/**
 * 视频复合查询服务
 * 实现基于标题匹配、创作者过滤、标签过滤、时长范围、发布时间范围的组合查询
 */

import type {
  VideoIndex,
  VideoQueryCondition,
  VideoQueryResult,
  TagExpression,
  DurationRange
} from './video-index-types.js';
import type { CreatorIndex } from '../query/types.js';
import { TagFilterEngine } from '../query/tag-filter-engine.js';
import { TagCache } from '../cache/tag-cache.js';

/**
 * 视频复合查询服务类
 */
export class VideoCompositeQueryService {
  private tagFilterEngine: TagFilterEngine;
  private tagCache: TagCache;

  constructor() {
    this.tagFilterEngine = new TagFilterEngine();
    this.tagCache = TagCache.getInstance();
  }

  /**
   * 执行复合查询
   * 优先级：创作者过滤 > 标签过滤 > 时长过滤 > 发布时间过滤 > 标题过滤
   * @param videoIndexes 视频索引列表
   * @param creatorIndexes 创作者索引列表（用于创作者名称查询）
   * @param condition 查询条件
   * @param cacheKey 缓存键（如 "video:bilibili"）
   * @returns 查询结果
   */
  query(
    videoIndexes: VideoIndex[],
    creatorIndexes: CreatorIndex[],
    condition: VideoQueryCondition,
    cacheKey?: string
  ): VideoQueryResult {
    const stats = {
      initialCount: videoIndexes.length,
      afterCreatorFilter: videoIndexes.length,
      afterTagFilter: videoIndexes.length,
      afterTitleFilter: videoIndexes.length,
      afterDurationFilter: videoIndexes.length,
      afterPublishTimeFilter: videoIndexes.length
    };

    let result = videoIndexes;

    // 1. 创作者过滤（优先级最高）
    if (condition.creatorIds && condition.creatorIds.length > 0) {
      result = this.filterByCreatorIds(result, condition.creatorIds);
      stats.afterCreatorFilter = result.length;
    }

    // 1.1 创作者名称过滤（需要通过创作者索引查询）
    if (condition.creatorName) {
      const matchedCreatorIds = this.getCreatorIdsByName(creatorIndexes, condition.creatorName);
      if (condition.onlyFollowingCreators) {
        // 如果需要只查询已关注的创作者
        const followingCreatorIds = this.getFollowingCreatorIds(creatorIndexes);
        result = this.filterByCreatorIds(
          result,
          matchedCreatorIds.filter(id => followingCreatorIds.includes(id))
        );
      } else {
        result = this.filterByCreatorIds(result, matchedCreatorIds);
      }
      stats.afterCreatorFilter = result.length;
    } else if (condition.onlyFollowingCreators) {
      // 只查询已关注的创作者的视频
      const followingCreatorIds = this.getFollowingCreatorIds(creatorIndexes);
      result = this.filterByCreatorIds(result, followingCreatorIds);
      stats.afterCreatorFilter = result.length;
    }

    // 2. 标签过滤（优先级次之）
    if (condition.tagExpressions && condition.tagExpressions.length > 0) {
      result = this.filterByTags(result, condition.tagExpressions, cacheKey);
      stats.afterTagFilter = result.length;
    }

    // 3. 时长过滤
    if (condition.durationRange) {
      result = this.filterByDuration(result, condition.durationRange);
      stats.afterDurationFilter = result.length;
    }

    // 4. 发布时间过滤
    if (condition.publishTimeRange) {
      result = this.filterByPublishTime(result, condition.publishTimeRange);
      stats.afterPublishTimeFilter = result.length;
    }

    // 5. 标题过滤（优先级最低）
    if (condition.keyword) {
      result = this.filterByTitle(result, condition.keyword);
      stats.afterTitleFilter = result.length;
    }

    return {
      indexes: result,
      total: result.length,
      stats
    };
  }

  /**
   * 执行复合查询并返回ID列表
   * @param videoIndexes 视频索引列表
   * @param creatorIndexes 创作者索引列表
   * @param condition 查询条件
   * @param cacheKey 缓存键
   * @returns 匹配的视频ID列表
   */
  queryIds(
    videoIndexes: VideoIndex[],
    creatorIndexes: CreatorIndex[],
    condition: VideoQueryCondition,
    cacheKey?: string
  ): string[] {
    const result = this.query(videoIndexes, creatorIndexes, condition, cacheKey);
    return result.indexes.map(index => index.videoId);
  }

  /**
   * 标题过滤
   * @param indexes 视频索引列表
   * @param keyword 关键词
   * @returns 过滤后的VideoIndex列表
   */
  private filterByTitle(
    indexes: VideoIndex[],
    keyword: string
  ): VideoIndex[] {
    if (!keyword || !keyword.trim()) {
      return indexes;
    }

    const lowerKeyword = keyword.toLowerCase().trim();
    return indexes.filter(index =>
      index.title.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * 创作者ID过滤
   * @param indexes 视频索引列表
   * @param creatorIds 创作者ID列表
   * @returns 过滤后的VideoIndex列表
   */
  private filterByCreatorIds(
    indexes: VideoIndex[],
    creatorIds: string[]
  ): VideoIndex[] {
    const creatorIdSet = new Set(creatorIds);
    return indexes.filter(index => creatorIdSet.has(index.creatorId));
  }

  /**
   * 标签过滤
   * @param indexes 视频索引列表
   * @param expressions 标签表达式列表
   * @param cacheKey 缓存键
   * @returns 过滤后的VideoIndex列表
   */
  private filterByTags(
    indexes: VideoIndex[],
    expressions: TagExpression[],
    cacheKey?: string
  ): VideoIndex[] {
    // 如果提供了缓存键，尝试从缓存获取
    if (cacheKey) {
      const cachedResult = this.tagCache.filter(cacheKey, expressions);
      if (cachedResult.matchedIds.size > 0) {
        const matchedIds = Array.from(cachedResult.matchedIds);
        return indexes.filter(index => matchedIds.includes(index.videoId));
      }
    }

    // 构建标签到ID集合的映射
    const tagToIds = new Map<string, Set<string>>();
    indexes.forEach(index => {
      index.tags.forEach(tagId => {
        if (!tagToIds.has(tagId)) {
          tagToIds.set(tagId, new Set());
        }
        tagToIds.get(tagId)!.add(index.videoId);
      });
    });

    // 如果提供了缓存键，将构建的映射存入缓存
    if (cacheKey) {
      this.tagCache.set(cacheKey, tagToIds);
    }

    // 使用TagFilterEngine执行过滤
    const filterResult = this.tagFilterEngine.filter(tagToIds, expressions);
    const matchedIds = Array.from(filterResult.matchedIds);

    // 返回匹配的VideoIndex
    return indexes.filter(index => matchedIds.includes(index.videoId));
  }

  /**
   * 时长过滤
   * @param indexes 视频索引列表
   * @param range 时长范围
   * @returns 过滤后的VideoIndex列表
   */
  private filterByDuration(
    indexes: VideoIndex[],
    range: DurationRange
  ): VideoIndex[] {
    return indexes.filter(index => {
      if (range.min !== undefined && index.duration < range.min) {
        return false;
      }
      if (range.max !== undefined && index.duration > range.max) {
        return false;
      }
      return true;
    });
  }

  /**
   * 发布时间过滤
   * @param indexes 视频索引列表
   * @param range 发布时间范围
   * @returns 过滤后的VideoIndex列表
   */
  private filterByPublishTime(
    indexes: VideoIndex[],
    range: { min?: number; max?: number }
  ): VideoIndex[] {
    return indexes.filter(index => {
      if (range.min !== undefined && index.publishTime < range.min) {
        return false;
      }
      if (range.max !== undefined && index.publishTime > range.max) {
        return false;
      }
      return true;
    });
  }

  /**
   * 根据创作者名称获取创作者ID列表
   * @param creatorIndexes 创作者索引列表
   * @param name 创作者名称
   * @returns 创作者ID列表
   */
  private getCreatorIdsByName(
    creatorIndexes: CreatorIndex[],
    name: string
  ): string[] {
    if (!name || !name.trim()) {
      return [];
    }

    const lowerName = name.toLowerCase().trim();
    return creatorIndexes
      .filter(index => index.name.toLowerCase().includes(lowerName))
      .map(index => index.creatorId);
  }

  /**
   * 获取已关注的创作者ID列表
   * @param creatorIndexes 创作者索引列表
   * @returns 已关注的创作者ID列表
   */
  private getFollowingCreatorIds(
    creatorIndexes: CreatorIndex[]
  ): string[] {
    return creatorIndexes
      .filter(index => index.isFollowing)
      .map(index => index.creatorId);
  }
}
