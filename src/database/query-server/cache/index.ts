/**
 * 缓存模块统一导出
 */

export { IndexCache } from './index-cache.js';
export { DataCache } from './data-cache.js';
export { BaseCache, type CacheOptions, type CacheEntry, type TagCacheEntry } from './base-cache.js';
export { CacheManager } from './cache-manager.js';

// 导出类型定义
export type {
  DurationRange,
  TagExpression,
  VideoIndex,
  VideoQueryCondition,
  CreatorIndex,
  IndexQuery
} from './types.js';
