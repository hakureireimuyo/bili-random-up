/**
 * 索引缓存模块
 * 管理索引的内存缓存，提供高性能的索引查询
 */

import type { ID } from '../../types/base.js';

/**
 * 索引缓存类
 * 支持泛型，可以存储任意类型的索引
 * 特性：
 * - 无容量限制，全量驻留内存
 * - 不包含过期时间
 * - 支持批量操作
 * - 全局单例，相同数据类型唯一
 */
export class IndexCache<T> {
  private cache: Map<ID, T> = new Map();

  constructor() {
    // 无容量限制，不需要maxSize参数
  }

  /**
   * 设置索引
   */
  set(id: ID, index: T): void {
    this.cache.set(id, index);
  }

  /**
   * 批量设置索引
   */
  setBatch(entries: Map<ID, T> | Record<number, T>): void {
    if (entries instanceof Map) {
      entries.forEach((index, id) => this.set(id, index));
    } else {
      Object.entries(entries).forEach(([id, index]) => this.set(Number(id), index));
    }
  }

  /**
   * 获取索引
   */
  get(id: ID): T | undefined {
    return this.cache.get(id);
  }

  /**
   * 批量获取索引
   */
  getBatch(ids: ID[]): Map<ID, T> {
    const result = new Map<ID, T>();
    ids.forEach(id => {
      const value = this.cache.get(id);
      if (value !== undefined) {
        result.set(id, value);
      }
    });
    return result;
  }

  /**
   * 获取所有索引
   */
  values(): T[] {
    return Array.from(this.cache.values());
  }

  /**
   * 删除索引
   */
  delete(id: ID): boolean {
    return this.cache.delete(id);
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
}
