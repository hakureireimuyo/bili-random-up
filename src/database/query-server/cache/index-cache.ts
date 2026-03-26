/**
 * 索引缓存模块
 * 管理索引的内存缓存，提供高性能的索引查询
 */

/**
 * 索引缓存类
 * 支持泛型，可以存储任意类型的索引
 */
export class IndexCache<T> {
  private cache: Map<string, T> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  /**
   * 设置索引
   */
  set(id: string, index: T): void {
    // 如果键已存在，先删除再重新添加以更新访问顺序
    if (this.cache.has(id)) {
      this.cache.delete(id);
    }
    // 如果缓存已满，删除最旧的条目（第一个键）
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(id, index);
  }

  /**
   * 批量设置索引
   */
  setBatch(entries: Map<string, T> | Record<string, T>): void {
    if (entries instanceof Map) {
      entries.forEach((index, id) => this.set(id, index));
    } else {
      Object.entries(entries).forEach(([id, index]) => this.set(id, index));
    }
  }

  /**
   * 获取索引
   */
  get(id: string): T | undefined {
    return this.cache.get(id);
  }

  /**
   * 批量获取索引
   */
  getBatch(ids: string[]): Map<string, T> {
    const result = new Map<string, T>();
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
  delete(id: string): boolean {
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
