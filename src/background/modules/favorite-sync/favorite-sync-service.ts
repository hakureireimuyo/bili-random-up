
/**
 * 收藏同步服务
 * 负责从B站同步收藏数据到本地数据库
 */

import { Platform } from "../../../database/types/base.js";
import type { FavoriteSyncConfig, FavoriteSyncResult, FavoriteSearchParams, FavoriteVideoDetail, IFavoriteSyncDependencies } from "./types.js";
import { DEFAULT_FAVORITE_SYNC_CONFIG } from "./config.js";
import { toDBVideo, toDBCreator, toDBTag, toInvalidVideo } from "./data-converters.js";

const BILIBILI = Platform.BILIBILI;

/**
 * 收藏同步服务类
 */
export class FavoriteSyncService {
  private config: FavoriteSyncConfig;

  constructor(
    private dependencies: IFavoriteSyncDependencies,
    config: Partial<FavoriteSyncConfig> = {}
  ) {
    this.config = { ...DEFAULT_FAVORITE_SYNC_CONFIG, ...config };
  }

  /**
   * 同步收藏夹数据
   * @param up_mid 用户ID
   * @param shouldStop 停止同步的回调函数
   * @returns 同步结果
   */
  async syncFavoriteVideos(up_mid: number, shouldStop?: () => Promise<boolean>): Promise<FavoriteSyncResult> {
  
    const result: FavoriteSyncResult = {
      syncedCount: 0,
      failedVideos: []
    };

    console.log(`[FavoriteSync] Result object created`);

    try {
      // 获取或创建收藏夹
      let collection;
      if (this.config.createMultipleCollections) {
          const folders = await this.dependencies.favoriteDataSource.getFavoriteFolders(up_mid);

          // 处理每个收藏夹
          for (const folder of folders) {
            // 检查是否应该停止同步
            if (shouldStop) {
              const shouldStopValue = await shouldStop();
              console.log(`[FavoriteSync] Checking shouldStop before processing folder: ${shouldStopValue}`);
              if (shouldStopValue) {
                console.log("[FavoriteSync] Sync stopped by user");
                break;
              }
            }

            await this.processFolder(folder, result, shouldStop);
          }

          // 获取用户订阅的合集列表
          const collectedFolders = await this.dependencies.favoriteDataSource.getCollectedFolders(up_mid);

          // 处理每个订阅合集
          for (const folder of collectedFolders) {
            // 检查是否应该停止同步
            if (shouldStop) {
              const shouldStopValue = await shouldStop();
              console.log(`[FavoriteSync] Checking shouldStop before processing collected folder: ${shouldStopValue}`);
              if (shouldStopValue) {
                console.log("[FavoriteSync] Sync stopped by user");
                break;
              }
            }

            await this.processFolder(folder, result, shouldStop);
          }
      } else {
        // 获取或创建默认收藏夹
        collection = await this.getOrCreateDefaultCollection();
        if (!collection) {
          throw new Error("Failed to create or get collection");
        }

        // 获取所有收藏视频
        const favoriteVideos = await this.dependencies.favoriteDataSource.getAllFavoriteVideos(up_mid, shouldStop);

        // 批量处理收藏视频
        for (let i = 0; i < favoriteVideos.length; i += this.config.batchSize) {
          // 检查是否应该停止同步
          if (shouldStop) {
            const shouldStopValue = await shouldStop();
            console.log(`[FavoriteSync] Checking shouldStop (default collection): ${shouldStopValue}`);
            if (shouldStopValue) {
              console.log("[FavoriteSync] Sync stopped by user");
              break;
            }
          }

          // 获取当前批次
          const batch = favoriteVideos.slice(i, i + this.config.batchSize);

          // 处理批次
          const shouldStopProcessing = await this.processBatch(batch, collection.collectionId, result, shouldStop);
          if (shouldStopProcessing) {
            console.log(`[FavoriteSync] Stopping further processing for default collection`);
            break;
          }
        }

      }

      console.log(`[FavoriteSync] Synced ${result.syncedCount} new videos`);
      return result;
    } catch (error) {
      console.error("[FavoriteSync] Error syncing favorite videos:", error);
      throw error;
    }
  }

  /**
   * 搜索收藏视频
   * @param params 搜索参数
   * @returns 搜索结果
   */
  async searchFavoriteVideos(params: FavoriteSearchParams): Promise<FavoriteVideoDetail[]> {
    const { collectionId, keyword, tagId, creatorId } = params;

    // 如果没有指定收藏夹ID，使用默认收藏夹
    const targetCollectionId = collectionId || this.config.defaultCollectionId;
    const collection = await this.dependencies.collectionRepository.getCollection(targetCollectionId);

    if (!collection) {
      return [];
    }

    // 获取收藏夹中的所有视频
    const { items } = await this.dependencies.collectionItemRepository.getCollectionVideos(
      collection.collectionId,
      { page: 0, pageSize: 1000 }
    );

    // 获取视频详情
    const videoIds = items.map((item: any) => item.videoId);
    const videos = await this.dependencies.videoRepository.getVideos(videoIds, BILIBILI);

    // 创建视频ID到收藏项的映射
    const itemMap = new Map(items.map((item: any) => [item.videoId, item]));

    // 合并视频详情和收藏项信息
    let merged = videos.map((video: any) => ({
      ...video,
      addedAt: (itemMap.get(video.videoId) as any)?.addedAt,
      picture: video.coverUrl
    }));

    // 应用过滤条件
    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      merged = merged.filter((v: any) =>
        v.title.toLowerCase().includes(lowerKeyword) ||
        v.description.toLowerCase().includes(lowerKeyword)
      );
    }

    if (tagId) {
      merged = merged.filter((v: any) => v.tags.includes(tagId));
    }

    if (creatorId) {
      merged = merged.filter((v: any) => v.creatorId === creatorId);
    }

    return merged;
  }

  /**
   * 获取或创建收藏夹
   */
  private async getOrCreateCollection(collectionId: string, name: string, description: string, type?: 'user' | 'subscription') {
    let collection = await this.dependencies.collectionRepository.getCollection(collectionId);

    if (!collection) {
      // 使用指定的ID创建收藏夹
      await this.dependencies.collectionRepository.createCollectionWithId(collectionId, {
        platform: BILIBILI,
        name,
        description,
        createdAt: Date.now(),
        lastUpdate: Date.now(),
        type
      });
      collection = await this.dependencies.collectionRepository.getCollection(collectionId);
    }

    return collection;
  }

  /**
   * 获取或创建默认收藏夹
   */
  private async getOrCreateDefaultCollection() {
    return this.getOrCreateCollection(
      this.config.defaultCollectionId,
      this.config.defaultCollectionName,
      this.config.defaultCollectionDescription,
      'user'
    );
  }
  
/**
 * 处理单个收藏夹/合集
 * @param folder 收藏夹/合集信息
 * @param result 同步结果
 * @param shouldStop 停止同步的回调函数
 */
private async processFolder(
  folder: any,
  result: FavoriteSyncResult,
  shouldStop?: () => Promise<boolean>
): Promise<void> {
  // 使用B站API返回的收藏夹ID作为本地收藏夹ID
  const collectionId = folder.id.toString();
  // 检查是否为订阅收藏夹（包含 upper 信息）
  const isCollectedFolder = 'upper' in folder;
  const description = isCollectedFolder
    ? `从UP主"${(folder as any).upper.name}"的合集"${folder.title}"同步的收藏视频`
    : `从B站收藏夹"${folder.title}"同步的收藏视频`;
  const type = isCollectedFolder ? 'subscription' : 'user';
  const folderCollection = await this.getOrCreateCollection(collectionId, folder.title, description, type);
  
  if (!folderCollection) {
    console.log(`[FavoriteSync] Failed to get or create collection for folder ${folder.title}`);
    return;
  }

  // 获取本地收藏夹中的视频数量
  const localVideoCount = await this.dependencies.collectionItemRepository.countCollectionItems(collectionId);
  console.log(`[FavoriteSync] Folder ${folder.title}: local count = ${localVideoCount}, API count = ${folder.media_count}`);

  // 如果本地存储的条目数量大于等于API返回的数量，则跳过该收藏夹
  if (localVideoCount >= folder.media_count) {
    console.log(`[FavoriteSync] Skipping folder ${folder.title}: local count (${localVideoCount}) >= API count (${folder.media_count})`);
    return;
  }

  // 获取本地收藏夹中的所有视频ID
  const { items: localItems } = await this.dependencies.collectionItemRepository.getCollectionVideos(
    collectionId,
    { page: 0, pageSize: 10000 }
  );
  const localVideoIds = new Set(localItems.map((item: any) => item.videoId));

  // 计算预期的差值：API总数 - 本地总数
  const expectedDiff = folder.media_count - localVideoCount;
  console.log(`[FavoriteSync] Folder ${folder.title}: expected diff = ${expectedDiff}`);

  // 获取该收藏夹的视频
  const pageSize = 20;
  let fetchedVideos: Array<{ bvid: string; intro?: string }> = [];
  let hasMore = true;
  let allFetchedCount = 0; // 总共获取的视频数量
  const maxFetchLimit = Math.min(expectedDiff * 2, 100); // 最大获取限制，避免过多请求
  let consecutiveExistingCount = 0; // 连续已存在视频计数
  const maxConsecutiveExisting = 5; // 最大连续已存在视频数（跳转后）

  // 智能分页策略：
  // 1. 先获取第一页，检查最新视频
  // 2. 如果本地有数据且第一页都是已存在的，跳到本地数据附近的位置
  // 3. 跳转后继续获取几页，直到找到新视频或达到限制
  
  let page = 1;
  let hasJumped = false; // 是否已经跳转过
  
  // 先获取第一页，检查最新视频
  // 根据收藏夹类型选择使用不同的方法
  const videos = isCollectedFolder
    ? await this.dependencies.favoriteDataSource.getSeasonVideos(folder.id, page, pageSize)
    : await this.dependencies.favoriteDataSource.getFavoriteVideos(folder.id, page, pageSize);

  if (videos.length > 0) {
    allFetchedCount += videos.length;
    console.log(`[FavoriteSync] Fetched ${videos.length} videos from page ${page}, total fetched: ${allFetchedCount}`);

    // 过滤掉已存在的视频
    let hasNewVideoInFirstPage = false;
    for (const video of videos) {
      if (!localVideoIds.has(video.bvid)) {
        fetchedVideos.push(video);
        hasNewVideoInFirstPage = true;
      }
    }

    // 如果第一页有新视频，继续从第二页开始获取
    if (hasNewVideoInFirstPage) {
      console.log(`[FavoriteSync] Found new videos in first page, continuing from page 2`);
    } else if (localVideoCount > 0 && videos.length === pageSize) {
      // 如果本地有数据且第一页都是已存在的，跳到本地数据附近的位置
      // 计算应该跳到的页码：本地数量 / 页大小，向下取整
      const jumpPage = Math.floor(localVideoCount / pageSize);
      if (jumpPage > 1) {
        console.log(`[FavoriteSync] First page all existing, jumping to page ${jumpPage} (around local data position ${localVideoCount})`);
        page = jumpPage;
        hasJumped = true;
        consecutiveExistingCount = 0; // 重置计数器
      }
    }
  } else {
    hasMore = false;
  }

  // 继续获取视频，直到获取足够的新视频或达到最大限制
  while (hasMore && fetchedVideos.length < expectedDiff && allFetchedCount < maxFetchLimit) {
    // 检查是否应该停止同步
    if (shouldStop) {
      const shouldStopValue = await shouldStop();
      console.log(`[FavoriteSync] Checking shouldStop while fetching videos: ${shouldStopValue}`);
      if (shouldStopValue) {
        console.log("[FavoriteSync] Sync stopped by user");
        return;
      }
    }

    // 获取下一页视频
    page++;
    // 根据收藏夹类型选择使用不同的方法
    const videos = isCollectedFolder
      ? await this.dependencies.favoriteDataSource.getSeasonVideos(folder.id, page, pageSize)
      : await this.dependencies.favoriteDataSource.getFavoriteVideos(folder.id, page, pageSize);

    
    if (videos.length === 0) {
      hasMore = false;
      break;
    }

    allFetchedCount += videos.length;
    console.log(`[FavoriteSync] Fetched ${videos.length} videos from page ${page}, total fetched: ${allFetchedCount}, new videos: ${fetchedVideos.length}/${expectedDiff}`);

    // 过滤掉已存在的视频
    let hasNewVideoInPage = false;
    for (const video of videos) {
      if (!localVideoIds.has(video.bvid)) {
        fetchedVideos.push(video);
        hasNewVideoInPage = true;
        consecutiveExistingCount = 0; // 重置计数器

        // 如果已经获取足够的新视频，立即停止
        if (fetchedVideos.length >= expectedDiff) {
          console.log(`[FavoriteSync] Fetched enough new videos (${fetchedVideos.length}/${expectedDiff}), stopping fetch`);
          hasMore = false;
          break;
        }
      } else {
        consecutiveExistingCount++;
      }
    }

    // 如果跳转后连续遇到多页已存在的视频，可以停止
    if (hasJumped && consecutiveExistingCount >= maxConsecutiveExisting * pageSize && !hasNewVideoInPage) {
      console.log(`[FavoriteSync] Found ${consecutiveExistingCount} consecutive existing videos after jump, stopping fetch`);
      hasMore = false;
    }

    // 如果获取的视频数小于页大小，说明已经没有更多视频
    if (videos.length < pageSize) {
      hasMore = false;
    }
  }

  // 如果没有获取到任何新视频，但本地数量小于API数量，可能是本地数据不准确
  if (fetchedVideos.length === 0 && localVideoCount < folder.media_count) {
    console.log(`[FavoriteSync] Warning: No new videos found but local count (${localVideoCount}) < API count (${folder.media_count}), may need to resync`);
  }

  console.log(`[FavoriteSync] Folder ${folder.title}: fetched ${fetchedVideos.length} new videos`);

  // 批量处理收藏视频
  for (let i = 0; i < fetchedVideos.length; i += this.config.batchSize) {
    // 检查是否应该停止同步
    if (shouldStop) {
      const shouldStopValue = await shouldStop();
      console.log(`[FavoriteSync] Checking shouldStop: ${shouldStopValue}`);
      if (shouldStopValue) {
        console.log("[FavoriteSync] Sync stopped by user");
        return;
      }
    }

    // 获取当前批次
    const batch = fetchedVideos.slice(i, i + this.config.batchSize);

    // 处理批次
    const shouldStopProcessing = await this.processBatch(batch, collectionId, result, shouldStop);
    if (shouldStopProcessing) {
      console.log(`[FavoriteSync] Stopping further processing for folder ${folder.title}`);
      return;
    }
  }
}

  /**
   * 批量处理收藏视频
   * @returns 是否应该停止处理该收藏夹的后续批次
   */
    private async processBatch(
    batch: Array<{ bvid: string; intro?: string }>,
    collectionId: string,
    result: FavoriteSyncResult,
    shouldStop?: () => Promise<boolean>
  ): Promise<boolean> {
    for (const favVideo of batch) {
      // 检查是否应该停止同步
      if (shouldStop) {
        const shouldStopValue = await shouldStop();
        console.log(`[FavoriteSync] Checking shouldStop in batch: ${shouldStopValue}`);
        if (shouldStopValue) {
          console.log("[FavoriteSync] Sync stopped by user during batch processing");
          return true;
        }
      }
      try {
        // 先检查视频是否已在收藏夹中
        const isInCollection = await this.dependencies.collectionItemRepository.isVideoInCollection(
          collectionId,
          favVideo.bvid
        );
        // 如果不在收藏夹中，需要获取视频详细信息并添加
        if (!isInCollection) {
          // 获取视频详细信息
          const videoDetail = await this.dependencies.videoDataSource.getVideoDetail(favVideo.bvid);
          
          if (!videoDetail) {
            console.warn(`[FavoriteSync] Failed to get video detail for ${favVideo.bvid}, creating invalid video record`);
            // 创建失效视频记录
            const invalidVideo = toInvalidVideo(favVideo.bvid);
            await this.dependencies.videoRepository.upsertVideo(invalidVideo);
            
            // 添加到收藏夹
            try {
              await this.dependencies.collectionItemRepository.addVideoToCollection(
                collectionId,
                favVideo.bvid,
                BILIBILI
              );
              result.syncedCount++;
              console.log(`[FavoriteSync] Added invalid video ${favVideo.bvid} to collection ${collectionId}`);
            } catch (error) {
              console.error(`[FavoriteSync] Error adding invalid video ${favVideo.bvid} to collection ${collectionId}:`, error);
              result.failedVideos.push({
                bvid: favVideo.bvid,
                error: error instanceof Error ? error.message : String(error)
              });
            }
            continue;
          }

          // 获取视频标签
          const videoTags = await this.dependencies.videoDataSource.getVideoTags(favVideo.bvid);

          // 确保UP主存在
          await this.ensureCreatorExists(videoDetail.owner.mid, videoDetail.owner.name);

          // 确保标签存在
          const tagIds = await this.ensureTagsExist(videoTags);

          // 保存视频信息
          const video = toDBVideo(videoDetail, tagIds);
          await this.dependencies.videoRepository.upsertVideo(video);

          // 添加到收藏夹
          try {
            const itemId = await this.dependencies.collectionItemRepository.addVideoToCollection(
              collectionId,
              favVideo.bvid,
              BILIBILI
            );
            result.syncedCount++;
          } catch (error) {
            console.error(`[FavoriteSync] Error adding video ${favVideo.bvid} to collection ${collectionId}:`, error);
            result.failedVideos.push({
              bvid: favVideo.bvid,
              error: error instanceof Error ? error.message : String(error)
            });
            continue;
          }

        } else {
          console.log(`[FavoriteSync] Video ${favVideo.bvid} already in collection, skipping`);
        }
      } catch (error) {
        console.error(`[FavoriteSync] Error processing video ${favVideo.bvid}:`, error);
        result.failedVideos.push({ 
          bvid: favVideo.bvid, 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // 只在用户主动停止时返回 true，否则始终返回 false 继续处理
    return false;
  }


  /**
   * 确保UP主存在
   */
  private async ensureCreatorExists(mid: number, name: string): Promise<void> {
    const creatorId = mid.toString();
    const existing = await this.dependencies.creatorRepository.getCreator(creatorId, BILIBILI);

    if (!existing) {
      const creator = toDBCreator(mid, name);
      await this.dependencies.creatorRepository.upsertCreator(creator);
    }
  }

  /**
   * 确保标签存在
   */
  private async ensureTagsExist(tags: { tag_id: number; tag_name: string }[]): Promise<string[]> {
    const tagIds: string[] = [];

    for (const tag of tags) {
      const tagId = tag.tag_id.toString();
      const existing = await this.dependencies.tagRepository.getTag(tagId);

      if (!existing) {
        const dbTag = toDBTag(tag);
        await this.dependencies.tagRepository.createTag(dbTag);
      }

      tagIds.push(tagId);
    }

    return tagIds;
  }
}
