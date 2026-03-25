/**
 * 标签查询模块调试工具
 * 用于诊断标签查询相关的问题
 * 使用Repository层访问数据
 */

import type { Tag } from '../../types/semantic.js';
import { tagRepository } from '../../repository/tag-repository.js';

/**
 * 检查标签数据
 */
export async function debugTagData(tagId: string): Promise<void> {
  console.log(`[Debug] Checking tag data for ${tagId}`);

  const tag = tagRepository.getTag(tagId);
  console.log('[Debug] Tag:', tag);
}

/**
 * 检查所有标签
 */
export async function debugAllTags(): Promise<void> {
  console.log('[Debug] Checking all tags...');

  // 确保 Repository 已初始化
  await tagRepository.init();

  const stats = tagRepository.getCacheStats();
  console.log(`[Debug] Cache stats:`, stats);

  // 查询所有标签
  const result = await tagRepository.query({});
  console.log(`[Debug] Total tags: ${result.total}`);
  console.log('[Debug] Tags:', result.data);

  // 按来源分组统计
  const userTags = result.data.filter(tag => tag.source === 'user');
  const systemTags = result.data.filter(tag => tag.source === 'system');
  console.log(`[Debug] User tags: ${userTags.length}`);
  console.log('[Debug] User tags:', userTags);
  console.log(`[Debug] System tags: ${systemTags.length}`);
  console.log('[Debug] System tags:', systemTags);
}

/**
 * 搜索标签
 */
export async function debugSearchTags(keyword: string): Promise<void> {
  console.log(`[Debug] Searching tags with keyword: ${keyword}`);

  const result = await tagRepository.query({ keyword });
  console.log(`[Debug] Found ${result.total} matching tags`);
  console.log('[Debug] Matched tags:', result.data);
}

/**
 * 运行完整诊断
 */
export async function runFullDiagnostics(): Promise<void> {
  console.log('[Debug] ===== Starting diagnostics =====');

  await debugAllTags();

  console.log('[Debug] ===== Diagnostics complete =====');
}

// 暴露到window对象以便在控制台调用
if (typeof window !== 'undefined') {
  (window as any).debugTagQuery = {
    debugTagData,
    debugAllTags,
    debugSearchTags,
    runFullDiagnostics
  };
  console.log('[Debug] Debug tools available at window.debugTagQuery');
}
