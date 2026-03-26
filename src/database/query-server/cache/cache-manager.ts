/**
 * 全局缓存管理器
 * 统一管理所有缓存单例，确保所有查询服务共享相同的缓存实例
 */

import { IndexCache } from './index-cache.js';
import { DataCache } from './data-cache.js';
import { TagCache } from './tag-cache.js';
import type { CreatorIndex } from './types.js';
import type { VideoIndex } from './types.js';

/**
 * 全局缓存管理器类
 * 单例模式，确保全局只有一个实例
 */
export class CacheManager {
  private static instance: CacheManager;

  // 创作者索引缓存
  private indexCache: IndexCache<CreatorIndex>;

  // 数据缓存（存储完整数据）
  private dataCache: DataCache<unknown>;

  // 标签缓存（使用SortedArray实现）
  private tagCache: TagCache;

  // 视频索引缓存
  private videoIndexCache: IndexCache<VideoIndex>;

  private constructor() {
    // 初始化所有缓存单例
    this.indexCache = new IndexCache<CreatorIndex>();
    this.dataCache = new DataCache<any>({
      maxSize: 2000,
      maxAge: 3600000,
      cleanupRatio: 0.2
    });
    this.tagCache = new TagCache();
    this.videoIndexCache = new IndexCache<VideoIndex>();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * 获取创作者索引缓存
   */
  getIndexCache(): IndexCache<CreatorIndex> {
    return this.indexCache;
  }

  /**
   * 获取数据缓存
   */
  getDataCache<T>(): DataCache<T> {
    return this.dataCache as DataCache<T>;
  }

  /**
   * 获取标签缓存
   */
  getTagCache(): TagCache {
    return this.tagCache;
  }

  /**
   * 获取视频索引缓存
   */
  getVideoIndexCache(): IndexCache<VideoIndex> {
    return this.videoIndexCache;
  }

  /**
   * 清空所有缓存
   */
  clearAll(): void {
    this.indexCache.clear();
    this.dataCache.clear();
    this.tagCache.clear();
    this.videoIndexCache.clear();
  }

  /**
   * 获取所有缓存的统计信息
   */
  getStats(): {
    indexCache: { size: number };
    dataCache: ReturnType<DataCache<unknown>['getStats']>;
    tagCache: ReturnType<TagCache['getStats']>;
    videoIndexCache: { size: number };
  } {
    return {
      indexCache: {
        size: this.indexCache.size()
      },
      dataCache: this.dataCache.getStats(),
      tagCache: this.tagCache.getStats(),
      videoIndexCache: {
        size: this.videoIndexCache.size()
      }
    };
  }
}
