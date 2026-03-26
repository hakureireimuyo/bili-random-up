/**
 * 书相关类型定义
 * 定义书、页、查询选项和结果等核心概念
 */

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
 * 只存储索引数据，完整数据通过Repository获取
 */
export interface BookPage<T> {
  /** 页码 */
  page: number;
  /** 数据列表（从Repository获取的完整数据） */
  items: T[];
  /** 是否已加载 */
  loaded: boolean;
  /** 加载时间戳 */
  loadTime?: number;
}

/**
 * 书类型
 * 只存储查询返回的索引数据，不存储完整对象
 * 通过Repository获取完整数据
 * 与前端页面数据显示容器绑定生命周期
 * Book 类在 book.ts 中定义
 */
export type Book<T> = import('./book.js').Book<T>;

/**
 * 书页查询结果
 */
export interface BookQueryResult<T> {
  /** 当前页数据 */
  items: T[];
  /** 分页状态 */
  state: BookPageState;
  /** 书的ID */
  bookId: number;
}
