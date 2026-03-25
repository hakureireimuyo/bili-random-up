/**
 * 标签查询实现
 * 基于src/cache和src/database/implementations实现
 * 只提供对数据的操作接口，不存储任何数据
 */

import type { Tag } from '../../../types/semantic.js';
import type { QueryResult, QueryOptions, TagQueryParams } from '../types.js';
import { TagRepository } from '../../../implementations/tag-repository.impl.js';
import { QueryError } from '../types.js';
import { TagSource } from '../../../types/base.js';
import { TagIndexCache, type TagIndex } from '../../cache/index-cache/tag-index-cache.js';
import { tagDataCache } from '../../cache/data-cache/tag-data-cache.js';

// 创建Repository实例
const tagRepo = new TagRepository();

// 创建索引缓存实例
const tagIndexCache = new TagIndexCache(1000);

/**
 * 获取所有标签
 * @param params 查询参数
 * @param options 查询选项
 * @returns 查询结果
 */
export async function getAllTags(
  params: TagQueryParams = {},
  options: QueryOptions = {}
): Promise<QueryResult<Tag>> {
  try {
    // 构建索引查询条件
    const indexQuery: any = {};
    if (params.source) {
      indexQuery.source = params.source;
    }

    // 先从索引缓存中查询
    let tagIndexes: TagIndex[] = tagIndexCache.query(indexQuery);

    // 如果索引缓存中没有数据，从数据库加载
    if (tagIndexes.length === 0) {
      console.log('[TagQuery] 索引缓存为空，从数据库加载所有标签索引');
      const allTags = await tagRepo.getAllTags();
      const tags = allTags.items;

      // 将所有标签转换为索引并缓存
      const indexes: TagIndex[] = tags.map(tag => ({
        tagId: tag.tagId,
        name: tag.name,
        source: tag.source,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt
      }));
      tagIndexCache.setBatch(indexes);

      // 重新查询
      tagIndexes = tagIndexCache.query(indexQuery);
    }

    // 计算分页
    const page = params.page || 0;
    const pageSize = params.pageSize || 50;
    const total = tagIndexes.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const pageIndexes = tagIndexes.slice(startIndex, endIndex);

    // 获取当前页的完整数据
    const tagIds = pageIndexes.map(index => index.tagId);

    // 先从缓存中获取
    const cachedTags: Tag[] = [];
    const uncachedIds: string[] = [];

    tagIds.forEach(id => {
      const cached = tagDataCache.get(id);
      if (cached) {
        cachedTags.push(cached);
      } else {
        uncachedIds.push(id);
      }
    });

    // 从数据库获取未缓存的数据
    let dbTags: Tag[] = [];
    if (uncachedIds.length > 0) {
      const tagsMap = await tagRepo.getTags(uncachedIds);
      dbTags = uncachedIds.map(id => tagsMap.find(t => t.tagId === id)).filter((t): t is Tag => t !== undefined);

      // 将新获取的数据存入缓存
      tagDataCache.setBatch(dbTags);
    }

    // 合并缓存和数据库数据，保持原始顺序
    const tags = tagIds.map(id => {
      const cached = cachedTags.find(t => t.tagId === id);
      if (cached) return cached;
      return dbTags.find(t => t.tagId === id);
    }).filter((t): t is Tag => t !== undefined);

    const result: QueryResult<Tag> = {
      data: tags,
      total,
      page,
      pageSize,
      hasNext: page < totalPages - 1,
      hasPrev: page > 0
    };

    return result;
  } catch (error) {
    console.error('[TagQuery] Error getting all tags:', error);
    throw new QueryError('获取标签列表失败', error as Error);
  }
}

/**
 * 根据ID获取标签
 * @param tagId 标签ID
 * @param options 查询选项
 * @returns 标签对象
 */
export async function getTagById(
  tagId: string,
  options: QueryOptions = {}
): Promise<Tag | undefined> {
  try {
    // 先从缓存中获取
    if (options.useCache !== false) {
      const cached = tagDataCache.get(tagId);
      if (cached) {
        return cached;
      }
    }

    // 从数据库获取数据
    const tag = await tagRepo.getTag(tagId);

    // 如果获取到数据，更新缓存
    if (tag && options.useCache !== false) {
      // 更新索引缓存
      const index: TagIndex = {
        tagId: tag.tagId,
        name: tag.name,
        source: tag.source,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt
      };
      tagIndexCache.set(index);

      // 更新数据缓存
      tagDataCache.set(tag);
    }

    return tag ?? undefined;
  } catch (error) {
    console.error('[TagQuery] Error getting tag by id:', error);
    throw new QueryError('获取标签失败', error as Error);
  }
}

/**
 * 根据ID列表批量获取标签
 * @param tagIds 标签ID列表
 * @param options 查询选项
 * @returns 标签对象Map
 */
export async function getTagsByIds(
  tagIds: string[],
  options: QueryOptions = {}
): Promise<Map<string, Tag>> {
  try {
    const result = new Map<string, Tag>();

    for (const tagId of tagIds) {
      const tag = await getTagById(tagId, options);
      if (tag) {
        result.set(tagId, tag);
      }
    }

    return result;
  } catch (error) {
    console.error('[TagQuery] Error getting tags by ids:', error);
    throw new QueryError('批量获取标签失败', error as Error);
  }
}

/**
 * 创建标签
 * @param params 标签参数
 * @returns 标签ID
 */
export async function createTag(params: {
  name: string;
  source: TagSource;
  createdAt: number;
}): Promise<string> {
  try {
    const { name, source } = params;
    const tagId = await tagRepo.createTag(name, source);

    // 清空缓存，确保数据一致性
    tagIndexCache.clear();
    tagDataCache.clear();

    return tagId;
  } catch (error) {
    console.error('[TagQuery] Error creating tag:', error);
    throw new QueryError('创建标签失败', error as Error);
  }
}

/**
 * 删除标签
 * @param tagId 标签ID
 * @returns 是否成功
 */
export async function deleteTag(tagId: string): Promise<boolean> {
  try {
    const success = await tagRepo.deleteTag(tagId);

    if (success) {
      // 从缓存中删除
      tagIndexCache.delete(tagId);
      tagDataCache.delete(tagId);
    }

    return success;
  } catch (error) {
    console.error('[TagQuery] Error deleting tag:', error);
    throw new QueryError('删除标签失败', error as Error);
  }
}

/**
 * 搜索标签
 * @param keyword 关键词
 * @param params 查询参数
 * @param options 查询选项
 * @returns 查询结果
 */
export async function searchTags(
  keyword: string,
  params: TagQueryParams = {},
  options: QueryOptions = {}
): Promise<QueryResult<Tag>> {
  try {
    // 构建索引查询条件
    const indexQuery: any = {
      keyword
    };
    if (params.source) {
      indexQuery.source = params.source;
    }

    // 从索引缓存中查询
    let tagIndexes = tagIndexCache.query(indexQuery);

    // 如果索引缓存中没有数据，从数据库加载
    if (tagIndexes.length === 0) {
      console.log('[TagQuery] 索引缓存为空，从数据库加载所有标签索引');
      const allTags = await tagRepo.getAllTags();
      const tags = allTags.items;

      // 将所有标签转换为索引并缓存
      const indexes: TagIndex[] = tags.map(tag => ({
        tagId: tag.tagId,
        name: tag.name,
        source: tag.source,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt
      }));
      tagIndexCache.setBatch(indexes);

      // 重新查询
      tagIndexes = tagIndexCache.query(indexQuery);
    }

    // 计算分页
    const page = params.page || 0;
    const pageSize = params.pageSize || 50;
    const total = tagIndexes.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    const pageIndexes = tagIndexes.slice(startIndex, endIndex);

    // 获取当前页的完整数据
    const tagIds = pageIndexes.map(index => index.tagId);

    // 先从缓存中获取
    const cachedTags: Tag[] = [];
    const uncachedIds: string[] = [];

    tagIds.forEach(id => {
      const cached = tagDataCache.get(id);
      if (cached) {
        cachedTags.push(cached);
      } else {
        uncachedIds.push(id);
      }
    });

    // 从数据库获取未缓存的数据
    let dbTags: Tag[] = [];
    if (uncachedIds.length > 0) {
      const tagsMap = await tagRepo.getTags(uncachedIds);
      dbTags = uncachedIds.map(id => tagsMap.find(t => t.tagId === id)).filter((t): t is Tag => t !== undefined);

      // 将新获取的数据存入缓存
      tagDataCache.setBatch(dbTags);
    }

    // 合并缓存和数据库数据，保持原始顺序
    const tags = tagIds.map(id => {
      const cached = cachedTags.find(t => t.tagId === id);
      if (cached) return cached;
      return dbTags.find(t => t.tagId === id);
    }).filter((t): t is Tag => t !== undefined);

    const result: QueryResult<Tag> = {
      data: tags,
      total,
      page,
      pageSize,
      hasNext: page < totalPages - 1,
      hasPrev: page > 0
    };

    return result;
  } catch (error) {
    console.error('[TagQuery] Error searching tags:', error);
    throw new QueryError('搜索标签失败', error as Error);
  }
}

/**
 * 清空标签缓存
 */
export function clearTagCache(): void {
  tagIndexCache.clear();
  tagDataCache.clear();
}
