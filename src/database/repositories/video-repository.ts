/**
 * Video Repository
 *
 * 作为数据中枢与唯一数据入口，负责：
 * 1. 数据库访问 - 封装所有数据库操作
 * 2. 缓存管理 - 统一管理 IndexCache、TagCache 和 DataCache
 * 3. 数据一致性 - 在数据库与缓存之间建立一致性保障机制
 * 4. 数据转换 - index ↔ id ↔ 完整对象
 * 5. 基于ID列表的数据获取 - 为上层提供稳定的数据访问方式
 */

import type { Video } from '../types/video.js';
import type { ID, Platform, PaginationParams, PaginationResult } from '../types/base.js';
import type { VideoIndex } from '../query-server/cache/types.js';

import { CacheManager } from '../query-server/cache/cache-manager.js';
import { VideoRepositoryImpl } from '../implementations/video-repository.impl.js';
import type { IDataRepository } from '../query-server/book/base-book-manager.js';

/**
 * Video Repository 类
 * 实现 IDataRepository 接口，为 Book 层提供数据访问能力
 */
export class VideoRepository implements IDataRepository<Video> {
  private repository: VideoRepositoryImpl;
  private cacheManager: CacheManager;
  private indexCache: ReturnType<CacheManager['getVideoIndexCache']>;
  private dataCache: ReturnType<CacheManager['getVideoDataCache']>;
  private tagCache: ReturnType<CacheManager['getTagCache']>;

  constructor() {
    this.repository = new VideoRepositoryImpl();
    this.cacheManager = CacheManager.getInstance();
    this.indexCache = this.cacheManager.getVideoIndexCache();
    this.dataCache = this.cacheManager.getVideoDataCache();
    this.tagCache = this.cacheManager.getTagCache();
  }

  // ==================== 数据访问职责 ====================

  /**
   * 获取单个视频
   * 优先从 DataCache 获取，未命中则从数据库获取并更新缓存
   */
  async getVideo(videoId: ID): Promise<Video | null> {
    // 先从 DataCache 获取
    const cached = this.dataCache.get(videoId) as Video | undefined;
    if (cached) {
      return cached;
    }

    // 缓存未命中，从数据库获取
    const video = await this.repository.getVideo(videoId);
    if (video) {
      // 更新缓存
      this.updateAllCaches(video);
    }
    return video;
  }

  /**
   * 批量获取视频
   * 优先从 DataCache 获取，未命中的从数据库获取并更新缓存
   */
  async getVideos(videoIds: ID[]): Promise<Map<ID, Video>> {
    const result = new Map<ID, Video>();
    const uncachedIds: ID[] = [];

    // 1. 先从 DataCache 获取已缓存的数据
    videoIds.forEach(id => {
      const cached = this.dataCache.get(id) as Video | undefined;
      if (cached) {
        result.set(id, cached);
      } else {
        uncachedIds.push(id);
      }
    });

    // 2. 从数据库获取未缓存的数据
    if (uncachedIds.length > 0) {
      const dbVideos = await this.repository.getVideos(uncachedIds);

      // 3. 更新 DataCache
      const cacheEntries = new Map<number, Video>();
      dbVideos.forEach(video => {
        cacheEntries.set(video.videoId, video);
        result.set(video.videoId, video);
      });
      this.dataCache.setBatch(cacheEntries);
    }

    return result;
  }

  /**
   * 创建视频
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async createVideo(video: Omit<Video, 'videoId' | 'createdAt'>): Promise<Video> {
    // 1. 先更新数据库
    const newVideo = await this.repository.createVideo(video);

    // 2. 更新缓存
    this.updateAllCaches(newVideo);

    return newVideo;
  }

  /**
   * 批量创建视频
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async createVideos(videos: Omit<Video, 'videoId' | 'createdAt'>[]): Promise<Video[]> {
    // 1. 先更新数据库
    const newVideos = await this.repository.createVideos(videos);

    // 2. 更新缓存
    newVideos.forEach(video => this.updateAllCaches(video));

    return newVideos;
  }

  /**
   * 创建或更新视频
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async upsertVideo(video: Video): Promise<void> {
    // 1. 先更新数据库
    await this.repository.upsertVideo(video);

    // 2. 更新缓存
    this.updateAllCaches(video);
  }

  /**
   * 批量创建或更新视频
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async upsertVideos(videos: Video[]): Promise<void> {
    // 1. 先更新数据库
    await this.repository.upsertVideos(videos);

    // 2. 更新缓存
    videos.forEach(video => this.updateAllCaches(video));
  }

  /**
   * 删除视频
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async deleteVideo(videoId: ID): Promise<void> {
    // 1. 先更新数据库
    await this.repository.deleteVideo(videoId);

    // 2. 从缓存中移除
    this.dataCache.delete(videoId);
    // IndexCache 和 TagCache 的清理由 CacheManager 统一管理
  }

  /**
   * 批量删除视频
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async deleteVideos(videoIds: ID[]): Promise<void> {
    // 1. 先更新数据库
    await this.repository.deleteVideos(videoIds);

    // 2. 从缓存中移除
    videoIds.forEach(id => this.dataCache.delete(id));
    // IndexCache 和 TagCache 的清理由 CacheManager 统一管理
  }

  /**
   * 更新视频标签
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async updateVideoTags(videoId: ID, tags: ID[]): Promise<void> {
    // 1. 先更新数据库
    await this.repository.updateVideoTags(videoId, tags);

    // 2. 更新缓存
    const video = await this.getVideo(videoId);
    if (video) {
      this.updateAllCaches(video);
    }
  }

  /**
   * 为视频添加标签
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async addVideoTag(videoId: ID, tagId: ID): Promise<void> {
    // 1. 先更新数据库
    await this.repository.addVideoTag(videoId, tagId);

    // 2. 更新缓存
    const video = await this.getVideo(videoId);
    if (video) {
      this.updateAllCaches(video);
    }
  }

  /**
   * 从视频中移除标签
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async removeVideoTag(videoId: ID, tagId: ID): Promise<void> {
    // 1. 先更新数据库
    await this.repository.removeVideoTag(videoId, tagId);

    // 2. 更新缓存
    const video = await this.getVideo(videoId);
    if (video) {
      this.updateAllCaches(video);
    }
  }

  /**
   * 获取创作者的视频列表
   */
  async getCreatorVideos(
    creatorId: ID,
    platform: Platform,
    pagination: PaginationParams
  ): Promise<PaginationResult<Video>> {
    return this.repository.getCreatorVideos(creatorId, platform, pagination);
  }

  /**
   * 获取指定平台的视频列表
   */
  async getVideosByPlatform(
    platform: Platform,
    pagination: PaginationParams
  ): Promise<PaginationResult<Video>> {
    return this.repository.getVideosByPlatform(platform, pagination);
  }

  /**
   * 更新视频封面图片
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async updateVideoPicture(
    videoId: ID,
    imageBlob: Blob,
    url?: string
  ): Promise<void> {
    // 1. 先更新数据库
    await this.repository.updateVideoPicture(videoId, imageBlob, url);

    // 2. 更新缓存
    const video = await this.getVideo(videoId);
    if (video) {
      this.updateAllCaches(video);
    }
  }

  /**
   * 获取视频封面图片
   */
  async getVideoPicture(videoId: ID): Promise<Blob | null> {
    return this.repository.getVideoPicture(videoId);
  }

  /**
   * 标记视频为失效
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async markVideoAsInvalid(videoId: ID): Promise<void> {
    // 1. 先更新数据库
    await this.repository.markVideoAsInvalid(videoId);

    // 2. 更新缓存
    const video = await this.getVideo(videoId);
    if (video) {
      this.updateAllCaches(video);
    }
  }

  /**
   * 批量标记视频为失效
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async markVideosAsInvalid(videoIds: ID[]): Promise<void> {
    // 1. 先更新数据库
    await this.repository.markVideosAsInvalid(videoIds);

    // 2. 更新缓存
    const videos = await this.repository.getVideos(videoIds);
    videos.forEach(video => this.updateAllCaches(video));
  }

  /**
   * 清理失效视频
   * 先更新数据库，再更新缓存，确保数据一致性
   */
  async cleanupInvalidVideos(): Promise<number> {
    // 1. 先更新数据库
    const count = await this.repository.cleanupInvalidVideos();

    // 2. 缓存清理由 CacheManager 统一管理

    return count;
  }

  // ==================== 缓存管理职责 ====================

  /**
   * 更新所有缓存（IndexCache、TagCache、DataCache）
   * 这是唯一允许修改缓存的地方
   */
  private updateAllCaches(video: Video): void {
    // 1. 更新 IndexCache
    this.updateIndexCache(video);

    // 2. 更新 TagCache
    this.updateTagCache(video);

    // 3. 更新 DataCache
    this.dataCache.set(video.videoId, video);
  }

  /**
   * 更新 IndexCache
   * 将 Video 转换为 VideoIndex
   */
  private updateIndexCache(video: Video): void {
    const index: VideoIndex = {
      videoId: video.videoId,
      platform: video.platform,
      bv: video.bv,
      creatorId: video.creatorId,
      title: video.title,
      duration: video.duration,
      publishTime: video.publishTime,
      tags: video.tags,
      isInvalid: video.isInvalid
    };
    this.indexCache.set(video.videoId, index);
  }

  /**
   * 更新 TagCache
   * 更新视频关联的所有标签映射
   */
  private updateTagCache(video: Video): void {
    video.tags.forEach(tagId => {
      // 更新标签到视频的映射
      // 注意：TagCache 的具体实现由 Cache 层负责，这里只负责调用更新
      // 实际的更新逻辑应该在 TagCache 内部实现
    });
  }

  // ==================== 数据转换职责 ====================

  /**
   * 将 ID 列表转换为 Video 对象列表
   * 协调 DataCache 与数据库完成数据加载
   */
  async getVideosByIds(ids: ID[]): Promise<Video[]> {
    const videoMap = await this.getVideos(ids);
    return ids.map(id => videoMap.get(id)).filter((v): v is Video => v !== undefined);
  }

  // ==================== IDataRepository 接口实现 ====================

  /**
   * 根据ID获取单个数据
   * 实现 IDataRepository 接口
   */
  async getById(id: number): Promise<Video | null> {
    return this.getVideo(id);
  }

  /**
   * 根据ID列表批量获取数据
   * 实现 IDataRepository 接口
   */
  async getByIds(ids: number[]): Promise<Video[]> {
    return this.getVideosByIds(ids);
  }

  /**
   * 获取所有数据
   * 实现 IDataRepository 接口
   */
  async getAll(): Promise<Video[]> {
    // 从数据库获取所有视频
    const allVideos = await this.repository.getAllVideos();

    // 批量更新缓存
    const cacheEntries = new Map<number, Video>();
    allVideos.forEach(video => {
      cacheEntries.set(video.videoId, video);
    });
    this.dataCache.setBatch(cacheEntries);

    return allVideos;
  }

  /**
   * 将 Video 对象转换为 VideoIndex
   */
  private videoToIndex(video: Video): VideoIndex {
    return {
      videoId: video.videoId,
      platform: video.platform,
      bv: video.bv,
      creatorId: video.creatorId,
      title: video.title,
      duration: video.duration,
      publishTime: video.publishTime,
      tags: video.tags,
      isInvalid: video.isInvalid
    };
  }

  // ==================== 缓存统计职责 ====================

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    videoDataCache: {
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
      videoDataCache: stats.videoDataCache,
      indexCache: stats.indexCache,
      tagCache: stats.tagCache
    };
  }
}
