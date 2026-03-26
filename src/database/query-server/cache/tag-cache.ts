/**
 * 标签缓存模块
 * 存储标签到索引数组(SortedArray)的映射，用于高效标签查询
 */

/**
 * 标签缓存条目
 */
export interface TagCacheEntry {
  /** 标签ID */
  tagId: number;
  /** 索引数组（升序，无重复） */
  indices: number[];
  /** 最后更新时间 */
  lastUpdate: number;
  /** 总数据量 */
  totalCount: number;
}

/**
 * 标签缓存类
 * 特性：
 * - 使用SortedArray替代Set，实现可预测的内存占用和高效的集合运算
 * - 标签映射存储的是索引而非完整ID，大幅减少内存消耗
 * - 支持增量更新，避免全量重建的开销
 * - 与IndexCache协同工作，先粗筛再精筛
 * - 不包含过期时间，长期驻留内存
 * - 无容量限制，不需要清理
 */
export class TagCache {
  /** 标签到索引数组的映射 */
  private tagMap: Map<number, number[]> = new Map();

  /** 全局索引映射（id → index） */
  private indexMap: Map<number, number> = new Map();

  /** 反向索引映射（index → id） */
  private reverseIndexMap: Map<number, number> = new Map();

  /** 下一个可用的索引 */
  private nextIndex: number = 0;

  constructor() {
    // 无容量限制，不需要任何参数
  }

  /**
   * 初始化全局索引映射
   * @param ids 所有ID的列表
   */
  initializeIndexMap(ids: number[]): void {
    this.indexMap.clear();
    this.reverseIndexMap.clear();
    this.nextIndex = 0;

    ids.forEach(id => {
      this.indexMap.set(id, this.nextIndex);
      this.reverseIndexMap.set(this.nextIndex, id);
      this.nextIndex++;
    });
  }

  /**
   * 获取ID对应的索引
   * @param id 数据ID
   * @returns 索引，如果不存在返回undefined
   */
  getIndex(id: number): number | undefined {
    return this.indexMap.get(id);
  }

  /**
   * 获取索引对应的ID
   * @param index 索引
   * @returns 数据ID，如果不存在返回undefined
   */
  getId(index: number): number | undefined {
    return this.reverseIndexMap.get(index);
  }

  /**
   * 批量获取ID对应的索引
   * @param ids ID列表
   * @returns 索引映射
   */
  getIndices(ids: number[]): Map<number, number> {
    const result = new Map<number, number>();
    ids.forEach(id => {
      const index = this.indexMap.get(id);
      if (index !== undefined) {
        result.set(id, index);
      }
    });
    return result;
  }

  /**
   * 批量获取索引对应的ID
   * @param indices 索引列表
   * @returns ID映射
   */
  getIds(indices: number[]): Map<number, number> {
    const result = new Map<number, number>();
    indices.forEach(index => {
      const id = this.reverseIndexMap.get(index);
      if (id !== undefined) {
        result.set(index, id);
      }
    });
    return result;
  }

  /**
   * 添加新的数据ID，分配新索引
   * @param id 新的数据ID
   * @returns 分配的索引
   */
  addId(id: number): number {
    if (this.indexMap.has(id)) {
      return this.indexMap.get(id)!;
    }

    const index = this.nextIndex++;
    this.indexMap.set(id, index);
    this.reverseIndexMap.set(index, id);
    return index;
  }

  /**
   * 移除数据ID及其索引
   * @param id 要移除的数据ID
   * @returns 是否成功移除
   */
  removeId(id: number): boolean {
    const index = this.indexMap.get(id);
    if (index === undefined) {
      return false;
    }

    // 从所有标签的索引数组中移除该索引
    this.tagMap.forEach(indices => {
      this.removeSortedIndex(indices, index);
    });

    // 从索引映射中移除
    this.indexMap.delete(id);
    this.reverseIndexMap.delete(index);

    return true;
  }

  /**
   * 设置标签的索引数组
   * @param tagId 标签ID
   * @param indices 索引数组（升序，无重复）
   */
  setTagIndices(tagId: number, indices: number[]): void {
    // 确保数组是升序且无重复的
    const sortedIndices = this.sortAndUnique(indices);
    this.tagMap.set(tagId, sortedIndices);
  }

  /**
   * 批量设置标签的索引数组
   * @param entries 标签到索引数组的映射
   */
  setTagIndicesBatch(entries: Map<number, number[]> | Record<string, number[]>): void {
    if (entries instanceof Map) {
      entries.forEach((indices, tagId) => this.setTagIndices(tagId, indices));
    } else {
      Object.entries(entries).forEach(([tagId, indices]) => this.setTagIndices(Number(tagId), indices));
    }
  }

  /**number
   * 获取标签的索引数组
   * @param tagId 标签ID
   * @returns 索引数组，如果不存在返回空数组
   */
  getTagIndices(tagId: number): number[] {
    return this.tagMap.get(tagId) || [];
  }

  /**
   * 批量获取标签的索引数组
   * @param tagIds 标签ID列表
   * @returns 标签到索引数组的映射
   */
  getTagIndicesBatch(tagIds: number[]): Map<number, number[]> {
    const result = new Map<number, number[]>();
    tagIds.forEach(tagId => {
      const indices = this.tagMap.get(tagId);
      if (indices) {
        result.set(tagId, indices);
      }
    });
    return result;
  }

  /**
   * 向标签添加索引
   * @param tagId 标签ID
   * @param index 要添加的索引
   */
  addIndexToTag(tagId: number, index: number): void {
    let indices = this.tagMap.get(tagId);
    if (!indices) {
      indices = [];
      this.tagMap.set(tagId, indices);
    }

    // 如果索引已存在，不添加
    if (this.binarySearch(indices, index) !== -1) {
      return;
    }

    // 插入到正确位置以保持升序
    this.insertSortedIndex(indices, index);
  }

  /**
   * 批量向标签添加索引
   * @param tagId 标签ID
   * @param indices 要添加的索引列表
   */
  addIndicesToTag(tagId: number, indices: number[]): void {
    indices.forEach(index => this.addIndexToTag(tagId, index));
  }

  /**
   * 从标签移除索引
   * @param tagId 标签ID
   * @param index 要移除的索引
   * @returns 是否成功移除
   */
  removeIndexFromTag(tagId: number, index: number): boolean {
    const indices = this.tagMap.get(tagId);
    if (!indices) {
      return false;
    }

    const removed = this.removeSortedIndex(indices, index);
    if (indices.length === 0) {
      this.tagMap.delete(tagId);
    }
    return removed;
  }

  /**
   * 批量从标签移除索引
   * @param tagId 标签ID
   * @param indices 要移除的索引列表
   * @returns 成功移除的数量
   */
  removeIndicesFromTag(tagId: number, indices: number[]): number {
    let count = 0;
    indices.forEach(index => {
      if (this.removeIndexFromTag(tagId, index)) {
        count++;
      }
    });
    return count;
  }

  /**
   * 获取标签缓存条目
   * @param tagId 标签ID
   * @returns 标签缓存条目，如果不存在返回undefined
   */
  getTagEntry(tagId: number): TagCacheEntry | undefined {
    const indices = this.tagMap.get(tagId);
    if (!indices) {
      return undefined;
    }

    return {
      tagId,
      indices: [...indices], // 返回副本
      lastUpdate: Date.now(),
      totalCount: indices.length
    };
  }

  /**
   * 获取所有标签ID
   * @returns 标签ID列表
   */
  getTagIds(): number[] {
    return Array.from(this.tagMap.keys());
  }

  /**
   * 清空所有标签缓存
   */
  clear(): void {
    this.tagMap.clear();
    this.indexMap.clear();
    this.reverseIndexMap.clear();
    this.nextIndex = 0;
  }

  /**
   * 获取缓存统计信息
   * @returns 统计信息
   */
  getStats(): {
    tagCount: number;
    totalIndices: number;
    indexMapSize: number;
    nextIndex: number;
  } {
    let totalIndices = 0;
    this.tagMap.forEach(indices => {
      totalIndices += indices.length;
    });

    return {
      tagCount: this.tagMap.size,
      totalIndices,
      indexMapSize: this.indexMap.size,
      nextIndex: this.nextIndex
    };
  }

  /**
   * 二分查找
   * @param arr 升序数组
   * @param target 目标值
   * @returns 目标值的索引，如果不存在返回-1
   */
  private binarySearch(arr: number[], target: number): number {
    let left = 0;
    let right = arr.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (arr[mid] === target) {
        return mid;
      } else if (arr[mid] < target) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return -1;
  }

  /**
   * 在升序数组中插入值，保持升序
   * @param arr 升序数组
   * @param value 要插入的值
   */
  private insertSortedIndex(arr: number[], value: number): void {
    let left = 0;
    let right = arr.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (arr[mid] === value) {
        return; // 已存在，不插入
      } else if (arr[mid] < value) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    // 在left位置插入
    arr.splice(left, 0, value);
  }

  /**
   * 从升序数组中移除值
   * @param arr 升序数组
   * @param value 要移除的值
   * @returns 是否成功移除
   */
  private removeSortedIndex(arr: number[], value: number): boolean {
    const index = this.binarySearch(arr, value);
    if (index === -1) {
      return false;
    }

    arr.splice(index, 1);
    return true;
  }

  /**
   * 对数组进行排序并去重
   * @param arr 数组
   * @returns 排序并去重后的数组
   */
  private sortAndUnique(arr: number[]): number[] {
    const sorted = [...arr].sort((a, b) => a - b);
    const result: number[] = [];

    for (let i = 0; i < sorted.length; i++) {
      if (i === 0 || sorted[i] !== sorted[i - 1]) {
        result.push(sorted[i]);
      }
    }

    return result;
  }
}
