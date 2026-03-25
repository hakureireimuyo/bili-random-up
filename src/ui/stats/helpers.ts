
import type { Category, FilterState, StatsState, UPDisplayData } from "./types.js";
import type { Creator } from "../../database/types/creator.js";

export function countUpTags(upTags: Record<string, string[]>): number {
  return Object.values(upTags).reduce((total, tags) => total + (tags?.length ?? 0), 0);
}

export function colorFromTag(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) {
    hash = (hash * 31 + tag.charCodeAt(i)) % 360;
  }
  const hue = Math.abs(hash) % 360;
  const sat = 70 + (Math.abs(hash * 7) % 21);
  const light = 85 + (Math.abs(hash * 13) % 11);
  return `hsl(${hue} ${sat}% ${light}%)`;
}

export function normalizeTag(tag: string): string {
  return tag.trim();
}

export function createInitialState(platform: string = "bilibili"): StatsState {
  return {
    platform: platform as any,
    showFollowedOnly: true,
    filters: {
      includeTags: [],
      excludeTags: [],
      includeCategories: [],
      excludeCategories: []
    }
  };
}

export function removeFromList(values: string[], target: string): string[] {
  return values.filter((value) => value !== target);
}

export function findCategory(categories: Category[], categoryId: string): Category | undefined {
  return categories.find((category) => category.id === categoryId);
}

export function resetFilters(filters: FilterState): void {
  filters.includeTags = [];
  filters.excludeTags = [];
  filters.includeCategories = [];
  filters.excludeCategories = [];
  filters.includeCategoryTags = [];
  filters.excludeCategoryTags = [];
}

export function creatorToCacheData(creator: Creator): UPDisplayData {
  return {
    creatorId: creator.creatorId,
    name: creator.name,
    avatar: null, // 头像数据从数据库异步获取
    avatarUrl: creator.avatarUrl || '',
    description: creator.description,
    followTime: creator.followTime,
    isFollowing: creator.isFollowing === 1,
    tags: []
  };
}
