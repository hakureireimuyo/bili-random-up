/**
 * 收藏同步模块类型定义
 */

import type { Collection } from "../../../database/types/collection.js";
import type { Video as DBVideo } from "../../../database/types/video.js";
import type { VideoRepository } from "../../../database/implementations/video-repository.impl.js";
import type { CreatorRepository } from "../../../database/implementations/creator-repository.impl.js";
import type { TagRepository } from "../../../database/implementations/tag-repository.impl.js";
import type { CollectionRepository } from "../../../database/implementations/collection-repository.impl.js";
import type { CollectionItemRepository } from "../../../database/implementations/collection-item-repository.impl.js";


/**
 * 收藏同步配置
 */
export type FavoriteSyncConfig = {
  /** 默认收藏夹ID */
  defaultCollectionId: string;
  /** 默认收藏夹名称 */
  defaultCollectionName: string;
  /** 默认收藏夹描述 */
  defaultCollectionDescription: string;
  /** 每次同步的批次大小 */
  batchSize: number;
  /** 是否为每个B站收藏夹创建对应的本地收藏夹 */
  createMultipleCollections: boolean;
  /** 请求间隔时间（毫秒），用于避免触发风控 */
  requestInterval: number;
};

/**
 * 收藏同步结果
 */
export type FavoriteSyncResult = {
  /** 同步的视频数量 */
  syncedCount: number;
  /** 失败的视频列表 */
  failedVideos: Array<{ bvid: string; error: string }>;
};

/**
 * 收藏视频搜索参数
 */
export type FavoriteSearchParams = {
  /** 收藏夹ID */
  collectionId?: string;
  /** 搜索关键词 */
  keyword?: string;
  /** 标签ID */
  tagId?: string;
  /** UP主ID */
  creatorId?: string;
};

/**
 * 收藏视频详情（包含收藏项信息）
 */
export type FavoriteVideoDetail = DBVideo & {
  /** 添加到收藏夹的时间 */
  addedAt?: number;
};

/**
 * 同步进度信息
 */
export type SyncProgress = {
  /** 当前处理的收藏夹名称 */
  currentFolder?: string;
  /** 当前收藏夹已同步数量 */
  currentFolderSynced: number;
  /** 当前收藏夹总数量 */
  currentFolderTotal: number;
  /** 总已同步数量 */
  totalSynced: number;
  /** 总待同步数量 */
  totalToSync: number;
  /** 当前处理的视频 */
  currentVideo?: string;
};

/**
 * 同步进度回调函数
 */
export type SyncProgressCallback = (progress: SyncProgress) => void;

/**
 * 取消令牌
 */
export class CancellationToken {
  private _isCancelled = false;

  cancel(): void {
    this._isCancelled = true;
  }

  get isCancelled(): boolean {
    return this._isCancelled;
  }

  /**
   * 创建停止检查器函数
   */
  createStopChecker(): () => Promise<boolean> {
    return async () => this.isCancelled;
  }
}

/**
 * 收藏同步依赖（直接使用数据层实现）
 */
export type FavoriteSyncDependencies = {
  /** 视频仓库 */
  videoRepository: VideoRepository;
  /** 收藏夹仓库 */
  collectionRepository: CollectionRepository;
  /** 收藏项仓库 */
  collectionItemRepository: CollectionItemRepository;
  /** UP主仓库 */
  creatorRepository: CreatorRepository;
  /** 标签仓库 */
  tagRepository: TagRepository;
};
