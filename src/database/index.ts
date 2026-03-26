/**
 * Database 模块统一入口
 * 
 * 本文件提供 database 模块的所有公共 API 导出
 */

// ============ IndexedDB 基础设施 ============
export { dbManager } from './indexeddb/db-manager.js';
export { DBUtils } from './indexeddb/db-utils.js';
export * from './indexeddb/config.js';

// ============ 应用状态管理 ============
export {
  setAppState,
  getAppState,
  deleteAppState,
  clearAppStateByPrefix,
  clearAppStateCache
} from './app-state.js';

// ============ Repository 层 ============
export { CreatorRepository } from './repositories/creator-repository.js';
export { VideoRepository } from './repositories/video-repository.js';
export { TagRepository } from './repositories/tag-repository.js';

// ============ Implementations 层 ============
export { TagRepositoryImpl } from './implementations/tag-repository.impl.js';
export { CategoryRepositoryImpl } from './implementations/category-repository.impl.js';
export { CreatorRepositoryImpl } from './implementations/creator-repository.impl.js';
export { VideoRepositoryImpl } from './implementations/video-repository.impl.js';
export { WatchEventRepositoryImpl } from './implementations/watch-event-repository.impl.js';
export { CollectionRepositoryImpl } from './implementations/collection-repository.impl.js';
export { CollectionItemRepositoryImpl } from './implementations/collection-item-repository.impl.js';
export { getValue, setValue, deleteValue } from './implementations/settings-repository.impl.js';
export type { AppSettings } from './implementations/settings-repository.impl.js';

// ============ Query-Server 层 ============
// 缓存层
export { CacheManager } from './query-server/cache/cache-manager.js';
export { BaseCache } from './query-server/cache/base-cache.js';
export { DataCache } from './query-server/cache/data-cache.js';
export { IndexCache } from './query-server/cache/index-cache.js';
export { TagCache } from './query-server/cache/tag-cache.js';

// 查询层
export { QueryService } from './query-server/query/query-service.js';
export { CompositeQueryService } from './query-server/query/composite-query-service.js';
export { filterByName, filterByFollowing, filterByTags, filterCombined } from './query-server/query/query-engine.js';
export { VideoQueryService } from './query-server/query/video-query-service.js';
export { TagFilterEngine } from './query-server/query/tag-filter-engine.js';

// 书管理层
export { BaseBookManager } from './query-server/book/base-book-manager.js';
export { Book } from './query-server/book/book.js';
export type { 
  IDataRepository, 
  IIndexConverter, 
  IQueryService
} from './query-server/book/base-book-manager.js';
export type { 
  BookQueryOptions,
  BookPageState,
  BookPage,
  BookQueryResult,
  Book as BookType
} from './query-server/book/types.js';

// ============ 类型定义 ============
export * from './types/base.js';
export * from './types/behavior.js';
export * from './types/collection.js';
export * from './types/creator.js';
export * from './types/image.js';
export * from './types/semantic.js';
export * from './types/video.js';
