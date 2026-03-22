/**
 * 收藏同步服务
 * 负责从B站同步收藏数据到本地数据库
 */

import { Platform } from "../../../database/types/base.js";
import type { CollectionType } from "../../../database/types/collection.js";
import type {
  CollectedFavoriteFolder,
  FavoriteFolderLike,
  FavoriteSearchParams,
  FavoriteSyncConfig,
  FavoriteSyncResult,
  FavoriteTag,
  FavoriteVideoDetail,
  FavoriteVideoEntry,
  IFavoriteSyncDependencies
} from "./types.js";
import { DEFAULT_FAVORITE_SYNC_CONFIG } from "./config.js";
import { toDBCreator, toDBTag, toDBVideo, toInvalidVideo } from "./data-converters.js";

const BILIBILI = Platform.BILIBILI;
const SEARCH_PAGE_SIZE = 1000;
const LOCAL_ITEMS_PAGE_SIZE = 10000;
const REMOTE_PAGE_SIZE = 20;
const MAX_FETCH_LIMIT = 1000;
const MAX_CONSECUTIVE_EXISTING_PAGES = 5;

type StopChecker = (() => Promise<boolean>) | undefined;

interface FolderContext {
  collectionId: string;
  title: string;
  mediaCount: number;
  type: CollectionType;
  description: string;
  isCollectedFolder: boolean;
  remoteId: number;
}

interface FolderState {
  localVideoCount: number;
  localVideoIds: Set<string>;
  expectedNewCount: number;
}

interface FetchPlan {
  currentPage: number;
  hasJumped: boolean;
  allFetchedCount: number;
  consecutiveExistingCount: number;
  videosToSync: FavoriteVideoEntry[];
}

/**
 * 收藏同步服务类
 */
export class FavoriteSyncService {
  private readonly config: FavoriteSyncConfig;

  constructor(
    private readonly dependencies: IFavoriteSyncDependencies,
    config: Partial<FavoriteSyncConfig> = {}
  ) {
    this.config = { ...DEFAULT_FAVORITE_SYNC_CONFIG, ...config };
  }

  async syncFavoriteVideos(up_mid: number, shouldStop?: StopChecker): Promise<FavoriteSyncResult> {
    const result: FavoriteSyncResult = {
      syncedCount: 0,
      failedVideos: []
    };

    try {
      if (this.config.createMultipleCollections) {
        await this.syncIntoSeparateCollections(up_mid, result, shouldStop);
      } else {
        await this.syncIntoDefaultCollection(up_mid, result, shouldStop);
      }

      return result;
    } catch (error) {
      console.error("[FavoriteSync] Error syncing favorite videos:", error);
      throw error;
    }
  }

  async searchFavoriteVideos(params: FavoriteSearchParams): Promise<FavoriteVideoDetail[]> {
    const targetCollectionId = params.collectionId ?? this.config.defaultCollectionId;
    const collection = await this.dependencies.collectionRepository.getCollection(targetCollectionId);

    if (!collection) {
      return [];
    }

    const { items } = await this.dependencies.collectionItemRepository.getCollectionVideos(collection.collectionId, {
      page: 0,
      pageSize: SEARCH_PAGE_SIZE
    });

    const videoIds = items.map(item => item.videoId);
    const videos = await this.dependencies.videoRepository.getVideos(videoIds, BILIBILI);
    const itemMap = new Map(items.map(item => [item.videoId, item]));

    return videos
      .map(video => ({
        ...video,
        addedAt: itemMap.get(video.videoId)?.addedAt,
        picture: video.coverUrl
      }))
      .filter(video => this.matchesSearchParams(video, params));
  }

  private async syncIntoSeparateCollections(
    upMid: number,
    result: FavoriteSyncResult,
    shouldStop?: StopChecker
  ): Promise<void> {
    const favoriteFolders = await this.dependencies.favoriteDataSource.getFavoriteFolders(upMid);
    const collectedFolders = await this.dependencies.favoriteDataSource.getCollectedFolders(upMid);

    for (const folder of [...favoriteFolders, ...collectedFolders]) {
      if (await this.shouldStopSync(shouldStop, "before processing folder")) {
        break;
      }

      await this.syncFolder(folder, result, shouldStop);
    }
  }

  private async syncIntoDefaultCollection(
    upMid: number,
    result: FavoriteSyncResult,
    shouldStop?: StopChecker
  ): Promise<void> {
    const collection = await this.getOrCreateDefaultCollection();
    if (!collection) {
      throw new Error("Failed to create or get collection");
    }

    const favoriteVideos = await this.dependencies.favoriteDataSource.getAllFavoriteVideos(upMid, shouldStop);
    await this.processBatches(favoriteVideos, collection.collectionId, result, shouldStop);
  }

  private async syncFolder(
    folder: FavoriteFolderLike,
    result: FavoriteSyncResult,
    shouldStop?: StopChecker
  ): Promise<void> {
    const context = this.createFolderContext(folder);
    const collection = await this.getOrCreateCollection(
      context.collectionId,
      context.title,
      context.description,
      context.type
    );

    if (!collection) {
      console.warn(`[FavoriteSync] Failed to resolve collection for folder ${context.title}`);
      return;
    }

    const state = await this.buildFolderState(context);
    if (state.expectedNewCount <= 0) {
      return;
    }

    const fetchedVideos = await this.collectNewVideos(context, state, shouldStop);
    if (fetchedVideos.length === 0) {
      console.warn(
        `[FavoriteSync] No new videos found for ${context.title} despite remote count ${context.mediaCount}`
      );
      return;
    }

    await this.processBatches(fetchedVideos, context.collectionId, result, shouldStop);
  }

  private createFolderContext(folder: FavoriteFolderLike): FolderContext {
    const isCollectedFolder = this.isCollectedFolder(folder);

    return {
      collectionId: String(folder.id),
      title: folder.title,
      mediaCount: folder.media_count,
      type: isCollectedFolder ? "subscription" : "user",
      description: isCollectedFolder
        ? `从UP主"${folder.upper.name}"的合集"${folder.title}"同步的收藏视频`
        : `从B站收藏夹"${folder.title}"同步的收藏视频`,
      isCollectedFolder,
      remoteId: folder.id
    };
  }

  private async buildFolderState(context: FolderContext): Promise<FolderState> {
    const localVideoCount = await this.dependencies.collectionItemRepository.countCollectionItems(context.collectionId);
    const { items } = await this.dependencies.collectionItemRepository.getCollectionVideos(context.collectionId, {
      page: 0,
      pageSize: LOCAL_ITEMS_PAGE_SIZE
    });

    return {
      localVideoCount,
      localVideoIds: new Set(items.map(item => item.videoId)),
      expectedNewCount: Math.max(0, context.mediaCount - localVideoCount)
    };
  }

  private async collectNewVideos(
    context: FolderContext,
    state: FolderState,
    shouldStop?: StopChecker
  ): Promise<FavoriteVideoEntry[]> {
    const plan: FetchPlan = {
      currentPage: 1,
      hasJumped: false,
      allFetchedCount: 0,
      consecutiveExistingCount: 0,
      videosToSync: []
    };

    const maxFetchLimit = Math.min(state.expectedNewCount * 2, MAX_FETCH_LIMIT);
    const firstPageVideos = await this.fetchFolderVideos(context, plan.currentPage);

    if (firstPageVideos.length === 0) {
      return [];
    }

    this.consumeFetchedPage(firstPageVideos, state.localVideoIds, state.expectedNewCount, plan);

    if (plan.videosToSync.length === 0 && state.localVideoCount > 0 && firstPageVideos.length === REMOTE_PAGE_SIZE) {
      const jumpPage = Math.floor(state.localVideoCount / REMOTE_PAGE_SIZE);
      if (jumpPage > 1) {
        plan.currentPage = jumpPage;
        plan.hasJumped = true;
        plan.consecutiveExistingCount = 0;
      }
    }

    while (plan.videosToSync.length < state.expectedNewCount && plan.allFetchedCount < maxFetchLimit) {
      if (await this.shouldStopSync(shouldStop, "while fetching folder videos")) {
        break;
      }

      plan.currentPage += 1;
      const videos = await this.fetchFolderVideos(context, plan.currentPage);
      if (videos.length === 0) {
        break;
      }

      const hadNewVideo = this.consumeFetchedPage(videos, state.localVideoIds, state.expectedNewCount, plan);

      if (
        plan.hasJumped &&
        !hadNewVideo &&
        plan.consecutiveExistingCount >= MAX_CONSECUTIVE_EXISTING_PAGES * REMOTE_PAGE_SIZE
      ) {
        break;
      }

      if (videos.length < REMOTE_PAGE_SIZE) {
        break;
      }
    }

    return plan.videosToSync;
  }

  private consumeFetchedPage(
    videos: FavoriteVideoEntry[],
    localVideoIds: Set<string>,
    expectedNewCount: number,
    plan: FetchPlan
  ): boolean {
    plan.allFetchedCount += videos.length;

    let hadNewVideo = false;
    for (const video of videos) {
      if (localVideoIds.has(video.bvid)) {
        plan.consecutiveExistingCount += 1;
        continue;
      }

      plan.videosToSync.push(video);
      plan.consecutiveExistingCount = 0;
      hadNewVideo = true;

      if (plan.videosToSync.length >= expectedNewCount) {
        break;
      }
    }

    return hadNewVideo;
  }

  private async processBatches(
    videos: FavoriteVideoEntry[],
    collectionId: string,
    result: FavoriteSyncResult,
    shouldStop?: StopChecker
  ): Promise<void> {
    for (let index = 0; index < videos.length; index += this.config.batchSize) {
      if (await this.shouldStopSync(shouldStop, "before processing batch")) {
        return;
      }

      const batch = videos.slice(index, index + this.config.batchSize);
      const shouldStopBatch = await this.processBatch(batch, collectionId, result, shouldStop);
      if (shouldStopBatch) {
        return;
      }
    }
  }

  private async processBatch(
    batch: FavoriteVideoEntry[],
    collectionId: string,
    result: FavoriteSyncResult,
    shouldStop?: StopChecker
  ): Promise<boolean> {
    for (const favoriteVideo of batch) {
      if (await this.shouldStopSync(shouldStop, "during batch processing")) {
        return true;
      }

      try {
        await this.syncSingleVideo(collectionId, favoriteVideo, result);
      } catch (error) {
        console.error(`[FavoriteSync] Error processing video ${favoriteVideo.bvid}:`, error);
        this.recordFailure(result, favoriteVideo.bvid, error);
      }
    }

    return false;
  }

  private async syncSingleVideo(
    collectionId: string,
    favoriteVideo: FavoriteVideoEntry,
    result: FavoriteSyncResult
  ): Promise<void> {
    const alreadyInCollection = await this.dependencies.collectionItemRepository.isVideoInCollection(
      collectionId,
      favoriteVideo.bvid
    );
    if (alreadyInCollection) {
      return;
    }

    const videoDetail = await this.dependencies.videoDataSource.getVideoDetail(favoriteVideo.bvid);
    if (!videoDetail) {
      await this.persistInvalidVideo(collectionId, favoriteVideo.bvid, result);
      return;
    }

    const videoTags = await this.dependencies.videoDataSource.getVideoTags(favoriteVideo.bvid);
    await this.ensureCreatorExists(videoDetail.owner.mid, videoDetail.owner.name);
    const tagIds = await this.ensureTagsExist(videoTags);

    await this.dependencies.videoRepository.upsertVideo(toDBVideo(videoDetail, tagIds));
    await this.addVideoToCollection(collectionId, favoriteVideo.bvid, result);
  }

  private async persistInvalidVideo(
    collectionId: string,
    bvid: string,
    result: FavoriteSyncResult
  ): Promise<void> {
    await this.dependencies.videoRepository.upsertVideo(toInvalidVideo(bvid));
    await this.addVideoToCollection(collectionId, bvid, result);
  }

  private async addVideoToCollection(
    collectionId: string,
    bvid: string,
    result: FavoriteSyncResult
  ): Promise<void> {
    try {
      await this.dependencies.collectionItemRepository.addVideoToCollection(collectionId, bvid, BILIBILI);
      result.syncedCount += 1;
    } catch (error) {
      this.recordFailure(result, bvid, error);
    }
  }

  private async ensureCreatorExists(mid: number, name: string): Promise<void> {
    const creatorId = String(mid);
    const existing = await this.dependencies.creatorRepository.getCreator(creatorId, BILIBILI);

    if (!existing) {
      await this.dependencies.creatorRepository.upsertCreator(toDBCreator(mid, name));
    }
  }

  private async ensureTagsExist(tags: FavoriteTag[]): Promise<string[]> {
    const tagIds: string[] = [];

    for (const tag of tags) {
      const tagId = String(tag.tag_id);
      const existing = await this.dependencies.tagRepository.getTag(tagId);
      if (!existing) {
        const { tagId: _tagId, ...tagToCreate } = toDBTag(tag);
        await this.dependencies.tagRepository.createTag(tagToCreate);
      }

      tagIds.push(tagId);
    }

    return tagIds;
  }

  private async fetchFolderVideos(context: FolderContext, page: number): Promise<FavoriteVideoEntry[]> {
    return context.isCollectedFolder
      ? this.dependencies.favoriteDataSource.getSeasonVideos(context.remoteId, page, REMOTE_PAGE_SIZE)
      : this.dependencies.favoriteDataSource.getFavoriteVideos(context.remoteId, page, REMOTE_PAGE_SIZE);
  }

  private async getOrCreateCollection(
    collectionId: string,
    name: string,
    description: string,
    type: CollectionType
  ) {
    let collection = await this.dependencies.collectionRepository.getCollection(collectionId);

    if (!collection) {
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

  private getOrCreateDefaultCollection() {
    return this.getOrCreateCollection(
      this.config.defaultCollectionId,
      this.config.defaultCollectionName,
      this.config.defaultCollectionDescription,
      "user"
    );
  }

  private matchesSearchParams(video: FavoriteVideoDetail, params: FavoriteSearchParams): boolean {
    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      const title = video.title.toLowerCase();
      const description = video.description.toLowerCase();
      if (!title.includes(keyword) && !description.includes(keyword)) {
        return false;
      }
    }

    if (params.tagId && !video.tags.includes(params.tagId)) {
      return false;
    }

    if (params.creatorId && video.creatorId !== params.creatorId) {
      return false;
    }

    return true;
  }

  private async shouldStopSync(shouldStop: StopChecker, context: string): Promise<boolean> {
    if (!shouldStop) {
      return false;
    }

    const stopped = await shouldStop();
    if (stopped) {
      console.log(`[FavoriteSync] Sync stopped by user (${context})`);
    }

    return stopped;
  }

  private isCollectedFolder(folder: FavoriteFolderLike): folder is CollectedFavoriteFolder {
    return "upper" in folder;
  }

  private recordFailure(result: FavoriteSyncResult, bvid: string, error: unknown): void {
    result.failedVideos.push({
      bvid,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
