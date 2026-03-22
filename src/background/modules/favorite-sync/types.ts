
/**
 * 收藏同步模块类型定义
 */

import type { Collection, CollectionItem } from "../../../database/types/collection.js";
import type { Platform, PaginationParams, PaginationResult } from "../../../database/types/base.js";
import type { Video as DBVideo } from "../../../database/types/video.js";
import type { Creator as DBCreator } from "../../../database/types/creator.js";
import type { Tag as DBTag } from "../../../database/types/semantic.js";
import type { ICollectionRepository } from "../../../database/interfaces/collection/collection-repository.interface.js";
import type { ICollectionItemRepository } from "../../../database/interfaces/collection/collection-item-repository.interface.js";
import type { IVideoRepository } from "../../../database/interfaces/video/video-repository.interface.js";
import type { ICreatorRepository } from "../../../database/interfaces/creator/creator-repository.interface.js";
import type { ITagRepository } from "../../../database/interfaces/semantic/tag-repository.interface.js";

export interface FavoriteVideoEntry {
  bvid: string;
  intro?: string;
}

export interface FavoriteTag {
  tag_id: number;
  tag_name: string;
}

export interface FavoriteFolder {
  id: number;
  title: string;
  media_count: number;
}

export interface CollectedFavoriteFolder extends FavoriteFolder {
  upper: {
    mid: number;
    name: string;
  };
}

export type FavoriteFolderLike = FavoriteFolder | CollectedFavoriteFolder;

export interface VideoOwner {
  mid: number;
  name: string;
}

export interface FavoriteVideoApiDetail {
  bvid: string;
  owner: VideoOwner;
  title: string;
  desc?: string;
  duration: number;
  pubdate: number;
  pic: string;
}

/**
 * 收藏同步配置
 */
export interface FavoriteSyncConfig {
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
}

/**
 * 收藏同步结果
 */
export interface FavoriteSyncResult {
  /** 同步的视频数量 */
  syncedCount: number;
  /** 失败的视频列表 */
  failedVideos: Array<{ bvid: string; error: string }>;
}

/**
 * 收藏视频搜索参数
 */
export interface FavoriteSearchParams {
  /** 收藏夹ID */
  collectionId?: string;
  /** 搜索关键词 */
  keyword?: string;
  /** 标签ID */
  tagId?: string;
  /** UP主ID */
  creatorId?: string;
}

/**
 * 收藏视频详情（包含收藏项信息）
 */
export type FavoriteVideoDetail = DBVideo & {
  /** 添加到收藏夹的时间 */
  addedAt?: number;
  /** 封面图（兼容字段） */
  picture?: string;
};

/**
 * 视频数据源接口
 */
export interface IVideoDataSource {
  /** 获取视频详情 */
  getVideoDetail(bvid: string): Promise<FavoriteVideoApiDetail | null>;
  /** 获取视频标签 */
  getVideoTags(bvid: string): Promise<FavoriteTag[]>;
}

/**
 * 收藏数据源接口
 */
export interface IFavoriteDataSource {
  /** 获取所有收藏视频 */
  getAllFavoriteVideos(up_mid: number, shouldStop?: () => Promise<boolean>): Promise<FavoriteVideoEntry[]>;
  /** 获取收藏夹列表 */
  getFavoriteFolders(up_mid: number): Promise<FavoriteFolder[]>;
  /** 获取收藏夹视频 */
  getFavoriteVideos(media_id: number, pn: number, ps: number): Promise<FavoriteVideoEntry[]>;
  /** 获取用户订阅的合集列表 */
  getCollectedFolders(up_mid: number): Promise<CollectedFavoriteFolder[]>;
  /** 获取订阅收藏夹视频 */
  getCollectedVideos(media_id: number, pn: number, ps: number): Promise<FavoriteVideoEntry[]>;
  /** 获取订阅合集视频 */
  getSeasonVideos(season_id: number, pn: number, ps: number): Promise<FavoriteVideoEntry[]>;
}

export interface ICollectionRepositoryLike extends Pick<ICollectionRepository, "getCollection" | "createCollectionWithId"> {}

export interface ICollectionItemRepositoryLike extends Pick<ICollectionItemRepository, "getCollectionVideos" | "countCollectionItems" | "isVideoInCollection" | "addVideoToCollection"> {
  getCollectionVideos(collectionId: string, pagination: PaginationParams): Promise<PaginationResult<CollectionItem>>;
}

export interface IVideoRepositoryLike extends Pick<IVideoRepository, "getVideos" | "upsertVideo"> {}

export interface ICreatorRepositoryLike extends Pick<ICreatorRepository, "getCreator" | "upsertCreator"> {}

export interface ITagRepositoryLike extends Pick<ITagRepository, "getTag" | "createTag"> {
  createTag(tag: Omit<DBTag, "tagId">): Promise<string>;
}

/**
 * 收藏同步依赖接口
 */
export interface IFavoriteSyncDependencies {
  /** 视频数据源 */
  videoDataSource: IVideoDataSource;
  /** 收藏数据源 */
  favoriteDataSource: IFavoriteDataSource;
  /** 视频仓库 */
  videoRepository: IVideoRepositoryLike;
  /** 收藏夹仓库 */
  collectionRepository: ICollectionRepositoryLike;
  /** 收藏项仓库 */
  collectionItemRepository: ICollectionItemRepositoryLike;
  /** UP主仓库 */
  creatorRepository: ICreatorRepositoryLike;
  /** 标签仓库 */
  tagRepository: ITagRepositoryLike;
}
