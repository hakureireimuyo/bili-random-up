/**
 * Creator Repository
 * 
 * 作为数据中枢与唯一数据入口，负责：
 * 1. 数据库访问 - 封装所有数据库操作
 * 2. 缓存管理 - 统一管理 IndexCache、TagCache 和 DataCache
 * 3. 数据一致性 - 在数据库与缓存之间建立一致性保障机制
 * 4. 数据转换 - index ↔ id ↔ 完整对象
 * 5. 基于ID列表的数据获取 - 为上层提供稳定的数据访问方式
 */

import type {
  Creator,
  CreatorTagWeight
} from '../types/creator.js';
import type { Tag } from '../types/semantic.js';
import type { ID, Platform, PaginationParams, PaginationResult } from '../types/base.js';
import type { CreatorIndex } from '../query-server/cache/types.js';

import { CacheManager } from '../query-server/cache/cache-manager.js';
import { CreatorRepositoryImpl } from '../implementations/creator-repository.impl.js';
import type { IDataRepository } from '../query-server/book/base-book-manager.js';

/**
 * Creator Repository 类
 * 实现 IDataRepository 接口，为 Book 层提供数据访问能力
 */
export class CreatorRepository implements IDataRepository<Creator> {
  private repository: CreatorRepositoryImpl;
  private cacheManager: CacheManager;
  private indexCache: ReturnType<CacheManager['getIndexCache']>;
  private dataCache: ReturnType<CacheManager['getCreatorDataCache']>;
  private tagCache: ReturnType<CacheManager['getTagCache']>;

  constructor() {
    this.repository = new CreatorRepositoryImpl();
    this.cacheManager = CacheManager.getInstance();
    this.indexCache = this.cacheManager.getIndexCache();
    this.dataCache = this.cacheManager.getCreatorDataCache();
    this.tagCache = this.cacheManager.getTagCache();
  }

  // ==================== 数据访问职责 ====================

  /**
   * 获取单个创作者
   * 优先从 DataCache 获取，未命中则从数据库获取并更新缓存
   */
  async getCreator(creatorId: ID): Promise<Creator | null> {
    // 先从 DataCache 获取
    const cached = this.dataCache.get(creatorId) as Creator | undefined;
    if (cached) {
      return cached;
    }

    // 缓存未命中，从数据库获取
    const creator = await this.repository.getCreator(creatorId);
    if (creator) {
      // 更新缓存
      this.dataCache.set(creatorId, creator);
    }
    return creator;
  }

  /**
   * 批量获取创作者
   * 优先从 DataCache 获取，未命中的从数据库获取并更新缓存
   */
  async getCreators(creatorIds: ID[]): Promise<Map<ID, Creator>> {
    const result = new Map<ID, Creator>();
    const uncachedIds: ID[] = [];

    // 1. 先从 DataCache 获取已缓存的数据
    creatorIds.forEach(id => {
      const cached = this.dataCache.get(id) as Creator | undefined;
      if (cached) {
        result.set(id, cached);
      } else {
        uncachedIds.push(id);
      }
    });

    // 2. 从数据库获取未缓存的数据
    if (uncachedIds.length > 0) {
      const dbCreators = await this.repository.getCreators(uncachedIds);

      // 3. 更新 DataCache
      const cacheEntries = new Map<number, Creator>();
      dbCreators.forEach(creator => {
        cacheEntries.set(creator.creatorId, creator);
        result.set(creator.creatorId, creator);
      });
      this.dataCache.setBatch(cacheEntries);
    }

    return result;
  }

  /**
   * 创建或更新创作者
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async upsertCreator(creator: Creator): Promise<void> {
    // 1. 先更新数据库
    await this.repository.upsertCreator(creator);

    // 2. 更新缓存
    this.updateAllCaches(creator);
  }

  /**
   * 批量创建或更新创作者
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async upsertCreators(creators: Creator[]): Promise<void> {
    // 1. 先更新数据库
    await this.repository.upsertCreators(creators);

    // 2. 更新缓存
    creators.forEach(creator => this.updateAllCaches(creator));
  }

  /**
   * 更新创作者标签权重
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async updateTagWeights(
    creatorId: ID,
    tagWeights: CreatorTagWeight[]
  ): Promise<void> {
    // 1. 先更新数据库
    await this.repository.updateTagWeights(creatorId, tagWeights);

    // 2. 更新缓存
    const creator = await this.getCreator(creatorId);
    if (creator) {
      this.updateAllCaches(creator);
    }
  }

  /**
   * 更新创作者关注状态
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async updateFollowStatus(
    creatorId: ID,
    isFollowing: number
  ): Promise<void> {
    // 1. 先更新数据库
    await this.repository.updateFollowStatus(creatorId, isFollowing);

    // 2. 更新缓存
    const creator = await this.getCreator(creatorId);
    if (creator) {
      this.updateAllCaches(creator);
    }
  }

  /**
   * 获取指定平台的全部创作者
   * 先从缓存获取，未命中则从数据库获取
   */
  async getAllCreators(platform: Platform): Promise<Creator[]> {
    // 从数据库获取指定平台的创作者
    const creators = await this.repository.getAllCreators(platform);

    // 批量更新缓存
    const cacheEntries = new Map<number, Creator>();
    creators.forEach(creator => {
      cacheEntries.set(creator.creatorId, creator);
    });
    this.dataCache.setBatch(cacheEntries);

    return creators;
  }

  /**
   * 获取分页后的创作者数据
   * 先从缓存获取，未命中则从数据库获取
   */
  async getPaginatedCreators(
    platform: Platform,
    params: PaginationParams = { page: 1, pageSize: 20 }
  ): Promise<PaginationResult<Creator>> {
    // 从数据库获取分页数据
    const result = await this.repository.getPaginatedCreators(platform, params);

    // 批量更新缓存
    const cacheEntries = new Map<number, Creator>();
    result.items.forEach(creator => {
      cacheEntries.set(creator.creatorId, creator);
    });
    this.dataCache.setBatch(cacheEntries);

    return result;
  }

  /**
   * 获取已关注的创作者
   * 先从缓存获取，未命中则从数据库获取
   */
  async getFollowingCreators(platform: Platform): Promise<Creator[]> {
    // 从数据库获取已关注的创作者
    const creators = await this.repository.getFollowingCreators(platform);

    // 批量更新缓存
    const cacheEntries = new Map<number, Creator>();
    creators.forEach(creator => {
      cacheEntries.set(creator.creatorId, creator);
    });
    this.dataCache.setBatch(cacheEntries);

    return creators;
  }

  /**
   * 获取已关注的创作者(分页)
   * 先从缓存获取，未命中则从数据库获取
   */
  async getPaginatedFollowingCreators(
    platform: Platform,
    params: PaginationParams = { page: 1, pageSize: 20 }
  ): Promise<PaginationResult<Creator>> {
    // 从数据库获取分页数据
    const result = await this.repository.getPaginatedFollowingCreators(platform, params);

    // 批量更新缓存
    const cacheEntries = new Map<number, Creator>();
    result.items.forEach(creator => {
      cacheEntries.set(creator.creatorId, creator);
    });
    this.dataCache.setBatch(cacheEntries);

    return result;
  }

  /**
   * 获取创作者的手动标签ID列表
   */
  async getUPManualTags(creatorId: ID): Promise<ID[]> {
    return await this.repository.getUPManualTags(creatorId);
  }

  /**
   * 添加单个标签到创作者
   * @param creatorId 创作者ID
   * @param tag 标签对象（由调用方提供完整的 Tag 信息）
   * @returns 是否成功添加
   */
  async addTag(creatorId: ID, tag: Tag): Promise<boolean> {
    // 1. 调用 repository 层实现添加标签
    const result = await this.repository.addTag(creatorId, tag);

    // 2. 如果添加成功，更新缓存
    if (result) {
      const creator = await this.getCreator(creatorId);
      if (creator) {
        this.updateAllCaches(creator);
      }
    }

    return result;
  }

  /**
   * 从创作者移除单个标签
   * @param creatorId 创作者ID
   * @param tag 标签对象（由调用方提供完整的 Tag 信息）
   * @returns 是否成功移除
   */
  async removeTag(creatorId: ID, tag: Tag): Promise<boolean> {
    // 1. 调用 repository 层实现移除标签
    const result = await this.repository.removeTag(creatorId, tag);

    // 2. 如果移除成功，更新缓存
    if (result) {
      const creator = await this.getCreator(creatorId);
      if (creator) {
        this.updateAllCaches(creator);
      }
    }

    return result;
  }

  /**
   * 删除创作者
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async deleteCreator(creatorId: ID): Promise<void> {
    // 1. 先更新数据库
    await this.repository.deleteCreator(creatorId);

    // 2. 从缓存中移除
    this.dataCache.delete(creatorId);
    // IndexCache 和 TagCache 的清理由 CacheManager 统一管理
  }

  /**
   * 标记创作者为已注销
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async markCreatorAsLogout(creatorId: ID): Promise<void> {
    // 1. 先更新数据库
    await this.repository.markCreatorAsLogout(creatorId);

    // 2. 更新缓存
    const creator = await this.getCreator(creatorId);
    if (creator) {
      this.updateAllCaches(creator);
    }
  }

  /**
   * 获取指定平台的创作者数量
   */
  async getCreatorCount(platform: Platform): Promise<number> {
    return await this.repository.getCreatorCount(platform);
  }

  /**
   * 获取已关注创作者数量
   */
  async getFollowedCount(platform: Platform): Promise<number> {
    return await this.repository.getFollowedCount(platform);
  }

  /**
   * 获取未关注创作者数量
   */
  async getUnfollowedCount(platform: Platform): Promise<number> {
    return await this.repository.getUnfollowedCount(platform);
  }

  /**
   * 更新创作者头像URL
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async updateAvatarUrl(creatorId: ID, avatarUrl: string): Promise<void> {
    // 1. 先更新数据库
    await this.repository.updateAvatarUrl(creatorId, avatarUrl);

    // 2. 更新缓存
    const creator = await this.getCreator(creatorId);
    if (creator) {
      this.updateAllCaches(creator);
    }
  }

  /**
   * 获取创作者头像二进制数据
   * 如果本地没有头像数据，会尝试从URL下载并存储
   */
  async getAvatarBinary(creatorId: ID): Promise<Blob | null> {
    return await this.repository.getAvatarBinary(creatorId);
  }

  /**
   * 保存创作者头像二进制数据
   * 将二进制数据存储到images_data表中，并更新creator表的avatar字段
   */
  async saveAvatarBinary(creatorId: ID, avatarBlob: Blob): Promise<void> {
    // 1. 先更新数据库
    await this.repository.saveAvatarBinary(creatorId, avatarBlob);

    // 2. 更新缓存
    const creator = await this.getCreator(creatorId);
    if (creator) {
      this.updateAllCaches(creator);
    }
  }

  /**
   * 删除创作者头像二进制数据
   * 同时清除images_data表中的对应数据
   */
  async deleteAvatarBinary(creatorId: ID): Promise<void> {
    // 1. 先更新数据库
    await this.repository.deleteAvatarBinary(creatorId);

    // 2. 更新缓存
    const creator = await this.getCreator(creatorId);
    if (creator) {
      this.updateAllCaches(creator);
    }
  }

  // ==================== 缓存管理职责 ====================

  /**
   * 更新所有缓存（IndexCache、TagCache、DataCache）
   * 这是唯一允许修改缓存的地方
   */
  private updateAllCaches(creator: Creator): void {
    // 1. 更新 IndexCache
    this.updateIndexCache(creator);

    // 2. 更新 TagCache
    this.updateTagCache(creator);

    // 3. 更新 DataCache
    this.dataCache.set(creator.creatorId, creator);
  }

  /**
   * 更新 IndexCache
   * 将 Creator 转换为 CreatorIndex
   */
  private updateIndexCache(creator: Creator): void {
    const index: CreatorIndex = {
      creatorId: creator.creatorId,
      name: creator.name,
      tags: creator.tagWeights.map(tw => tw.tagId),
      isFollowing: creator.isFollowing === 1
    };
    this.indexCache.set(creator.creatorId, index);
  }

  /**
   * 更新 TagCache
   * 更新创作者关联的所有标签映射
   */
  private updateTagCache(creator: Creator): void {
    creator.tagWeights.forEach(tagWeight => {
      // 更新标签到创作者的映射
      // 注意：TagCache 的具体实现由 Cache 层负责，这里只负责调用更新
      // 实际的更新逻辑应该在 TagCache 内部实现
    });
  }

  // ==================== 数据转换职责 ====================

  /**
   * 将 ID 列表转换为 Creator 对象列表
   * 协调 DataCache 与数据库完成数据加载
   */
  async getCreatorsByIds(ids: ID[]): Promise<Creator[]> {
    const creatorMap = await this.getCreators(ids);
    return ids.map(id => creatorMap.get(id)).filter((c): c is Creator => c !== undefined);
  }

  // ==================== IDataRepository 接口实现 ====================

  /**
   * 根据ID获取单个数据
   * 实现 IDataRepository 接口
   */
  async getById(id: ID): Promise<Creator | null> {
    return this.getCreator(id);
  }

  /**
   * 根据ID列表批量获取数据
   * 实现 IDataRepository 接口
   */
  async getByIds(ids: ID[]): Promise<Creator[]> {
    return this.getCreatorsByIds(ids);
  }

  /**
   * 获取所有数据
   * 实现 IDataRepository 接口
   */
  async getAll(): Promise<Creator[]> {
    // 从数据库获取所有创作者
    const allCreators = await this.repository.getAll();

    // 批量更新缓存
    const cacheEntries = new Map<number, Creator>();
    allCreators.forEach(creator => {
      cacheEntries.set(creator.creatorId, creator);
    });
    this.dataCache.setBatch(cacheEntries);

    return allCreators;
  }
  
  // ==================== 缓存统计职责 ====================

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    creatorDataCache: {
      size: number;
      totalAccesses: number;
      avgAccessCount: number;
      oldestEntry?: number;
      newestEntry?: number;
    };
    indexCache: {
      size: number;
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
      creatorDataCache: stats.creatorDataCache,
      indexCache: stats.indexCache,
      tagCache: stats.tagCache
    };
  }
}
