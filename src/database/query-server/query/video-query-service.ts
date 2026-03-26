/**
 * 视频查询服务 - 调度层
 * 协调视频查询流程，调用纯函数执行查询
 */

import type { VideoQueryCondition, VideoIndex, CreatorIndex, QueryOutput} from './types.js';
import type { Video } from '../../types/video.js';
import type { TagExpression } from '../cache/types.js';
import { IndexCache } from '../cache/index-cache.js';
import { TagFilterEngine } from './tag-filter-engine.js';
import { CacheManager } from '../cache/cache-manager.js';
import { ID } from '../../types/base.js';

/**
 * 视频查询服务类 - 调度层
 */
export class VideoQueryService {
  private indexCache: IndexCache<VideoIndex>;
  private creatorIndexCache: IndexCache<CreatorIndex>;

  constructor() {
    const cacheManager = CacheManager.getInstance();
    // 从CacheManager获取所有缓存单例
    this.indexCache = cacheManager.getVideoIndexCache();
    this.creatorIndexCache = cacheManager.getIndexCache();
  }

  /**
   * 从Video对象创建VideoIndex
   * @param video 视频对象
   * @returns 视频索引
   */
  createVideoIndex(video: Video): VideoIndex {
    return {
      videoId: video.videoId,
      bv: video.bv,
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
    const indexMap = new Map<ID, VideoIndex>();
    indexes.forEach(index => indexMap.set(index.videoId, index));
    this.indexCache.setBatch(indexMap);
  }

  /**
   * 查询视频ID列表
   * @param queryCondition 查询条件
   * @returns 视频ID列表
   */
  async queryVideoIds(queryCondition: VideoQueryCondition): Promise<ID[]> {
    const result = await this.query(queryCondition);
    return result.matchedIds;
  }

  /**
   * 执行查询并返回完整结果
   * @param queryCondition 查询条件
   * @returns 查询结果
   */
  async query(queryCondition: VideoQueryCondition): Promise<QueryOutput> {
    const videoIndexes = this.indexCache.values();
    const creatorIndexes = this.creatorIndexCache.values();

    let results = videoIndexes;

    // 1. 创作者过滤（优先级最高）
    if (queryCondition.creatorIds && queryCondition.creatorIds.length > 0) {
      results = results.filter(v => queryCondition.creatorIds!.includes(v.creatorId));
    }

    // 2. 创作者名称过滤（需要通过创作者索引查询）
    if (queryCondition.creatorName) {
      const creatorIds = creatorIndexes
        .filter(c => c.name.includes(queryCondition.creatorName!))
        .map(c => c.creatorId);

      if (creatorIds.length > 0) {
        results = results.filter(v => creatorIds.includes(v.creatorId));
      } else {
        // 如果没有匹配的创作者，返回空结果
        return {
          matchedIds: [],
          stats: {
            initialCount: videoIndexes.length,
            stageCounts: {}
          }
        };
      }
    }

    // 3. 只查询已关注的创作者的视频
    if (queryCondition.onlyFollowingCreators) {
      const followingCreatorIds = creatorIndexes
        .filter(c => c.isFollowing)
        .map(c => c.creatorId);

      results = results.filter(v => followingCreatorIds.includes(v.creatorId));
    }

    // 4. 标签过滤
    if (queryCondition.tagExpressions && queryCondition.tagExpressions.length > 0) {
      results = this.filterByTags(results, queryCondition.tagExpressions);
    }

    // 5. 时长过滤
    if (queryCondition.durationRange) {
      const { min, max } = queryCondition.durationRange;
      results = results.filter(v => {
        if (min !== undefined && v.duration < min) return false;
        if (max !== undefined && v.duration > max) return false;
        return true;
      });
    }

    // 6. 发布时间过滤
    if (queryCondition.publishTimeRange) {
      const { min, max } = queryCondition.publishTimeRange;
      results = results.filter(v => {
        if (min !== undefined && v.publishTime < min) return false;
        if (max !== undefined && v.publishTime > max) return false;
        return true;
      });
    }

    // 7. 标题关键词过滤（优先级最低）
    if (queryCondition.keyword) {
      const lowerKeyword = queryCondition.keyword.toLowerCase().trim();
      results = results.filter(v => v.title.toLowerCase().includes(lowerKeyword));
    }

    return {
      matchedIds: results.map(v => v.videoId),
      stats: {
        initialCount: videoIndexes.length,
        stageCounts: {}
      }
    };
  }

  /**
   * 标签过滤 - 调度层
   * @param indexes 视频索引列表
   * @param expressions 标签表达式列表
   * @returns 过滤后的VideoIndex列表
   */
  private filterByTags(
    indexes: VideoIndex[],
    expressions: TagExpression[]
  ): VideoIndex[] {
    // 构建标签到ID集合的映射
    const tagToIds = TagFilterEngine.buildTagIndexMap(
      indexes.map(index => ({ id: index.videoId, tags: index.tags }))
    );

    // 使用TagFilterEngine执行过滤
    const filterResult = TagFilterEngine.filter(tagToIds, expressions);
    const matchedIds = Array.from(filterResult.matchedIds);

    // 返回匹配的VideoIndex
    return indexes.filter(index => matchedIds.includes(index.videoId));
  }

  /**
   * 获取视频索引缓存
   */
  getIndexCache(): IndexCache<VideoIndex> {
    return this.indexCache;
  }

  /**
   * 获取创作者索引缓存
   */
  getCreatorIndexCache(): IndexCache<CreatorIndex> {
    return this.creatorIndexCache;
  }

  /**
   * 清空视频索引缓存
   */
  clearIndexCache(): void {
    this.indexCache.clear();
  }

  /**
   * 获取视频索引缓存大小
   */
  getIndexCacheSize(): number {
    return this.indexCache.size();
  }
}
