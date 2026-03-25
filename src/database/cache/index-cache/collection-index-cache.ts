
/**
 * 收藏夹索引缓存
 * 纯内存存储,不包含任何逻辑和状态管理
 */

import type { CollectionIndex } from './types.js';
import type { ID } from '../../types/base.js';

/**
 * 收藏夹索引缓存类型
 * 纯数据容器,不包含任何逻辑
 */
export type CollectionIndexCache = {
  /** 主缓存: collectionId -> CollectionIndex */
  data: Map<ID, CollectionIndex>;
  /** 标签索引: tagId -> collectionIds */
  tagIndex: Map<ID, Set<ID>>;
};

// 导出单例实例
export const collectionIndexCache: CollectionIndexCache = {
  data: new Map(),
  tagIndex: new Map()
};
