/**
 * 索引和缓存相关类型定义
 * 定义视频索引、创作者索引等轻量级数据结构
 */

import type { Platform, ID } from '../../types/base.js';

/**
 * 时长范围查询条件
 */
export interface DurationRange {
  /** 最小时长（秒） */
  min?: number;
  /** 最大时长（秒） */
  max?: number;
}

/**
 * 标签表达式
 */
export interface TagExpression {
  /** 标签ID或标签ID列表（用于OR操作） */
  tagId: ID | ID[];
  /** 操作符 */
  operator: 'AND' | 'OR' | 'NOT';
}

/**
 * 标签映射数据结构
 * 一个标签可以映射到多种数据类型的ID集合
 */
export interface TagMapping {
  /** 创作者ID集合 */
  creatorIds: Set<ID>;
  /** 视频ID集合 */
  videoIds: Set<ID>;
  /** 动态扩展其他数据类型 */
  [key: string]: Set<ID>;
}

/**
 * 标签缓存条目
 */
export interface TagCacheEntry {
  /** 标签ID */
  tagId: ID;
  /** 标签映射到多种数据类型的ID集合 */
  mapping: TagMapping;
  /** 最后更新时间 */
  lastUpdate: number;
  /** 总数据量（所有类型ID集合大小之和） */
  totalCount: number;
}

/**
 * 视频索引
 * 用于快速查询视频的轻量级数据结构
 */
export interface VideoIndex {
  /** 视频ID */
  videoId: ID;
  /** 平台类型 */
  platform: Platform;
  /** 平台中唯一编号 */
  bv:string;
  /** 创作者ID */
  creatorId: ID;
  /** 视频标题 */
  title: string;
  /** 视频时长（秒） */
  duration: number;
  /** 视频发布时间 */
  publishTime: number;
  /** 视频标签列表 */
  tags: ID[];
  /** 是否失效 */
  isInvalid?: boolean;
}

/**
 * 视频查询条件
 */
export interface VideoQueryCondition {
  /** 平台 */
  platform: Platform;
  /** 标题关键词（可选） */
  keyword?: string;
  /** 创作者ID列表（可选） */
  creatorIds?: ID[];
  /** 创作者名称（可选，需要通过创作者索引查询） */
  creatorName?: string;
  /** 标签表达式列表（可选） */
  tagExpressions?: TagExpression[];
  /** 时长范围（可选） */
  durationRange?: DurationRange;
  /** 发布时间范围（可选） */
  publishTimeRange?: {
    min?: number;
    max?: number;
  };
  /** 是否只查询已关注的创作者的视频（可选） */
  onlyFollowingCreators?: boolean;
}

/**
 * 创作者索引
 * 用于快速查询的轻量级数据结构
 */
export interface CreatorIndex {
  /** 创作者ID */
  creatorId: ID;
  /** 创作者名称 */
  name: string;
  /** 标签ID列表 */
  tags: ID[];
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
