/**
 * 书页查询机制核心类型定义
 * 定义高性能查询的书、页、索引等核心概念
 */

import type { Creator } from '../../types/creator.js';
import type { Platform } from '../../types/base.js';
import type { CompositeQueryCondition } from './composite-query-service.js';

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
 * 查询条件类型
 */
export type QueryCondition = NameQueryCondition | TagQueryCondition | CompositeQueryCondition;

/**
 * 名称查询条件
 */
export interface NameQueryCondition {
  type: 'name';
  /** 平台 */
  platform: Platform;
  /** 搜索关键词 */
  keyword: string;
  /** 是否只查询已关注的 */
  isFollowing?: boolean;
}

/**
 * 标签查询条件
 */
export interface TagQueryCondition {
  type: 'tag';
  /** 平台 */
  platform: Platform;
  /** 标签表达式列表 */
  tagExpressions: TagExpression[];
  /** 是否只查询已关注的 */
  isFollowing?: boolean;
}

/**
 * 标签表达式
 */
export interface TagExpression {
  /** 标签ID或标签ID列表（用于OR操作） */
  tagId: string | string[];
  /** 操作符 */
  operator: 'AND' | 'OR' | 'NOT';
}

/**
 * 创作者索引
 * 用于快速查询的轻量级数据结构
 */
export interface CreatorIndex {
  /** 创作者ID */
  creatorId: string;
  /** 创作者名称 */
  name: string;
  /** 标签ID列表 */
  tags: string[];
  /** 是否已关注 */
  isFollowing: boolean;
}

/**
 * 索引查询条件
 */
export interface IndexQuery {
  /** 搜索关键词 */
  keyword?: string;
  /** 是否已关注 */
  isFollowing?: boolean;
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
