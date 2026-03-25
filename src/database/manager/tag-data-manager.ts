
/**
 * TagDataManager - 标签数据管理器
 * 核心调度层，统一调度数据流
 */

import type { Tag } from '../types/semantic.js';
import type { TagSource } from '../types/base.js';
import type { DataRequest } from '../plan/query-plan.js';
import type { PaginatedResult } from './types.js';
import type { DataManagementOptions } from './types.js';
import { TagRepository as DBTagRepository } from '../implementations/tag-repository.impl.js';
import { TagStrategy } from '../strategy/tag-strategy.js';
import { tagDataCache } from '../cache/data-cache/tag-data-cache.js';
import { tagIndexCache } from '../cache/index-cache/tag-index-cache.js';

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
 * 标签缓存接口
 */
interface TagCache {
  /** 数据缓存: tagId -> Tag */
  data: Map<string, Tag>;
  /** 来源索引: source -> tagIds */
  sourceIndex: Map<TagSource, Set<string>>;
  /** 名称索引: name -> tagId */
  nameIndex: Map<string, string>;
  /** LRU策略配置 */
  strategy: CacheStrategyConfig;
  /** LRU访问顺序 */
  accessOrder: string[];
}

/**
 * 标签索引缓存接口
 */
interface TagIndexCache {
  /** 检查是否有来源索引 */
  hasSource(source: TagSource): boolean;
  /** 检查是否已初始化 */
  isInitialized(): boolean;
  /** 解析索引查询 */
  resolve(indexQuery: any): Set<string>;
  /** 构建索引 */
  build(tags: Tag[]): void;
  /** 插入数据 */
  insert(tags: Tag[]): void;
}

/**
 * 标签数据库接口
 */
interface TagDB {
  /** 加载数据 */
  load(query: any): Promise<Tag[]>;
  /** 创建标签 */
  create(name: string, source: TagSource): Promise<string>;
  /** 删除标签 */
  delete(tagId: string): Promise<boolean>;
}

/**
 * 标签数据管理器
 * 职责：
 * - 判断数据来源（cache / DB）
 * - 控制加载范围
 * - 调用 Query
 * - 管理 cache 生命周期
 * - 保证数据一致性
 */
export class TagDataManager {
  private dbRepo: DBTagRepository;
  private cache: TagCache;
  private index: TagIndexCache;
  private db: TagDB;
  private strategy: TagStrategy;
  private initialized: boolean = false;

  constructor() {
    this.dbRepo = new DBTagRepository();
    this.cache = {
      data: new Map(),
      sourceIndex: new Map(),
      nameIndex: new Map(),
      strategy: {
        maxSize: 1000,
        enableLRU: true
      },
      accessOrder: []
    };

    // 初始化数据库接口
    this.db = {
      load: async (query: any) => this.loadFromDB(query),
      create: async (name: string, source: TagSource) => this.createTagInDB(name, source),
      delete: async (tagId: string) => this.deleteTagInDB(tagId)
    };

    // 初始化策略
    this.strategy = new TagStrategy();
  }

  /**
   * 初始化数据管理器
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[TagDataManager] 初始化,从数据库加载所有标签数据');
    const result = await this.dbRepo.getAllTags();
    const tags = result.items;

    // 构建索引缓存（全量存储，无限制）
    tags.forEach(tag => {
      tagIndexCache.data.set(tag.tagId, tag);

      // 更新来源索引
      if (!tagIndexCache.sourceIndex.has(tag.source)) {
        tagIndexCache.sourceIndex.set(tag.source, new Set());
      }
      tagIndexCache.sourceIndex.get(tag.source)!.add(tag.tagId);
    });

    this.initialized = true;
    console.log(`[TagDataManager] 初始化完成,加载了 ${tags.length} 个标签`);
  }

  /**
   * 执行数据请求
   * @param request 数据请求
   * @param options 查询选项
   * @returns 查询结果
   */
  async execute(request: DataRequest, options: DataManagementOptions = {}): Promise<PaginatedResult<Tag>> {
    // 确保已初始化
    if (!this.initialized) {
      await this.init();
    }

    // 1. 从索引缓存中获取候选ID（全量搜索）
    const ids = this.resolveIndexQuery(request.payload);

    // 2. 应用查询条件进行过滤
    const resultIds = this.applyQuery(ids, request.payload);

    // 3. 获取数据（应用LRU策略）
    const tags = await this.getByIds(resultIds);

    // 4. 应用分页
    const page = options.page || 0;
    const pageSize = options.pageSize || 50;
    const total = tags.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = tags.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total,
      page,
      pageSize,
      hasNext: page < totalPages - 1,
      hasPrev: page > 0
    };
  }

  /**
   * 根据 ID 获取标签
   * @param tagId 标签ID
   * @returns 标签对象
   */
  getTag(tagId: string): Tag | undefined {
    return this.cache.data.get(tagId);
  }

  /**
   * 批量获取标签
   * @param tagIds 标签ID列表
   * @returns 标签对象Map
   */
  getTags(tagIds: string[]): Map<string, Tag> {
    const result = new Map<string, Tag>();
    tagIds.forEach(id => {
      const tag = this.cache.data.get(id);
      if (tag) {
        result.set(id, tag);
      }
    });
    return result;
  }

  /**
   * 创建标签
   * @param name 标签名称
   * @param source 标签来源
   * @returns 标签ID
   */
  async createTag(name: string, source: TagSource): Promise<string> {
    // 写入 DB
    const tagId = await this.db.create(name, source);

    // 同步更新 cache
    const tag: Tag = {
      tagId,
      name,
      source
    };
    this.cache.data.set(tagId, tag);

    // 更新来源索引
    if (!this.cache.sourceIndex.has(source)) {
      this.cache.sourceIndex.set(source, new Set());
    }
    this.cache.sourceIndex.get(source)!.add(tagId);

    // 更新名称索引
    this.cache.nameIndex.set(name, tagId);

    return tagId;
  }

  /**
   * 删除标签
   * @param tagId 标签ID
   * @returns 是否成功
   */
  async deleteTag(tagId: string): Promise<boolean> {
    // 从 DB 删除
    const success = await this.db.delete(tagId);

    if (success) {
      // 从 cache 删除
      const tag = this.cache.data.get(tagId);
      if (tag) {
        // 从来源索引中移除
        const sourceIds = this.cache.sourceIndex.get(tag.source);
        if (sourceIds) {
          sourceIds.delete(tagId);
        }

        // 从名称索引中移除
        this.cache.nameIndex.delete(tag.name);

        // 从数据缓存中移除
        this.cache.data.delete(tagId);
      }
    }

    return success;
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.data.clear();
    this.cache.accessOrder = [];
    this.cache.sourceIndex.clear();
    this.cache.nameIndex.clear();
    tagIndexCache.data.clear();
    tagIndexCache.sourceIndex.clear();
    this.initialized = false;
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return {
      dataCount: this.cache.data.size,
      sourceIndexCount: this.cache.sourceIndex.size,
      nameIndexCount: this.cache.nameIndex.size,
      initialized: this.initialized
    };
  }

  /**
   * 从数据库加载数据
   */
  private async loadFromDB(query: any): Promise<Tag[]> {
    // 根据查询条件从数据库加载数据
    if (query.source) {
      // 按来源加载
      const result = await this.dbRepo.getAllTags();
      return result.items.filter(tag => tag.source === query.source);
    } else {
      // 加载所有数据
      const result = await this.dbRepo.getAllTags();
      return result.items;
    }
  }

  /**
   * 在数据库中创建标签
   */
  private async createTagInDB(name: string, source: TagSource): Promise<string> {
    return await this.dbRepo.createTag(name, source);
  }

  /**
   * 在数据库中删除标签
   */
  private async deleteTagInDB(tagId: string): Promise<boolean> {
    return await this.dbRepo.deleteTag(tagId);
  }

  /**
   * 解析索引查询
   */
  private resolveIndexQuery(payload: any): Set<string> {
    // 从索引缓存中获取所有标签ID
    return new Set(tagIndexCache.data.keys());
  }

  /**
   * 插入数据到缓存（应用LRU策略）
   * @param tag 标签对象
   */
  private insertToCacheWithLRU(tag: Tag): void {
    const { maxSize, enableLRU } = this.cache.strategy;

    // 如果启用LRU且缓存已满，淘汰最少使用的项
    if (enableLRU && this.cache.data.size >= maxSize) {
      this.evictLRU();
    }

    // 插入数据
    this.cache.data.set(tag.tagId, tag);
    tagDataCache.set(tag);

    // 更新访问顺序
    this.updateAccessOrder(tag.tagId);
  }

  /**
   * 更新访问顺序（LRU策略）
   * @param tagId 标签ID
   */
  private updateAccessOrder(tagId: string): void {
    const { enableLRU } = this.cache.strategy;

    if (!enableLRU) {
      return;
    }

    // 从访问顺序中移除
    const index = this.cache.accessOrder.indexOf(tagId);
    if (index !== -1) {
      this.cache.accessOrder.splice(index, 1);
    }

    // 添加到末尾（最近访问）
    this.cache.accessOrder.push(tagId);
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
      // 从缓存中删除
      this.cache.data.delete(lruId);
      tagDataCache.delete(lruId);
    }
  }

  /**
   * 根据ID列表获取标签
   */
  private async getByIds(ids: Set<string>): Promise<Tag[]> {
    const result: Tag[] = [];
    const uncachedIds: string[] = [];

    // 先从缓存中获取
    ids.forEach(id => {
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
      const dbTags = await this.dbRepo.getTags(uncachedIds);

      // 将新获取的数据存入缓存（应用LRU策略）
      dbTags.forEach(tag => {
        this.insertToCacheWithLRU(tag);
      });

      result.push(...dbTags);
    }

    return result;
  }

  /**
   * 应用查询条件进行过滤和排序
   */
  private applyQuery(ids: Set<string>, payload: any): Set<string> {
    let resultIds = ids;

    // 关键词搜索
    if (payload.keyword) {
      const keyword = payload.keyword.toLowerCase();
      resultIds = new Set(
        Array.from(resultIds)
          .filter(id => {
            const tag = this.cache.data.get(id);
            return tag && tag.name.toLowerCase().includes(keyword);
          })
      );
    }

    return resultIds;
  }
}
