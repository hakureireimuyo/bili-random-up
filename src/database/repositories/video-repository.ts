/**
 * Video查询Repository
 * 对外提供统一的高性能查询接口，隐藏底层实现细节
 */

import type {
  Video
} from '../types/video.js';
import type {
  BookQueryOptions,
  BookQueryResult
} from '../query-server/query/types.js';
import type { VideoQueryCondition } from '../query-server/video/video-index-types.js';
import { Platform } from '../types/base.js';
import { VideoBookManager } from '../query-server/video/video-book-manager.js';
import { VideoQueryService } from '../query-server/video/video-query-service.js';
import { VideoRepository as VideoRepositoryImpl } from '../implementations/video-repository.impl.js';

/**
 * Video查询Repository类
 */
export class VideoRepository {
  private bookManager: VideoBookManager;
  private queryService: VideoQueryService;
  private repository: VideoRepositoryImpl;
  private dataCache: import('../query-server/cache/data-cache.js').DataCache<Video>;

  constructor() {
    this.repository = new VideoRepositoryImpl();
    this.bookManager = new VideoBookManager(this.repository);
    this.queryService = new VideoQueryService();
    this.dataCache = this.bookManager.getDataCache();
  }

  /**
   * 创建视频查询书
   * @param queryCondition 查询条件
   * @param options 查询选项
   * @returns 书ID
   */
  async createQueryBook(
    queryCondition: VideoQueryCondition,
    options: BookQueryOptions = {}
  ): Promise<string> {
    const resultIds = await this.queryService.queryVideoIds(queryCondition);
    const book = this.bookManager.createBook(
      `video:${JSON.stringify(queryCondition)}`,
      queryCondition,
      resultIds,
      options
    );
    return book.bookId;
  }

  /**
   * 获取书页数据
   * @param bookId 书ID
   * @param page 页码
   * @param options 查询选项
   * @returns 书页数据
   */
  async getPage(
    bookId: string,
    page: number,
    options: BookQueryOptions = {}
  ): Promise<BookQueryResult<Video>> {
    return this.bookManager.getPage(bookId, page, options);
  }

  /**
   * 获取视频
   * @param videoId 视频ID
   * @returns 视频对象
   */
  async getVideo(videoId: string): Promise<Video | null> {
    // 先从缓存获取
    const cached = this.dataCache.get(videoId);
    if (cached) {
      return cached;
    }

    // 从数据库获取
    const video = await this.repository.getVideo(videoId, Platform.BILIBILI);
    if (video) {
      this.dataCache.set(videoId, video);
    }
    return video;
  }

  /**
   * 批量获取视频
   * @param videoIds 视频ID列表
   * @returns 视频对象Map
   */
  async getVideos(videoIds: string[]): Promise<Map<string, Video>> {
    // 先从缓存获取
    const cachedVideos = this.dataCache.getBatch(videoIds);
    const uncachedIds = videoIds.filter(id =>
      !cachedVideos.some((v: Video) => v.videoId === id)
    );

    // 从数据库获取未缓存的数据
    let dbVideos: Video[] = [];
    if (uncachedIds.length > 0) {
      dbVideos = await this.repository.getVideos(uncachedIds, Platform.BILIBILI);
      // 使用setBatch批量设置数据
      const entries = new Map<string, Video>();
      dbVideos.forEach(video => entries.set(video.videoId, video));
      this.dataCache.setBatch(entries);
    }

    // 合并结果
    const result = new Map<string, Video>();
    [...cachedVideos, ...dbVideos].forEach(video => {
      result.set(video.videoId, video);
    });

    return result;
  }

  /**
   * 创建或更新视频
   * @param video 视频对象
   */
  async upsertVideo(video: Video): Promise<void> {
    await this.repository.upsertVideo(video);
    this.dataCache.set(video.videoId, video);

    // 更新索引缓存
    this.queryService.addVideo(video);
  }

  /**
   * 批量创建或更新视频
   * @param videos 视频对象列表
   */
  async upsertVideos(videos: Video[]): Promise<void> {
    await this.repository.upsertVideos(videos);
    // 使用setBatch批量设置数据
    const entries = new Map<string, Video>();
    videos.forEach(video => entries.set(video.videoId, video));
    this.dataCache.setBatch(entries);

    // 更新索引缓存
    this.queryService.addVideos(videos);
  }

  /**
   * 获取所有视频
   * @returns 所有视频对象数组
   */
  async getAllVideos(): Promise<Video[]> {
    return this.repository.getAllVideos();
  }

  /**
   * 分页获取视频
   * @param pagination 分页参数
   * @returns 分页结果
   */
  async getVideosPaginated(pagination: { page: number; pageSize: number }): Promise<{
    items: Video[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    return this.repository.getVideosPaginated(pagination);
  }

  /**
   * 删除视频
   * @param videoId 视频ID
   */
  async deleteVideo(videoId: string): Promise<void> {
    await this.repository.deleteVideo(videoId,Platform.BILIBILI);
    this.dataCache.delete(videoId);
  }

  /**
   * 批量删除视频
   * @param videoIds 视频ID列表
   */
  async deleteVideos(videoIds: string[]): Promise<void> {
    await this.repository.deleteVideos(videoIds,Platform.BILIBILI);
    videoIds.forEach(id => this.dataCache.delete(id));
  }

  /**
   * 清理过期的书
   * @param maxAge 最大存活时间(毫秒)
   */
  cleanupExpiredBooks(maxAge: number = 3600000): void {
    this.bookManager.cleanupExpiredBooks(maxAge);
  }

  /**
   * 清空所有书
   */
  clearAllBooks(): void {
    this.bookManager.clearAllBooks();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    dataCache: ReturnType<import('../query-server/cache/data-cache.js').DataCache<Video>['getStats']>;
    indexCache: { size: number };
  } {
    return this.bookManager.getCacheStats();
  }
}
