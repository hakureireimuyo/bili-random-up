/**
 * 查询服务模块
 * 实现通用查询逻辑，与Book和页面无关
 */

import type { QueryCondition } from './types.js';
import type { CompositeQueryCondition } from './composite-query-service.js';
import type { CreatorIndex } from './types.js';
import { IndexCache } from '../cache/index-cache.js';
import { CompositeQueryService } from './composite-query-service.js';
import { CreatorRepository } from '../../implementations/creator-repository.impl.js';
import { Platform } from '../../types/base.js';
import { CacheManager } from '../cache/cache-manager.js';

/**
 * 查询服务类
 * 负责执行查询逻辑，返回结果ID列表
 * 与Book和页面无关，是通用工具
 */
export class QueryService {
  private indexCache: IndexCache<CreatorIndex>;
  private repository: CreatorRepository;
  private compositeQueryService: CompositeQueryService;
  private cacheManager: CacheManager;

  constructor(
    repository?: CreatorRepository
  ) {
    this.cacheManager = CacheManager.getInstance();
    // 从CacheManager获取缓存单例
    this.indexCache = this.cacheManager.getIndexCache();
    this.repository = repository || new CreatorRepository();
    this.compositeQueryService = new CompositeQueryService();
  }

  /**
   * 查询结果ID列表
   * @param queryCondition 查询条件
   * @returns 结果ID列表
   */
  async queryResultIds(queryCondition: QueryCondition): Promise<string[]> {
    // 确保索引缓存已加载
    if (this.indexCache.size() === 0) {
      await this.loadIndexCache();
    }

    const allIndexes = this.indexCache.values();
    const compositeCond = queryCondition as unknown as CompositeQueryCondition;
    const cacheKey = 'creator:bilibili';

    return this.compositeQueryService.queryIds(allIndexes, compositeCond, cacheKey);
  }

  /**
   * 加载索引缓存
   */
  async loadIndexCache(): Promise<void> {
    const allCreators = await this.repository.getAllCreators(Platform.BILIBILI);
    const indexes: CreatorIndex[] = allCreators.map(creator => ({
      creatorId: creator.creatorId,
      name: creator.name,
      tags: creator.tagWeights.map(tw => tw.tagId),
      isFollowing: creator.isFollowing === 1
    }));
    // 将数组转换为Map
    const entries = new Map<string, CreatorIndex>();
    indexes.forEach(index => entries.set(index.creatorId, index));
    this.indexCache.setBatch(entries);
  }

  /**
   * 获取索引缓存实例
   */
  getIndexCache(): IndexCache<CreatorIndex> {
    return this.indexCache;
  }

  /**
   * 清空索引缓存
   */
  clearIndexCache(): void {
    this.indexCache.clear();
  }

  /**
   * 获取索引缓存大小
   */
  getIndexCacheSize(): number {
    return this.indexCache.size();
  }
}
