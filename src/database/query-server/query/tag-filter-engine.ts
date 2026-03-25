/**
 * 标签过滤引擎
 * 实现基于AND、OR、NOT操作的标签逻辑过滤
 * 可被所有数据类型（Creator、Video等）复用
 */

/**
 * 标签表达式
 */
export interface TagExpression {
  /** 标签ID或标签ID列表（用于OR操作） */
  tagId: string | string[];
  /** 操作符 */
  operator: 'AND' | 'OR' | 'NOT';
}

/**
 * 标签过滤结果
 */
export interface TagFilterResult {
  /** 匹配的ID集合 */
  matchedIds: Set<string>;
  /** 执行的步骤数 */
  steps: number;
  /** 每步的ID数量统计 */
  stepStats: number[];
}

/**
 * 标签过滤引擎类
 */
export class TagFilterEngine {
  /**
   * 执行标签过滤
   * @param indexMap 标签到ID集合的映射
   * @param expressions 标签表达式列表
   * @param allIds 所有候选ID集合（可选，如果不提供则从indexMap推断）
   * @returns 过滤结果
   */
  filter(
    indexMap: Map<string, Set<string>>,
    expressions: TagExpression[],
    allIds?: Set<string>
  ): TagFilterResult {
    if (expressions.length === 0) {
      // 没有表达式，返回所有ID
      const ids = allIds || this.getAllIdsFromMap(indexMap);
      return {
        matchedIds: new Set(ids),
        steps: 0,
        stepStats: []
      };
    }

    // 初始化结果集
    let currentIds: Set<string> = allIds || this.getAllIdsFromMap(indexMap);
    const stepStats: number[] = [currentIds.size];

    // 依次执行每个表达式
    for (let i = 0; i < expressions.length; i++) {
      const expr = expressions[i];
      currentIds = this.executeExpression(currentIds, indexMap, expr);
      stepStats.push(currentIds.size);
    }

    return {
      matchedIds: currentIds,
      steps: expressions.length,
      stepStats
    };
  }

  /**
   * 执行单个表达式
   */
  private executeExpression(
    currentIds: Set<string>,
    indexMap: Map<string, Set<string>>,
    expression: TagExpression
  ): Set<string> {
    switch (expression.operator) {
      case 'AND':
        return this.executeAnd(currentIds, indexMap, expression.tagId as string);

      case 'OR':
        return this.executeOr(currentIds, indexMap, expression.tagId as string[]);

      case 'NOT':
        return this.executeNot(currentIds, indexMap, expression.tagId as string);

      default:
        throw new Error(`Unknown operator: ${expression.operator}`);
    }
  }

  /**
   * 执行AND操作
   * 结果 = 当前结果 ∩ 指定标签的ID集合
   */
  private executeAnd(
    currentIds: Set<string>,
    indexMap: Map<string, Set<string>>,
    tagId: string
  ): Set<string> {
    const tagIds = indexMap.get(tagId);
    if (!tagIds) {
      // 标签不存在，返回空集
      return new Set();
    }

    // 计算交集
    const result = new Set<string>();
    for (const id of currentIds) {
      if (tagIds.has(id)) {
        result.add(id);
      }
    }
    return result;
  }

  /**
   * 执行OR操作
   * 结果 = 当前结果 ∪ (指定标签列表中任一标签的ID集合)
   */
  private executeOr(
    currentIds: Set<string>,
    indexMap: Map<string, Set<string>>,
    tagIds: string[]
  ): Set<string> {
    // 收集所有指定标签的ID集合
    const unionIds = new Set<string>();
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
   * 执行NOT操作
   * 结果 = 当前结果 - 指定标签的ID集合
   */
  private executeNot(
    currentIds: Set<string>,
    indexMap: Map<string, Set<string>>,
    tagId: string
  ): Set<string> {
    const tagIds = indexMap.get(tagId);
    if (!tagIds) {
      // 标签不存在，返回原结果
      return new Set(currentIds);
    }

    // 计算差集
    const result = new Set<string>();
    for (const id of currentIds) {
      if (!tagIds.has(id)) {
        result.add(id);
      }
    }
    return result;
  }

  /**
   * 从标签映射中获取所有ID
   */
  private getAllIdsFromMap(indexMap: Map<string, Set<string>>): Set<string> {
    const allIds = new Set<string>();
    for (const ids of indexMap.values()) {
      for (const id of ids) {
        allIds.add(id);
      }
    }
    return allIds;
  }

  /**
   * 构建标签到ID的映射
   * 从索引列表构建标签映射
   */
  static buildTagIndexMap<T extends { id: string; tags: string[] }>(
    items: T[]
  ): Map<string, Set<string>> {
    const tagMap = new Map<string, Set<string>>();

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

  /**
   * 解析标签表达式字符串
   * 支持格式: "AND tag1 AND tag2 OR [tag3,tag4] NOT tag5"
   */
  static parseExpressionString(exprStr: string): TagExpression[] {
    const expressions: TagExpression[] = [];

    // 按操作符分割
    const parts = exprStr.split(/\s+(AND|OR|NOT)\s+/i);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;

      // 检查是否是操作符
      const operatorMatch = part.match(/^(AND|OR|NOT)$/i);
      if (operatorMatch) {
        const operator = operatorMatch[1].toUpperCase() as 'AND' | 'OR' | 'NOT';

        // 获取下一个部分作为标签
        if (i + 1 < parts.length) {
          const tagPart = parts[i + 1].trim();
          const tagIds = this.parseTagIds(tagPart);

          if (operator === 'OR' && Array.isArray(tagIds)) {
            expressions.push({ operator, tagId: tagIds });
          } else {
            expressions.push({ operator, tagId: tagIds as string });
          }
          i++; // 跳过已处理的标签部分
        }
      }
    }

    return expressions;
  }

  /**
   * 解析标签ID
   * 支持单个标签: "tag1"
   * 支持标签列表: "[tag1,tag2,tag3]"
   */
  private static parseTagIds(tagStr: string): string | string[] {
    tagStr = tagStr.trim();

    // 检查是否是列表格式
    if (tagStr.startsWith('[') && tagStr.endsWith(']')) {
      const inner = tagStr.slice(1, -1);
      return inner.split(',').map(t => t.trim()).filter(t => t);
    }

    return tagStr;
  }
}
