
/**
 * 视频索引缓存
 * 纯内存存储,不包含任何逻辑和状态管理
 */

import type { VideoIndex } from './types.js';
import type { ID } from '../../types/base.js';

/**
 * 视频索引缓存类型
 * 纯数据容器,不包含任何逻辑
 */
export type VideoIndexCache = {
  /** 主缓存: videoId -> VideoIndex */
  data: Map<ID, VideoIndex>;
  /** 创作者索引: creatorId -> videoIds */
  creatorIndex: Map<ID, Set<ID>>;
  /** 收藏夹索引: collectionId -> videoIds */
  collectionIndex: Map<ID, Set<ID>>;
  /** 标签索引: tagId -> videoIds */
  tagIndex: Map<ID, Set<ID>>;
};

// 导出单例实例
export const videoIndexCache: VideoIndexCache = {
  data: new Map(),
  creatorIndex: new Map(),
  collectionIndex: new Map(),
  tagIndex: new Map()
};
