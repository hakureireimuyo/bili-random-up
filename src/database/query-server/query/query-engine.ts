/**
 * 查询引擎模块
 * 实现高性能的索引查询逻辑（纯函数）
 */

import type { CreatorIndex, TagExpression } from './types.js';
import { TagFilterEngine } from './tag-filter-engine.js';
import { ID } from '../../types/base.js';

/**
 * 根据名称关键词过滤索引（纯函数）
 */
export function filterByName(indexes: CreatorIndex[], keyword: string): CreatorIndex[] {
  if (!keyword || !keyword.trim()) {
    return indexes;
  }

  const lowerKeyword = keyword.toLowerCase().trim();
  return indexes.filter(index =>
    index.name.toLowerCase().includes(lowerKeyword)
  );
}

/**
 * 根据关注状态过滤索引（纯函数）
 */
export function filterByFollowing(indexes: CreatorIndex[], isFollowing: 0 | 1): CreatorIndex[] {
  const following = isFollowing === 1;
  return indexes.filter(index => index.isFollowing === following);
}

/**
 * 根据标签表达式过滤索引（纯函数）
 */
export function filterByTags(
  indexes: CreatorIndex[],
  expressions: TagExpression[]
): ID[] {
  if (expressions.length === 0) {
    return indexes.map(index => index.creatorId);
  }

  // 构建标签到ID集合的映射
  const tagToIds = new Map<ID, Set<ID>>();
  indexes.forEach(index => {
    index.tags.forEach(tagId => {
      if (!tagToIds.has(tagId)) {
        tagToIds.set(tagId, new Set());
      }
      tagToIds.get(tagId)!.add(index.creatorId);
    });
  });

  // 使用TagFilterEngine执行过滤
  const result = TagFilterEngine.filter(tagToIds, expressions);
  return Array.from(result.matchedIds);
}

/**
 * 组合查询：同时使用关键词和标签表达式（纯函数）
 */
export function filterCombined(
  indexes: CreatorIndex[],
  keyword?: string,
  expressions?: TagExpression[],
  isFollowing?: 0 | 1
): ID[] {
  let result = indexes;

  // 1. 关注状态过滤（优先级最高）
  if (isFollowing !== undefined) {
    result = filterByFollowing(result, isFollowing);
  }

  // 2. 标签过滤（优先级次之）
  if (expressions && expressions.length > 0) {
    // 构建标签到ID集合的映射
    const tagToIds = new Map<ID, Set<ID>>();
    result.forEach(index => {
      index.tags.forEach(tagId => {
        if (!tagToIds.has(tagId)) {
          tagToIds.set(tagId, new Set());
        }
        tagToIds.get(tagId)!.add(index.creatorId);
      });
    });

    // 使用TagFilterEngine执行过滤
    const filterResult = TagFilterEngine.filter(tagToIds, expressions);

    // 转换回CreatorIndex数组
    const filteredIds = Array.from(filterResult.matchedIds);
    result = result.filter(index => filteredIds.includes(index.creatorId));
  }

  // 3. 名称过滤（优先级最低）
  if (keyword) {
    result = filterByName(result, keyword);
  }

  return result.map(index => index.creatorId);
}
