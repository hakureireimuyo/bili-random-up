
/**
 * 视频数据缓存
 * 纯内存存储,不包含任何逻辑和状态管理
 */

import type { VideoData } from './types.js';
import type { ID } from '../../types/base.js';

/**
 * 视频数据缓存类型
 * 纯数据容器,不包含任何逻辑
 */
export type VideoDataCache = Map<ID, VideoData>;

// 导出单例实例
export const videoDataCache: VideoDataCache = new Map();
