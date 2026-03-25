/**
 * Creator书管理器
 * 专门用于Creator数据的书管理器实现
 */

import type {
  Book,
  BookPage,
  BookPageState,
  BookQueryOptions,
  BookQueryResult,
  QueryCondition,
  CreatorIndex,
  TagExpression
} from '../query/types.js';
import type { Creator } from '../../types/creator.js';
import { DataCache } from '../cache/data-cache.js';
import { IndexCache } from '../cache/index-cache.js';
import { CompositeQueryService, type CompositeQueryCondition } from '../query/composite-query-service.js';
import { CreatorRepository as CreatorRepositoryImpl } from '../../implementations/creator-repository.impl.js';
import { BaseBookManager, type IDataRepository, type IIndexConverter } from './base-book-manager.js';
import { Platform } from '../../types/base.js';
import { CacheManager } from '../cache/cache-manager.js';

/**
 * Creator索引转换器
 */
class CreatorIndexConverter implements IIndexConverter<Creator, CreatorIndex> {
  toIndex(data: Creator): CreatorIndex {
    return {
      creatorId: data.creatorId,
      name: data.name,
      tags: data.tagWeights.map(tw => tw.tagId),
      isFollowing: data.isFollowing === 1
    };
  }

  getId(data: Creator): string {
    return data.creatorId;
  }
}

/**
 * Creator数据仓库适配器
 * 将CreatorRepositoryImpl适配为IDataRepository接口
 */
class CreatorRepositoryAdapter implements IDataRepository<Creator> {
  constructor(private repository: CreatorRepositoryImpl) {}

  async getById(id: string): Promise<Creator | null> {
    const creators = await this.repository.getCreators([id], Platform.BILIBILI);
    return creators[0] || null;
  }

  async getByIds(ids: string[]): Promise<Creator[]> {
    return await this.repository.getCreators(ids, Platform.BILIBILI);
  }

  async getAll(): Promise<Creator[]> {
    return await this.repository.getAllCreators(Platform.BILIBILI);
  }
}

/**
 * Creator书管理器类
 * 专门用于Creator数据的书管理器
 */
export class CreatorBookManager extends BaseBookManager<Creator, CreatorIndex> {
  private compositeQueryService: CompositeQueryService;
  private cacheManager: CacheManager;

  constructor(
    repository?: CreatorRepositoryImpl
  ) {
    const repo = repository || new CreatorRepositoryImpl();
    const cacheManager = CacheManager.getInstance();

    // 使用CacheManager获取缓存单例
    super(
      cacheManager.getDataCache<Creator>(),    // DataCache<Creator>单例
      cacheManager.getIndexCache(),    // IndexCache<CreatorIndex>单例
      new CreatorRepositoryAdapter(repo),
      new CreatorIndexConverter()
    );

    this.cacheManager = cacheManager;
    this.compositeQueryService = new CompositeQueryService();
  }

  /**
   * 创建复合查询书
   * 支持名字匹配、标签过滤和isFollowing字段的组合查询
   */
  async createCompositeQueryBook(
    platform: Platform,
    keyword?: string,
    tagExpressions?: TagExpression[],
    isFollowing?: 0 | 1,
    options: BookQueryOptions = {}
  ): Promise<Book<Creator>> {
    const condition: CompositeQueryCondition = {
      platform,
      keyword,
      tagExpressions,
      isFollowing
    };

    const cacheKey = `creator:${platform}`;

    return await this.createBook(
      { type: 'composite', ...condition } as QueryCondition,
      options,
      (cond, indexes) => {
        const compositeCond = cond as unknown as CompositeQueryCondition;
        return this.compositeQueryService.queryIds(indexes, compositeCond, cacheKey);
      }
    );
  }

  /**
   * 创建名称查询书（兼容旧接口）
   */
  async createNameQueryBook(
    platform: Platform,
    keyword: string,
    isFollowing?: boolean,
    options: BookQueryOptions = {}
  ): Promise<Book<Creator>> {
    return await this.createCompositeQueryBook(
      platform,
      keyword,
      undefined,
      isFollowing !== undefined ? (isFollowing ? 1 : 0) : undefined,
      options
    );
  }

  /**
   * 创建标签查询书（兼容旧接口）
   */
  async createTagQueryBook(
    platform: Platform,
    tagExpressions: TagExpression[],
    isFollowing?: boolean,
    options: BookQueryOptions = {}
  ): Promise<Book<Creator>> {
    return await this.createCompositeQueryBook(
      platform,
      undefined,
      tagExpressions,
      isFollowing !== undefined ? (isFollowing ? 1 : 0) : undefined,
      options
    );
  }

  /**
   * 从索引中提取ID
   */
  protected extractIdFromIndex(index: CreatorIndex): string {
    return index.creatorId;
  }

  /**
   * 生成书ID
   */
  protected generateBookId(condition: QueryCondition): string {
    const compositeCond = condition as unknown as CompositeQueryCondition;
    // 使用JSON.stringify生成唯一标识
    return JSON.stringify({
      platform: compositeCond.platform,
      keyword: compositeCond.keyword,
      tagExpressions: compositeCond.tagExpressions,
      isFollowing: compositeCond.isFollowing
    });
  }
}
