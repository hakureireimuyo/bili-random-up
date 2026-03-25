
/**
 * VideoQueryEngine - 视频查询引擎
 * 纯计算工具,不包含任何状态管理逻辑
 * 职责: 负责对给定的数据进行过滤、排序等计算
 */

import type { Video } from '../../types/video.js';
import type { VideoQueryParams } from '../types.js';

/**
 * 视频查询条件
 */
export interface VideoQueryCondition {
  /** 收藏夹ID */
  collectionId?: string;
  /** 创作者ID */
  creatorId?: string;
  /** 包含的标签 */
  includeTags?: string[];
  /** 排除的标签 */
  excludeTags?: string[];
  /** 关键词搜索 */
  keyword?: string;
  /** 排序字段 */
  sortBy?: 'createdAt' | 'publishTime' | 'title';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 视频查询引擎
 * 提供纯函数式的查询能力
 */
export class VideoQueryEngine {
  /**
   * 查询视频
   * @param data 视频数据
   * @param condition 查询条件
   * @returns 过滤和排序后的视频列表
   */
  static query(data: Video[], condition: VideoQueryCondition): Video[] {
    let result = data;

    // 1. 应用过滤条件
    result = this.filter(result, condition);

    // 2. 应用排序
    result = this.sort(result, condition);

    return result;
  }

  /**
   * 过滤视频
   * @param data 视频数据
   * @param condition 查询条件
   * @returns 过滤后的视频列表
   */
  private static filter(data: Video[], condition: VideoQueryCondition): Video[] {
    let result = data;

    // 标签过滤
    if (condition.includeTags && condition.includeTags.length > 0) {
      result = result.filter(video =>
        condition.includeTags!.some(tag => video.tags.includes(tag))
      );
    }

    if (condition.excludeTags && condition.excludeTags.length > 0) {
      result = result.filter(video =>
        !condition.excludeTags!.some(tag => video.tags.includes(tag))
      );
    }

    // 关键词搜索
    if (condition.keyword) {
      const keyword = condition.keyword.toLowerCase();
      result = result.filter(video =>
        video.title.toLowerCase().includes(keyword)
      );
    }

    return result;
  }

  /**
   * 排序视频
   * @param data 视频数据
   * @param condition 查询条件
   * @returns 排序后的视频列表
   */
  private static sort(data: Video[], condition: VideoQueryCondition): Video[] {
    if (!condition.sortBy) {
      return data;
    }

    const sortBy = condition.sortBy;
    const sortOrder = condition.sortOrder || 'desc';
    const order = sortOrder === 'desc' ? -1 : 1;

    return [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // 根据排序字段获取值
      if (sortBy === 'createdAt') {
        aValue = a.createdAt || 0;
        bValue = b.createdAt || 0;
      } else if (sortBy === 'publishTime') {
        aValue = a.publishTime || 0;
        bValue = b.publishTime || 0;
      } else if (sortBy === 'title') {
        aValue = a.title;
        bValue = b.title;
      } else {
        return 0;
      }

      // 字符串类型特殊处理
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * order;
      }

      return (aValue - bValue) * order;
    });
  }
}
