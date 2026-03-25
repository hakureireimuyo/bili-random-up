/**
 * 创作者查询模块统一导出
 */

// 类型定义
export type {
  QueryResult,
  CreatorQueryParams
} from '../types.js';

// 查询引擎
export { CreatorQueryEngine } from './creator-query-engine.js';
export type { CreatorIndexQuery, TagExpression } from './creator-query-engine.js';

// 查询实现
export {} from './creator-query-engine.js';

// 调试工具
export {
  debugCreatorData,
  debugAllCreators,
  debugSearchCreators,
  debugTagUsage,
  runFullDiagnostics
} from './debug.js';
