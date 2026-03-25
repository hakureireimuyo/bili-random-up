
/**
 * 视频查询实现
 * 纯计算工具,不包含任何状态管理逻辑
 * 所有数据访问通过 VideoRepository 进行
 */

import type { Video } from '../../types/video.js';
import type { VideoQueryParams, QueryResult, QueryOptions } from '../types.js';
import { QueryError } from '../types.js';
import { videoRepository } from '../../repository/video-repository.js';
import { VideoQueryEngine, type VideoQueryCondition } from './video-query-engine.js';

/**
 * 构建视频索引
 * 从数据库加载所有必要数据并构建内存索引
 * 使用Repository层访问数据
 */
export async function buildVideoIndex(collectionId?: string, collectionType?: 'user' | 'subscription'): Promise<void> {
  try {
    // 通过 Repository 初始化
    await videoRepository.init(collectionId, collectionType);
    console.log('[VideoQuery] Video index built successfully');
  } catch (error) {
    console.error('[VideoQuery] Error building video index:', error);
    throw new QueryError('构建视频索引失败', error as Error);
  }
}

/**
 * 执行查询
 * @param params 查询参数
 * @param options 查询选项
 * @returns 查询结果
 */
export async function executeQuery(
  params: VideoQueryParams,
  options: QueryOptions = {}
): Promise<QueryResult<Video>> {
  try {
    // 构建查询条件
    const condition: VideoQueryCondition = {};
    if (params.collectionId) {
      condition.collectionId = params.collectionId;
    }
    if (params.includeTags) {
      condition.includeTags = params.includeTags;
    }
    if (params.excludeTags) {
      condition.excludeTags = params.excludeTags;
    }
    if (params.keyword) {
      condition.keyword = params.keyword;
    }

    // 通过 Repository 查询
    return await videoRepository.query(condition, options);
  } catch (error) {
    console.error('[VideoQuery] Error executing query:', error);
    throw new QueryError('执行查询失败', error as Error);
  }
}

/**
 * 获取视频数据
 * @param videoIds 视频ID列表
 * @returns 视频数据列表
 */
export async function getVideos(videoIds: string[]): Promise<Video[]> {
  // 通过 Repository 获取视频
  return videoRepository.getVideos(videoIds);
}

/**
 * 清空查询缓存
 */
export function clearQueryCache(): void {
  videoRepository.clearCache();
}

/**
 * 获取所有标签
 * @returns 标签ID列表
 */
export async function getAllTags(): Promise<string[]> {
  try {
    // 通过 Repository 获取所有标签
    return videoRepository.getAllTags();
  } catch (error) {
    console.error('[VideoQuery] Error getting tags:', error);
    throw new QueryError('获取标签失败', error as Error);
  }
}
