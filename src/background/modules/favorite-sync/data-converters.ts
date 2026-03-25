/**
 * 收藏同步模块数据转换器
 * 负责将 B 站 API 数据转换为本地数据库模型
 */

import type { 
  FavoriteFolderInfo, 
  SubscribedFavoriteFolderInfo, 
  FavoriteVideoInfo, 
  SubscribedFavoriteVideoInfo 
} from "../../../api/types.js";
import type { 
  Video, 
  Collection, 
  CollectionItem, 
  Creator, 
  Tag 
} from "../../../database/types/index.js";
import { Platform } from "../../../database/types/base.js";
import { TagSource } from "../../../database/types/base.js";

/**
 * 将 B 站收藏夹信息转换为本地收藏夹模型
 */
export function convertBiliFolderToLocalCollection(
  folder:SubscribedFavoriteFolderInfo,
  type: 'user' | 'subscription',
  defaultCollectionId?: string,
  defaultCollectionName?: string,
  defaultCollectionDescription?: string
): Omit<Collection, 'collectionId'> {
  return {
    platform: Platform.BILIBILI,
    name: folder.title,
    description: folder.intro || defaultCollectionDescription || "从B站同步的收藏视频",
    type,
    isPublic: true,
    sortOrder: 'time',
    videoCount: folder.media_count || 0,
    lastUpdate: Date.now(),
    lastAddedAt: Date.now(),
    createdAt: Date.now()
  };
}

/**
 * 将 B 站收藏夹信息转换为本地收藏夹模型（带ID）
 */
export function convertBiliFolderToLocalCollectionWithId(
  folder:SubscribedFavoriteFolderInfo,
  type: 'user' | 'subscription',
  defaultCollectionId?: string,
  defaultCollectionName?: string,
  defaultCollectionDescription?: string
): Collection {
  const baseCollection = convertBiliFolderToLocalCollection(
    folder, 
    type, 
    defaultCollectionId, 
    defaultCollectionName, 
    defaultCollectionDescription
  );

  return {
    ...baseCollection,
    collectionId: defaultCollectionId || `bili_${folder.id}`,
  };
}

/**
 * 将 B 站视频信息转换为本地视频模型
 */
export function convertBiliVideoToLocalVideo(
  video: FavoriteVideoInfo,
  tags?: Tag[]
): Video {
  return {
    videoId: video.bvid,
    platform: Platform.BILIBILI,
    creatorId: video.upper?.mid || '',
    title: video.title,
    description: video.intro || '',
    duration: video.duration,
    publishTime: video.pubtime,
    tags: tags?.map(tag => tag.tagId) || [],
    createdAt: Date.now(),
    coverUrl: video.cover,
    isInvalid: false
  };
}

/**
 * 将 B 站视频信息转换为本地创作者模型
 */
export function convertBiliUPToCreator(
  mid: string,
  name?: string,
  avatar?: string,
  avatarUrl?: string
): Omit<Creator, 'creatorId'> {
  return {
    platform: Platform.BILIBILI,
    name: name || '',
    avatar: avatar || '',
    avatarUrl: avatarUrl || '',
    isLogout: 0,
    description: '',
    createdAt: Date.now(),
    followTime: Date.now(),
    isFollowing: 0,
    tagWeights: []
  };
}

/**
 * 将 B 站视频信息转换为本地创作者模型（带ID）
 */
export function convertBiliUPToCreatorWithId(
  mid: string,
  name?: string,
  avatar?: string,
  avatarUrl?: string
): Creator {
  const baseCreator = convertBiliUPToCreator(mid, name, avatar, avatarUrl);
  return {
    ...baseCreator,
    creatorId: mid
  };
}

/**
 * 将 B 站视频信息转换为本地收藏项模型
 */
export function convertBiliVideoToCollectionItem(
  video: FavoriteVideoInfo | SubscribedFavoriteVideoInfo,
  collectionId: string
): Omit<CollectionItem, 'itemId' | 'addedAt'> {
  return {
    collectionId,
    videoId: video.bvid,
    note: '',
    order: 0
  };
}

/**
 * 将标签名称转换为本地标签模型
 */
export function convertTagNameToTag(
  name: string,
  source: TagSource = TagSource.SYSTEM
): Omit<Tag, 'tagId'> {
  return {
    name,
    source
  };
}

/**
 * 将标签名称转换为本地标签模型（带ID）
 */
export function convertTagNameToTagWithId(
  tagId: string,
  name: string,
  source: TagSource = TagSource.SYSTEM
): Tag {
  return {
    tagId,
    name,
    source
  };
}

/**
 * 从视频描述中提取标签（简单实现）
 */
export function extractTagsFromDescription(description: string): string[] {
  if (!description) return [];

  // 简单实现：提取#标签格式的标签
  const tagRegex = /#([^\s#]+)/g;
  const tags: string[] = [];
  let match;

  while ((match = tagRegex.exec(description)) !== null) {
    tags.push(match[1]);
  }

  return tags;
}
