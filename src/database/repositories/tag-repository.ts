/**
 * Tag Repository
 *
 * 作为数据中枢与唯一数据入口，负责：
 * 1. 数据库访问 - 封装所有数据库操作
 * 2. 缓存管理 - 统一管理 IndexCache、TagCache 和 DataCache
 * 3. 数据一致性 - 在数据库与缓存之间建立一致性保障机制
 * 4. 数据转换 - index ↔ id ↔ 完整对象
 * 5. 基于ID列表的数据获取 - 为上层提供稳定的数据访问方式
 */

import type { Tag } from '../types/semantic.js';
import type { ID, TagSource, PaginationParams, PaginationResult } from '../types/base.js';

import { CacheManager } from '../query-server/cache/cache-manager.js';
import { TagRepositoryImpl } from '../implementations/tag-repository.impl.js';
import type { IDataRepository } from '../query-server/book/base-book-manager.js';

/**
 * Tag Repository 类
 * 实现 IDataRepository 接口，为 Book 层提供数据访问能力
 */
export class TagRepository implements IDataRepository<Tag> {
  private repository: TagRepositoryImpl;
  private cacheManager: CacheManager;
  private dataCache: ReturnType<CacheManager['getTagDataCache']>;
  private tagCache: ReturnType<CacheManager['getTagCache']>;

  constructor() {
    this.repository = new TagRepositoryImpl();
    this.cacheManager = CacheManager.getInstance();
    this.dataCache = this.cacheManager.getTagDataCache();
    this.tagCache = this.cacheManager.getTagCache();
  }

  // ==================== 数据访问职责 ====================

  /**
   * 获取单个标签
   * 优先从 DataCache 获取，未命中则从数据库获取并更新缓存
   */
  async getTag(tagId: ID): Promise<Tag | null> {
    // 先从 DataCache 获取
    const cached = this.dataCache.get(tagId) as Tag | undefined;
    if (cached) {
      return cached;
    }

    // 缓存未命中，从数据库获取
    const tag = await this.repository.getTag(tagId);
    if (tag) {
      // 更新缓存
      this.dataCache.set(tagId, tag);
    }
    return tag;
  }

  /**
   * 批量获取标签
   * 优先从 DataCache 获取，未命中的从数据库获取并更新缓存
   */
  async getTags(tagIds: ID[]): Promise<Map<ID, Tag>> {
    const result = new Map<ID, Tag>();
    const uncachedIds: ID[] = [];

    // 1. 先从 DataCache 获取已缓存的数据
    tagIds.forEach(id => {
      const cached = this.dataCache.get(id) as Tag | undefined;
      if (cached) {
        result.set(id, cached);
      } else {
        uncachedIds.push(id);
      }
    });

    // 2. 从数据库获取未缓存的数据
    if (uncachedIds.length > 0) {
      const dbTags = await this.repository.getTags(uncachedIds);

      // 3. 更新 DataCache
      const cacheEntries = new Map<number, Tag>();
      dbTags.forEach(tag => {
        cacheEntries.set(tag.tagId, tag);
        result.set(tag.tagId, tag);
      });
      this.dataCache.setBatch(cacheEntries);
    }

    return result;
  }

  /**
   * 创建标签
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async createTag(name: string, source: TagSource): Promise<ID> {
    // 1. 先更新数据库
    const tagId = await this.repository.createTag(name, source);

    // 2. 从数据库获取完整标签并更新缓存
    const tag = await this.repository.getTag(tagId);
    if (tag) {
      this.updateAllCaches(tag);
    }

    return tagId;
  }

  /**
   * 批量创建标签
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async createTags(names: string[], source: TagSource): Promise<ID[]> {
    // 1. 先更新数据库
    const tagIds = await this.repository.createTags(names, source);

    // 2. 批量获取标签并更新缓存
    const tags = await this.repository.getTags(tagIds);
    tags.forEach(tag => this.updateAllCaches(tag));

    return tagIds;
  }

  /**
   * 删除标签
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async deleteTag(tagId: ID): Promise<boolean> {
    // 1. 先更新数据库
    const result = await this.repository.deleteTag(tagId);

    if (result) {
      // 2. 从缓存中移除
      this.dataCache.delete(tagId);
      // TagCache 的清理由 CacheManager 统一管理
    }

    return result;
  }

  /**
   * 批量删除标签
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async deleteTags(tagIds: ID[]): Promise<void> {
    // 1. 先更新数据库
    await this.repository.deleteTags(tagIds);

    // 2. 从缓存中移除
    tagIds.forEach(id => this.dataCache.delete(id));
    // TagCache 的清理由 CacheManager 统一管理
  }

  /**
   * 通过名称查找标签
   */
  async findTagByName(name: string): Promise<Tag | null> {
    return this.repository.findTagByName(name);
  }

  /**
   * 搜索标签
   */
  async searchTags(
    keyword: string,
    pagination?: PaginationParams
  ): Promise<PaginationResult<Tag>> {
    return this.repository.searchTags(keyword, pagination);
  }

  /**
   * 获取所有标签（分页）
   */
  async getAllTags(pagination?: PaginationParams): Promise<PaginationResult<Tag>> {
    return this.repository.getAllTags(pagination);
  }

  /**
   * 按来源获取标签
   */
  async getTagsBySource(source: TagSource, pagination?: PaginationParams): Promise<PaginationResult<Tag>> {
    return this.repository.getTagsBySource(source, pagination);
  }

  /**
   * 获取系统标签
   */
  async getSystemTags(pagination?: PaginationParams): Promise<PaginationResult<Tag>> {
    return this.repository.getSystemTags(pagination);
  }

  /**
   * 获取用户标签
   */
  async getUserTags(pagination?: PaginationParams): Promise<PaginationResult<Tag>> {
    return this.repository.getUserTags(pagination);
  }

  // ==================== 缓存管理职责 ====================

  /**
   * 更新所有缓存（DataCache、TagCache）
   * 这是唯一允许修改缓存的地方
   */
  private updateAllCaches(tag: Tag): void {
    // 1. 更新 DataCache
    this.dataCache.set(tag.tagId, tag);

    // 2. TagCache 的更新由 CacheManager 统一管理
    // Repository 不直接操作 TagCache 的内部结构
  }

  // ==================== 数据转换职责 ====================

  /**
   * 将 ID 列表转换为 Tag 对象列表
   * 协调 DataCache 与数据库完成数据加载
   */
  async getTagsByIds(ids: ID[]): Promise<Tag[]> {
    const tagMap = await this.getTags(ids);
    return ids.map(id => tagMap.get(id)).filter((t): t is Tag => t !== undefined);
  }

  // ==================== IDataRepository 接口实现 ====================

  /**
   * 根据ID获取单个数据
   * 实现 IDataRepository 接口
   */
  async getById(id: number): Promise<Tag | null> {
    return this.getTag(id);
  }

  /**
   * 根据ID列表批量获取数据
   * 实现 IDataRepository 接口
   */
  async getByIds(ids: number[]): Promise<Tag[]> {
    return this.getTagsByIds(ids);
  }

  /**
   * 获取所有数据
   * 实现 IDataRepository 接口
   */
  async getAll(): Promise<Tag[]> {
    // 从数据库获取所有标签
    const allTags = await this.repository.getAllTags();

    // 批量更新缓存
    const cacheEntries = new Map<number, Tag>();
    allTags.items.forEach(tag => {
      cacheEntries.set(tag.tagId, tag);
    });
    this.dataCache.setBatch(cacheEntries);

    return allTags.items;
  }

  // ==================== 缓存统计职责 ====================

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    dataCache: {
      size: number;
      totalAccesses: number;
      avgAccessCount: number;
      oldestEntry?: number;
      newestEntry?: number;
    };
    tagCache: {
      tagCount: number;
      totalIndices: number;
      indexMapSize: number;
      nextIndex: number;
    };
  } {
    const stats = this.cacheManager.getStats();
    return {
      dataCache: stats.tagDataCache,
      tagCache: stats.tagCache
    };
  }
}
