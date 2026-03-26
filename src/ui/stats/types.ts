
import type { Platform, ID, TagSource } from "../../database/types/base.js";

/**
 * 标签信息
 */
export interface TagInfo {
  tagId: ID;
  name: string;
  source: TagSource;
  count?: number;
}

/**
 * 分类信息
 */
export interface CategoryInfo {
  categoryId: ID;
  name: string;
  description?: string;
  tagIds: ID[];
  tags?: TagInfo[];
}

/**
 * 分类标签列表
 */
export interface CategoryTagList {
  categoryId: ID;
  tagIds: ID[];
}

/**
 * 过滤状态
 */
export interface FilterState {
  includeTags: ID[];
  excludeTags: ID[];
  includeCategories: ID[];
  excludeCategories: ID[];
  includeCategoryTags: CategoryTagList[];
  excludeCategoryTags: CategoryTagList[];
}

/**
 * 统计页面状态
 */
export interface StatsState {
  platform: Platform;
  showFollowedOnly: boolean;
  filters: FilterState;
  cacheEnabled: boolean;
  loading: boolean;
  error?: string;
  searchKeyword?: string;
}

/**
 * 分页状态
 */
export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}
