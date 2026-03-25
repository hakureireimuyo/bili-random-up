
/**
 * 标签索引缓存
 * 纯内存存储,不包含任何逻辑和状态管理
 */

import type { ID, Timestamp, TagSource } from '../../types/base.js';

/**
 * 标签索引信息
 * 只存储标签的关键索引字段,用于快速搜索和过滤
 */
export interface TagIndex {
  /** 标签ID */
  tagId: ID;
  /** 名称 */
  name: string;
  /** 来源 */
  source: TagSource;
  /** 创建时间 */
  createdAt: Timestamp;
  /** 更新时间 */
  updatedAt: Timestamp;
}

/**
 * 标签索引缓存类型
 * 纯数据容器,不包含任何逻辑
 */
export type TagIndexCache = {
  /** 主缓存: tagId -> TagIndex */
  data: Map<ID, TagIndex>;
  /** 来源索引: source -> tagIds */
  sourceIndex: Map<TagSource, Set<ID>>;
};

// 导出单例实例
export const tagIndexCache: TagIndexCache = {
  data: new Map(),
  sourceIndex: new Map()
};
