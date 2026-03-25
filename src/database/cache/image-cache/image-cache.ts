/**
 * 图像缓存
 * 纯内存存储，不包含任何逻辑和状态管理
 */

import type { ImageData } from './types.js';

/**
 * 图像缓存类型
 * 纯数据容器，不包含任何逻辑
 */
export type ImageCache = Map<string, ImageData>;

// 导出单例实例
export const imageCache: ImageCache = new Map();
