/**
 * 收藏夹查询实现
 * 纯计算工具，只负责数据过滤和排序
 */

import type { Collection } from '../../types/collection.js';
import type { Video } from '../../types/video.js';
import type { QueryResult } from '../types.js';

/**
 * 获取所有收藏夹
 * @param collections 收藏夹列表
 * @returns 查询结果
 */
export function getAllCollections(
  collections: Collection[]
): QueryResult<Collection> {
  return {
    data: collections,
    total: collections.length
  };
}

/**
 * 根据ID获取收藏夹
 * @param collections 收藏夹列表
 * @param collectionId 收藏夹ID
 * @returns 收藏夹对象
 */
export function getCollectionById(
  collections: Collection[],
  collectionId: string
): Collection | undefined {
  return collections.find(c => c.collectionId === collectionId);
}

/**
 * 获取收藏夹中的视频
 * @param videos 视频列表
 * @param page 页码
 * @param pageSize 每页大小
 * @returns 查询结果
 */
export function getCollectionVideos(
  videos: Video[],
  page: number = 0,
  pageSize: number = 20
): QueryResult<Video> {
  const total = videos.length;
  const startIndex = page * pageSize;
  const endIndex = startIndex + pageSize;
  const pageVideos = videos.slice(startIndex, endIndex);

  return {
    data: pageVideos,
    total
  };
}
