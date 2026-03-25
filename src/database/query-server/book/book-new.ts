/**
 * 书管理器模块
 * 实现书页机制的核心功能，管理查询结果和分页数据
 * Book是数据容器，与页面生命周期绑定
 */

import type {
  Book,
  BookPage,
  BookPageState,
  BookQueryOptions,
  BookQueryResult,
  QueryCondition
} from '../query/types.js';
import type { Creator } from '../../types/creator.js';
import { DataCache } from '../cache/data-cache.js';
import { CreatorRepository } from '../../implementations/creator-repository.impl.js';
import { Platform } from '../../types/base.js';

/**
 * 书管理器类
 * 职责：
 * 1. 管理Book的CRUD操作
 * 2. 加载Book的页数据
 * 3. 不执行查询逻辑，查询逻辑由QueryService负责
 */
export class BookManager {
  private books: Map<string, Book<Creator>> = new Map();
  private dataCache: DataCache<Creator>;
  private repository: CreatorRepository;

  constructor(
    dataCache?: DataCache<Creator>,
    repository?: CreatorRepository
  ) {
    this.dataCache = dataCache || new DataCache<Creator>({
      maxSize: 2000,
      maxAge: 3600000,
      cleanupRatio: 0.2
    });
    this.repository = repository || new CreatorRepository();
  }

  /**
   * 创建一本书
   * Book是数据容器，不执行查询逻辑
   * 查询逻辑由QueryService负责
   */
  createBook(
    bookId: string,
    queryCondition: QueryCondition,
    resultIds: string[],
    options: BookQueryOptions = {}
  ): Book<Creator> {
    const pageSize = options.pageSize || 20;

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
   * 更新书的查询结果
   */
  updateBookResult(
    bookId: string,
    newResultIds: string[]
  ): Book<Creator> | undefined {
    const book = this.getBook(bookId);
    if (!book) {
      return undefined;
    }

    // 更新书
    book.resultIds = newResultIds;
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
   * 获取所有书
   */
  getAllBooks(): Map<string, Book<Creator>> {
    return this.books;
  }

  /**
   * 清空所有书
   */
  clearAllBooks(): void {
    this.books.clear();
  }

  /**
   * 获取数据缓存实例
   */
  getDataCache(): DataCache<Creator> {
    return this.dataCache;
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    dataCache: ReturnType<DataCache<Creator>['getStats']>;
  } {
    return {
      dataCache: this.dataCache.getStats()
    };
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
}
