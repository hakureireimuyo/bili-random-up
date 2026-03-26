/**
 * 基础缓存类
 * 实现LRU策略的泛型缓存，可被所有数据类型复用
 */

/**
 * 缓存条目
 */
export interface CacheEntry<T> {
  data: T;
  lastAccessTime: number;
  accessCount: number;
}

/**
 * 缓存配置选项
 */
export interface CacheOptions {
  /** 最大缓存条目数 */
  maxSize?: number;
  /** 缓存最大存活时间（毫秒） */
  maxAge?: number;
  /** 清理比例（0-1），当缓存满时清理的比例 */
  cleanupRatio?: number;
}

/**
 * 基础缓存类
 * 实现LRU（最近最少使用）策略的泛型缓存
 */
export class BaseCache<T> {
  protected cache: Map<number, CacheEntry<T>> = new Map();
  protected maxSize: number;
  protected maxAge: number;
  protected cleanupRatio: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize ?? 1000;
    this.maxAge = options.maxAge ?? 3600000; // 默认1小时
    this.cleanupRatio = options.cleanupRatio ?? 0.2; // 默认清理20%
  }

  /**
   * 设置数据
   */
  set(key: number, data: T): void {
    // 如果缓存已满，执行清理
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    // 检查是否已存在
    const existing = this.cache.get(key);
    if (existing) {
      // 更新现有条目
      existing.data = data;
      existing.lastAccessTime = Date.now();
      existing.accessCount++;
    } else {
      // 添加新条目
      this.cache.set(key, {
        data,
        lastAccessTime: Date.now(),
        accessCount: 1
      });
    }
  }

  /**
   * 批量设置数据
   */
  setBatch(entries: Map<number, T> | Record<number, T>): void {
    if (entries instanceof Map) {
      entries.forEach((data, key) => this.set(key, data));
    } else {
      Object.entries(entries).forEach(([key, data]) => this.set(key as unknown as number, data));
    }
  }

  /**
   * 获取数据
   */
  get(key: number): T | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      // 检查是否过期
      const now = Date.now();
      if (now - entry.lastAccessTime > this.maxAge) {
        this.cache.delete(key);
        return undefined;
      }

      // 更新访问信息
      entry.lastAccessTime = now;
      entry.accessCount++;
      return entry.data;
    }
    return undefined;
  }

  /**
   * 批量获取数据
   */
  getBatch(keys: number[]): Map<number, T> {
    const result = new Map<number, T>();
    keys.forEach(key => {
      const value = this.get(key);
      if (value !== undefined) {
        result.set(key, value);
      }
    });
    return result;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    totalAccesses: number;
    avgAccessCount: number;
    oldestEntry?: number;
    newestEntry?: number;
  } {
    const entries = Array.from(this.cache.values());
    const totalAccesses = entries.reduce((sum, e) => sum + e.accessCount, 0);
    const avgAccessCount = entries.length > 0 ? totalAccesses / entries.length : 0;

    const times = entries.map(e => e.lastAccessTime);
    return {
      size: this.cache.size,
      totalAccesses,
      avgAccessCount,
      oldestEntry: times.length > 0 ? Math.min(...times) : undefined,
      newestEntry: times.length > 0 ? Math.max(...times) : undefined
    };
  }

  /**
   * 删除数据
   */
  delete(key: number): boolean {
    return this.cache.delete(key);
  }

  /**
   * 批量删除数据
   */
  deleteBatch(keys: number[]): number {
    let count = 0;
    keys.forEach(key => {
      if (this.cache.delete(key)) {
        count++;
      }
    });
    return count;
  }

  /**
   * 清空缓存
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
   * 检查数据是否存在
   */
  has(key: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // 检查是否过期
    const now = Date.now();
    if (now - entry.lastAccessTime > this.maxAge) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 获取未缓存的键列表
   */
  getUncachedKeys(keys: number[]): number[] {
    return keys.filter(key => !this.has(key));
  }

  /**
   * 批量检查缓存状态
   */
  getCachedStatus(keys: number[]): Map<number, boolean> {
    const result = new Map<number, boolean>();
    keys.forEach(key => {
      result.set(key, this.has(key));
    });
    return result;
  }

  /**
   * 清理过期和最少使用的缓存
   */
  protected cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // 1. 先删除过期的条目
    entries.forEach(([key, entry]) => {
      if (now - entry.lastAccessTime > this.maxAge) {
        this.cache.delete(key);
      }
    });

    // 2. 如果还是满了，删除最少使用的条目
    if (this.cache.size >= this.maxSize) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => {
          // 优先删除访问次数少的
          if (a[1].accessCount !== b[1].accessCount) {
            return a[1].accessCount - b[1].accessCount;
          }
          // 访问次数相同，删除最久未访问的
          return a[1].lastAccessTime - b[1].lastAccessTime;
        });

      // 删除指定比例的条目
      const deleteCount = Math.floor(this.cache.size * this.cleanupRatio);
      for (let i = 0; i < deleteCount && i < sortedEntries.length; i++) {
        this.cache.delete(sortedEntries[i][0]);
      }
    }
  }

  /**
   * 获取所有键
   */
  keys(): number[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取所有值
   */
  values(): T[] {
    const now = Date.now();
    return Array.from(this.cache.entries())
      .filter(([_, entry]) => now - entry.lastAccessTime <= this.maxAge)
      .map(([_, entry]) => entry.data);
  }

  /**
   * 获取所有条目
   */
  entries(): [number, T][] {
    const now = Date.now();
    return Array.from(this.cache.entries())
      .filter(([_, entry]) => now - entry.lastAccessTime <= this.maxAge)
      .map(([key, entry]) => [key, entry.data]);
  }
}
