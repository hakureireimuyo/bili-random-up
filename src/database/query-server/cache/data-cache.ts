/**
 * 数据缓存模块
 * 管理完整数据的内存缓存
 */

import { BaseCache, type CacheOptions } from './base-cache.js';

/**
 * 数据缓存类
 * 继承BaseCache，提供数据缓存功能
 * 支持泛型，可以存储任意类型的数据
 * 特性：
 * - 存储完整数据（如Creator、Video）
 * - 包含过期时间（默认1小时）
 * - 使用LRU策略管理容量
 * - 支持批量操作
 * - 全局单例，相同数据类型唯一
 * 
 * 容量管理：
 * - 最小支持50条数据
 * - 最多支持1000条数据
 * - 使用数量限制而非实际占用限制
 */
export class DataCache<T> extends BaseCache<T> {
  constructor(options: CacheOptions = {}) {
    // 默认缓存500个，限制在50-1000之间
    const maxSize = options.maxSize ?? 500;
    super({
      maxSize: Math.max(50, Math.min(1000, maxSize)),
      maxAge: options.maxAge ?? 3600000,
      cleanupRatio: options.cleanupRatio ?? 0.2
    });
  }

  /**
   * 设置数据
   * @override
   */
  set(key: number, data: T): void {
    super.set(key, data);
  }

  /**
   * 批量设置数据
   * @override
   */
  setBatch(entries: Map<number, T> | Record<number, T>): void {
    super.setBatch(entries);
  }

  /**
   * 获取数据
   */
  get(id: number): T | undefined {
    return super.get(id);
  }

  /**
   * 批量获取数据
   */
  getBatch(ids: number[]): Map<number, T> {
    return super.getBatch(ids);
  }

  /**
   * 获取未缓存的ID列表
   */
  getUncachedIds(ids: number[]): number[] {
    return super.getUncachedKeys(ids);
  }

  /**
   * 批量检查缓存状态
   */
  getCachedStatus(ids: number[]): Map<number, boolean> {
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
