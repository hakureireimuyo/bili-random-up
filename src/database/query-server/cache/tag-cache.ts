/**
 * 共享标签缓存模块
 * 管理标签到ID集合的映射，可被Creator和Video等不同数据类型共享使用
 */

import type { TagExpression } from '../query/types.js';
import { TagFilterEngine } from '../query/tag-filter-engine.js';

/**
 * 标签缓存条目
 */
export interface TagCacheEntry {
  /** 标签ID到ID集合的映射 */
  tagToIds: Map<string, Set<string>>;
  /** 最后更新时间 */
  lastUpdate: number;
  /** 总数量 */
  totalCount: number;
}

/**
 * 共享标签缓存类
 * 单例模式，确保全局只有一个实例
 */
export class TagCache {
  private static instance: TagCache;
  private cache: Map<string, TagCacheEntry>;
  private maxSize: number;
  private maxAge: number; // 缓存过期时间（毫秒）

  private constructor(maxSize: number = 100, maxAge: number = 3600000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.maxAge = maxAge;
  }

  /**
   * 获取单例实例
   */
  static getInstance(maxSize?: number, maxAge?: number): TagCache {
    if (!TagCache.instance) {
      TagCache.instance = new TagCache(maxSize, maxAge);
    }
    return TagCache.instance;
  }

  /**
   * 设置标签缓存
   * @param cacheKey 缓存键（如 "creator:bilibili" 或 "video:bilibili"）
   * @param tagToIds 标签到ID集合的映射
   */
  set(cacheKey: string, tagToIds: Map<string, Set<string>>): void {
    // 如果缓存已满，清理最旧的条目
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    // 计算总数量
    const allIds = new Set<string>();
    for (const ids of tagToIds.values()) {
      for (const id of ids) {
        allIds.add(id);
      }
    }

    this.cache.set(cacheKey, {
      tagToIds,
      lastUpdate: Date.now(),
      totalCount: allIds.size
    });
  }

  /**
   * 获取标签缓存
   * @param cacheKey 缓存键
   * @returns 标签到ID集合的映射，如果不存在或已过期则返回undefined
   */
  get(cacheKey: string): Map<string, Set<string>> | undefined {
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return undefined;
    }

    // 检查是否过期
    if (Date.now() - entry.lastUpdate > this.maxAge) {
      this.cache.delete(cacheKey);
      return undefined;
    }

    return entry.tagToIds;
  }

  /**
   * 执行标签过滤
   * @param cacheKey 缓存键
   * @param expressions 标签表达式列表
   * @param allIds 所有候选ID集合（可选）
   * @returns 过滤结果
   */
  filter(
    cacheKey: string,
    expressions: TagExpression[],
    allIds?: Set<string>
  ) {
    const tagToIds = this.get(cacheKey);

    if (!tagToIds) {
      return {
        matchedIds: new Set<string>(),
        steps: 0,
        stepStats: []
      };
    }

    const tagFilterEngine = new TagFilterEngine();
    return tagFilterEngine.filter(tagToIds, expressions, allIds);
  }

  /**
   * 删除标签缓存
   * @param cacheKey 缓存键
   */
  delete(cacheKey: string): boolean {
    return this.cache.delete(cacheKey);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    entries: Array<{
      key: string;
      totalCount: number;
      lastUpdate: number;
      age: number;
    }>;
  } {
    const now = Date.now();
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        totalCount: entry.totalCount,
        lastUpdate: entry.lastUpdate,
        age: now - entry.lastUpdate
      }))
    };
  }

  /**
   * 清理过期的缓存
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastUpdate > this.maxAge) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));

    // 如果清理后仍然超过最大大小，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].lastUpdate - b[1].lastUpdate);

      const deleteCount = this.cache.size - this.maxSize + 1;
      for (let i = 0; i < deleteCount; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  /**
   * 构建标签到ID的映射
   * @param items 包含id和tags字段的对象数组
   * @returns 标签到ID集合的映射
   */
  static buildTagIndexMap<T extends { id: string; tags: string[] }>(
    items: T[]
  ): Map<string, Set<string>> {
    const tagMap = new Map<string, Set<string>>();

    for (const item of items) {
      for (const tagId of item.tags) {
        if (!tagMap.has(tagId)) {
          tagMap.set(tagId, new Set());
        }
        tagMap.get(tagId)!.add(item.id);
      }
    }

    return tagMap;
  }
}
