/**
 * 数据缓存模块
 * 管理完整数据的内存缓存
 */

import { BaseCache, type CacheOptions } from './base-cache.js';

/**
 * 数据缓存类
 * 继承BaseCache，提供数据缓存功能
 * 支持泛型，可以存储任意类型的数据
 */
export class DataCache<T> extends BaseCache<T> {
  constructor(options: CacheOptions = {}) {
    // 默认缓存500个
    super({
      maxSize: options.maxSize ?? 500,
      maxAge: options.maxAge ?? 3600000,
      cleanupRatio: options.cleanupRatio ?? 0.2
    });
  }

  /**
   * 设置数据
   * @override
   */
  set(key: string, data: T): void {
    super.set(key, data);
  }

  /**
   * 批量设置数据
   * @override
   */
  setBatch(entries: Map<string, T> | Record<string, T>): void {
    super.setBatch(entries);
  }

  /**
   * 获取数据
   */
  get(id: string): T | undefined {
    return super.get(id);
  }

  /**
   * 批量获取数据
   */
  getBatch(ids: string[]): Map<string, T> {
    return super.getBatch(ids);
  }

  /**
   * 获取未缓存的ID列表
   */
  getUncachedIds(ids: string[]): string[] {
    return super.getUncachedKeys(ids);
  }

  /**
   * 批量检查缓存状态
   */
  getCachedStatus(ids: string[]): Map<string, boolean> {
    return super.getCachedStatus(ids);
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
    return super.getStats();
  }
}
