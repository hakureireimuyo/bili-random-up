/**
 * 收藏同步模块数据适配器
 * 负责 B 站 API 调用和请求节流管理
 */

import type { 
  FavoriteFolderInfo, 
  SubscribedFavoriteFolderInfo, 
  FavoriteVideoInfo, 
  SubscribedFavoriteVideoInfo 
} from "../../../api/types.js";
import { 
  getFavoriteFolders, 
  getCollectedFolders, 
  getFavoriteVideos, 
  getSeasonVideos, 
  getCollectedVideos,
} from "../../../api/favorite.js";
import { getVideoTagsDetail as getVideoTagsDetailFromVideoAPI } from "../../../api/video.js";
import { apiRequest, type ApiRequestOptions } from "../../../api/request.js";

/**
 * 请求节流器
 * 用于控制 API 请求频率，避免触发风控
 */
export class RequestThrottler {
  private lastRequestTime = 0;
  private minInterval: number;

  /**
   * 创建请求节流器
   * @param minInterval 最小请求间隔（毫秒）
   */
  constructor(minInterval: number = 2500) {
    this.minInterval = minInterval;
  }

  /**
   * 执行节流后的请求
   * @param requestFn 请求函数
   * @param options 请求选项
   * @returns 请求结果
   */
  async throttle<T>(requestFn: () => Promise<T>, options?: ApiRequestOptions): Promise<T> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    // 如果距离上次请求的时间小于最小间隔，则等待
    if (elapsed < this.minInterval) {
      const waitTime = this.minInterval - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    try {
      const result = await requestFn();
      this.lastRequestTime = Date.now();
      return result;
    } catch (error) {
      // 发生错误时也更新请求时间，避免重试过快
      this.lastRequestTime = Date.now();
      throw error;
    }
  }

  /**
   * 设置最小请求间隔
   * @param interval 间隔时间（毫秒）
   */
  setInterval(interval: number): void {
    this.minInterval = interval;
  }
}

/**
 * B 站收藏夹数据源
 * 封装了获取收藏夹相关数据的操作
 */
export class BiliApiFavoriteDataSource {
  private throttler: RequestThrottler;

  /**
   * 创建数据源
   * @param requestInterval 请求间隔（毫秒）
   */
  constructor(requestInterval: number = 2500) {
    this.throttler = new RequestThrottler(requestInterval);
  }

  /**
   * 获取用户收藏夹列表
   * @param upMid 用户ID
   * @returns 收藏夹列表
   */
  async getUserFavoriteFolders(upMid: string): Promise<FavoriteFolderInfo[]> {
    return this.throttler.throttle(() => getFavoriteFolders(upMid));
  }

  /**
   * 获取用户订阅的收藏夹列表
   * @param upMid 用户ID
   * @returns 订阅收藏夹列表
   */
  async getSubscribedFavoriteFolders(upMid: string): Promise<SubscribedFavoriteFolderInfo[]> {
    return this.throttler.throttle(() => getCollectedFolders(upMid));
  }

  /**
   * 获取收藏夹中的视频
   * @param mediaId 收藏夹ID
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 视频列表
   */
  async getFavoriteVideos(
    mediaId: string, 
    page: number = 1, 
    pageSize: number = 20
  ): Promise<FavoriteVideoInfo[]> {
    return this.throttler.throttle(() => getFavoriteVideos(mediaId, page, pageSize));
  }

  /**
   * 获取订阅收藏夹中的视频
   * @param mediaId 收藏夹ID
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 视频列表
   */
  async getSubscribedFavoriteVideos(
    mediaId: string, 
    page: number = 1, 
    pageSize: number = 20
  ): Promise<SubscribedFavoriteVideoInfo[]> {
    return this.throttler.throttle(() => getCollectedVideos(mediaId, page, pageSize));
  }

  /**
   * 获取订阅合集中的视频
   * @param seasonId 合集ID
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 视频列表
   */
  async getSeasonVideos(
    seasonId: string, 
    page: number = 1, 
    pageSize: number = 20
  ): Promise<SubscribedFavoriteVideoInfo[]> {
    return this.throttler.throttle(() => getSeasonVideos(seasonId, page, pageSize));
  }
}

/**
 * B 站视频数据源
 * 封装了获取视频相关数据的操作
 */
export class BiliApiVideoDataSource {
  private throttler: RequestThrottler;

  /**
   * 创建数据源
   * @param requestInterval 请求间隔（毫秒）
   */
  constructor(requestInterval: number = 2500) {
    this.throttler = new RequestThrottler(requestInterval);
  }

  /**
   * 获取视频详情
   * @param bvid 视频ID
   * @returns 视频详情
   */
  async getVideoDetail(bvid: string): Promise<any> {
    return this.throttler.throttle(() => getVideoDetail(bvid));
  }

  /**
   * 获取视频标签
   * @param bvid 视频ID
   * @returns 视频标签列表
   */
  async getVideoTags(bvid: string): Promise<any[]> {
    return this.throttler.throttle(() => getVideoTagsDetail(bvid));
  }

  /**
   * 获取视频标签（从视频API）
   * @param bvid 视频ID
   * @returns 视频标签列表
   */
  async getVideoTagsFromVideoAPI(bvid: string): Promise<any[]> {
    return this.throttler.throttle(() => getVideoTagsDetailFromVideoAPI(bvid));
  }
}

/**
 * B 站用户数据源
 * 封装了获取用户相关数据的操作
 */
export class BiliApiUserDataSource {
  private throttler: RequestThrottler;

  /**
   * 创建数据源
   * @param requestInterval 请求间隔（毫秒）
   */
  constructor(requestInterval: number = 2500) {
    this.throttler = new RequestThrottler(requestInterval);
  }

  /**
   * 获取用户信息
   * @param mid 用户ID
   * @returns 用户信息
   */
  async getUserInfo(mid: string): Promise<any> {
    return this.throttler.throttle(() => {
      const url = `https://api.bilibili.com/x/space/acc/info?mid=${mid}`;
      return apiRequest(url);
    });
  }
}
