
/**
 * 数据转换工具
 * 负责将API数据转换为数据库模型
 */

import { Platform, TagSource } from "../../../database/types/base.js";
import type { Video as DBVideo } from "../../../database/types/video.js";
import type { Creator as DBCreator } from "../../../database/types/creator.js";

const BILIBILI = Platform.BILIBILI;

/**
 * 将API视频详情转换为数据库视频模型
 */
export function toDBVideo(videoDetail: any, tagIds: string[]): DBVideo {
  return {
    videoId: videoDetail.bvid,
    platform: BILIBILI,
    creatorId: videoDetail.owner.mid.toString(),
    title: videoDetail.title,
    description: videoDetail.desc || "",
    duration: videoDetail.duration,
    publishTime: videoDetail.pubdate * 1000,
    tags: tagIds,
    createdAt: Date.now(),
    coverUrl: videoDetail.pic
  };
}

/**
 * 创建失效视频的数据库模型
 * 用于标记无法获取详情的视频（如被删除、下架等）
 */
export function toInvalidVideo(bvid: string, creatorId?: string): DBVideo {
  return {
    videoId: bvid,
    platform: BILIBILI,
    creatorId: creatorId || "unknown",
    title: "失效视频",
    description: "该视频已失效或无法获取详情",
    duration: 0,
    publishTime: Date.now(),
    tags: [],
    createdAt: Date.now(),
    isInvalid: true
  };
}

/**
 * 将API UP主信息转换为数据库UP主模型
 */
export function toDBCreator(mid: number, name: string): DBCreator {
  return {
    creatorId: mid.toString(),
    platform: BILIBILI,
    name,
    avatar: "",
    description: "",
    isFollowing: 0,
    createdAt: Date.now(),
    followTime: Date.now(),
    isLogout: 0,
    tagWeights: []
  };
}

/**
 * 将API标签转换为数据库标签模型
 */
export function toDBTag(tag: { tag_id: number; tag_name: string }) {
  return {
    tagId: tag.tag_id.toString(),
    name: tag.tag_name,
    source: TagSource.USER,
    createdAt: Date.now()
  };
}
