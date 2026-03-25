/**
 * Creator查询Repository
 * 对外提供统一的高性能查询接口，隐藏底层实现细节
 */

import type { 
  Creator, 
  CreatorTagWeight 
} from '../types/creator.js';
import type { 
  BookQueryOptions, 
  BookQueryResult, 
  QueryCondition,
  TagExpression 
} from '../query-server/query/types.js';
import { Platform } from '../types/base.js';
import { BookManager } from '../query-server/book/book.js';
import { IndexCache } from '../query-server/cache/index.js';
import { DataCache } from '../query-server/cache/index.js';
import { CreatorRepository as CreatorRepositoryImpl } from '../implementations/creator-repository.impl.js';

/**
 * Creator查询Repository类
 */
export class CreatorRepository {
  private bookManager: BookManager;
  private repository: CreatorRepositoryImpl;

  constructor() {
    this.repository = new CreatorRepositoryImpl();
    this.bookManager = new BookManager(undefined, undefined, this.repository);
  }

  /**
   * 获取索引缓存实例
   */
  private get indexCache(): IndexCache<import('../query-server/query/types.js').CreatorIndex> {
    return this.bookManager.getIndexCache();
  }

  /**
   * 获取数据缓存实例
   */
  private get dataCache(): DataCache<Creator> {
    return this.bookManager.getDataCache();
  }

  /**
   * 创建名称查询书
   * @param platform 平台
   * @param keyword 搜索关键词
   * @param isFollowing 是否只查询已关注的
   * @param options 查询选项
   * @returns 书ID
   */
  async createNameQueryBook(
    platform: Platform,
    keyword: string,
    isFollowing?: boolean,
    options: BookQueryOptions = {}
  ): Promise<string> {
    const condition: QueryCondition = {
      type: 'name',
      platform,
      keyword,
      isFollowing
    };
    const book = await this.bookManager.createBook(condition, options);
    return book.bookId;
  }

  /**
   * 创建标签查询书
   * @param platform 平台
   * @param tagExpressions 标签表达式列表
   * @param isFollowing 是否只查询已关注的
   * @param options 查询选项
   * @returns 书ID
   */
  async createTagQueryBook(
    platform: Platform,
    tagExpressions: TagExpression[],
    isFollowing?: boolean,
    options: BookQueryOptions = {}
  ): Promise<string> {
    const condition: QueryCondition = {
      type: 'tag',
      platform,
      tagExpressions,
      isFollowing
    };
    const book = await this.bookManager.createBook(condition, options);
    return book.bookId;
  }

  /**
   * 获取书页数据
   * @param bookId 书ID
   * @param page 页码
   * @param options 查询选项
   * @returns 查询结果
   */
  async getPage(
    bookId: string,
    page: number,
    options: BookQueryOptions = {}
  ): Promise<BookQueryResult<Creator>> {
    return await this.bookManager.getPage(bookId, page, options);
  }

  /**
   * 更新查询条件
   * @param bookId 书ID
   * @param newCondition 新的查询条件
   * @returns 更新后的书
   */
  async updateQueryCondition(
    bookId: string,
    newCondition: QueryCondition
  ): Promise<void> {
    await this.bookManager.updateQueryCondition(bookId, newCondition);
  }

  /**
   * 删除书
   * @param bookId 书ID
   */
  deleteBook(bookId: string): boolean {
    return this.bookManager.deleteBook(bookId);
  }

  /**
   * 获取单个创作者
   * @param creatorId 创作者ID
   * @param platform 平台
   * @returns 创作者对象
   */
  async getCreator(
    creatorId: string,
    platform: Platform
  ): Promise<Creator | null> {
    // 先从缓存获取
    const cached = this.dataCache.get(creatorId);
    if (cached) {
      return cached;
    }

    // 从数据库获取
    const creator = await this.repository.getCreator(creatorId, platform);
    if (creator) {
      this.dataCache.set(creator.creatorId, creator);
    }
    return creator;
  }

  /**
   * 批量获取创作者
   * @param creatorIds 创作者ID列表
   * @param platform 平台
   * @returns 创作者对象Map
   */
  async getCreators(
    creatorIds: string[],
    platform: Platform
  ): Promise<Map<string, Creator>> {
    // 先从缓存获取
    const cachedCreators = this.dataCache.getBatch(creatorIds);
    const uncachedIds = creatorIds.filter(id => 
      !cachedCreators.some((c: Creator) => c.creatorId === id)
    );

    // 从数据库获取未缓存的数据
    let dbCreators: Creator[] = [];
    if (uncachedIds.length > 0) {
      dbCreators = await this.repository.getCreators(uncachedIds, platform);
      // 使用setBatch批量设置数据
      const entries = new Map<string, Creator>();
      dbCreators.forEach(creator => entries.set(creator.creatorId, creator));
      this.dataCache.setBatch(entries);
    }

    // 合并结果
    const result = new Map<string, Creator>();
    [...cachedCreators, ...dbCreators].forEach(creator => {
      result.set(creator.creatorId, creator);
    });

    return result;
  }

  /**
   * 创建或更新创作者
   * @param creator 创作者对象
   */
  async upsertCreator(creator: Creator): Promise<void> {
    await this.repository.upsertCreator(creator);
    this.dataCache.set(creator.creatorId, creator);

    // 更新索引缓存
    const index = {
      creatorId: creator.creatorId,
      name: creator.name,
      tags: creator.tagWeights.map(tw => tw.tagId),
      isFollowing: creator.isFollowing === 1
    };
    this.indexCache.set(creator.creatorId, index);
  }

  /**
   * 批量创建或更新创作者
   * @param creators 创作者对象列表
   */
  async upsertCreators(creators: Creator[]): Promise<void> {
    await this.repository.upsertCreators(creators);
    // 使用setBatch批量设置数据
    const entries = new Map<string, Creator>();
    creators.forEach(creator => entries.set(creator.creatorId, creator));
    this.dataCache.setBatch(entries);

    // 更新索引缓存
    const indexes = creators.map(creator => ({
      creatorId: creator.creatorId,
      name: creator.name,
      tags: creator.tagWeights.map(tw => tw.tagId),
      isFollowing: creator.isFollowing === 1
    }));
    const indexEntries = new Map<string, import('../query-server/query/types.js').CreatorIndex>();
    indexes.forEach(index => indexEntries.set(index.creatorId, index));
    this.indexCache.setBatch(indexEntries);
  }

  /**
   * 更新创作者标签权重
   * @param creatorId 创作者ID
   * @param platform 平台
   * @param tagWeights 标签权重列表
   */
  async updateTagWeights(
    creatorId: string,
    platform: Platform,
    tagWeights: CreatorTagWeight[]
  ): Promise<void> {
    await this.repository.updateTagWeights(creatorId, platform, tagWeights);

    // 更新缓存
    const creator = await this.getCreator(creatorId,Platform.BILIBILI);
    if (creator) {
      const index = {
        creatorId: creator.creatorId,
        name: creator.name,
        tags: creator.tagWeights.map(tw => tw.tagId),
        isFollowing: creator.isFollowing === 1
      };
      this.indexCache.set(creatorId, index);
    }
  }

  /**
   * 更新创作者关注状态
   * @param creatorId 创作者ID
   * @param platform 平台
   * @param isFollowing 是否关注
   */
  async updateFollowStatus(
    creatorId: string,
    platform: Platform,
    isFollowing: number
  ): Promise<void> {
    await this.repository.updateFollowStatus(creatorId, platform, isFollowing);

    // 更新缓存
    const creator = await this.getCreator(creatorId,Platform.BILIBILI);
    if (creator) {
      const index = {
        creatorId: creator.creatorId,
        name: creator.name,
        tags: creator.tagWeights.map(tw => tw.tagId),
        isFollowing: creator.isFollowing === 1
      };
      this.indexCache.set(creatorId, index);
    }
  }

  /**
   * 清理过期的书
   * @param maxAge 最大存活时间(毫秒)
   */
  cleanupExpiredBooks(maxAge: number = 3600000): void {
    this.bookManager.cleanupExpiredBooks(maxAge);
  }

  /**
   * 清空所有缓存
   */
  clearCache(): void {
    this.indexCache.clear();
    this.dataCache.clear();
  }

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
    indexCache: {
      size: number;
    };
  } {
    return this.bookManager.getCacheStats();
  }

  /**
   * 获取缓存命中率
   * 用于监控缓存效果
   */
  getCacheHitRate(): {
    dataCache: number;
    indexCache: number;
  } {
    const stats = this.getCacheStats();
    // 这里可以添加更详细的命中率跟踪
    // 当前实现没有跟踪命中率，返回0作为默认值
    return {
      dataCache: 0,
      indexCache: 0
    };
  }
}
