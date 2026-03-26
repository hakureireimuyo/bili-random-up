/**
 * 书相关类型定义
 * 定义书、页、查询选项和结果等核心概念
 */

import type { QueryCondition } from '../query/types.js';

/**
 * 书页查询选项
 */
export interface BookQueryOptions {
  /** 每页大小 */
  pageSize?: number;
  /** 是否预加载下一页 */
  preloadNext?: boolean;
  /** 预加载的页数 */
  preloadCount?: number;
}

/**
 * 书页状态
 */
export interface BookPageState {
  /** 当前页码 */
  currentPage: number;
  /** 总页数 */
  totalPages: number;
  /** 每页大小 */
  pageSize: number;
  /** 总记录数 */
  totalRecords: number;
}

/**
 * 书页数据
 */
export interface BookPage<T> {
  /** 页码 */
  page: number;
  /** 数据列表 */
  items: T[];
  /** 是否已加载 */
  loaded: boolean;
  /** 加载时间戳 */
  loadTime?: number;
}

/**
 * 书
 * 管理查询结果和分页数据
 */
export interface Book<T> {
  /** 书的唯一标识 */
  bookId: string;
  /** 结果ID列表 */
  resultIds: string[];
  /** 页数据缓存 */
  pages: Map<number, BookPage<T>>;
  /** 当前状态 */
  state: BookPageState;
  /** 查询条件 */
  queryCondition: QueryCondition;
  /** 创建时间 */
  createdAt: number;
  /** 最后访问时间 */
  lastAccessTime: number;
}

/**
 * 书页查询结果
 */
export interface BookQueryResult<T> {
  /** 当前页数据 */
  items: T[];
  /** 分页状态 */
  state: BookPageState;
  /** 书的ID */
  bookId: string;
}
