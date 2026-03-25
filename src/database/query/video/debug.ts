/**
 * 视频查询模块调试工具
 * 用于诊断视频查询相关的问题
 * 使用Repository层访问数据
 */

import type { Video } from '../../types/video.js';
import { videoRepository } from '../../repository/video-repository.js';

/**
 * 检查所有Videos
 */
export async function debugAllVideos(): Promise<void> {
  console.log('[Debug] Checking all videos...');

  // 确保 Repository 已初始化
  await videoRepository.init();

  const stats = videoRepository.getCacheStats();
  console.log('[Debug] Cache stats:', stats);

  // 查询所有视频
  const result = await videoRepository.query({});
  console.log(`[Debug] Total videos: ${result.total}`);
  console.log('[Debug] Videos:', result.data);
}

/**
 * 运行完整诊断
 */
export async function runFullDiagnostics(): Promise<void> {
  console.log('[Debug] ===== Starting diagnostics =====');

  await debugAllVideos();

  console.log('[Debug] ===== Diagnostics complete =====');
}

// 暴露到window对象以便在控制台调用
if (typeof window !== 'undefined') {
  (window as any).debugVideoQuery = {
    debugAllVideos,
    runFullDiagnostics
  };
  console.log('[Debug] Debug tools available at window.debugVideoQuery');
}
