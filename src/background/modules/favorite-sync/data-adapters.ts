/**
 * 数据访问适配器
 * 负责适配API数据源
 */

import type { CollectedFolder } from "../../../api/bili-api.js";
import type {
  CollectedFavoriteFolder,
  FavoriteFolder,
  FavoriteTag,
  FavoriteVideoApiDetail,
  FavoriteVideoEntry,
  IFavoriteDataSource,
  IVideoDataSource
} from "./types.js";

class RequestThrottler {
  private lastRequestTime = 0;

  constructor(private readonly requestInterval: number) {}

  async wait(): Promise<void> {
    if (this.requestInterval <= 0) {
      return;
    }

    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.requestInterval) {
      await new Promise(resolve => setTimeout(resolve, this.requestInterval - elapsed));
    }

    this.lastRequestTime = Date.now();
  }
}

/**
 * B站API视频数据源适配器
 */
export class BiliApiVideoDataSource implements IVideoDataSource {
  private readonly throttler: RequestThrottler;

  constructor(
    private readonly getVideoDetailFn: (bvid: string) => Promise<FavoriteVideoApiDetail | null>,
    private readonly getVideoTagsFn: (bvid: string) => Promise<FavoriteTag[]>,
    requestInterval = 2500
  ) {
    this.throttler = new RequestThrottler(requestInterval);
  }

  async getVideoDetail(bvid: string): Promise<FavoriteVideoApiDetail | null> {
    await this.throttler.wait();
    return this.getVideoDetailFn(bvid);
  }

  async getVideoTags(bvid: string): Promise<FavoriteTag[]> {
    await this.throttler.wait();
    return this.getVideoTagsFn(bvid);
  }
}

/**
 * B站API收藏数据源适配器
 */
export class BiliApiFavoriteDataSource implements IFavoriteDataSource {
  private readonly throttler: RequestThrottler;

  constructor(
    private readonly getAllFavoriteVideosFn: (upMid: number) => Promise<FavoriteVideoEntry[]>,
    private readonly getFavoriteFoldersFn?: (upMid: number) => Promise<FavoriteFolder[]>,
    private readonly getFavoriteVideosFn?: (
      mediaId: number,
      page: number,
      pageSize: number
    ) => Promise<FavoriteVideoEntry[]>,
    private readonly getCollectedFoldersFn?: (upMid: number) => Promise<CollectedFolder[]>,
    private readonly getCollectedVideosFn?: (
      mediaId: number,
      page: number,
      pageSize: number
    ) => Promise<FavoriteVideoEntry[]>,
    private readonly getSeasonVideosFn?: (
      seasonId: number,
      page: number,
      pageSize: number
    ) => Promise<FavoriteVideoEntry[]>,
    requestInterval = 2500
  ) {
    this.throttler = new RequestThrottler(requestInterval);
  }

  async getAllFavoriteVideos(
    upMid: number,
    shouldStop?: () => Promise<boolean>
  ): Promise<FavoriteVideoEntry[]> {
    const folders = await this.getFavoriteFolders(upMid);
    const allVideos: FavoriteVideoEntry[] = [];
    const pageSize = 20;

    for (const folder of folders) {
      let page = 1;

      while (true) {
        if (shouldStop && (await shouldStop())) {
          return allVideos;
        }

        const videos = await this.getFavoriteVideos(folder.id, page, pageSize);
        if (videos.length === 0) {
          break;
        }

        allVideos.push(
          ...videos.map(video => ({
            bvid: video.bvid,
            intro: String(folder.id)
          }))
        );

        if (videos.length < pageSize) {
          break;
        }

        page += 1;
      }
    }

    return allVideos;
  }

  async getFavoriteFolders(upMid: number): Promise<FavoriteFolder[]> {
    if (!this.getFavoriteFoldersFn) {
      throw new Error("getFavoriteFoldersFn not provided");
    }

    await this.throttler.wait();
    return this.getFavoriteFoldersFn(upMid);
  }

  async getFavoriteVideos(mediaId: number, page: number, pageSize: number): Promise<FavoriteVideoEntry[]> {
    if (!this.getFavoriteVideosFn) {
      throw new Error("getFavoriteVideosFn not provided");
    }

    await this.throttler.wait();
    return this.getFavoriteVideosFn(mediaId, page, pageSize);
  }

  async getCollectedFolders(upMid: number): Promise<CollectedFavoriteFolder[]> {
    if (!this.getCollectedFoldersFn) {
      throw new Error("getCollectedFoldersFn not provided");
    }

    await this.throttler.wait();
    const collectedFolders = await this.getCollectedFoldersFn(upMid);

    return collectedFolders.map(folder => ({
      id: folder.id,
      title: folder.title,
      media_count: folder.media_count,
      upper: {
        mid: folder.upper.mid,
        name: folder.upper.name
      }
    }));
  }

  async getCollectedVideos(mediaId: number, page: number, pageSize: number): Promise<FavoriteVideoEntry[]> {
    if (!this.getCollectedVideosFn) {
      throw new Error("getCollectedVideosFn not provided");
    }

    await this.throttler.wait();
    return this.getCollectedVideosFn(mediaId, page, pageSize);
  }

  async getSeasonVideos(seasonId: number, page: number, pageSize: number): Promise<FavoriteVideoEntry[]> {
    if (!this.getSeasonVideosFn) {
      throw new Error("getSeasonVideosFn not provided");
    }

    await this.throttler.wait();
    return this.getSeasonVideosFn(seasonId, page, pageSize);
  }
}
