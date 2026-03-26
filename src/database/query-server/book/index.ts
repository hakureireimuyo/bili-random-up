/**
 * 管理器模块统一导出
 */

export { BaseBookManager, type IDataRepository, type IIndexConverter, type IQueryService } from './base-book-manager.js';

// 导出类型定义
export type {
  BookQueryOptions,
  BookPageState,
  BookPage,
  Book,
  BookQueryResult
} from './types.js';
