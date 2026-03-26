/**
 * 统计页面辅助函数
 * 所有数据操作已移除，仅保留基础框架
 */

import type { FilterState, StatsState, PaginationState } from "./types.js";
import { Platform } from "../../database/types/base.js";

/**
 * 创建初始状态
 */
export function createInitialState(platform: Platform = Platform.BILIBILI): StatsState {
  return {
    platform,
    showFollowedOnly: true,
    filters: createEmptyFilters(),
    cacheEnabled: true,
    loading: false
  };
}

/**
 * 创建空筛选器
 */
export function createEmptyFilters(): FilterState {
  return {
    includeTags: [],
    excludeTags: [],
    includeCategories: [],
    excludeCategories: [],
    includeCategoryTags: [],
    excludeCategoryTags: []
  };
}

/**
 * 重置过滤器状态
 */
export function resetFilters(filters: FilterState): void {
  filters.includeTags = [];
  filters.excludeTags = [];
  filters.includeCategories = [];
  filters.excludeCategories = [];
  filters.includeCategoryTags = [];
  filters.excludeCategoryTags = [];
}

/**
 * 创建初始分页状态
 */
export function createInitialPagination(): PaginationState {
  return {
    currentPage: 0,
    pageSize: 50,
    totalPages: 0,
    totalItems: 0
  };
}

/**
 * 更新加载状态
 */
export function setLoading(state: StatsState, loading: boolean): void {
  state.loading = loading;
}

/**
 * 设置错误信息
 */
export function setError(state: StatsState, error?: string): void {
  state.error = error;
}

