
/**
 * TagQueryEngine - 标签查询引擎
 * 纯计算工具,不包含任何状态管理逻辑
 * 职责: 负责对给定的数据进行过滤、排序等计算
 */

import type { Tag } from '../../types/semantic.js';
import type { TagSource } from '../../types/base.js';

/**
 * 标签查询条件
 */
export interface TagQueryCondition {
  /** 标签来源 */
  source?: TagSource;
  /** 关键词搜索 */
  keyword?: string;
  /** 排序字段 */
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 标签查询引擎
 * 提供纯函数式的查询能力
 */
export class TagQueryEngine {
  /**
   * 查询标签
   * @param data 标签数据
   * @param condition 查询条件
   * @returns 过滤和排序后的标签列表
   */
  static query(data: Tag[], condition: TagQueryCondition): Tag[] {
    let result = data;

    // 1. 应用过滤条件
    result = this.filter(result, condition);

    // 2. 应用排序
    result = this.sort(result, condition);

    return result;
  }

  /**
   * 过滤标签
   * @param data 标签数据
   * @param condition 查询条件
   * @returns 过滤后的标签列表
   */
  private static filter(data: Tag[], condition: TagQueryCondition): Tag[] {
    let result = data;

    // 来源过滤
    if (condition.source) {
      result = result.filter(tag => tag.source === condition.source);
    }

    // 关键词搜索
    if (condition.keyword) {
      const keyword = condition.keyword.toLowerCase();
      result = result.filter(tag =>
        tag.name.toLowerCase().includes(keyword)
      );
    }

    return result;
  }

  /**
   * 排序标签
   * @param data 标签数据
   * @param condition 查询条件
   * @returns 排序后的标签列表
   */
  private static sort(data: Tag[], condition: TagQueryCondition): Tag[] {
    if (!condition.sortBy) {
      return data;
    }

    const sortBy = condition.sortBy;
    const sortOrder = condition.sortOrder || 'asc';
    const order = sortOrder === 'desc' ? -1 : 1;

    return [...data].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      // 字符串类型特殊处理
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * order;
      }

      return ((aValue as number) - (bValue as number)) * order;
    });
  }
}
