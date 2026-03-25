
/**
 * CreatorDataManager - 创作者数据管理器
 * 核心调度层，统一调度数据流
 */

import type { Creator } from '../types/creator.js';
import type { Platform } from '../types/base.js';
import type { DataRequest, QueryPlan } from '../plan/query-plan.js';
import type { PaginatedResult } from './types.js';
import type { DataManagementOptions } from './types.js';
import { CreatorRepository as DBCreatorRepository } from '../implementations/creator-repository.impl.js';
import { CreatorStrategy } from '../strategy/creator-strategy.js';
import { CreatorQueryEngine, type CreatorIndexQuery } from '../query/creator/index.js';
import { creatorDataCache } from '../cache/data-cache/creator-data-cache.js';
import { creatorIndexCache } from '../cache/index-cache/creator-index-cache.js';

/**
 * 缓存策略配置
 */
interface CacheStrategyConfig {
  /** 最大缓存数量 */
  maxSize: number;
  /** 是否启用LRU策略 */
  enableLRU: boolean;
}

/**
 * 创作者缓存接口
 */
interface CreatorCache {
  /** 数据缓存: creatorId -> Creator */
  data: Map<string, Creator>;
  /** LRU策略配置 */
  strategy: CacheStrategyConfig;
  /** LRU访问顺序 */
  accessOrder: string[];
}

/**
 * 创作者数据管理器
 * 职责：
 * - 判断数据来源（cache / DB）
 * - 控制加载范围
 * - 调用 Query
 * - 管理 cache 生命周期
 * - 保证数据一致性
 */
export class CreatorDataManager {
  private dbCreatorRepo: DBCreatorRepository;
  private cache: CreatorCache;
  private strategy: CreatorStrategy;
  private initialized: boolean = false;

  constructor() {
    this.dbCreatorRepo = new DBCreatorRepository();
    this.cache = {
      data: new Map(),
      strategy: {
        maxSize: 500,
        enableLRU: true
      },
      accessOrder: []
    };

    // 初始化策略
    this.strategy = new CreatorStrategy();
  }

  /**
   * 初始化数据管理器
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[CreatorDataManager] 初始化，从数据库加载所有创作者索引');

    // 清空现有缓存
    this.clearCache();

    // 从数据库加载所有创作者索引
    const allCreators = await this.dbCreatorRepo.getAllCreators('bilibili' as Platform);

    // 构建索引缓存（全量存储，无限制）
    allCreators.forEach(creator => {
      creatorIndexCache.data.set(creator.creatorId, {
        creatorId: creator.creatorId,
        name: creator.name,
        tags: creator.tagWeights.map(tw => tw.tagId),
        isFollowing: creator.isFollowing === 1
      });

      // 更新标签索引
      const tagIds = creator.tagWeights.map(tw => tw.tagId);
      tagIds.forEach(tagId => {
        if (!creatorIndexCache.tagIndex.has(tagId)) {
          creatorIndexCache.tagIndex.set(tagId, new Set());
        }
        creatorIndexCache.tagIndex.get(tagId)!.add(creator.creatorId);
      });

      // 更新关注索引
      const isFollowing = creator.isFollowing === 1;
      if (!creatorIndexCache.followingIndex.has(isFollowing)) {
        creatorIndexCache.followingIndex.set(isFollowing, new Set());
      }
      creatorIndexCache.followingIndex.get(isFollowing)!.add(creator.creatorId);
    });

    this.initialized = true;
    console.log(`[CreatorDataManager] 初始化完成，加载了 ${allCreators.length} 个创作者索引`);
  }

  /**
   * 执行数据请求 - 统一处理搜索和全量获取
   * @param request 数据请求
   * @param options 查询选项
   * @returns 查询结果
   */
  async execute(request: DataRequest, options: DataManagementOptions = {}): Promise<PaginatedResult<Creator>> {
    // 确保已初始化
    if (!this.initialized) {
      await this.init();
    }

    // 1. 使用策略创建查询计划
    const plan = this.strategy.createPlan(request, {
      cache: {},
      index: {
        isInitialized: () => this.initialized,
        hasTag: (tagId: string) => creatorIndexCache.tagIndex.has(tagId),
        hasCreator: (creatorId: string) => creatorIndexCache.data.has(creatorId),
        hasCollection: (collectionId: string) => false // Creator 不支持收藏夹
      }
    });

    // 2. 从索引缓存中获取候选ID（全量搜索）
    const ids = this.resolveIndexQuery(request.payload);

    // 3. 获取当前页的ID
    const page = options.page || 0;
    const pageSize = options.pageSize || 20;
    const total = ids.size;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;

    const paginatedIds = Array.from(ids).slice(startIndex, endIndex);

    // 4. 获取数据（应用LRU策略）
    const creators = await this.getCreatorsByIds(paginatedIds);

    return {
      data: creators,
      total,
      page,
      pageSize,
      hasNext: page < totalPages - 1,
      hasPrev: page > 0
    };
  }

  /**
   * 根据ID获取创作者
   * @param creatorId 创作者ID
   * @returns 创作者对象
   */
  getCreator(creatorId: string): Creator | undefined {
    const creator = this.cache.data.get(creatorId);
    if (creator) {
      // 更新LRU访问顺序
      this.updateAccessOrder(creatorId);
    }
    return creator;
  }

  /**
   * 获取创作者头像二进制数据
   * @param creatorId 创作者ID
   * @param platform 平台类型
   * @returns 头像Blob数据
   */
  async getAvatarBinary(creatorId: string, platform: Platform): Promise<Blob | null> {
    return this.dbCreatorRepo.getAvatarBinary(creatorId, platform);
  }

  /**
   * 批量获取创作者头像二进制数据
   * @param creatorIds 创作者ID列表
   * @param platform 平台类型
   * @returns 头像Blob数据映射
   */
  async getAvatarBinaries(creatorIds: string[], platform: Platform): Promise<Map<string, Blob | null>> {
    const result = new Map<string, Blob | null>();
    
    // 并行获取所有头像数据
    const promises = creatorIds.map(async (creatorId) => {
      try {
        const blob = await this.dbCreatorRepo.getAvatarBinary(creatorId, platform);
        result.set(creatorId, blob);
      } catch (error) {
        console.error(`[CreatorDataManager] Failed to fetch avatar for ${creatorId}:`, error);
        result.set(creatorId, null);
      }
    });
    
    await Promise.all(promises);
    return result;
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    // 清空本地缓存
    this.cache.data.clear();
    this.cache.accessOrder = [];

    // 清空全局缓存
    creatorDataCache.clear();
    creatorIndexCache.data.clear();
    creatorIndexCache.tagIndex.clear();
    creatorIndexCache.followingIndex.clear();

    // 重置初始化状态
    this.initialized = false;
  }

  /**
   * 解析索引查询
   * @param payload 查询参数
   * @returns 创作者ID集合
   */
  private resolveIndexQuery(payload: any): Set<string> {
    // 从索引缓存中获取所有创作者索引
    const allIndexes = Array.from(creatorIndexCache.data.values());

    // 如果有标签表达式，使用标签查询
    if (payload.tagExpressions && payload.tagExpressions.length > 0) {
      const results = CreatorQueryEngine.queryByTagExpressions(
        allIndexes,
        payload.tagExpressions
      );
      return new Set(results);
    }

    // 否则使用基本查询
    const results = CreatorQueryEngine.query(allIndexes, payload);
    return new Set(results.map(r => r.creatorId));
  }

  /**
   * 插入数据到缓存（应用LRU策略）
   * @param creator 创作者对象
   */
  private insertToCacheWithLRU(creator: Creator): void {
    const { maxSize, enableLRU } = this.cache.strategy;

    // 如果启用LRU且缓存已满，淘汰最少使用的项
    if (enableLRU && this.cache.data.size >= maxSize) {
      this.evictLRU();
    }

    // 插入数据 - 同步更新两个缓存
    this.cache.data.set(creator.creatorId, creator);
    creatorDataCache.set(creator.creatorId, creator);

    // 更新访问顺序
    this.updateAccessOrder(creator.creatorId);
  }

  /**
   * 更新访问顺序（LRU策略）
   * @param creatorId 创作者ID
   */
  private updateAccessOrder(creatorId: string): void {
    const { enableLRU } = this.cache.strategy;

    if (!enableLRU) {
      return;
    }

    // 从访问顺序中移除
    const index = this.cache.accessOrder.indexOf(creatorId);
    if (index !== -1) {
      this.cache.accessOrder.splice(index, 1);
    }

    // 添加到末尾（最近访问）
    this.cache.accessOrder.push(creatorId);
  }

  /**
   * 淘汰最少使用的数据（LRU策略）
   */
  private evictLRU(): void {
    if (this.cache.accessOrder.length === 0) {
      return;
    }

    // 获取最久未访问的ID
    const lruId = this.cache.accessOrder.shift();
    if (lruId) {
      // 从缓存中删除 - 同步删除两个缓存
      this.cache.data.delete(lruId);
      creatorDataCache.delete(lruId);
    }
  }

  /**
   * 根据ID列表获取创作者
   * @param creatorIds 创作者ID列表
   * @returns 创作者列表
   */
  private async getCreatorsByIds(creatorIds: string[]): Promise<Creator[]> {
    const result: Creator[] = [];
    const uncachedIds: string[] = [];

    // 先从缓存中获取
    creatorIds.forEach(id => {
      const cached = this.cache.data.get(id);
      if (cached) {
        result.push(cached);
        // 更新LRU访问顺序
        this.updateAccessOrder(id);
      } else {
        uncachedIds.push(id);
      }
    });

    // 从数据库获取未缓存的数据
    if (uncachedIds.length > 0) {
      const dbCreators = await this.dbCreatorRepo.getCreators(uncachedIds, 'bilibili' as Platform);

      // 将新获取的数据存入缓存（应用LRU策略）
      dbCreators.forEach(creator => {
        this.insertToCacheWithLRU(creator);
      });

      result.push(...dbCreators);
    }

    return result;
  }
}
