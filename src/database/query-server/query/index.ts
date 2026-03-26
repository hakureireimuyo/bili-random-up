/**
 * 查询模块统一导出
 */

export * from './types.js';

// 集合运算工具
export {
  intersect,
  union,
  subtract,
  insertSorted,
  removeFromArray
} from './set-operations.js';
// 调度层（Executor层）
export { QueryService } from './query-service.js';

// 纯函数（Engine层）
export {
  filterByName,
  filterByFollowing,
  filterByTags,
  filterCombined
} from './query-engine.js';
export { VideoQueryService } from './video-query-service.js';
export { TagFilterEngine, type TagFilterResult } from './tag-filter-engine.js';
export { 
  CompositeQueryService, 
  type CompositeQueryCondition, 
  type CompositeQueryResult 
} from './composite-query-service.js';

// 从 book 模块导出类型
export type {
  BookQueryOptions,
  BookPageState,
  BookPage,
  Book,
  BookQueryResult
} from '../book/types.js';
