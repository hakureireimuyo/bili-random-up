/**
 * 基础书管理器类
 * 实现书页机制的核心功能，可被所有数据类型复用
 */

import type {
  Book,
  BookPage,
  BookPageState,
  BookQueryOptions,
  BookQueryResult
} from './types.js';
import type { QueryCondition } from '../query/types.js';
import { DataCache } from '../cache/data-cache.js';
import { IndexCache } from '../cache/index-cache.js';

/**
 * 数据仓库接口
 * 定义数据仓库必须实现的方法
 */
export interface IDataRepository<T> {
  /**
   * 根据ID获取单个数据
   */
  getById(id: string): Promise<T | null>;

  /**
   * 根据ID列表批量获取数据
   */
  getByIds(ids: string[]): Promise<T[]>;

  /**
   * 获取所有数据
   */
  getAll(): Promise<T[]>;
}

/**
 * 索引转换器接口
 * 定义如何将数据转换为索引
 */
export interface IIndexConverter<T, I> {
  /**
   * 将数据转换为索引
   */
  toIndex(data: T): I;

  /**
   * 获取数据的唯一标识
   */
  getId(data: T): string;
}

/**
 * 基础书管理器类
 * 实现书页机制的核心功能，管理查询结果和分页数据
 */
export class BaseBookManager<T, I> {
  protected books: Map<string, Book<T>> = new Map();
  protected dataCache: DataCache<T>;
  protected indexCache: IndexCache<I>;
  protected repository: IDataRepository<T>;
  protected indexConverter: IIndexConverter<T, I>;

  constructor(
    dataCache: DataCache<T>,
    indexCache: IndexCache<I>,
    repository: IDataRepository<T>,
    indexConverter: IIndexConverter<T, I>
  ) {
    this.dataCache = dataCache;
    this.indexCache = indexCache;
    this.repository = repository;
    this.indexConverter = indexConverter;
  }

  /**
   * 创建一本书
   */
  async createBook(
    queryCondition: QueryCondition,
    options: BookQueryOptions = {},
    queryExecutor?: (condition: QueryCondition, allIndexes: I[]) => string[]
  ): Promise<Book<T>> {
    const pageSize = options.pageSize || 20;

    // 生成书ID
    const bookId = this.generateBookId(queryCondition);

    // 获取结果ID列表
    const resultIds = await this.queryResultIds(queryCondition, queryExecutor);

    // 创建书
    const book: Book<T> = {
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
  getBook(bookId: string): Book<T> | undefined {
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
  ): Promise<BookQueryResult<T>> {
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
    newCondition: QueryCondition,
    queryExecutor?: (condition: QueryCondition, allIndexes: I[]) => string[]
  ): Promise<Book<T>> {
    const book = this.getBook(bookId);
    if (!book) {
      throw new Error(`Book not found: ${bookId}`);
    }

    // 获取新的结果ID列表
    const newResultIds = await this.queryResultIds(newCondition, queryExecutor);

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
   * 获取缓存统计信息
   */
  getCacheStats(): {
    dataCacheSize: number;
    indexCacheSize: number;
  } {
    return {
      dataCacheSize: this.dataCache.size(),
      indexCacheSize: this.indexCache.size()
    };
  }

  /**
   * 获取数据缓存实例
   */
  getDataCache(): DataCache<T> {
    return this.dataCache;
  }

  /**
   * 获取索引缓存实例
   */
  getIndexCache(): IndexCache<I> {
    return this.indexCache;
  }

  /**
   * 加载页数据
   */
  protected async loadPage(
    book: Book<T>,
    page: number,
    pageSize: number
  ): Promise<BookPage<T>> {
    const startIndex = page * pageSize;
    const endIndex = Math.min(startIndex + pageSize, book.resultIds.length);
    const pageIds = book.resultIds.slice(startIndex, endIndex);

    // 从缓存获取数据（利用共享缓存）
    const cachedData = this.dataCache.getBatch(pageIds);

    // 使用getUncachedKeys方法获取未缓存的ID
    const uncachedIds = this.dataCache.getUncachedKeys(pageIds);

    // 从数据库获取未缓存的数据
    let dbData: T[] = [];
    if (uncachedIds.length > 0) {
      dbData = await this.repository.getByIds(uncachedIds);
      // 批量存入缓存
      const entries = new Map<string, T>();
      dbData.forEach(data => {
        entries.set(this.indexConverter.getId(data), data);
      });
      this.dataCache.setBatch(entries);
    }

    // 合并数据，保持原始顺序
    const items = pageIds.map(id => {
      const cached = cachedData.find(d => this.indexConverter.getId(d) === id);
      if (cached) return cached;
      return dbData.find(d => this.indexConverter.getId(d) === id);
    }).filter((d): d is T => d !== undefined);

    return {
      page,
      items,
      loaded: true,
      loadTime: Date.now()
    };
  }

  /**
   * 查询结果ID列表
   */
  protected async queryResultIds(
    queryCondition: QueryCondition,
    queryExecutor?: (condition: QueryCondition, allIndexes: I[]) => string[]
  ): Promise<string[]> {
    // 确保索引缓存已加载
    if (this.indexCache.size() === 0) {
      await this.loadIndexCache();
    }

    const allIndexes = this.indexCache.values();

    // 如果提供了自定义查询执行器，使用它
    if (queryExecutor) {
      return queryExecutor(queryCondition, allIndexes);
    }

    // 默认返回所有ID
    return allIndexes.map(index => this.extractIdFromIndex(index));
  }

  /**
   * 加载索引缓存
   */
  protected async loadIndexCache(): Promise<void> {
    const allData = await this.repository.getAll();
    const entries = new Map<string, I>();

    allData.forEach(data => {
      const index = this.indexConverter.toIndex(data);
      entries.set(this.extractIdFromIndex(index), index);
    });

    this.indexCache.setBatch(entries);
  }

  /**
   * 生成书ID
   */
  protected generateBookId(condition: QueryCondition): string {
    // 子类可以重写此方法以实现自定义的书ID生成逻辑
    return JSON.stringify(condition);
  }

  /**
   * 从索引中提取ID
   */
  protected extractIdFromIndex(index: I): string {
    // 子类应该重写此方法
    return index as unknown as string;
  }
}
