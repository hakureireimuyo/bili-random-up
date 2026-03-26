/**
 * 复合查询服务 - 调度层
 * 协调查询流程，调用纯函数执行查询
 */

import type { CreatorIndex, TagExpression, QueryOutput, QueryStats } from './types.js';
import { filterByName, filterByFollowing } from './query-engine.js';
import { TagFilterEngine } from './tag-filter-engine.js';
import { Platform } from '../../types/base.js';
import { ID } from '../../types/base.js';

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
  stats: QueryStats;
}

/**
 * 复合查询服务类 - 调度层
 */
export class CompositeQueryService {
  /**
   * 执行复合查询
   * 优先级：关注状态 > 标签过滤 > 名字过滤
   * @param indexes 创作者索引列表
   * @param condition 查询条件
   * @returns 查询结果
   */
  query(
    indexes: CreatorIndex[],
    condition: CompositeQueryCondition
  ): CompositeQueryResult {
    const stats: QueryStats = {
      initialCount: indexes.length,
      stageCounts: {
        afterFollowingFilter: indexes.length,
        afterTagFilter: indexes.length,
        afterNameFilter: indexes.length
      }
    };

    let result = indexes;

    // 1. 关注状态过滤（优先级最高）
    if (condition.isFollowing !== undefined) {
      result = filterByFollowing(result, condition.isFollowing);
      stats.stageCounts.afterFollowingFilter = result.length;
    }

    // 2. 标签过滤（优先级次之）
    if (condition.tagExpressions && condition.tagExpressions.length > 0) {
      result = this.filterByTags(result, condition.tagExpressions);
      stats.stageCounts.afterTagFilter = result.length;
    }

    // 3. 名字过滤（优先级最低）
    if (condition.keyword) {
      result = filterByName(result, condition.keyword);
      stats.stageCounts.afterNameFilter = result.length;
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
   * @returns 匹配的Creator ID列表
   */
  queryIds(
    indexes: CreatorIndex[],
    condition: CompositeQueryCondition
  ): ID[] {
    const result = this.query(indexes, condition);
    return result.indexes.map(index => index.creatorId);
  }

  /**
   * 标签过滤 - 调度层
   * @param indexes 创作者索引列表
   * @param expressions 标签表达式列表
   * @returns 过滤后的CreatorIndex列表
   */
  private filterByTags(
    indexes: CreatorIndex[],
    expressions: TagExpression[]
  ): CreatorIndex[] {
    // 构建标签到ID集合的映射
    const tagToIds = TagFilterEngine.buildTagIndexMap(
      indexes.map(index => ({ id: index.creatorId, tags: index.tags }))
    );

    // 使用TagFilterEngine执行过滤
    const filterResult = TagFilterEngine.filter(tagToIds, expressions);
    const matchedIds = Array.from(filterResult.matchedIds);

    // 返回匹配的CreatorIndex
    return indexes.filter(index => matchedIds.includes(index.creatorId));
  }
}
