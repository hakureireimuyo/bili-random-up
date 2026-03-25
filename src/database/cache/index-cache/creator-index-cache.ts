/**
 * 创作者索引缓存
 * 纯内存存储，不包含任何逻辑
 */

import type { ID } from '../../types/base.js';

/**
 * 创作者索引信息
 * 只存储创作者的关键索引字段,用于快速搜索和过滤
 */
export interface CreatorIndex {
  /** 创作者ID */
  creatorId: ID;
  /** 名称 */
  name: string;
  /** 标签列表 */
  tags: ID[];
  /** 是否关注 */
  isFollowing: boolean;
}

/**
 * 创作者索引缓存类型
 * 纯数据容器,不包含任何逻辑
 */
export type CreatorIndexCache = {
  /** 主缓存: creatorId -> CreatorIndex */
  data: Map<ID, CreatorIndex>;
  /** 标签索引: tagId -> creatorIds */
  tagIndex: Map<ID, Set<ID>>;
  /** 关注索引: isFollowing -> creatorIds */
  followingIndex: Map<boolean, Set<ID>>;
};

// 导出单例实例
export const creatorIndexCache: CreatorIndexCache = {
  data: new Map(),
  tagIndex: new Map(),
  followingIndex: new Map()
};
