/**
 * 视频书管理器
 * 管理视频的Book，实现视频的分页查询功能
 */

import type {
  Book,
  BookPage,
  BookPageState,
  BookQueryOptions,
  BookQueryResult,
  QueryCondition
} from '../query/types.js';
import type { Video } from '../../types/video.js';
import type { VideoQueryCondition } from './video-index-types.js';
import { DataCache } from '../cache/data-cache.js';
import { Platform } from '../../types/base.js';
import { CacheManager } from '../cache/cache-manager.js';

/**
 * 视频书管理器类
 * 职责：
 * 1. 管理视频Book的CRUD操作
 * 2. 加载视频Book的页数据
 * 3. 不执行查询逻辑，查询逻辑由VideoQueryService负责
 */
export class VideoBookManager {
  private books: Map<string, Book<Video>> = new Map();
  private dataCache: DataCache<Video>;
  private videoRepository: VideoRepository;
  private cacheManager: CacheManager;

  constructor(
    videoRepository?: VideoRepository
  ) {
    this.cacheManager = CacheManager.getInstance();
    // 从CacheManager获取DataCache单例
    this.dataCache = this.cacheManager.getDataCache<Video>();
    this.videoRepository = videoRepository || new VideoRepository();
  }

  /**
   * 创建一本书
   * Book是数据容器，不执行查询逻辑
   * 查询逻辑由VideoQueryService负责
   */
  createBook(
    bookId: string,
    queryCondition: VideoQueryCondition,
    resultIds: string[],
    options: BookQueryOptions = {}
  ): Book<Video> {
    const pageSize = options.pageSize || 20;

    // 创建书
    const book: Book<Video> = {
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
  getBook(bookId: string): Book<Video> | undefined {
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
  ): Promise<BookQueryResult<Video>> {
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
  ): Book<Video> | undefined {
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
  getAllBooks(): Map<string, Book<Video>> {
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
  getDataCache(): DataCache<Video> {
    return this.dataCache;
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    dataCache: ReturnType<DataCache<Video>['getStats']>;
    indexCache: { size: number };
  } {
    return {
      dataCache: this.dataCache.getStats(),
      indexCache: { size: 0 } // VideoBookManager不直接管理索引缓存
    };
  }

  /**
   * 清理过期的书
   * @param maxAge 最大存活时间(毫秒)
   */
  cleanupExpiredBooks(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [bookId, book] of this.books) {
      if (now - book.lastAccessTime > maxAge) {
        this.books.delete(bookId);
      }
    }
  }

  /**
   * 加载页数据
   */
  private async loadPage(
    book: Book<Video>,
    page: number,
    pageSize: number
  ): Promise<BookPage<Video>> {
    const startIndex = page * pageSize;
    const endIndex = Math.min(startIndex + pageSize, book.resultIds.length);
    const pageIds = book.resultIds.slice(startIndex, endIndex);

    // 从缓存获取数据（利用共享缓存）
    const cachedVideos = this.dataCache.getBatch(pageIds);

    // 使用getUncachedIds方法获取未缓存的ID
    const uncachedIds = this.dataCache.getUncachedIds(pageIds);

    // 从数据库获取未缓存的数据
    let dbVideos: Video[] = [];
    if (uncachedIds.length > 0) {
      dbVideos = await this.videoRepository.getVideos(uncachedIds, Platform.BILIBILI);
      // 使用setBatch批量设置数据
      const entries = new Map<string, Video>();
      dbVideos.forEach(video => entries.set(video.videoId, video));
      this.dataCache.setBatch(entries);
    }

    // 合并数据，保持原始顺序
    const items = pageIds.map(id => {
      const cached = cachedVideos.find(v => v.videoId === id);
      if (cached) return cached;
      return dbVideos.find(v => v.videoId === id);
    }).filter((v): v is Video => v !== undefined);

    return {
      page,
      items,
      loaded: true,
      loadTime: Date.now()
    };
  }
}

/**
 * 视频仓库接口
 * 用于从数据库获取视频数据
 */
export interface VideoRepository {
  /**
   * 根据ID列表获取视频
   * @param videoIds 视频ID列表
   * @param platform 平台
   * @returns 视频列表
   */
  getVideos(videoIds: string[], platform: Platform): Promise<Video[]>;
}

/**
 * 默认视频仓库实现
 * 需要根据实际的数据源实现
 */
export class DefaultVideoRepository implements VideoRepository {
  async getVideos(videoIds: string[], platform: Platform): Promise<Video[]> {
    // TODO: 实现从数据库获取视频的逻辑
    // 示例：
    // return await this.db.query(
    //   'SELECT * FROM videos WHERE video_id IN (?) AND platform = ?',
    //   [videoIds, platform]
    // );
    return [];
  }
}
