/**
 * Video查询Repository
 * 对外提供统一的高性能查询接口，隐藏底层实现细节
 */

import type {
  Video
} from '../types/video.js';
import type {
  BookQueryOptions,
  BookQueryResult,
  VideoQueryCondition
} from '../query-server/query/types.js';
import { Platform, PaginationParams, PaginationResult } from '../types/base.js';
import { VideoBookManager, type IVideoRepository } from '../query-server/book/video-book-manager.js';
import { VideoQueryService } from '../query-server/query/video-query-service.js';
import { VideoRepository as VideoRepositoryImpl } from '../implementations/video-repository.impl.js';

/**
 * Video查询Repository类
 */
export class VideoRepository {
  private bookManager: VideoBookManager;
  private queryService: VideoQueryService;
  private repository: VideoRepositoryImpl;

  constructor() {
    this.repository = new VideoRepositoryImpl();
    this.bookManager = new VideoBookManager(this.repository);
    this.queryService = new VideoQueryService();
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
    const book = await this.bookManager.createVideoQueryBook(queryCondition, options);
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
    // 从数据库获取
    const video = await this.repository.getVideo(videoId, Platform.BILIBILI);
    return video;
  }

  /**
   * 批量获取视频
   * @param videoIds 视频ID列表
   * @returns 视频对象Map
   */
  async getVideos(videoIds: string[]): Promise<Map<string, Video>> {
    // 从数据库获取
    const videos = await this.repository.getVideos(videoIds, Platform.BILIBILI);
    const result = new Map<string, Video>();
    videos.forEach(video => {
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
    // 索引缓存和数据缓存由 VideoBookManager 管理，不需要手动更新
  }

  /**
   * 批量创建或更新视频
   * @param videos 视频对象列表
   */
  async upsertVideos(videos: Video[]): Promise<void> {
    await this.repository.upsertVideos(videos);
    // 索引缓存和数据缓存由 VideoBookManager 管理，不需要手动更新
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
    await this.repository.deleteVideo(videoId, Platform.BILIBILI);
    // 缓存由 VideoBookManager 管理，不需要手动删除
  }

  /**
   * 批量删除视频
   * @param videoIds 视频ID列表
   */
  async deleteVideos(videoIds: string[]): Promise<void> {
    await this.repository.deleteVideos(videoIds, Platform.BILIBILI);
    // 缓存由 VideoBookManager 管理，不需要手动删除
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
    videoIndexCache: { size: number };
  } {
    return this.bookManager.getCacheStats();
  }

  /**
   * 获取创作者的视频列表（基于索引）
   * @param creatorId 创作者ID
   * @param platform 平台类型
   * @param pagination 分页参数
   * @returns 分页结果
   */
  async getCreatorVideos(
    creatorId: string,
    platform: Platform,
    pagination: PaginationParams
  ): Promise<PaginationResult<Video>> {
    return this.repository.getCreatorVideos(creatorId, platform, pagination);
  }

  /**
   * 获取指定平台的视频列表（基于索引）
   * @param platform 平台类型
   * @param pagination 分页参数
   * @returns 分页结果
   */
  async getVideosByPlatform(
    platform: Platform,
    pagination: PaginationParams
  ): Promise<PaginationResult<Video>> {
    return this.repository.getVideosByPlatform(platform, pagination);
  }

  /**
   * 更新视频标签
   * @param videoId 视频ID
   * @param platform 平台类型
   * @param tags 标签ID数组
   */
  async updateVideoTags(videoId: string, platform: Platform, tags: string[]): Promise<void> {
    await this.repository.updateVideoTags(videoId, platform, tags);
    // 缓存由 VideoBookManager 管理，不需要手动更新
  }

  /**
   * 更新视频封面图片（使用 ImageRepository）
   * @param videoId 视频ID
   * @param platform 平台类型
   * @param imageBlob 图片 Blob 数据
   * @param url 图片URL（可选，用于判断是否为同一图片）
   */
  async updateVideoPicture(
    videoId: string,
    platform: Platform,
    imageBlob: Blob,
    url?: string
  ): Promise<void> {
    await this.repository.updateVideoPicture(videoId, platform, imageBlob, url);
    // 缓存由 VideoBookManager 管理，不需要手动更新
  }

  /**
   * 获取视频封面图片
   * @param videoId 视频ID
   * @param platform 平台类型
   * @returns 图片 Blob 数据，不存在返回 null
   */
  async getVideoPicture(videoId: string, platform: Platform): Promise<Blob | null> {
    return this.repository.getVideoPicture(videoId, platform);
  }

  /**
   * 标记视频为失效
   * @param videoId 视频ID
   * @param platform 平台类型
   */
  async markVideoAsInvalid(videoId: string, platform: Platform): Promise<void> {
    await this.repository.markVideoAsInvalid(videoId, platform);
    // 缓存由 VideoBookManager 管理，不需要手动删除
  }

  /**
   * 批量标记视频为失效
   * @param videoIds 视频ID数组
   * @param platform 平台类型
   */
  async markVideosAsInvalid(videoIds: string[], platform: Platform): Promise<void> {
    await this.repository.markVideosAsInvalid(videoIds, platform);
    // 缓存由 VideoBookManager 管理，不需要手动删除
  }

  /**
   * 清理失效视频（联动删除关联的封面图片）
   * @returns 清理的视频数量
   */
  async cleanupInvalidVideos(): Promise<number> {
    const count = await this.repository.cleanupInvalidVideos();
    // 缓存由 VideoBookManager 管理，不需要手动清空
    return count;
  }
}
