
/**
 * VideoRepository - 视频数据仓库
 * 作为对外接口层，只负责将 UI 请求转为数据请求描述
 */

import type { Video } from '../types/video.js';
import type { PaginatedResult, DataManagementOptions } from '../manager/types.js';
import { VideoDataManager } from '../manager/video-data-manager.js';
import { RequestType } from '../plan/query-plan.js';

// Query 类型定义
type VideoQueryCondition = {
  collectionId?: string;
  creatorId?: string;
  tags?: string[];
  keyword?: string;
  collectionType?: 'user' | 'subscription';
};

/**
 * VideoRepository 类
 * 职责:
 * 1. 将 UI 请求转为数据请求描述
 * 2. 不直接操作 cache
 * 3. 不直接访问 DB
 * 4. 不做复杂逻辑
 */
export class VideoRepository {
  private manager: VideoDataManager;

  constructor() {
    this.manager = new VideoDataManager();
  }

  /**
   * 初始化
   * @param collectionId 收藏夹ID
   * @param collectionType 收藏夹类型
   */
  async init(collectionId?: string, collectionType?: 'user' | 'subscription'): Promise<void> {
    return this.manager.init(collectionId, collectionType);
  }

  /**
   * 查询视频 - 主查询入口
   * @param condition 查询条件
   * @param options 查询选项
   * @returns 查询结果
   */
  async query(
    condition: VideoQueryCondition,
    options: DataManagementOptions = {}
  ): Promise<PaginatedResult<Video>> {
    // 根据查询条件决定请求类型
    if (condition.collectionId) {
      return this.manager.execute({
        type: RequestType.GET_VIDEOS_BY_COLLECTION,
        payload: {
          collectionId: condition.collectionId,
          collectionType: condition.collectionType,
          keyword: condition.keyword
        }
      }, options);
    } else if (condition.creatorId) {
      return this.manager.execute({
        type: RequestType.GET_VIDEOS_BY_CREATOR,
        payload: {
          creatorId: condition.creatorId,
          keyword: condition.keyword
        }
      }, options);
    } else if (condition.tags && condition.tags.length > 0) {
      return this.manager.execute({
        type: RequestType.GET_VIDEOS_BY_TAG,
        payload: {
          tags: condition.tags,
          keyword: condition.keyword
        }
      }, options);
    } else {
      return this.manager.execute({
        type: RequestType.GET_ALL_VIDEOS,
        payload: {
          keyword: condition.keyword
        }
      }, options);
    }
  }

  /**
   * 根据 ID 获取视频
   * @param videoId 视频ID
   * @returns 视频对象
   */
  getVideo(videoId: string): Video | undefined {
    return this.manager.getVideo(videoId);
  }

  /**
   * 批量获取视频
   * @param videoIds 视频ID列表
   * @returns 视频对象列表
   */
  getVideos(videoIds: string[]): Video[] {
    return this.manager.getVideos(videoIds);
  }

  /**
   * 获取所有标签
   * @returns 标签ID列表
   */
  getAllTags(): string[] {
    return this.manager.getAllTags();
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.manager.clearCache();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return this.manager.getCacheStats();
  }
}

// 导出单例实例
export const videoRepository = new VideoRepository();
