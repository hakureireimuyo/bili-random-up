/**
 * CreatorQueryEngine - 创作者查询引擎
 * 纯计算工具,不包含任何状态管理逻辑
 * 职责: 负责对给定的数据进行过滤、排序等计算
 */

import type { CreatorIndex } from '../../cache/index-cache/creator-index-cache.js';

/**
 * 创作者查询条件
 */
export interface CreatorIndexQuery {
  /** 是否关注 */
  isFollowing?: boolean;
  /** 关键词搜索 */
  keyword?: string;
}

/**
 * 标签逻辑表达式
 */
export interface TagExpression {
  operator: 'and' | 'or' | 'not';
  tagIds: string[];
}

/**
 * 创作者查询引擎
 * 提供纯函数式的查询能力
 */
export class CreatorQueryEngine {
  /**
   * 查询创作者索引
   * @param data 创作者索引数据
   * @param condition 查询条件
   * @returns 过滤后的创作者索引列表
   */
  static query(data: CreatorIndex[], condition: CreatorIndexQuery): CreatorIndex[] {
    let result = data;

    // 应用过滤条件
    result = this.filter(result, condition);

    return result;
  }

  /**
   * 根据标签逻辑表达式查询创作者ID
   * @param data 创作者索引数据
   * @param expressions 标签逻辑表达式数组（从左到右依次执行）
   * @returns 符合条件的创作者ID列表
   */
  static queryByTagExpressions(data: CreatorIndex[], expressions: TagExpression[]): string[] {
    if (expressions.length === 0) {
      return data.map(index => index.creatorId);
    }

    // 初始结果为所有创作者ID
    let result = data.map(index => index.creatorId);

    // 从左到右依次执行每个表达式
    for (const expr of expressions) {
      switch (expr.operator) {
        case 'and':
          // 与运算：必须包含所有指定标签
          result = this.applyAndOperator(result, data, expr.tagIds);
          break;
        case 'or':
          // 或运算：至少包含其中一个标签
          result = this.applyOrOperator(result, data, expr.tagIds);
          break;
        case 'not':
          // 非运算：不包含指定标签
          result = this.applyNotOperator(result, data, expr.tagIds);
          break;
      }
    }

    return result;
  }

  /**
   * 过滤创作者索引
   * @param data 创作者索引数据
   * @param condition 查询条件
   * @returns 过滤后的创作者索引列表
   */
  private static filter(data: CreatorIndex[], condition: CreatorIndexQuery): CreatorIndex[] {
    let result = data;

    // 关注状态过滤
    if (condition.isFollowing !== undefined) {
      result = result.filter(index => index.isFollowing === condition.isFollowing);
    }

    // 关键词搜索
    if (condition.keyword) {
      const keyword = condition.keyword.toLowerCase();
      result = result.filter(index =>
        index.name.toLowerCase().includes(keyword)
      );
    }

    return result;
  }

  /**
   * 应用与运算符
   * @param currentIds 当前创作者ID列表
   * @param data 创作者索引数据
   * @param tagIds 标签ID列表
   * @returns 同时包含所有指定标签的创作者ID列表
   */
  private static applyAndOperator(
    currentIds: string[],
    data: CreatorIndex[],
    tagIds: string[]
  ): string[] {
    if (tagIds.length === 0) {
      return currentIds;
    }

    // 创建标签到创作者的映射
    const tagToCreators = new Map<string, Set<string>>();
    data.forEach(index => {
      index.tags.forEach(tagId => {
        if (!tagToCreators.has(tagId)) {
          tagToCreators.set(tagId, new Set());
        }
        tagToCreators.get(tagId)!.add(index.creatorId);
      });
    });

    // 获取第一个标签的创作者ID
    const firstTagCreators = tagToCreators.get(tagIds[0]) || new Set();

    // 如果只有一个标签，返回交集
    if (tagIds.length === 1) {
      return currentIds.filter(id => firstTagCreators.has(id));
    }

    // 多个标签，取所有标签的交集
    const allTagCreators = tagIds.reduce((acc, tagId) => {
      const creators = tagToCreators.get(tagId) || new Set();
      return new Set([...acc].filter(id => creators.has(id)));
    }, firstTagCreators);

    // 返回与当前结果的交集
    return currentIds.filter(id => allTagCreators.has(id));
  }

  /**
   * 应用或运算符
   * @param currentIds 当前创作者ID列表
   * @param data 创作者索引数据
   * @param tagIds 标签ID列表
   * @returns 至少包含其中一个标签的创作者ID列表
   */
  private static applyOrOperator(
    currentIds: string[],
    data: CreatorIndex[],
    tagIds: string[]
  ): string[] {
    if (tagIds.length === 0) {
      return currentIds;
    }

    // 收集所有标签对应的创作者ID
    const allTagCreators = new Set<string>();
    data.forEach(index => {
      if (index.tags.some(tagId => tagIds.includes(tagId))) {
        allTagCreators.add(index.creatorId);
      }
    });

    // 返回当前结果中至少包含一个标签的创作者
    return currentIds.filter(id => allTagCreators.has(id));
  }

  /**
   * 应用非运算符
   * @param currentIds 当前创作者ID列表
   * @param data 创作者索引数据
   * @param tagIds 标签ID列表
   * @returns 不包含任何指定标签的创作者ID列表
   */
  private static applyNotOperator(
    currentIds: string[],
    data: CreatorIndex[],
    tagIds: string[]
  ): string[] {
    if (tagIds.length === 0) {
      return currentIds;
    }

    // 收集所有标签对应的创作者ID
    const excludedIds = new Set<string>();
    data.forEach(index => {
      if (index.tags.some(tagId => tagIds.includes(tagId))) {
        excludedIds.add(index.creatorId);
      }
    });

    // 返回当前结果中不包含任何排除标签的创作者
    return currentIds.filter(id => !excludedIds.has(id));
  }
}
