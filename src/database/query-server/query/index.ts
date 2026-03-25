/**
 * 查询模块统一导出
 */

export * from './types.js';
export { QueryEngine } from './query-engine.js';
export { TagFilterEngine, type TagExpression, type TagFilterResult } from './tag-filter-engine.js';
export { 
  CompositeQueryService, 
  type CompositeQueryCondition, 
  type CompositeQueryResult 
} from './composite-query-service.js';
