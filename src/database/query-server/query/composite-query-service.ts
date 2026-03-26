/**
 * 复合查询服务
 * 实现基于名字匹配、标签过滤和isFollowing字段的组合查询
 */

import type { CreatorIndex, TagExpression } from './types.js';
import { TagFilterEngine } from './tag-filter-engine.js';
import { CacheManager } from '../cache/cache-manager.js';
import { type TagCacheEntry } from '../cache/base-cache.js';
import { Platform } from '../../types/base.js';

/**
 * 复合查询条件
 */
export interface CompositeQueryCondition {
  /** 平台 */
  platform: Platform;
  /** 名字关键词（可选） */
  keyword?: string;
  /** 标签表达式列表（可选） */
  tagExpressions?: TagExpression[];
  /** 是否已关注（可选，0或1） */
  isFollowing?: 0 | 1;
}

/**
 * 复合查询结果
 */
export interface CompositeQueryResult {
  /** 匹配的CreatorIndex列表 */
  indexes: CreatorIndex[];
  /** 总数 */
  total: number;
  /** 查询统计 */
  stats: {
    /** 初始总数 */
    initialCount: number;
    /** 关注状态过滤后数量 */
    afterFollowingFilter: number;
    /** 标签过滤后数量 */
    afterTagFilter: number;
    /** 名字过滤后数量 */
    afterNameFilter: number;
  };
}

/**
 * 复合查询服务类
 */
export class CompositeQueryService {
  private tagFilterEngine: TagFilterEngine;
  private cacheManager: CacheManager;

  constructor() {
    this.tagFilterEngine = new TagFilterEngine();
    this.cacheManager = CacheManager.getInstance();
  }

  /**
   * 执行复合查询
   * 优先级：关注状态 > 标签过滤 > 名字过滤
   * @param indexes 创作者索引列表
   * @param condition 查询条件
   * @param cacheKey 缓存键（如 "creator:bilibili"）
   * @returns 查询结果
   */
  query(
    indexes: CreatorIndex[],
    condition: CompositeQueryCondition,
    cacheKey?: string
  ): CompositeQueryResult {
    const stats = {
      initialCount: indexes.length,
      afterFollowingFilter: indexes.length,
      afterTagFilter: indexes.length,
      afterNameFilter: indexes.length
    };

    let result = indexes;

    // 1. 关注状态过滤（优先级最高）
    if (condition.isFollowing !== undefined) {
      result = this.filterByFollowing(result, condition.isFollowing);
      stats.afterFollowingFilter = result.length;
    }

    // 2. 标签过滤（优先级次之）
    if (condition.tagExpressions && condition.tagExpressions.length > 0) {
      result = this.filterByTags(result, condition.tagExpressions, cacheKey);
      stats.afterTagFilter = result.length;
    }

    // 3. 名字过滤（优先级最低）
    if (condition.keyword) {
      result = this.filterByName(result, condition.keyword);
      stats.afterNameFilter = result.length;
    }

    return {
      indexes: result,
      total: result.length,
      stats
    };
  }

  /**
   * 执行复合查询并返回ID列表
   * @param indexes 创作者索引列表
   * @param condition 查询条件
   * @param cacheKey 缓存键（如 "creator:bilibili"）
   * @returns 匹配的Creator ID列表
   */
  queryIds(
    indexes: CreatorIndex[],
    condition: CompositeQueryCondition,
    cacheKey?: string
  ): string[] {
    const result = this.query(indexes, condition, cacheKey);
    return result.indexes.map(index => index.creatorId);
  }

  /**
   * 名字过滤
   * @param indexes 创作者索引列表
   * @param keyword 关键词（可选）
   * @returns 过滤后的CreatorIndex列表
   */
  private filterByName(
    indexes: CreatorIndex[],
    keyword?: string
  ): CreatorIndex[] {
    // 如果没有关键词，返回所有索引
    if (!keyword || !keyword.trim()) {
      return indexes;
    }

    const lowerKeyword = keyword.toLowerCase().trim();
    return indexes.filter(index =>
      index.name.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * 标签过滤
   * @param indexes 创作者索引列表
   * @param expressions 标签表达式列表
   * @param cacheKey 缓存键（如 "creator:bilibili"）
   * @returns 过滤后的CreatorIndex列表
   */
  private filterByTags(
    indexes: CreatorIndex[],
    expressions: TagExpression[],
    cacheKey?: string
  ): CreatorIndex[] {
    const tagCache = this.cacheManager.getTagCache();

    // 如果提供了缓存键，尝试从缓存获取
    if (cacheKey) {
      const cachedEntry = tagCache.get(cacheKey);
      if (cachedEntry) {
        const cachedResult = this.tagFilterEngine.filter(cachedEntry.tagToIds, expressions);
        if (cachedResult.matchedIds.size > 0) {
          const matchedIds = Array.from(cachedResult.matchedIds);
          return indexes.filter(index => matchedIds.includes(index.creatorId));
        }
      }
    }

    // 构建标签到ID集合的映射
    const tagToIds = new Map<string, Set<string>>();
    indexes.forEach(index => {
      index.tags.forEach(tagId => {
        if (!tagToIds.has(tagId)) {
          tagToIds.set(tagId, new Set());
        }
        tagToIds.get(tagId)!.add(index.creatorId);
      });
    });

    // 如果提供了缓存键，将构建的映射存入缓存
    if (cacheKey) {
      // 计算总数量
      const allIds = new Set<string>();
      for (const ids of tagToIds.values()) {
        for (const id of ids) {
          allIds.add(id);
        }
      }

      tagCache.set(cacheKey, {
        tagToIds,
        lastUpdate: Date.now(),
        totalCount: allIds.size
      });
    }

    // 使用TagFilterEngine执行过滤
    const filterResult = this.tagFilterEngine.filter(tagToIds, expressions);
    const matchedIds = Array.from(filterResult.matchedIds);

    // 返回匹配的CreatorIndex
    return indexes.filter(index => matchedIds.includes(index.creatorId));
  }

  /**
   * 关注状态过滤
   * @param indexes 创作者索引列表
   * @param isFollowing 关注状态（0或1）
   * @returns 过滤后的CreatorIndex列表
   */
  private filterByFollowing(
    indexes: CreatorIndex[],
    isFollowing: 0 | 1
  ): CreatorIndex[] {
    const following = isFollowing === 1;
    return indexes.filter(index => index.isFollowing === following);
  }
}
