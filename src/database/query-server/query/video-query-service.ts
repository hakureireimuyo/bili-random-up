/**
 * 视频查询服务
 * 继承自QueryService，负责执行视频查询逻辑，返回结果ID列表
 * 与Book和页面无关，是通用工具
 */

import type { VideoQueryCondition } from './types.js';
import type { Video } from '../../types/video.js';
import type { CreatorIndex } from './types.js';
import type { VideoIndex } from './types.js';
import { QueryService } from './query-service.js';
import { CacheManager } from '../cache/cache-manager.js';

/**
 * 视频查询服务类
 * 继承自QueryService，专门用于视频查询
 */
export class VideoQueryService extends QueryService<Video, VideoIndex, VideoQueryCondition> {
  private cacheManager: CacheManager;

  constructor() {
    const cacheManager = CacheManager.getInstance();
    // 从CacheManager获取所有缓存单例
    const indexCache = cacheManager.getVideoIndexCache();
    const creatorIndexCache = cacheManager.getIndexCache();

    super(indexCache, creatorIndexCache);
    this.cacheManager = cacheManager;
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
    this.indexCache.set(index.videoId, index);
  }

  /**
   * 批量添加视频到索引缓存
   * @param videos 视频对象列表
   */
  addVideos(videos: Video[]): void {
    const indexes = this.createVideoIndexes(videos);
    const indexMap = new Map<string, VideoIndex>();
    indexes.forEach(index => indexMap.set(index.videoId, index));
    this.indexCache.setBatch(indexMap);
  }

  /**
   * 查询视频ID列表
   * @param queryCondition 查询条件
   * @returns 视频ID列表
   */
  async queryVideoIds(queryCondition: VideoQueryCondition): Promise<string[]> {
    const videoIndexes = this.indexCache.values();
    const creatorIndexes = this.creatorIndexCache.values();
    const cacheKey = `video:${queryCondition.platform}`;

    return this.queryIds(
      videoIndexes,
      creatorIndexes,
      queryCondition,
      cacheKey
    );
  }

  /**
   * 实现查询逻辑
   * @param indexes 视频索引列表
   * @param condition 查询条件
   * @returns 匹配的视频ID列表
   */
  protected executeQuery(
    indexes: VideoIndex[],
    condition: VideoQueryCondition
  ): string[] {
    let results = indexes;

    // 创作者过滤
    if (condition.creatorIds && condition.creatorIds.length > 0) {
      results = results.filter(v => condition.creatorIds!.includes(v.creatorId));
    }

    // 创作者名称过滤（需要通过创作者索引查询）
    if (condition.creatorName) {
      const creatorIds = this.creatorIndexCache
        .values()
        .filter(c => c.name.includes(condition.creatorName!))
        .map(c => c.creatorId);

      if (creatorIds.length > 0) {
        results = results.filter(v => creatorIds.includes(v.creatorId));
      } else {
        // 如果没有匹配的创作者，返回空结果
        return [];
      }
    }

    // 标签过滤
    if (condition.tagExpressions && condition.tagExpressions.length > 0) {
      results = results.filter(v => {
        return condition.tagExpressions!.every(expr => {
          const hasTag = expr.tagId instanceof Array
            ? expr.tagId.some(t => v.tags.includes(t))
            : v.tags.includes(expr.tagId);

          switch (expr.operator) {
            case 'AND':
              return hasTag;
            case 'OR':
              return hasTag;
            case 'NOT':
              return !hasTag;
            default:
              return false;
          }
        });
      });
    }

    // 时长过滤
    if (condition.durationRange) {
      const { min, max } = condition.durationRange;
      results = results.filter(v => {
        if (min !== undefined && v.duration < min) return false;
        if (max !== undefined && v.duration > max) return false;
        return true;
      });
    }

    // 发布时间过滤
    if (condition.publishTimeRange) {
      const { min, max } = condition.publishTimeRange;
      results = results.filter(v => {
        if (min !== undefined && v.publishTime < min) return false;
        if (max !== undefined && v.publishTime > max) return false;
        return true;
      });
    }

    // 只查询已关注的创作者的视频
    if (condition.onlyFollowingCreators) {
      const followingCreatorIds = this.creatorIndexCache
        .values()
        .filter(c => c.isFollowing)
        .map(c => c.creatorId);

      results = results.filter(v => followingCreatorIds.includes(v.creatorId));
    }

    return results.map(v => v.videoId);
  }
}
