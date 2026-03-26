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

  TagExpression 
} from '../query-server/query/types.js';
import { Platform } from '../types/base.js';
import { CreatorBookManager } from '../query-server/book/creator-book-manager.js';

import { CreatorRepository as CreatorRepositoryImpl } from '../implementations/creator-repository.impl.js';

/**
 * Creator查询Repository类
 */
export class CreatorRepository {
  private bookManager: CreatorBookManager;
  private repository: CreatorRepositoryImpl;

  constructor() {
    this.repository = new CreatorRepositoryImpl();
    this.bookManager = new CreatorBookManager(this.repository);
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
    const book = await this.bookManager.createNameQueryBook(
      platform,
      keyword,
      isFollowing,
      options
    );
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
    const book = await this.bookManager.createTagQueryBook(
      platform,
      tagExpressions,
      isFollowing,
      options
    );
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
    // 从数据库获取
    const creator = await this.repository.getCreator(creatorId, platform);
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
    // 从数据库获取
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
    // 索引缓存和数据缓存由 CreatorBookManager 管理，不需要手动更新
  }

  /**
   * 批量创建或更新创作者
   * @param creators 创作者对象列表
   */
  async upsertCreators(creators: Creator[]): Promise<void> {
    await this.repository.upsertCreators(creators);
    // 索引缓存和数据缓存由 CreatorBookManager 管理，不需要手动更新
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
    const creator = await this.getCreator(creatorId, Platform.BILIBILI);
    if (creator) {
      // 索引缓存由 CreatorBookManager 管理，不需要手动更新
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
    const creator = await this.getCreator(creatorId, Platform.BILIBILI);
    if (creator) {
      // 索引缓存由 CreatorBookManager 管理，不需要手动更新
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
   * 清空所有书
   */
  clearAllBooks(): void {
    this.bookManager.clearAllBooks();
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
