/**
 * 查询机制核心类型定义
 * 定义查询条件、查询服务等核心概念
 */

import type { Platform, ID } from '../../types/base.js';
import type { TagExpression } from '../cache/types.js';

/**
 * 查询输入规范
 */
export interface QueryInput<T> {
  /** 索引数据列表 */
  indexes: T[];
  /** 查询条件 */
  condition: QueryCondition;
  /** 可选的缓存键 */
  cacheKey?: string;
}

/**
 * 查询输出规范
 */
export interface QueryOutput {
  /** 匹配的ID列表 */
  matchedIds: ID[];
  /** 查询统计信息（可选） */
  stats?: QueryStats;
}

/**
 * 查询统计信息
 */
export interface QueryStats {
  /** 初始总数 */
  initialCount: number;
  /** 各过滤阶段后的数量 */
  stageCounts: {
    /** 关注状态过滤后数量 */
    afterFollowingFilter?: number;
    /** 标签过滤后数量 */
    afterTagFilter?: number;
    /** 名称/标题过滤后数量 */
    afterNameFilter?: number;
  };
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
  isFollowing?: 0 | 1;
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
  isFollowing?: 0 | 1;
}

/**
 * 复合查询条件
 */
export interface CompositeQueryCondition {
  /** 平台 */
  platform: Platform;
  /** 名字关键词（可选） */
  keyword?: string;
  /** 标签表达式列表（可选） */
  tagExpressions?: TagExpression[];
  /** 是否已关注（可选，0或1） */
  isFollowing?: 0 | 1;
}

/**
 * 创作者索引
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
 * 视频索引
 */
export interface VideoIndex {
  /** 视频ID */
  videoId: ID;
  /** 视频在网址上的编号 */
  bv:string;
  /** 平台类型 */
  platform: Platform;
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
  durationRange?: {
    min?: number;
    max?: number;
  };
  /** 发布时间范围（可选） */
  publishTimeRange?: {
    min?: number;
    max?: number;
  };
  /** 是否只查询已关注的创作者的视频（可选） */
  onlyFollowingCreators?: boolean;
}

// 重新导出 TagExpression 以便其他模块使用
export type { TagExpression } from '../cache/types.js';
