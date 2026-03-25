
import type { Platform } from "../../database/types/base.js";

/**
 * UI使用的分类类型 - 与数据库Category类型保持一致
 */
export interface Category {
  id: string;
  name: string;
  tagIds: string[];
}

/**
 * 拖拽上下文
 */
export interface DragContext {
  tagId: string;
  tagName: string;
  originUpMid?: string;
  categoryId?: string;
  dropped: boolean;
}

/**
 * UP主显示数据
 */
export interface UPDisplayData {
  creatorId: string;
  name: string;
  avatar: Blob;
  avatarUrl: string;
  description: string;
  followTime: number;
  isFollowing: boolean;
  tags: string[];
}

/**
 * 标签显示数据
 */
export interface TagDisplayData {
  tagId: string;
  name: string;
  source: "user" | "system";
  color?: string;
  icon?: string;
}

/**
 * 分类标签列表
 */
export interface CategoryTagList {
  categoryId: string;
  tagIds: string[];
}

/**
 * 过滤状态
 */
export interface FilterState {
  includeTags: string[];
  excludeTags: string[];
  includeCategories: string[];
  excludeCategories: string[];
  includeCategoryTags: CategoryTagList[]; // 分类中的标签列表（OR条件）
  excludeCategoryTags: CategoryTagList[]; // 分类中的标签列表（NOT条件）
}

/**
 * 统计页面状态 - 仅包含页面UI必须的状态
 */
export interface StatsState {
  // 平台
  platform: Platform;
  // 是否只显示已关注
  showFollowedOnly: boolean;
  // 过滤状态
  filters: FilterState;
}
