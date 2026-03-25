
/**
 * TagRepository - 标签数据仓库
 * 作为对外接口层，只负责将 UI 请求转为数据请求描述
 */

import type { Tag } from '../types/semantic.js';
import type { TagSource } from '../types/base.js';
import type { PaginatedResult } from '../manager/types.js';
import type { DataManagementOptions } from '../manager/types.js';
import { TagDataManager } from '../manager/tag-data-manager.js';
import { RequestType } from '../plan/query-plan.js';

// Query 类型定义
type TagQueryCondition = {
  source?: TagSource;
  keyword?: string;
};

/**
 * TagRepository 类
 * 职责:
 * 1. 将 UI 请求转为数据请求描述
 * 2. 不直接操作 cache
 * 3. 不直接访问 DB
 * 4. 不做复杂逻辑
 */
export class TagRepository {
  private manager: TagDataManager;

  constructor() {
    this.manager = new TagDataManager();
  }

  /**
   * 初始化
   */
  async init(): Promise<void> {
    return this.manager.init();
  }

  /**
   * 查询标签 - 主查询入口
   * @param condition 查询条件
   * @param options 查询选项
   * @returns 查询结果
   */
  async query(
    condition: TagQueryCondition,
    options: DataManagementOptions = {}
  ): Promise<PaginatedResult<Tag>> {
    // 根据查询条件决定请求类型
    if (condition.source) {
      return this.manager.execute({
        type: RequestType.GET_TAGS_BY_SOURCE,
        payload: {
          source: condition.source,
          keyword: condition.keyword
        }
      }, options);
    } else {
      return this.manager.execute({
        type: RequestType.GET_ALL_TAGS,
        payload: {
          keyword: condition.keyword
        }
      }, options);
    }
  }

  /**
   * 根据 ID 获取标签
   * @param tagId 标签ID
   * @returns 标签对象
   */
  getTag(tagId: string): Tag | undefined {
    return this.manager.getTag(tagId);
  }

  /**
   * 批量获取标签
   * @param tagIds 标签ID列表
   * @returns 标签对象Map
   */
  getTags(tagIds: string[]): Map<string, Tag> {
    return this.manager.getTags(tagIds);
  }

  /**
   * 创建标签
   * @param name 标签名称
   * @param source 标签来源
   * @returns 标签ID
   */
  async createTag(name: string, source: TagSource): Promise<string> {
    return this.manager.createTag(name, source);
  }

  /**
   * 删除标签
   * @param tagId 标签ID
   * @returns 是否成功
   */
  async deleteTag(tagId: string): Promise<boolean> {
    return this.manager.deleteTag(tagId);
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.manager.clearCache();
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats() {
    return this.manager.getCacheStats();
  }
}

// 导出单例实例
export const tagRepository = new TagRepository();
