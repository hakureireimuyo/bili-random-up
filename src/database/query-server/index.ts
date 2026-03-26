/**
 * query-server模块统一导出
 */

export * from './cache/index.js';
export * from './book/index.js';

// 从 query 模块导出，避免与 cache 模块的重复导出冲突
export {
  QueryService,
  CompositeQueryService,
  filterByName,
  filterByFollowing,
  filterByTags,
  filterCombined,
  VideoQueryService,
  TagFilterEngine
} from './query/index.js';

export type {
  QueryInput,
  QueryOutput,
  QueryStats,
  QueryCondition,
  NameQueryCondition,
  TagQueryCondition,
  CompositeQueryCondition
} from './query/types.js';

export type {
  TagFilterResult
} from './query/tag-filter-engine.js';
