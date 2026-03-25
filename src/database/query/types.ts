/**
 * 查询层类型定义
 * 定义所有查询相关的类型和接口
 */


/**
 * 查询参数
 */
export interface QueryParams {
  /** 排序条件 */
  sort?: SortCondition[];
  /** 搜索关键词 */
  keyword?: string;
  /** 其他自定义参数 */
  [key: string]: unknown;
}

/**
 * 标签逻辑操作符
 */
export enum TagLogicalOperator {
  /** 与：必须包含所有指定标签 */
  AND = "and",
  /** 或：至少包含其中一个标签 */
  OR = "or",
  /** 非：不包含指定标签 */
  NOT = "not"
}

/**
 * 标签逻辑表达式
 * 支持从左到右依次执行的简单表达式
 */
export interface TagExpression {
  /** 操作符 */
  operator: TagLogicalOperator;
  /** 标签ID列表（对于OR操作符，表示标签集合） */
  tagIds: string[];
}

/**
 * 排序条件
 */
export interface SortCondition {
  /** 字段名 */
  field: string;
  /** 排序方向 */
  direction: "asc" | "desc";
}

/**
 * 过滤条件
 */
export interface Filter {
  /** 字段名 */
  field: string;
  /** 操作符 */
  operator?: "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "nin" | "contains";
  /** 值 */
  value: unknown;
}

/**
 * 查询结果
 */
export interface QueryResult<T> {
  /** 数据列表 */
  data: T[];
  /** 总数 */
  total: number;
}

// PaginationParams 已在 types/base.ts 中定义

// 注意：数据管理选项（如缓存、预加载等）已移至 manager/types.ts 中的 DataManagementOptions
// Query 层只负责纯计算，不涉及数据管理策略

// VideoIndex 已在 cache/index-cache/types.ts 中定义

/**
 * 搜索结果
 */
export interface SearchResult {
  /** 匹配的视频ID列表 */
  videoIds: string[];
  /** 总数 */
  total: number;
}

/**
 * 视频查询参数
 */
export interface VideoQueryParams extends QueryParams {
  /** 收藏夹ID */
  collectionId?: string;
  /** 收藏夹类型 */
  collectionType?: 'user' | 'subscription';
  /** 包含的标签 */
  includeTags?: string[];
  /** 排除的标签 */
  excludeTags?: string[];
  /** 过滤条件 */
  filters?: Filter[];
}

/**
 * 创作者查询参数
 */
export interface CreatorQueryParams extends QueryParams {
  /** 是否关注 */
  isFollowing?: boolean;
  /** 标签逻辑表达式数组（从左到右依次执行） */
  tagExpressions?: TagExpression[];
}

/**
 * 标签查询参数
 */
export interface TagQueryParams extends QueryParams {
  /** 标签来源 */
  source?: 'user' | 'system';
}

/**
 * 分类查询参数
 */
export interface CategoryQueryParams extends QueryParams {
  /** 标签ID */
  tagId?: string;
}

/**
 * 统计数据
 */
export interface StatsData {
  followedCount: number;
  unfollowedCount: number;
  totalCreators: number;
  totalTags: number;
}

/**
 * 标签使用计数
 */
export type TagUsageMap = Map<string, number>;

/**
 * 查询错误类
 */
export class QueryError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "QueryError";
  }
}
