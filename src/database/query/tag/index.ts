/**
 * 标签查询模块统一导出
 */

// 类型定义
export type {
  QueryResult,
  QueryOptions,
  TagQueryParams
} from '../types.js';

// 查询实现
export {
  getAllTags,
  getTagById,
  getTagsByIds,
  createTag,
  deleteTag,
  searchTags,
  clearTagCache
} from './tag-query.js';

// 查询引擎
export {
  TagQueryEngine,
  type TagQueryCondition
} from './tag-query-engine.js';

// 调试工具
export {
  debugTagData,
  debugAllTags,
  debugSearchTags,
  runFullDiagnostics
} from './debug.js';
