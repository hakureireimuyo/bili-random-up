
/**
 * CreatorRepository - 创作者数据仓库
 * 作为对外接口层，只负责将 UI 请求转为数据请求描述
 */

import type { Creator } from '../types/creator.js';
import type { PaginatedResult } from '../manager/types.js';
import type { DataManagementOptions } from '../manager/types.js';
import { CreatorDataManager } from '../manager/creator-data-manager.js';
import { RequestType } from '../plan/query-plan.js';
import {TagSource} from '../types/base.js'

type CreatorQueryCondition = {
  keyword?: string;
  isFollowing?: boolean;
  page?: number;
  pageSize?: number;
  tagExpressions?: import('../plan/query-plan.js').TagExpression[];
};

/**
 * CreatorRepository 类
 * 职责:
 * 1. 将 UI 请求转为数据请求描述
 * 2. 不直接操作 cache
 * 3. 不直接访问 DB
 * 4. 不做复杂逻辑
 */
export class CreatorRepository {
  private manager: CreatorDataManager;

  constructor() {
    this.manager = new CreatorDataManager();
  }

  /**
   * 初始化
   */
  async init(): Promise<void> {
    return this.manager.init();
  }

  /**
   * 查询创作者 - 主查询入口
   * 无论是否有关键词，都使用统一的处理流程
   * @param condition 查询条件
   * @param options 查询选项
   * @returns 查询结果
   */
  async query(
    condition: CreatorQueryCondition,
    options: DataManagementOptions = {}
  ): Promise<PaginatedResult<Creator>> {
    return this.manager.execute({
      type: RequestType.GET_CREATORS,
      payload: {
        keyword: condition.keyword,
        isFollowing: condition.isFollowing,
        page: condition.page || 0,
        pageSize: condition.pageSize || 20,
        tagExpressions: condition.tagExpressions
      }
    }, options);
  }

  /**
   * 根据 ID 获取创作者
   * @param creatorId 创作者ID
   * @returns 创作者对象
   */
  getCreator(creatorId: string): Creator | undefined {
    return this.manager.getCreator(creatorId);
  }

  /**
   * 获取创作者头像二进制数据
   * @param creatorId 创作者ID
   * @param platform 平台类型
   * @returns 头像Blob数据
   */
  async getAvatarBinary(creatorId: string, platform: string): Promise<Blob | null> {
    return this.manager.getAvatarBinary(creatorId, platform as any);
  }

  /**
   * 批量获取创作者头像二进制数据
   * @param creatorIds 创作者ID列表
   * @param platform 平台类型
   * @returns 头像Blob数据映射
   */
  async getAvatarBinaries(creatorIds: string[], platform: string): Promise<Map<string, Blob | null>> {
    return this.manager.getAvatarBinaries(creatorIds, platform as any);
  }

  /**
   * 保存创作者头像二进制数据
   * @param creatorId 创作者ID
   * @param platform 平台类型
   * @param avatarBlob 头像Blob数据
   */
  async saveAvatarBinary(creatorId: string, platform: string, avatarBlob: Blob): Promise<void> {
    return this.manager.saveAvatarBinary(creatorId, platform as any, avatarBlob);
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.manager.clearCache();
  }

  /**
   * 添加已存在数据库中的标签到创作者
   * 如果标签已存在，自动增加计数器
   * @param creatorId 创作者ID
   * @param tagId 标签ID
   * @param source 标签来源
   * @returns Promise<void>
   */
  async addTag(
    creatorId: string,
    tagId: string,
    source:TagSource
  ): Promise<void> {
    const creator = this.getCreator(creatorId);
    if (!creator) {
      throw new Error(`Creator not found: ${creatorId}`);
    }

    // 查找现有标签
    const existing = creator.tagWeights.find(tw => tw.tagId === tagId);
    
    if (existing) {
      // 如果标签已存在，增加计数器
      if (source === TagSource.SYSTEM) {
        existing.count += 1;
      }
    } else {
      // 如果标签不存在，添加新标签
      creator.tagWeights.push({
        tagId,
        source,
        count: source === TagSource.SYSTEM ? 1 : 0,
        createdAt: Date.now()
      });
    }

    // 更新缓存
    const cache = this.manager.getCreator(creatorId);
    if (cache) {
      Object.assign(cache, creator);
    }

    // 更新数据库
  }

  /**
   * 从创作者处移除标签
   * 只对 TagSource.USER 类型的标签生效
   * @param creatorId 创作者ID
   * @param tagId 标签ID
   * @returns Promise<void>
   */
  async removeTag(
    creatorId: string,
    tagId: string
  ): Promise<void> {
    const creator = this.getCreator(creatorId);
    if (!creator) {
      throw new Error(`Creator not found: ${creatorId}`);
    }

    // 查找标签
    const index = creator.tagWeights.findIndex(tw => tw.tagId === tagId && tw.source === TagSource.USER);
    
    if (index !== -1) {
      // 只移除 USER 类型的标签
      creator.tagWeights.splice(index, 1);
    }

    // 更新缓存
    const cache = this.manager.getCreator(creatorId);
    if (cache) {
      Object.assign(cache, creator);
    }

    // 更新数据库
  }

  /**
   * 获取创作者统计数据
   * @param platform 平台类型
   * @returns 统计数据
   */
  async loadStats(platform: string): Promise<{
    followedCount: number;
    unfollowedCount: number;
  }> {
    const followedResult = await this.query({
      isFollowing: true,
      page: 0,
      pageSize: 0
    });
    
    const unfollowedResult = await this.query({
      isFollowing: false,
      page: 0,
      pageSize: 0
    });
    
    return {
      followedCount: followedResult.total,
      unfollowedCount: unfollowedResult.total
    };
  }

  /**
   * 更新创作者标签权重
   * @param creatorId 创作者ID
   * @param tagWeights 标签权重列表
   * @returns Promise<void>
   */
  async updateTagWeights(
    creatorId: string,
    tagWeights: Creator['tagWeights']
  ): Promise<void> {
    const creator = this.getCreator(creatorId);
    if (!creator) {
      throw new Error(`Creator not found: ${creatorId}`);
    }

    // 合并现有标签权重
    const existingMap = new Map(
      creator.tagWeights.map(tw => [tw.tagId, tw])
    );

    tagWeights.forEach(tw => {
      const existing = existingMap.get(tw.tagId);
      if (existing) {
        // 如果已存在，合并计数
        existing.count += tw.count;
      } else {
        // 如果不存在，添加新标签
        existingMap.set(tw.tagId, tw);
      }
    });

    const updated: Creator = {
      ...creator,
      tagWeights: Array.from(existingMap.values())
    };

    // 更新缓存
    const cache = this.manager.getCreator(creatorId);
    if (cache) {
      Object.assign(cache, updated);
    }

    // 更新数据库
  }
  
}

// 导出单例实例
export const creatorRepository = new CreatorRepository();
