/**
 * 查询模块统一导出
 */

export * from './types.js';
export { QueryEngine } from './query-engine.js';
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
