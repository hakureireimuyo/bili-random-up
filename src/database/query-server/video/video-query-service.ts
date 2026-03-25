/**
 * 视频查询服务
 * 负责执行视频查询逻辑，返回结果ID列表
 * 与Book和页面无关，是通用工具
 */

import type { VideoQueryCondition } from './video-index-types.js';
import type { Video } from '../../types/video.js';
import type { CreatorIndex } from '../query/types.js';
import { VideoIndexCacheImpl } from './video-index-cache.js';
import { VideoCompositeQueryService } from './video-composite-query-service.js';
import type { VideoIndex } from './video-index-types.js';
import { IndexCache } from '../cache/index-cache.js';
import { QueryService } from '../query/query-service.js';
import { CacheManager } from '../cache/cache-manager.js';

/**
 * 视频查询服务类
 * 职责：
 * 1. 管理视频索引缓存
 * 2. 执行视频查询逻辑
 * 3. 与创作者索引缓存配合，支持基于创作者名称的查询
 */
export class VideoQueryService {
  private videoIndexCache: VideoIndexCacheImpl;
  private creatorIndexCache: IndexCache<CreatorIndex>;
  private compositeQueryService: VideoCompositeQueryService;
  private cacheManager: CacheManager;

  constructor() {
    this.cacheManager = CacheManager.getInstance();
    // 从CacheManager获取所有缓存单例
    this.videoIndexCache = this.cacheManager.getVideoIndexCache();
    this.creatorIndexCache = this.cacheManager.getIndexCache();
    this.compositeQueryService = new VideoCompositeQueryService();
  }

  /**
   * 从Video对象创建VideoIndex
   * @param video 视频对象
   * @returns 视频索引
   */
  createVideoIndex(video: Video): VideoIndex {
    return {
      videoId: video.videoId,
      platform: video.platform,
      creatorId: video.creatorId,
      title: video.title,
      duration: video.duration,
      publishTime: video.publishTime,
      tags: video.tags,
      isInvalid: video.isInvalid
    };
  }

  /**
   * 批量创建视频索引
   * @param videos 视频对象列表
   * @returns 视频索引列表
   */
  createVideoIndexes(videos: Video[]): VideoIndex[] {
    return videos.map(video => this.createVideoIndex(video));
  }

  /**
   * 添加视频到索引缓存
   * @param video 视频对象
   */
  addVideo(video: Video): void {
    const index = this.createVideoIndex(video);
    this.videoIndexCache.set(index);
  }

  /**
   * 批量添加视频到索引缓存
   * @param videos 视频对象列表
   */
  addVideos(videos: Video[]): void {
    const indexes = this.createVideoIndexes(videos);
    this.videoIndexCache.setBatch(indexes);
  }

  /**
   * 查询视频ID列表
   * @param queryCondition 查询条件
   * @returns 视频ID列表
   */
  async queryVideoIds(queryCondition: VideoQueryCondition): Promise<string[]> {
    const videoIndexes = this.videoIndexCache.values();
    const creatorIndexes = this.creatorIndexCache.values();
    const cacheKey = `video:${queryCondition.platform}`;

    return this.compositeQueryService.queryIds(
      videoIndexes,
      creatorIndexes,
      queryCondition,
      cacheKey
    );
  }

  /**
   * 查询视频索引列表
   * @param queryCondition 查询条件
   * @returns 视频索引列表
   */
  async queryVideoIndexes(queryCondition: VideoQueryCondition): Promise<VideoIndex[]> {
    const videoIndexes = this.videoIndexCache.values();
    const creatorIndexes = this.creatorIndexCache.values();
    const cacheKey = `video:${queryCondition.platform}`;

    const result = this.compositeQueryService.query(
      videoIndexes,
      creatorIndexes,
      queryCondition,
      cacheKey
    );

    return result.indexes;
  }

  /**
   * 获取视频索引缓存
   * @returns 视频索引缓存实例
   */
  getVideoIndexCache(): VideoIndexCacheImpl {
    return this.videoIndexCache;
  }

  /**
   * 获取创作者索引缓存
   * @returns 创作者索引缓存实例（来自CacheManager单例）
   */
  getCreatorIndexCache(): IndexCache<CreatorIndex> {
    return this.creatorIndexCache;
  }

  /**
   * 获取CacheManager实例
   * @returns CacheManager实例
   */
  getCacheManager(): CacheManager {
    return this.cacheManager;
  }

  /**
   * 清空视频索引缓存
   */
  clearVideoIndexCache(): void {
    this.videoIndexCache.clear();
  }

  /**
   * 获取视频索引缓存大小
   */
  getVideoIndexCacheSize(): number {
    return this.videoIndexCache.size();
  }

  /**
   * 获取创作者索引缓存大小
   */
  getCreatorIndexCacheSize(): number {
    return this.creatorIndexCache.size();
  }

  /**
   * 根据创作者ID获取视频索引
   * @param creatorId 创作者ID
   * @returns 视频索引列表
   */
  getVideosByCreator(creatorId: string): VideoIndex[] {
    return this.videoIndexCache.getByCreator(creatorId);
  }

  /**
   * 根据创作者ID列表获取视频索引
   * @param creatorIds 创作者ID列表
   * @returns 视频索引列表
   */
  getVideosByCreators(creatorIds: string[]): VideoIndex[] {
    return this.videoIndexCache.getByCreators(creatorIds);
  }

  /**
   * 根据标签获取视频索引
   * @param tagIds 标签ID列表
   * @returns 视频索引列表
   */
  getVideosByTags(tagIds: string[]): VideoIndex[] {
    return this.videoIndexCache.getByTags(tagIds);
  }

  /**
   * 根据时长范围获取视频索引
   * @param min 最小时长（秒）
   * @param max 最大时长（秒）
   * @returns 视频索引列表
   */
  getVideosByDuration(min?: number, max?: number): VideoIndex[] {
    return this.videoIndexCache.getByDurationRange(min, max);
  }

  /**
   * 根据发布时间范围获取视频索引
   * @param min 最小时间戳
   * @param max 最大时间戳
   * @returns 视频索引列表
   */
  getVideosByPublishTime(min?: number, max?: number): VideoIndex[] {
    return this.videoIndexCache.getByPublishTimeRange(min, max);
  }

  /**
   * 根据关键词搜索视频
   * @param keyword 关键词
   * @returns 视频索引列表
   */
  searchVideosByKeyword(keyword: string): VideoIndex[] {
    return this.videoIndexCache.filterByKeyword(keyword);
  }

  /**
   * 获取有效的视频索引
   * @returns 有效的视频索引列表
   */
  getValidVideos(): VideoIndex[] {
    return this.videoIndexCache.filterValid();
  }
}
