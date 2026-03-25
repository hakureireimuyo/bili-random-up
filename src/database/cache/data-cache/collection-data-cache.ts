
/**
 * 收藏夹数据缓存
 * 纯内存存储,不包含任何逻辑和状态管理
 */

import type { CollectionData } from './types.js';
import type { ID } from '../../database/types/base.js';

/**
 * 收藏夹数据缓存类型
 * 纯数据容器,不包含任何逻辑
 */
export type CollectionDataCache = Map<ID, CollectionData>;

// 导出单例实例
export const collectionDataCache: CollectionDataCache = new Map();
