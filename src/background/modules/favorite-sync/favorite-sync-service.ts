/**
 * 收藏同步服务
 * 负责收藏同步的主要业务逻辑，包括增量抓取、批处理和搜索
 */

import type {
  FavoriteSyncConfig,
  FavoriteSyncResult,
  FavoriteSearchParams,
  FavoriteVideoDetail,
  SyncProgress,
  SyncProgressCallback,
  CancellationToken
} from "./types.js";
import type {
  Video,
  Collection,
  CollectionItem,
  Creator,
  Tag
} from "../../../database/types/index.js";
import {
  convertBiliFolderToLocalCollectionWithId,
  convertBiliVideoToLocalVideo,
  convertBiliUPToCreatorWithId,
  convertBiliVideoToCollectionItem,
  convertTagNameToTag,
  convertTagNameToTagWithId,
  extractTagsFromDescription
} from "./data-converters.js";
import {
  BiliApiFavoriteDataSource,
  BiliApiVideoDataSource,
  BiliApiUserDataSource
} from "./data-adapters.js";
import { DEFAULT_FAVORITE_SYNC_CONFIG } from "./config.js";
import { Platform } from "../../../database/types/base.js";
import { TagSource } from "../../../database/types/base.js";
import {categoryRepository, VideoRepository, favoriteRepository, creatorRepository, tagRepository} from "../../../database/repository/index.js"

/**
 * 收藏夹上下文
 * 用于记录同步过程中的状态信息
 */
export interface FolderContext {
  /** 远程收藏夹信息 */
  remoteFolder: any;
  /** 本地收藏夹信息 */
  localFolder: Collection;
  /** 已同步的视频ID集合 */
  syncedVideoIds: Set<string>;
  /** 远程总视频数 */
  remoteTotalCount: number;
  /** 同步进度 */
  progress: SyncProgress;
}

/**
 * 收藏同步服务类
 */
export class FavoriteSyncService {
  private config: FavoriteSyncConfig;
  private videoDataSource: BiliApiVideoDataSource;
  private favoriteDataSource: BiliApiFavoriteDataSource;
  private userDataSource: BiliApiUserDataSource;
  private progressCallback: SyncProgressCallback | null = null;
  private cancellationToken: CancellationToken | null = null;
  private isRunning = false;

  /**
   * 创建收藏同步服务
   * @param config 同步配置
   */
  constructor(config: FavoriteSyncConfig = DEFAULT_FAVORITE_SYNC_CONFIG) {
    this.config = config;
    this.videoDataSource = new BiliApiVideoDataSource(config.requestInterval);
    this.favoriteDataSource = new BiliApiFavoriteDataSource(config.requestInterval);
    this.userDataSource = new BiliApiUserDataSource(config.requestInterval);
  }

  /**
   * 设置进度回调函数
   * @param callback 进度回调函数
   */
  setProgressCallback(callback: SyncProgressCallback): void {
    this.progressCallback = callback;
  }

  /**
   * 设置取消令牌
   * @param token 取消令牌
   */
  setCancellationToken(token: CancellationToken): void {
    this.cancellationToken = token;
  }

  /**
   * 执行同步
   * @param upMid 用户ID
   * @param options 同步选项
   * @returns 同步结果
   */
  async sync(upMid: string, options: {
    skipExisting?: boolean;
    forceFullSync?: boolean;
  } = {}): Promise<FavoriteSyncResult> {
    if (this.isRunning) {
      throw new Error("同步任务已在运行中");
    }

    this.isRunning = true;
    const result: FavoriteSyncResult = {
      syncedCount: 0,
      failedVideos: []
    };

    try {
      // 初始化取消检查
      if (this.cancellationToken) {
        const stopChecker = this.cancellationToken.createStopChecker();
        const checkInterval = setInterval(async () => {
          if (await stopChecker()) {
            this.isRunning = false;
            clearInterval(checkInterval);
            throw new Error("同步已取消");
          }
        }, 1000);
      }

      // 1. 获取用户收藏夹和订阅合集
      const userFolders = await this.favoriteDataSource.getUserFavoriteFolders(upMid);
      const subscribedFolders = await this.favoriteDataSource.getSubscribedFavoriteFolders(upMid);

      // 2. 处理收藏夹
      const allFolderContexts: FolderContext[] = [];

      // 处理用户收藏夹
      for (const folder of userFolders) {
        if (this.cancellationToken?.isCancelled) break;

        const context = await this.processFolder(
          folder,
          'user',
          upMid,
          options
        );
        allFolderContexts.push(context);
      }

      // 处理订阅合集
      for (const folder of subscribedFolders) {
        if (this.cancellationToken?.isCancelled) break;

        const context = await this.processFolder(
          folder,
          'subscription',
          upMid,
          options
        );
        allFolderContexts.push(context);
      }

      // 3. 同步所有收藏夹的视频
      for (const context of allFolderContexts) {
        if (this.cancellationToken?.isCancelled) break;

        await this.syncFolderVideos(context, result);
      }

      return result;
    } catch (error) {
      console.error("同步过程中发生错误:", error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 处理单个收藏夹
   * @param folder 远程收藏夹信息
   * @param type 收藏夹类型
   * @param upMid 用户ID
   * @param options 同步选项
   * @returns 收藏夹上下文
   */
  private async processFolder(
    folder: any,
    type: 'user' | 'subscription',
    upMid: string,
    options: { skipExisting?: boolean; forceFullSync?: boolean }
  ): Promise<FolderContext> {
    // 转换为本地收藏夹模型
    const localFolder = convertBiliFolderToLocalCollectionWithId(
      folder,
      type,
      this.config.defaultCollectionId,
      this.config.defaultCollectionName,
      this.config.defaultCollectionDescription
    );

    // 检查本地是否已存在该收藏夹
    const existingFolder = await favoriteRepository.getCollection(localFolder.collectionId);
    
    if (!existingFolder) {
      // 如果不存在，则创建
      await favoriteRepository.createCollection(
        localFolder.name,
        localFolder.platform,
        localFolder.description,
        localFolder.isPublic,
        localFolder.sortOrder,
        localFolder.tags,
        localFolder.type
      );
    }

    // 获取本地已同步的视频ID集合
    const localItems = await favoriteRepository.queryItems(localFolder.collectionId);
    const syncedVideoIds = new Set(localItems.data.map(item => item.videoId));

    // 获取远程总视频数
    let remoteTotalCount = folder.media_count || 0;

    // 如果启用了增量同步且本地已有数据，则获取远程实际数量
    if (!options.forceFullSync && syncedVideoIds.size > 0) {
      try {
        const firstPageVideos = await this.favoriteDataSource.getFavoriteVideos(
          folder.id,
          1,
          1
        );
        remoteTotalCount = firstPageVideos.length > 0 ? folder.media_count : 0;
      } catch (error) {
        console.warn(`获取远程视频总数失败: ${error}`);
      }
    }

    // 创建进度信息
    const progress: SyncProgress = {
      currentFolder: folder.title,
      currentFolderSynced: syncedVideoIds.size,
      currentFolderTotal: remoteTotalCount,
      totalSynced: 0,
      totalToSync: remoteTotalCount,
      currentVideo: undefined
    };

    return {
      remoteFolder: folder,
      localFolder: existingFolder || localFolder,
      syncedVideoIds,
      remoteTotalCount,
      progress
    };
  }

  /**
   * 同步收藏夹中的视频
   * @param context 收藏夹上下文
   * @param result 同步结果
   */
  private async syncFolderVideos(context: FolderContext, result: FavoriteSyncResult): Promise<void> {
    const { remoteFolder, localFolder, syncedVideoIds, remoteTotalCount } = context;
    const folderId = remoteFolder.id;
    const folderType = remoteFolder.type || 'user';

    // 如果本地数据已是最新的，则跳过
    if (syncedVideoIds.size >= remoteTotalCount && remoteTotalCount > 0) {
      console.log(`收藏夹 "${remoteFolder.title}" 已是最新，跳过同步`);
      return;
    }

    // 计算需要抓取的页数
    const pageSize = 20;
    const totalPages = Math.ceil(remoteTotalCount / pageSize);
    let currentPage = 1;
    let syncedInFolder = 0;

    // 如果本地已有数据，尝试从接近本地数据量的位置开始抓取
    if (syncedVideoIds.size > 0 && remoteTotalCount > syncedVideoIds.size) {
      const estimatedPosition = Math.floor((syncedVideoIds.size / remoteTotalCount) * totalPages);
      currentPage = Math.max(1, estimatedPosition - 1); // 向前一页开始，确保不遗漏
    }

    // 分页抓取视频
    while (currentPage <= totalPages && !this.cancellationToken?.isCancelled) {
      let videos: any[] = [];

      try {
        // 根据收藏夹类型选择不同的API
        if (folderType === 'subscription') {
          videos = await this.favoriteDataSource.getSubscribedFavoriteVideos(
            folderId,
            currentPage,
            pageSize
          );
        } else {
          videos = await this.favoriteDataSource.getFavoriteVideos(
            folderId,
            currentPage,
            pageSize
          );
        }

        if (videos.length === 0) {
          break;
        }

        // 过滤掉已存在的视频
        const newVideos = videos.filter(video => !syncedVideoIds.has(video.bvid));

        if (newVideos.length === 0) {
          // 如果这一页没有新视频，且已经接近本地数据量，则提前结束
          if (syncedInFolder > 0 && currentPage > 1) {
            console.log(`连续多页没有新视频，提前结束同步`);
            break;
          }
          currentPage++;
          continue;
        }

        // 分批处理新视频
        const batches = this.chunkArray(newVideos, this.config.batchSize);

        for (const batch of batches) {
          if (this.cancellationToken?.isCancelled) break;

          try {
            await this.processVideoBatch(batch, localFolder.collectionId, result);
            syncedInFolder += batch.length;

            // 更新进度
            context.progress.currentFolderSynced += batch.length;
            context.progress.totalSynced += batch.length;
            context.progress.currentVideo = batch[batch.length - 1].title;

            // 通知进度更新
            if (this.progressCallback) {
              this.progressCallback(context.progress);
            }
          } catch (error) {
            console.error(`处理视频批次失败: ${error}`);
            // 将失败的视频记录到结果中
            batch.forEach(video => {
              result.failedVideos.push({
                bvid: video.bvid,
                error: error instanceof Error ? error.message : String(error)
              });
            });
          }
        }

        currentPage++;
      } catch (error) {
        console.error(`获取第 ${currentPage} 页视频失败: ${error}`);
        // 记录错误但不中断整个同步过程
        currentPage++;
      }
    }
  }

  /**
   * 处理视频批次
   * @param videos 视频列表
   * @param collectionId 收藏夹ID
   * @param result 同步结果
   */
  private async processVideoBatch(
    videos: any[],
    collectionId: string,
    result: FavoriteSyncResult
  ): Promise<void> {
    // 1. 获取视频详情和标签
    const videoDetails = await Promise.all(
      videos.map(video => this.videoDataSource.getVideoDetail(video.bvid))
    );

    // 2. 获取视频标签
    const videoTagsList = await Promise.all(
      videos.map(video => this.videoDataSource.getVideoTags(video.bvid))
    );

    // 3. 获取创作者信息
    const creators = await Promise.all(
      videos.map(async (video) => {
        const creator = await this.userDataSource.getUserInfo(video.upper?.mid);
        return creator;
      })
    );

    // 4. 处理创作者
    const processedCreators: Creator[] = [];
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const creatorInfo = creators[i];

      if (!creatorInfo) continue;

      const creator = convertBiliUPToCreatorWithId(
        video.upper?.mid || '',
        creatorInfo.name,
        creatorInfo.face,
        creatorInfo.face
      );

      // 更新创作者信息
      await creatorRepository.createOrUpdateCreator(creator);
      processedCreators.push(creator);
    }

    // 5. 处理标签
    const allTagNames = new Set<string>();
    videoTagsList.forEach(tags => {
      tags.forEach((tag: any) => {
        allTagNames.add(tag.tag_name);
      });
    });

    // 创建标签
    const createdTagIds = [];
    for (const tagName of allTagNames) {
      const tag = await tagRepository.createTag(tagName, TagSource.SYSTEM);
      createdTagIds.push(tag);
    }

    // 创建标签映射
    const tagMap = new Map<string, string>();
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const tags = videoTagsList[i];

      // 获取视频对应的标签ID列表
      const tagIds = tags.map((tag: any) => {
        if (tagMap.has(tag.tag_name)) {
          return tagMap.get(tag.tag_name)!;
        }

        const tagId = createdTagIds.find(id => 
          this.tagRepository.getTag(id)?.name === tag.tag_name
        );

        if (tagId) {
          tagMap.set(tag.tag_name, tagId);
          return tagId;
        }

        return '';
      });

      // 6. 处理视频
      const videoDetail = videoDetails[i];
      const videoCreator = processedCreators[i];

      if (!videoDetail) continue;

      const video = convertBiliVideoToLocalVideo(
        videos[i],
        videoCreator,
        tagIds.map(id => ({ tagId: id, name: '', source: TagSource.SYSTEM }))
      );

      // 更新视频信息
      await videoRepository.createOrUpdateVideo(video);

      // 7. 添加到收藏夹
      const collectionItem = convertBiliVideoToCollectionItem(
        videos[i],
        collectionId
      );

      try {
        await favoriteRepository.addToCollection(
          collectionId,
          videos[i].bvid,
          collectionItem.note,
          collectionItem.order
        );
        result.syncedCount++;
      } catch (error) {
        console.error(`添加视频到收藏夹失败: ${error}`);
        result.failedVideos.push({
          bvid: videos[i].bvid,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * 搜索收藏视频
   * @param params 搜索参数
   * @returns 搜索结果
   */
  async searchFavoriteVideos(params: FavoriteSearchParams): Promise<FavoriteVideoDetail[]> {
    // 构建查询条件
    const condition: any = {};

    if (params.collectionId) {
      condition.collectionId = params.collectionId;
    }

    if (params.keyword) {
      condition.keyword = params.keyword;
    }

    if (params.tagId) {
      condition.tags = [params.tagId];
    }

    if (params.creatorId) {
      condition.creatorId = params.creatorId;
    }

    // 执行查询
    const result = await this.videoRepository.query(condition);

    // 转换为收藏视频详情
    const favoriteVideos: FavoriteVideoDetail[] = [];

    for (const video of result.data) {
      // 获取收藏项信息
      const collectionItem = await favoriteRepository.getCollectionItem(
        params.collectionId || '',
        video.videoId
      );

      if (collectionItem) {
        favoriteVideos.push({
          ...video,
          addedAt: collectionItem.addedAt
        });
      }
    }

    return favoriteVideos;
  }

  /**
   * 分割数组为多个小块
   * @param array 原始数组
   * @param size 每块大小
   * @returns 分割后的数组
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * 收藏视频搜索服务
 */
export class FavoriteVideoSearchService {
  private videoRepository: VideoRepository;
  private collectionRepository: typeof favoriteRepository;

  constructor(
    videoRepository: VideoRepository,
    collectionRepository: typeof favoriteRepository
  ) {
    this.videoRepository = videoRepository;
    this.collectionRepository = collectionRepository;
  }

  /**
   * 搜索收藏视频
   * @param params 搜索参数
   * @returns 搜索结果
   */
  async search(params: FavoriteSearchParams): Promise<FavoriteVideoDetail[]> {
    // 构建查询条件
    const condition: any = {};

    if (params.collectionId) {
      condition.collectionId = params.collectionId;
      condition.collectionType = 'user'; // 默认搜索用户收藏夹
    }

    if (params.keyword) {
      condition.keyword = params.keyword;
    }

    if (params.tagId) {
      condition.tags = [params.tagId];
    }

    if (params.creatorId) {
      condition.creatorId = params.creatorId;
    }

    // 执行查询
    const result = await this.videoRepository.query(condition);

    // 转换为收藏视频详情
    const favoriteVideos: FavoriteVideoDetail[] = [];

    for (const video of result.data) {
      // 获取收藏项信息
      if (params.collectionId) {
        const collectionItem = await this.collectionRepository.getCollectionItem(
          params.collectionId,
          video.videoId
        );

        if (collectionItem) {
          favoriteVideos.push({
            ...video,
            addedAt: collectionItem.addedAt
          });
        }
      } else {
        // 如果没有指定收藏夹，则从所有收藏项中查找
        const collections = await this.collectionRepository.query({});
        
        for (const collection of collections.data) {
          const collectionItem = await this.collectionRepository.getCollectionItem(
            collection.collectionId,
            video.videoId
          );
          
          if (collectionItem) {
            favoriteVideos.push({
              ...video,
              addedAt: collectionItem.addedAt
            });
          }
        }
      }
    }

    return favoriteVideos;
  }
}
