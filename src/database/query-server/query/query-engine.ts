/**
 * 查询引擎模块
 * 实现高性能的索引查询逻辑
 */

import type { CreatorIndex, IndexQuery, TagExpression } from './types.js';
import { TagFilterEngine } from './tag-filter-engine.js';

/**
 * 查询引擎类
 */
export class QueryEngine {
  /**
   * 根据查询条件过滤索引
   */
  static query(indexes: CreatorIndex[], query: IndexQuery): CreatorIndex[] {
    let result = indexes;

    // 关键词过滤
    if (query.keyword && query.keyword.trim()) {
      const keyword = query.keyword.toLowerCase().trim();
      result = result.filter(index =>
        index.name.toLowerCase().includes(keyword)
      );
    }

    // 关注状态过滤
    if (query.isFollowing !== undefined) {
      result = result.filter(index => index.isFollowing === query.isFollowing);
    }

    return result;
  }

  /**
   * 根据标签表达式过滤索引
   */
  static queryByTagExpressions(
    indexes: CreatorIndex[],
    expressions: TagExpression[]
  ): string[] {
    if (expressions.length === 0) {
      return indexes.map(index => index.creatorId);
    }

    // 使用TagFilterEngine执行标签过滤
    const tagFilterEngine = new TagFilterEngine();

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

    // 执行过滤
    const result = tagFilterEngine.filter(tagToIds, expressions);
    return Array.from(result.matchedIds);
  }

  /**
   * 组合查询：同时使用关键词和标签表达式
   */
  static queryCombined(
    indexes: CreatorIndex[],
    query: IndexQuery,
    expressions: TagExpression[]
  ): string[] {
    // 先用关键词和关注状态过滤
    let result = this.query(indexes, query);

    // 如果有标签表达式，再进行标签过滤
    if (expressions.length > 0) {
      // 构建标签到ID集合的映射
      const tagToIds = new Map<string, Set<string>>();
      result.forEach(index => {
        index.tags.forEach(tagId => {
          if (!tagToIds.has(tagId)) {
            tagToIds.set(tagId, new Set());
          }
          tagToIds.get(tagId)!.add(index.creatorId);
        });
      });

      // 使用TagFilterEngine执行过滤
      const tagFilterEngine = new TagFilterEngine();
      const filterResult = tagFilterEngine.filter(tagToIds, expressions);

      // 转换回CreatorIndex数组
      const filteredIds = Array.from(filterResult.matchedIds);
      result = result.filter(index => filteredIds.includes(index.creatorId));
    }

    return result.map(index => index.creatorId);
  }
}
