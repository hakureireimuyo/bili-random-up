/**
 * 管理器模块统一导出
 */

export { BaseBookManager, type IDataRepository, type IIndexConverter } from './base-book-manager.js';
export { CreatorBookManager } from './creator-book-manager.js';
export { VideoBookManager, type IVideoRepository } from './video-book-manager.js';

// 导出类型定义
export type {
  BookQueryOptions,
  BookPageState,
  BookPage,
  Book,
  BookQueryResult
} from './types.js';
