/**
 * DataManager 层类型定义
 * 定义所有数据管理相关的类型和接口
 */

/**
 * 数据管理选项
 * 用于控制数据获取和缓存行为
 */
export interface DataManagementOptions {
  /** 是否使用缓存 */
  useCache?: boolean;
  /** 是否预加载 */
  preload?: boolean;
  /** 预加载数量 */
  preloadCount?: number;
  /** 超时时间(毫秒) */
  timeout?: number;
  /** 页码 */
  page?: number;
  /** 每页大小 */
  pageSize?: number;
}

/**
 * 分页结果
 * 扩展查询结果，添加分页相关字段
 */
export interface PaginatedResult<T> {
  /** 数据列表 */
  data: T[];
  /** 总数 */
  total: number;
  /** 当前页 */
  page: number;
  /** 每页大小 */
  pageSize: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrev: boolean;
}

/**
 * 预取配置
 */
export interface PrefetchConfig {
  /** 是否启用预取 */
  enabled: boolean;
  /** 预取的页数 */
  prefetchPages: number;
}
