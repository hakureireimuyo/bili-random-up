/**
 * 创作者数据缓存
 * 纯内存存储,不包含任何逻辑和状态管理
 */

import type { Creator } from '../../database/types/creator.js';

/**
 * 创作者数据缓存类型
 * 纯数据容器,不包含任何逻辑
 */
export type CreatorDataCache = Map<string, Creator>;

// 导出单例实例
export const creatorDataCache: CreatorDataCache = new Map();
