/**
 * 查询机制核心类型定义
 * 定义查询条件、查询服务等核心概念
 */

import type { Platform } from '../../types/base.js';
import type { CompositeQueryCondition } from './composite-query-service.js';
import type { TagExpression } from '../cache/types.js';

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

// 重新导出 TagExpression 以便其他模块使用
export type { TagExpression } from '../cache/types.js';
