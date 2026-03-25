/**
 * 视频索引类型定义
 * 定义视频索引相关的数据模型
 */

import type { Video } from '../../types/video.js';
import type { CreatorIndex } from '../query/types.js';
import type { Platform } from '../../types/base.js';

/**
 * 视频索引
 * 用于快速查询视频的轻量级数据结构
 */
export interface VideoIndex {
  /** 视频ID */
  videoId: string;
  /** 平台类型 */
  platform: Platform;
  /** 创作者ID */
  creatorId: string;
  /** 视频标题 */
  title: string;
  /** 视频时长（秒） */
  duration: number;
  /** 视频发布时间 */
  publishTime: number;
  /** 视频标签列表 */
  tags: string[];
  /** 是否失效 */
  isInvalid?: boolean;
}

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
 * 视频查询条件
 */
export interface VideoQueryCondition {
  /** 平台 */
  platform: Platform;
  /** 标题关键词（可选） */
  keyword?: string;
  /** 创作者ID列表（可选） */
  creatorIds?: string[];
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
 * 标签表达式
 */
export interface TagExpression {
  /** 标签ID或标签ID列表（用于OR操作） */
  tagId: string | string[];
  /** 操作符 */
  operator: 'AND' | 'OR' | 'NOT';
}

/**
 * 视频查询结果
 */
export interface VideoQueryResult {
  /** 匹配的VideoIndex列表 */
  indexes: VideoIndex[];
  /** 总数 */
  total: number;
  /** 查询统计 */
  stats: {
    /** 初始总数 */
    initialCount: number;
    /** 创作者过滤后数量 */
    afterCreatorFilter: number;
    /** 标签过滤后数量 */
    afterTagFilter: number;
    /** 标题过滤后数量 */
    afterTitleFilter: number;
    /** 时长过滤后数量 */
    afterDurationFilter: number;
    /** 发布时间过滤后数量 */
    afterPublishTimeFilter: number;
  };
}

/**
 * 视频索引缓存接口
 */
export interface VideoIndexCache {
  /** 设置视频索引 */
  set(index: VideoIndex): void;
  /** 批量设置视频索引 */
  setBatch(indexes: VideoIndex[]): void;
  /** 获取视频索引 */
  get(id: string): VideoIndex | undefined;
  /** 获取所有视频索引 */
  values(): VideoIndex[];
  /** 删除视频索引 */
  delete(id: string): boolean;
  /** 清空缓存 */
  clear(): void;
  /** 获取缓存大小 */
  size(): number;
  /** 根据创作者ID获取视频索引 */
  getByCreator(creatorId: string): VideoIndex[];
}
