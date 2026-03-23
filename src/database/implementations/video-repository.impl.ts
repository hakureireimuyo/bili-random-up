/**
 * VideoRepository 实现
 * 基于 IndexedDB 的视频仓库实现
 * 只实现适合 IndexedDB 的高效操作：
 * - 基于主键和索引的增删改查
 * - 获取全部数据和分页查询
 * - 视频与图片的联动操作
 */

import { Video } from '../types/video.js';
import { Platform, PaginationParams, PaginationResult } from '../types/base.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';
import { ImageRepository } from './image-repository.impl.js';
import { ImagePurpose } from '../types/image.js';

/**
 * VideoRepository 实现类
 */
export class VideoRepository {
  private imageRepository: ImageRepository;

  constructor() {
    this.imageRepository = new ImageRepository();
  }

  /**
   * 创建或更新视频信息
   * @param video 视频对象
   */
  async upsertVideo(video: Video): Promise<void> {
    await DBUtils.put(STORE_NAMES.VIDEOS, video);
  }

  /**
   * 批量创建或更新视频信息
   * @param videos 视频对象数组
   */
  async upsertVideos(videos: Video[]): Promise<void> {
    await DBUtils.putBatch(STORE_NAMES.VIDEOS, videos);
  }

  /**
   * 获取视频信息（基于主键）
   * @param videoId 视频ID
   * @param platform 平台类型
   * @returns 视频对象，不存在返回 null
   */
  async getVideo(videoId: string, platform: Platform): Promise<Video | null> {
    const video = await DBUtils.get<Video>(STORE_NAMES.VIDEOS, videoId);
    if (!video || video.platform !== platform) {
      return null;
    }
    return video;
  }

  /**
   * 批量获取视频信息（基于主键）
   * @param videoIds 视频ID数组
   * @param platform 平台类型
   * @returns 视频对象数组
   */
  async getVideos(videoIds: string[], platform: Platform): Promise<Video[]> {
    const allVideos = await DBUtils.getBatch<Video>(
      STORE_NAMES.VIDEOS,
      videoIds
    );
    return allVideos.filter(v => v.platform === platform && !v.isInvalid);
  }

  /**
   * 获取所有视频（仅用于数据导出等场景）
   * @returns 所有视频对象数组
   */
  async getAllVideos(): Promise<Video[]> {
    return DBUtils.getAll<Video>(STORE_NAMES.VIDEOS);
  }

  /**
   * 分页获取所有视频
   * @param pagination 分页参数
   * @returns 分页结果
   */
  async getVideosPaginated(pagination: PaginationParams): Promise<PaginationResult<Video>> {
    const allVideos = await this.getAllVideos();
    const total = allVideos.length;

    const start = pagination.page * pagination.pageSize;
    const end = start + pagination.pageSize;
    const items = allVideos.slice(start, end);

    return {
      items,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize)
    };
  }

  /**
   * 获取创作者的视频列表（基于索引）
   * @param creatorId 创作者ID
   * @param platform 平台类型
   * @param pagination 分页参数
   * @returns 分页结果
   */
  async getCreatorVideos(
    creatorId: string,
    platform: Platform,
    pagination: PaginationParams
  ): Promise<PaginationResult<Video>> {
    const allVideos = await DBUtils.getByIndex<Video>(
      STORE_NAMES.VIDEOS,
      'creatorId',
      creatorId
    );

    const filtered = allVideos.filter(v => v.platform === platform && !v.isInvalid);
    const sorted = filtered.sort((a, b) => b.publishTime - a.publishTime);

    const start = pagination.page * pagination.pageSize;
    const end = start + pagination.pageSize;
    const items = sorted.slice(start, end);

    return {
      items,
      total: sorted.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(sorted.length / pagination.pageSize)
    };
  }

  /**
   * 获取指定平台的视频列表（基于索引）
   * @param platform 平台类型
   * @param pagination 分页参数
   * @returns 分页结果
   */
  async getVideosByPlatform(
    platform: Platform,
    pagination: PaginationParams
  ): Promise<PaginationResult<Video>> {
    const allVideos = await DBUtils.getByIndex<Video>(
      STORE_NAMES.VIDEOS,
      'platform',
      platform
    );

    const filtered = allVideos.filter(v => !v.isInvalid);
    const sorted = filtered.sort((a, b) => b.publishTime - a.publishTime);

    const start = pagination.page * pagination.pageSize;
    const end = start + pagination.pageSize;
    const items = sorted.slice(start, end);

    return {
      items,
      total: sorted.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(sorted.length / pagination.pageSize)
    };
  }

  /**
   * 删除视频（联动删除关联的封面图片）
   * @param videoId 视频ID
   * @param platform 平台类型
   */
  async deleteVideo(videoId: string, platform: Platform): Promise<void> {
    const video = await this.getVideo(videoId, platform);
    if (!video) {
      return;
    }

    // 如果视频有关联的封面图片ID，删除图片
    if (video.picture) {
      try {
        await this.imageRepository.deleteImage(video.picture);
      } catch (error) {
        console.error(`[VideoRepository] Failed to delete cover image for video ${videoId}:`, error);
      }
    }

    // 删除视频记录
    await DBUtils.delete(STORE_NAMES.VIDEOS, videoId);
  }

  /**
   * 批量删除视频（联动删除关联的封面图片）
   * @param videoIds 视频ID数组
   * @param platform 平台类型
   */
  async deleteVideos(videoIds: string[], platform: Platform): Promise<void> {
    // 获取所有视频以查找关联的图片
    const videos = await this.getVideos(videoIds, platform);
    if (videos.length === 0) {
      return;
    }

    // 收集需要删除的图片ID
    const imageIds = videos
      .map(v => v.picture)
      .filter((id): id is string => !!id);

    // 删除关联的图片
    if (imageIds.length > 0) {
      try {
        await this.imageRepository.deleteImages(imageIds);
      } catch (error) {
        console.error('[VideoRepository] Failed to delete cover images:', error);
      }
    }

    // 批量删除视频记录
    await DBUtils.deleteBatch(STORE_NAMES.VIDEOS, videoIds);
  }

  /**
   * 更新视频标签
   * @param videoId 视频ID
   * @param platform 平台类型
   * @param tags 标签ID数组
   */
  async updateVideoTags(videoId: string, platform: Platform, tags: string[]): Promise<void> {
    const video = await this.getVideo(videoId, platform);
    if (!video) {
      throw new Error(`Video not found: ${videoId}`);
    }

    const updated: Video = {
      ...video,
      tags
    };

    await this.upsertVideo(updated);
  }

  /**
   * 更新视频封面图片（使用 ImageRepository）
   * @param videoId 视频ID
   * @param platform 平台类型
   * @param imageBlob 图片 Blob 数据
   * @param url 图片URL（可选，用于判断是否为同一图片）
   */
  async updateVideoPicture(
    videoId: string,
    platform: Platform,
    imageBlob: Blob,
    url?: string
  ): Promise<void> {
    const video = await this.getVideo(videoId, platform);
    if (!video) {
      throw new Error(`Video not found: ${videoId}`);
    }

    // 如果提供了 URL，通过 URL 判断是否为同一图片
    // 只有当 URL 相同且 picture 已存在时才跳过
    if (url && video.coverUrl === url && video.picture) {
      console.log(`[VideoRepository] Picture already cached for ${videoId}`);
      return;
    }

    // 创建新的图片记录
    const image = await this.imageRepository.createImage({
      purpose: ImagePurpose.COVER,
      data: imageBlob
    });

    // 更新视频记录，关联新的图片ID
    await this.upsertVideo({
      ...video,
      coverUrl: url,
      picture: image.metadata.id
    });
  }

  /**
   * 获取视频封面图片
   * @param videoId 视频ID
   * @param platform 平台类型
   * @returns 图片 Blob 数据，不存在返回 null
   */
  async getVideoPicture(videoId: string, platform: Platform): Promise<Blob | null> {
    const video = await this.getVideo(videoId, platform);
    if (!video || !video.picture) {
      return null;
    }

    const image = await this.imageRepository.getImage(video.picture);
    return image?.data?.data || null;
  }

  /**
   * 标记视频为失效
   * @param videoId 视频ID
   * @param platform 平台类型
   */
  async markVideoAsInvalid(videoId: string, platform: Platform): Promise<void> {
    const video = await this.getVideo(videoId, platform);
    if (!video) {
      throw new Error(`Video not found: ${videoId}`);
    }

    await this.upsertVideo({
      ...video,
      isInvalid: true
    });
  }

  /**
   * 批量标记视频为失效
   * @param videoIds 视频ID数组
   * @param platform 平台类型
   */
  async markVideosAsInvalid(videoIds: string[], platform: Platform): Promise<void> {
    const videos = await this.getVideos(videoIds, platform);
    if (videos.length === 0) {
      return;
    }

    const updatedVideos = videos.map(v => ({
      ...v,
      isInvalid: true
    }));

    await this.upsertVideos(updatedVideos);
  }

  /**
   * 清理失效视频（联动删除关联的封面图片）
   * @returns 清理的视频数量
   */
  async cleanupInvalidVideos(): Promise<number> {
    const allVideos = await this.getAllVideos();
    const invalidVideos = allVideos.filter(v => v.isInvalid);

    if (invalidVideos.length === 0) {
      return 0;
    }

    const videoIds = invalidVideos.map(v => v.videoId);
    const platforms = new Set(invalidVideos.map(v => v.platform));

    // 为每个平台删除视频
    for (const platform of platforms) {
      const platformVideos = invalidVideos.filter(v => v.platform === platform);
      const platformVideoIds = platformVideos.map(v => v.videoId);
      await this.deleteVideos(platformVideoIds, platform);
    }

    return invalidVideos.length;
  }
}
