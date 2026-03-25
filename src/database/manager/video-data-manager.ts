
/**
 * VideoDataManager - 视频数据管理器
 * 核心调度层，统一调度数据流
 */

import type { Video } from '../types/video.js';
import type { CollectionItem } from '../types/collection.js';
import type { Creator } from '../types/creator.js';
import type { Platform } from '../types/base.js';
import type { DataRequest, QueryPlan } from '../plan/query-plan.js';
import type { PaginatedResult } from './types.js';
import type { DataManagementOptions } from './types.js';
import { VideoRepository as DBVideoRepository } from '../implementations/video-repository.impl.js';
import { CollectionRepository } from '../implementations/collection-repository.impl.js';
import { CollectionItemRepository } from '../implementations/collection-item-repository.impl.js';
import { CreatorRepository as DBCreatorRepository } from '../implementations/creator-repository.impl.js';
import { VideoStrategy } from '../strategy/video-strategy.js';
import { videoDataCache } from '../cache/data-cache/video-data-cache.js';
import { videoIndexCache } from '../cache/index-cache/video-index-cache.js';

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
 * 视频缓存接口
 */
interface VideoCache {
  /** 数据缓存: videoId -> Video */
  data: Map<string, Video>;
  /** 创作者索引: creatorId -> videoIds */
  creatorIndex: Map<string, Set<string>>;
  /** 收藏夹索引: collectionId -> videoIds */
  collectionIndex: Map<string, Set<string>>;
  /** 标签索引: tagId -> videoIds */
  tagIndex: Map<string, Set<string>>;
  /** LRU策略配置 */
  strategy: CacheStrategyConfig;
  /** LRU访问顺序 */
  accessOrder: string[];
}

/**
 * 视频索引缓存接口
 */
interface VideoIndexCache {
  /** 检查是否有创作者索引 */
  hasCreator(creatorId: string): boolean;
  /** 检查是否有收藏夹索引 */
  hasCollection(collectionId: string): boolean;
  /** 检查是否有标签索引 */
  hasTag(tagId: string): boolean;
  /** 检查是否已初始化 */
  isInitialized(): boolean;
  /** 解析索引查询 */
  resolve(indexQuery: any): Set<string>;
  /** 构建索引 */
  build(videos: Video[]): void;
  /** 插入数据 */
  insert(videos: Video[]): void;
}

/**
 * 视频数据库接口
 */
interface VideoDB {
  /** 加载数据 */
  load(query: any): Promise<Video[]>;
}

/**
 * 视频数据管理器
 * 职责：
 * - 判断数据来源（cache / DB）
 * - 控制加载范围
 * - 调用 Query
 * - 管理 cache 生命周期
 * - 保证数据一致性
 */
export class VideoDataManager {
  private dbVideoRepo: DBVideoRepository;
  private dbCollectionRepo: CollectionRepository;
  private dbCollectionItemRepo: CollectionItemRepository;
  private dbCreatorRepo: DBCreatorRepository;
  private cache: VideoCache;
  private index: VideoIndexCache;
  private db: VideoDB;
  private strategy: VideoStrategy;
  private initialized: boolean = false;

  constructor() {
    this.dbVideoRepo = new DBVideoRepository();
    this.dbCollectionRepo = new CollectionRepository();
    this.dbCollectionItemRepo = new CollectionItemRepository();
    this.dbCreatorRepo = new DBCreatorRepository();
    this.cache = {
      data: new Map(),
      creatorIndex: new Map(),
      collectionIndex: new Map(),
      tagIndex: new Map(),
      strategy: {
        maxSize: 200,
        enableLRU: true
      },
      accessOrder: []
    };

    // 初始化数据库接口
    this.db = {
      load: async (query: any) => this.loadFromDB(query)
    };

    // 初始化策略
    this.strategy = new VideoStrategy();
  }

  /**
   * 初始化数据管理器
   * @param collectionId 收藏夹ID
   * @param collectionType 收藏夹类型
   */
  async init(collectionId?: string, collectionType?: 'user' | 'subscription'): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('[VideoDataManager] 初始化,从数据库加载所有视频数据');

    // 清空现有缓存
    this.clearCache();

    // 加载收藏夹项
    let collectionItems: CollectionItem[] = [];
    if (collectionId === 'all') {
      // 加载所有收藏夹的视频
      const allCollections = await this.dbCollectionRepo.getAllCollections();
      const filteredCollections = collectionType
        ? allCollections.filter((c: any) => c.type === collectionType)
        : allCollections;

      for (const collection of filteredCollections) {
        const items = await this.dbCollectionItemRepo.getItemsByCollection(collection.collectionId);
        collectionItems.push(...items);
      }
    } else if (collectionId) {
      // 加载指定收藏夹的视频
      collectionItems = await this.dbCollectionItemRepo.getItemsByCollection(collectionId);
    }

    if (collectionItems.length === 0) {
      this.initialized = true;
      return;
    }

    // 批量加载视频数据
    const videoIds = collectionItems.map(item => item.videoId);
    const videos = await this.dbVideoRepo.getVideos(videoIds, Platform.BILIBILI);

    // 构建视频ID到收藏夹ID的映射
    const videoToCollection = new Map<string, string>();
    collectionItems.forEach(item => {
      videoToCollection.set(item.videoId, item.collectionId);
    });

    // 构建索引缓存（全量存储，无限制）
    videos.forEach(video => {
      // 更新创作者索引
      if (!videoIndexCache.creatorIndex.has(video.creatorId)) {
        videoIndexCache.creatorIndex.set(video.creatorId, new Set());
      }
      videoIndexCache.creatorIndex.get(video.creatorId)!.add(video.videoId);

      // 更新收藏夹索引
      const collectionId = videoToCollection.get(video.videoId);
      if (collectionId) {
        if (!videoIndexCache.collectionIndex.has(collectionId)) {
          videoIndexCache.collectionIndex.set(collectionId, new Set());
        }
        videoIndexCache.collectionIndex.get(collectionId)!.add(video.videoId);
      }

      // 更新标签索引
      video.tags.forEach(tagId => {
        if (!videoIndexCache.tagIndex.has(tagId)) {
          videoIndexCache.tagIndex.set(tagId, new Set());
        }
        videoIndexCache.tagIndex.get(tagId)!.add(video.videoId);
      });
    });

    this.initialized = true;
    console.log(`[VideoDataManager] 初始化完成,加载了 ${videos.length} 个视频`);
  }

  /**
   * 执行数据请求
   * @param request 数据请求
   * @param options 查询选项
   * @returns 查询结果
   */
  async execute(request: DataRequest, options: DataManagementOptions = {}): Promise<PaginatedResult<Video>> {
    // 确保已初始化
    if (!this.initialized) {
      await this.init();
    }

    // 创建查询计划
    const plan = this.strategy.createPlan(request, {
      cache: this.cache,
      index: this.index
    });

    // 1. 确保数据存在
    if (plan.needLoadFromDB && plan.dbQuery) {
      const data = await this.db.load(plan.dbQuery);
      this.cache.insert(data);
      this.index.build(data);
    }

    // 2. 获取候选 ID（关键变化）
    const ids = this.index.resolve(plan.indexQuery);

    // 3. 应用查询条件进行过滤和排序
    const resultIds = this.applyQuery(ids, request.payload);

    // 4. 最后映射数据
    const videos = this.cache.getByIds ? this.cache.getByIds(resultIds) : this.getByIds(resultIds);

    // 5. 应用分页
    const page = options.page || 0;
    const pageSize = options.pageSize || 10;
    const total = videos.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = videos.slice(startIndex, endIndex);

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
   * 根据ID获取视频
   * @param videoId 视频ID
   * @returns 视频对象
   */
  getVideo(videoId: string): Video | undefined {
    return this.cache.data.get(videoId);
  }

  /**
   * 批量获取视频
   * @param videoIds 视频ID列表
   * @returns 视频对象列表
   */
  getVideos(videoIds: string[]): Video[] {
    const result: Video[] = [];
    videoIds.forEach(id => {
      const video = this.cache.data.get(id);
      if (video) {
        result.push(video);
      }
    });
    return result;
  }

  /**
   * 获取所有标签
   * @returns 标签ID列表
   */
  getAllTags(): string[] {
    return Array.from(this.cache.tagIndex.keys());
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cache.data.clear();
    this.cache.creatorIndex.clear();
    this.cache.collectionIndex.clear();
    this.cache.tagIndex.clear();
    this.initialized = false;
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return {
      dataCount: this.cache.data.size,
      creatorIndexCount: this.cache.creatorIndex.size,
      collectionIndexCount: this.cache.collectionIndex.size,
      tagIndexCount: this.cache.tagIndex.size,
      initialized: this.initialized
    };
  }

  /**
   * 从数据库加载数据
   */
  private async loadFromDB(query: any): Promise<Video[]> {
    // 根据查询条件从数据库加载数据
    if (query.tagId) {
      // 按标签加载
      return []; // 这里需要实现具体的加载逻辑
    } else if (query.creatorId) {
      // 按创作者加载
      return []; // 这里需要实现具体的加载逻辑
    } else if (query.collectionId) {
      // 按收藏夹加载
      const collectionItems = await this.dbCollectionItemRepo.getItemsByCollection(query.collectionId);
      const videoIds = collectionItems.map(item => item.videoId);
      return await this.dbVideoRepo.getVideos(videoIds, Platform.BILIBILI);
    } else {
      // 加载所有数据
      return []; // 这里需要实现具体的加载逻辑
    }
  }

  /**
   * 构建缓存和索引
   */
  private buildCacheAndIndex(videos: Video[], videoToCollection: Map<string, string>): void {
    videos.forEach(video => {
      // 存储视频数据
      this.cache.data.set(video.videoId, video);

      // 更新创作者索引
      if (!this.cache.creatorIndex.has(video.creatorId)) {
        this.cache.creatorIndex.set(video.creatorId, new Set());
      }
      this.cache.creatorIndex.get(video.creatorId)!.add(video.videoId);

      // 更新收藏夹索引
      const collectionId = videoToCollection.get(video.videoId);
      if (collectionId) {
        if (!this.cache.collectionIndex.has(collectionId)) {
          this.cache.collectionIndex.set(collectionId, new Set());
        }
        this.cache.collectionIndex.get(collectionId)!.add(video.videoId);
      }

      // 更新标签索引
      video.tags.forEach(tagId => {
        if (!this.cache.tagIndex.has(tagId)) {
          this.cache.tagIndex.set(tagId, new Set());
        }
        this.cache.tagIndex.get(tagId)!.add(video.videoId);
      });
    });
  }

  /**
   * 解析索引查询
   */
  private resolveIndexQuery(indexQuery: any): Set<string> {
    let candidateIds: Set<string> | undefined;

    switch (indexQuery.type) {
      case 'TAG':
        candidateIds = this.cache.tagIndex.get(indexQuery.value);
        break;
      case 'CREATOR':
        candidateIds = this.cache.creatorIndex.get(indexQuery.value);
        break;
      case 'COLLECTION':
        candidateIds = this.cache.collectionIndex.get(indexQuery.value);
        break;
      case 'FULL':
        // 返回所有视频ID
        candidateIds = new Set(this.cache.data.keys());
        break;
    }

    return candidateIds || new Set();
  }

  /**
   * 构建索引
   */
  private buildIndex(videos: Video[]): void {
    videos.forEach(video => {
      // 更新创作者索引
      if (!this.cache.creatorIndex.has(video.creatorId)) {
        this.cache.creatorIndex.set(video.creatorId, new Set());
      }
      this.cache.creatorIndex.get(video.creatorId)!.add(video.videoId);

      // 更新标签索引
      video.tags.forEach(tagId => {
        if (!this.cache.tagIndex.has(tagId)) {
          this.cache.tagIndex.set(tagId, new Set());
        }
        this.cache.tagIndex.get(tagId)!.add(video.videoId);
      });
    });
  }

  /**
   * 插入数据到缓存
   */
  private insertToCache(videos: Video[]): void {
    videos.forEach(video => {
      this.cache.data.set(video.videoId, video);
    });
  }

  /**
   * 根据ID列表获取视频
   */
  private getByIds(ids: Set<string>): Video[] {
    return Array.from(ids)
      .map(id => this.cache.data.get(id))
      .filter((video): video is Video => video !== undefined);
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
            const video = this.cache.data.get(id);
            return video && video.title.toLowerCase().includes(keyword);
          })
      );
    }

    // 标签过滤
    if (payload.tags && payload.tags.length > 0) {
      const firstTagVideos = this.cache.tagIndex.get(payload.tags[0]);
      if (firstTagVideos) {
        resultIds = new Set([...resultIds].filter(id => firstTagVideos.has(id)));
        // 多个标签,取交集
        if (payload.tags.length > 1) {
          payload.tags.slice(1).forEach(tagId => {
            const videos = this.cache.tagIndex.get(tagId);
            if (videos) {
              resultIds = new Set([...resultIds].filter(id => videos.has(id)));
            }
          });
        }
      } else {
        resultIds = new Set();
      }
    }

    return resultIds;
  }
}
