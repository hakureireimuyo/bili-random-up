
/**
 * 标签数据缓存
 * 纯内存存储,不包含任何逻辑和状态管理
 */

import type { Tag } from '../../types/semantic.js';

/**
 * 标签数据缓存类型
 * 纯数据容器,不包含任何逻辑
 */
export type TagDataCache = Map<string, Tag>;

// 导出单例实例
export const tagDataCache: TagDataCache = new Map();
