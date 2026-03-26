/**
 * 标签过滤引擎
 * 实现基于AND、OR、NOT操作的标签逻辑过滤
 * 可被所有数据类型（Creator、Video等）复用
 */

import type { TagExpression } from '../cache/types.js';
import type { ID } from '../../types/base.js';

/**
 * 标签过滤结果
 */
export interface TagFilterResult {
  /** 匹配的ID集合 */
  matchedIds: Set<ID>;
  /** 执行的步骤数 */
  steps: number;
  /** 每步的ID数量统计 */
  stepStats: number[];
}

/**
 * 标签过滤引擎类 - 纯函数实现
 */
export class TagFilterEngine {
  /**
   * 执行标签过滤（纯函数）
   * @param indexMap 标签到ID集合的映射
   * @param expressions 标签表达式列表
   * @param allIds 所有候选ID集合（可选，如果不提供则从indexMap推断）
   * @returns 过滤结果
   */
  static filter(
    indexMap: Map<ID, Set<ID>>,
    expressions: TagExpression[],
    allIds?: Set<ID>
  ): TagFilterResult {
    if (expressions.length === 0) {
      // 没有表达式，返回所有ID
      const ids = allIds || getAllIdsFromMap(indexMap);
      return {
        matchedIds: new Set(ids),
        steps: 0,
        stepStats: []
      };
    }

    // 初始化结果集
    let currentIds: Set<ID> = allIds || getAllIdsFromMap(indexMap);
    const stepStats: number[] = [currentIds.size];

    // 依次执行每个表达式
    for (let i = 0; i < expressions.length; i++) {
      const expr = expressions[i];
      currentIds = executeExpression(currentIds, indexMap, expr);
      stepStats.push(currentIds.size);

      // 提前终止：如果结果为空，不再继续
      if (currentIds.size === 0) {
        break;
      }
    }

    return {
      matchedIds: currentIds,
      steps: expressions.length,
      stepStats
    };
  }

  /**
   * 构建标签到ID的映射（纯函数）
   * 从索引列表构建标签映射
   */
  static buildTagIndexMap<T extends { id: ID; tags: ID[] }>(
    items: T[]
  ): Map<ID, Set<ID>> {
    const tagMap = new Map<ID, Set<ID>>();

    for (const item of items) {
      for (const tagId of item.tags) {
        if (!tagMap.has(tagId)) {
          tagMap.set(tagId, new Set());
        }
        tagMap.get(tagId)!.add(item.id);
      }
    }

    return tagMap;
  }

}

/**
 * 执行单个表达式（纯函数）
 */
function executeExpression(
  currentIds: Set<ID>,
  indexMap: Map<ID, Set<ID>>,
  expression: TagExpression
): Set<ID> {
  switch (expression.operator) {
    case 'AND':
      return executeAnd(currentIds, indexMap, expression.tagId as ID);

    case 'OR':
      return executeOr(currentIds, indexMap, expression.tagId as ID[]);

    case 'NOT':
      return executeNot(currentIds, indexMap, expression.tagId as ID);

    default:
      throw new Error(`Unknown operator: ${expression.operator}`);
  }
}

/**
 * 执行AND操作（纯函数）
 * 结果 = 当前结果 ∩ 指定标签的ID集合
 */
function executeAnd(
  currentIds: Set<ID>,
  indexMap: Map<ID, Set<ID>>,
  tagId: ID
): Set<ID> {
  const tagIds = indexMap.get(tagId);
  if (!tagIds) {
    // 标签不存在，返回空集
    return new Set();
  }

  // 计算交集
  const result = new Set<ID>();
  for (const id of currentIds) {
    if (tagIds.has(id)) {
      result.add(id);
    }
  }
  return result;
}

/**
 * 执行OR操作（纯函数）
 * 结果 = 当前结果 ∪ (指定标签列表中任一标签的ID集合)
 */
function executeOr(
  currentIds: Set<ID>,
  indexMap: Map<ID, Set<ID>>,
  tagIds: ID[]
): Set<ID> {
  // 收集所有指定标签的ID集合
  const unionIds = new Set<ID>();
  for (const tagId of tagIds) {
    const ids = indexMap.get(tagId);
    if (ids) {
      for (const id of ids) {
        unionIds.add(id);
      }
    }
  }

  // 计算并集
  const result = new Set(currentIds);
  for (const id of unionIds) {
    result.add(id);
  }
  return result;
}

/**
 * 执行NOT操作（纯函数）
 * 结果 = 当前结果 - 指定标签的ID集合
 */
function executeNot(
  currentIds: Set<ID>,
  indexMap: Map<ID, Set<ID>>,
  tagId: ID
): Set<ID> {
  const tagIds = indexMap.get(tagId);
  if (!tagIds) {
    // 标签不存在，返回原结果
    return new Set(currentIds);
  }

  // 计算差集
  const result = new Set<ID>();
  for (const id of currentIds) {
    if (!tagIds.has(id)) {
      result.add(id);
    }
  }
  return result;
}

/**
 * 从标签映射中获取所有ID（纯函数）
 */
function getAllIdsFromMap(indexMap: Map<ID, Set<ID>>): Set<ID> {
  const allIds = new Set<ID>();
  for (const ids of indexMap.values()) {
    for (const id of ids) {
      allIds.add(id);
    }
  }
  return allIds;
}

