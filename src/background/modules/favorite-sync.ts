/**
 * 收藏同步服务
 * 负责从B站同步收藏数据到本地数据库
 */

import { getAllFavoriteVideos, getVideoDetail, getVideoTagsDetail } from "../../api/bili-api.js";
import { VideoRepository } from "../../database/implementations/video-repository.impl.js";
import { CollectionRepository } from "../../database/implementations/collection-repository.impl.js";
import { CollectionItemRepository } from "../../database/implementations/collection-item-repository.impl.js";
import { CreatorRepository } from "../../database/implementations/creator-repository.impl.js";
import { TagRepository } from "../../database/implementations/tag-repository.impl.js";
import { Platform, TagSource } from "../../database/types/base.js";
import type { Video as DBVideo } from "../../database/types/video.js";
import type { Creator as DBCreator } from "../../database/types/creator.js";
import type { Tag as DBTag } from "../../database/types/semantic.js";

const videoRepository = new VideoRepository();
const collectionRepository = new CollectionRepository();
const collectionItemRepository = new CollectionItemRepository();
const creatorRepository = new CreatorRepository();
const tagRepository = new TagRepository();
const BILIBILI = Platform.BILIBILI;

/**
 * 同步收藏夹数据
 * @param up_mid 用户ID
 * @returns 同步的视频数量
 */
export async function syncFavoriteVideos(up_mid: number): Promise<number> {
  console.log("[FavoriteSync] Start syncing favorite videos for user:", up_mid);

  try {
    // 获取所有收藏视频
    const favoriteVideos = await getAllFavoriteVideos(up_mid);
    console.log(`[FavoriteSync] Found ${favoriteVideos.length} favorite videos`);

    // 获取或创建默认收藏夹
    let collection = await collectionRepository.getCollection("bilibili_favorites");
    if (!collection) {
      const collectionId = await collectionRepository.createCollection({
        platform: BILIBILI,
        name: "B站收藏夹",
        description: "从B站同步的收藏视频",
        videoIds: [],
        createdAt: Date.now(),
        lastUpdate: Date.now()
      });
      collection = await collectionRepository.getCollection(collectionId);
    }

    if (!collection) {
      throw new Error("Failed to create or get collection");
    }

    let syncedCount = 0;

    // 处理每个收藏视频
    for (const favVideo of favoriteVideos) {
      try {
        // 获取视频详细信息（用于获取描述、时长和标签）
        const videoDetail = await getVideoDetail(favVideo.bvid);
        if (!videoDetail) {
          console.warn(`[FavoriteSync] Failed to get video detail for ${favVideo.bvid}`);
          continue;
        }

        // 获取视频标签
        const videoTags = await getVideoTagsDetail(favVideo.bvid);

        // 确保UP主存在
        await ensureCreatorExists(videoDetail.owner.mid, videoDetail.owner.name);

        // 确保标签存在
        const tagIds = await ensureTagsExist(videoTags);

        // 保存视频信息
        const video: DBVideo = {
          videoId: videoDetail.bvid,
          platform: BILIBILI,
          creatorId: videoDetail.owner.mid.toString(),
          title: videoDetail.title,
          description: videoDetail.desc || favVideo.intro,
          duration: videoDetail.duration,
          publishTime: videoDetail.pubdate * 1000,
          tags: tagIds,
          createdAt: Date.now(),
          coverUrl: videoDetail.pic
        };

        await videoRepository.upsertVideo(video);

        // 添加到收藏夹
        const isInCollection = await collectionItemRepository.isVideoInCollection(
          collection.collectionId,
          favVideo.bvid
        );

        if (!isInCollection) {
          await collectionItemRepository.addVideoToCollection(
            collection.collectionId,
            favVideo.bvid,
            BILIBILI
          );
          syncedCount++;
        }
      } catch (error) {
        console.error(`[FavoriteSync] Error processing video ${favVideo.bvid}:`, error);
      }
    }

    console.log(`[FavoriteSync] Synced ${syncedCount} new videos`);
    return syncedCount;
  } catch (error) {
    console.error("[FavoriteSync] Error syncing favorite videos:", error);
    throw error;
  }
}

/**
 * 确保UP主存在
 * @param mid UP主ID
 * @param name UP主名称
 */
async function ensureCreatorExists(mid: number, name: string): Promise<void> {
  const creatorId = mid.toString();
  const existing = await creatorRepository.getCreator(creatorId, BILIBILI);

  if (!existing) {
    await creatorRepository.upsertCreator({
      creatorId,
      platform: BILIBILI,
      name,
      avatar: "",
      description: "",
      isFollowing: 0,
      createdAt: Date.now(),
      followTime: Date.now(),
      isLogout:0,
      tagWeights:[]
    });
  }
}

/**
 * 确保标签存在
 * @param tags 标签列表
 * @returns 标签ID列表
 */
async function ensureTagsExist(tags: { tag_id: number; tag_name: string }[]): Promise<string[]> {
  const tagIds: string[] = [];

  for (const tag of tags) {
    const tagId = tag.tag_id.toString();
    const existing = await tagRepository.getTag(tagId);

    if (!existing) {
      await tagRepository.createTag({
        name: tag.tag_name,
        source: TagSource.USER,
        createdAt: Date.now(),
      });
    }

    tagIds.push(tagId);
  }

  return tagIds;
}

/**
 * 搜索收藏视频
 * @param keyword 搜索关键词
 * @param tagId 标签ID（可选）
 * @param creatorId UP主ID（可选）
 * @returns 搜索结果
 */
export async function searchFavoriteVideos(
  collectionId?: string,
  keyword?: string,
  tagId?: string,
  creatorId?: string
): Promise<Array<DBVideo & { picture?: string; addedAt?: number }>> {
  // 如果没有指定收藏夹ID，使用默认收藏夹
  const targetCollectionId = collectionId || "bilibili_favorites";
  const collection = await collectionRepository.getCollection(targetCollectionId);
  if (!collection) {
    return [];
  }

  // 获取收藏夹中的所有视频
  const { items } = await collectionItemRepository.getCollectionVideos(
    collection.collectionId,
    { page: 0, pageSize: 1000 }
  );

  // 获取视频详情
  const videoIds = items.map(item => item.videoId);
  const videos = await videoRepository.getVideos(videoIds, BILIBILI);

  // 创建视频ID到收藏项的映射
  const itemMap = new Map(items.map(item => [item.videoId, item]));

  // 合并视频详情和收藏项信息
  let merged = videos.map(video => ({
    ...video,
    addedAt: itemMap.get(video.videoId)?.addedAt
  }));

  if (keyword) {
    const lowerKeyword = keyword.toLowerCase();
    merged = merged.filter(v => 
      v.title.toLowerCase().includes(lowerKeyword) ||
      v.description.toLowerCase().includes(lowerKeyword)
    );
  }

  if (tagId) {
    merged = merged.filter(v => v.tags.includes(tagId));
  }

  if (creatorId) {
    merged = merged.filter(v => v.creatorId === creatorId);
  }

  return merged;
}
