/**
 * 书管理器模块
 * 实现书页机制的核心功能，管理查询结果和分页数据
 */

import type { 
  Book, 
  BookPage, 
  BookPageState, 
  BookQueryOptions, 
  BookQueryResult, 
  QueryCondition,
  CreatorIndex 
} from '../query/types.js';
import type { Creator } from '../../types/creator.js';
import { IndexCache } from '../cache/index-cache.js';
import { DataCache } from '../cache/data-cache.js';
import { CompositeQueryService } from '../query/composite-query-service.js';
import type { CompositeQueryCondition } from '../query/composite-query-service.js';
import { CreatorRepository } from '../../implementations/creator-repository.impl.js';
import { Platform } from '../../types/base.js';
/**
 * 书管理器类
 */
export class BookManager {
  private books: Map<string, Book<Creator>> = new Map();
  private indexCache: IndexCache<CreatorIndex>;
  private dataCache: DataCache<Creator>;
  private repository: CreatorRepository;
  private compositeQueryService: CompositeQueryService;

  constructor(
    indexCache?: IndexCache<CreatorIndex>,
    dataCache?: DataCache<Creator>,
    repository?: CreatorRepository
  ) {
    this.indexCache = indexCache || new IndexCache<CreatorIndex>(10000);
    this.dataCache = dataCache || new DataCache<Creator>({
      maxSize: 2000,
      maxAge: 3600000,
      cleanupRatio: 0.2
    });
    this.repository = repository || new CreatorRepository();
    this.compositeQueryService = new CompositeQueryService();
  }

  /**
   * 创建一本书
   */
  async createBook(
    queryCondition: QueryCondition,
    options: BookQueryOptions = {}
  ): Promise<Book<Creator>> {
    const pageSize = options.pageSize || 20;

    // 生成书ID
    const bookId = this.generateBookId(queryCondition);

    // 获取结果ID列表
    const resultIds = await this.queryResultIds(queryCondition);

    // 创建书
    const book: Book<Creator> = {
      bookId,
      resultIds,
      pages: new Map(),
      state: {
        currentPage: 0,
        totalPages: Math.ceil(resultIds.length / pageSize),
        pageSize,
        totalRecords: resultIds.length
      },
      queryCondition,
      createdAt: Date.now(),
      lastAccessTime: Date.now()
    };

    // 存储书
    this.books.set(bookId, book);

    return book;
  }

  /**
   * 获取书
   */
  getBook(bookId: string): Book<Creator> | undefined {
    const book = this.books.get(bookId);
    if (book) {
      book.lastAccessTime = Date.now();
    }
    return book;
  }

  /**
   * 获取书页数据
   */
  async getPage(
    bookId: string,
    page: number,
    options: BookQueryOptions = {}
  ): Promise<BookQueryResult<Creator>> {
    const book = this.getBook(bookId);
    if (!book) {
      throw new Error(`Book not found: ${bookId}`);
    }

    const pageSize = options.pageSize || book.state.pageSize;
    const totalPages = Math.ceil(book.resultIds.length / pageSize);

    // 检查页码是否有效
    if (page < 0 || page >= totalPages) {
      throw new Error(`Invalid page number: ${page}. Total pages: ${totalPages}`);
    }

    // 更新当前页
    book.state.currentPage = page;
    book.state.totalPages = totalPages;
    book.state.pageSize = pageSize;

    // 获取或加载页数据
    let bookPage = book.pages.get(page);
    if (!bookPage || !bookPage.loaded) {
      bookPage = await this.loadPage(book, page, pageSize);
      book.pages.set(page, bookPage);
    }

    // 预加载下一页
    if (options.preloadNext && page < totalPages - 1) {
      const preloadCount = options.preloadCount || 1;
      for (let i = 1; i <= preloadCount && page + i < totalPages; i++) {
        const nextPage = page + i;
        const nextPageData = book.pages.get(nextPage);
        if (!nextPageData || !nextPageData.loaded) {
          this.loadPage(book, nextPage, pageSize).then(page => {
            book.pages.set(nextPage, page);
          });
        }
      }
    }

    return {
      items: bookPage.items,
      state: { ...book.state },
      bookId: book.bookId
    };
  }

  /**
   * 更新查询条件
   */
  async updateQueryCondition(
    bookId: string,
    newCondition: QueryCondition
  ): Promise<Book<Creator>> {
    const book = this.getBook(bookId);
    if (!book) {
      throw new Error(`Book not found: ${bookId}`);
    }

    // 获取新的结果ID列表
    const newResultIds = await this.queryResultIds(newCondition);

    // 更新书
    book.resultIds = newResultIds;
    book.queryCondition = newCondition;
    book.state.totalRecords = newResultIds.length;
    book.state.totalPages = Math.ceil(newResultIds.length / book.state.pageSize);
    book.state.currentPage = 0;
    book.pages.clear(); // 清空页缓存
    book.lastAccessTime = Date.now();

    return book;
  }

  /**
   * 删除书
   */
  deleteBook(bookId: string): boolean {
    return this.books.delete(bookId);
  }

  /**
   * 清理过期的书
   */
  cleanupExpiredBooks(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [bookId, book] of this.books.entries()) {
      if (now - book.lastAccessTime > maxAge) {
        this.books.delete(bookId);
      }
    }
  }

  /**
   * 获取索引缓存实例
   */
  getIndexCache(): IndexCache<CreatorIndex> {
    return this.indexCache;
  }

  /**
   * 获取数据缓存实例
   */
  getDataCache(): DataCache<Creator> {
    return this.dataCache;
  }

  /**
   * 加载页数据
   */
  private async loadPage(
    book: Book<Creator>,
    page: number,
    pageSize: number
  ): Promise<BookPage<Creator>> {
    const startIndex = page * pageSize;
    const endIndex = Math.min(startIndex + pageSize, book.resultIds.length);
    const pageIds = book.resultIds.slice(startIndex, endIndex);

    // 从缓存获取数据（利用共享缓存）
    const cachedCreators = this.dataCache.getBatch(pageIds);

    // 使用新的getUncachedIds方法获取未缓存的ID
    const uncachedIds = this.dataCache.getUncachedIds(pageIds);

    // 从数据库获取未缓存的数据
    let dbCreators: Creator[] = [];
    if (uncachedIds.length > 0) {
      dbCreators = await this.repository.getCreators(uncachedIds, Platform.BILIBILI);
      // 使用setBatch批量设置数据
      const entries = new Map<string, Creator>();
      dbCreators.forEach(creator => entries.set(creator.creatorId, creator));
      this.dataCache.setBatch(entries);
    }

    // 合并数据，保持原始顺序
    const items = pageIds.map(id => {
      const cached = cachedCreators.find(c => c.creatorId === id);
      if (cached) return cached;
      return dbCreators.find(c => c.creatorId === id);
    }).filter((c): c is Creator => c !== undefined);

    return {
      page,
      items,
      loaded: true,
      loadTime: Date.now()
    };
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    dataCache: ReturnType<DataCache<Creator>['getStats']>;
    indexCache: { size: number };
  } {
    return {
      dataCache: this.dataCache.getStats(),
      indexCache: {
        size: this.indexCache.size()
      }
    };
  }

  /**
   * 查询结果ID列表
   */
  private async queryResultIds(queryCondition: QueryCondition): Promise<string[]> {
    // 确保索引缓存已加载
    if (this.indexCache.size() === 0) {
      await this.loadIndexCache();
    }

    const allIndexes = this.indexCache.values();
    const compositeCond = queryCondition as unknown as CompositeQueryCondition;
    const cacheKey = 'creator:bilibili';

    return this.compositeQueryService.queryIds(allIndexes, compositeCond, cacheKey);
  }

  /**
   * 加载索引缓存
   */
  private async loadIndexCache(): Promise<void> {
    const allCreators = await this.repository.getAllCreators(Platform.BILIBILI);
    const indexes: CreatorIndex[] = allCreators.map(creator => ({
      creatorId: creator.creatorId,
      name: creator.name,
      tags: creator.tagWeights.map(tw => tw.tagId),
      isFollowing: creator.isFollowing === 1
    }));
    // 将数组转换为Map
    const entries = new Map<string, CreatorIndex>();
    indexes.forEach(index => entries.set(index.creatorId, index));
    this.indexCache.setBatch(entries);
  }

  /**
   * 生成书ID
   */
  private generateBookId(condition: QueryCondition): string {
    const compositeCond = condition as unknown as CompositeQueryCondition;
    // 使用JSON.stringify生成唯一标识
    return JSON.stringify({
      platform: compositeCond.platform,
      keyword: compositeCond.keyword,
      tagExpressions: compositeCond.tagExpressions,
      isFollowing: compositeCond.isFollowing
    });
  }
}
