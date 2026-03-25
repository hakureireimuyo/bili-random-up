/**
 * 视频索引缓存实现
 * 管理视频索引的内存缓存
 */

import type { VideoIndex, VideoIndexCache } from './video-index-types.js';

/**
 * 视频索引缓存类
 */
export class VideoIndexCacheImpl implements VideoIndexCache {
  private cache: Map<string, VideoIndex> = new Map();
  private creatorToVideos: Map<string, Set<string>> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  /**
   * 设置视频索引
   */
  set(index: VideoIndex): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        const oldIndex = this.cache.get(firstKey);
        if (oldIndex) {
          // 从创作者映射中删除
          const videoSet = this.creatorToVideos.get(oldIndex.creatorId);
          if (videoSet) {
            videoSet.delete(firstKey);
            if (videoSet.size === 0) {
              this.creatorToVideos.delete(oldIndex.creatorId);
            }
          }
        }
        this.cache.delete(firstKey);
      }
    }

    // 添加到缓存
    this.cache.set(index.videoId, index);

    // 更新创作者到视频的映射
    if (!this.creatorToVideos.has(index.creatorId)) {
      this.creatorToVideos.set(index.creatorId, new Set());
    }
    this.creatorToVideos.get(index.creatorId)!.add(index.videoId);
  }

  /**
   * 批量设置视频索引
   */
  setBatch(indexes: VideoIndex[]): void {
    indexes.forEach(index => this.set(index));
  }

  /**
   * 获取视频索引
   */
  get(id: string): VideoIndex | undefined {
    return this.cache.get(id);
  }

  /**
   * 获取所有视频索引
   */
  values(): VideoIndex[] {
    return Array.from(this.cache.values());
  }

  /**
   * 删除视频索引
   */
  delete(id: string): boolean {
    const index = this.cache.get(id);
    if (!index) {
      return false;
    }

    // 从创作者映射中删除
    const videoSet = this.creatorToVideos.get(index.creatorId);
    if (videoSet) {
      videoSet.delete(id);
      if (videoSet.size === 0) {
        this.creatorToVideos.delete(index.creatorId);
      }
    }

    return this.cache.delete(id);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.creatorToVideos.clear();
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 根据创作者ID获取视频索引
   */
  getByCreator(creatorId: string): VideoIndex[] {
    const videoIds = this.creatorToVideos.get(creatorId);
    if (!videoIds) {
      return [];
    }

    const result: VideoIndex[] = [];
    for (const videoId of videoIds) {
      const index = this.cache.get(videoId);
      if (index) {
        result.push(index);
      }
    }
    return result;
  }

  /**
   * 根据创作者ID列表获取视频索引
   */
  getByCreators(creatorIds: string[]): VideoIndex[] {
    const result: VideoIndex[] = [];
    for (const creatorId of creatorIds) {
      const videos = this.getByCreator(creatorId);
      result.push(...videos);
    }
    return result;
  }

  /**
   * 根据标签获取视频索引
   */
  getByTags(tagIds: string[]): VideoIndex[] {
    return this.values().filter(index =>
      tagIds.some(tagId => index.tags.includes(tagId))
    );
  }

  /**
   * 根据时长范围获取视频索引
   */
  getByDurationRange(min?: number, max?: number): VideoIndex[] {
    return this.values().filter(index => {
      if (min !== undefined && index.duration < min) {
        return false;
      }
      if (max !== undefined && index.duration > max) {
        return false;
      }
      return true;
    });
  }

  /**
   * 根据发布时间范围获取视频索引
   */
  getByPublishTimeRange(min?: number, max?: number): VideoIndex[] {
    return this.values().filter(index => {
      if (min !== undefined && index.publishTime < min) {
        return false;
      }
      if (max !== undefined && index.publishTime > max) {
        return false;
      }
      return true;
    });
  }

  /**
   * 根据关键词过滤视频索引
   */
  filterByKeyword(keyword: string): VideoIndex[] {
    if (!keyword) {
      return this.values();
    }
    const lowerKeyword = keyword.toLowerCase();
    return this.values().filter(index =>
      index.title.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * 排除失效的视频
   */
  filterValid(): VideoIndex[] {
    return this.values().filter(index => !index.isInvalid);
  }
}
