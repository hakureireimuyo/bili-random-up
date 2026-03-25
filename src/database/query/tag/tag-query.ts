/**
 * 标签查询实现
 * 纯计算工具，只负责数据过滤和排序
 */

import type { Tag } from '../../types/semantic.js';
import type { QueryResult, TagQueryParams } from '../types.js';

/**
 * 获取所有标签
 * @param tags 标签列表
 * @param params 查询参数
 * @returns 查询结果
 */
export function getAllTags(
  tags: Tag[],
  params: TagQueryParams = {}
): QueryResult<Tag> {
  let result = tags;

  // 按来源过滤
  if (params.source) {
    result = result.filter(tag => tag.source === params.source);
  }

  // 按关键词过滤
  if (params.keyword) {
    const keyword = params.keyword.toLowerCase();
    result = result.filter(tag =>
      tag.name.toLowerCase().includes(keyword)
    );
  }

  return {
    data: result,
    total: result.length
  };
}

/**
 * 根据ID获取标签
 * @param tags 标签列表
 * @param tagId 标签ID
 * @returns 标签对象
 */
export function getTagById(
  tags: Tag[],
  tagId: string
): Tag | undefined {
  return tags.find(tag => tag.tagId === tagId);
}

/**
 * 根据ID列表批量获取标签
 * @param tags 标签列表
 * @param tagIds 标签ID列表
 * @returns 标签对象Map
 */
export function getTagsByIds(
  tags: Tag[],
  tagIds: string[]
): Map<string, Tag> {
  const result = new Map<string, Tag>();
  tags.forEach(tag => {
    if (tagIds.includes(tag.tagId)) {
      result.set(tag.tagId, tag);
    }
  });
  return result;
}

/**
 * 搜索标签
 * @param tags 标签列表
 * @param keyword 关键词
 * @param params 查询参数
 * @returns 查询结果
 */
export function searchTags(
  tags: Tag[],
  keyword: string,
  params: TagQueryParams = {}
): QueryResult<Tag> {
  let result = tags;

  // 按关键词过滤
  const lowerKeyword = keyword.toLowerCase();
  result = result.filter(tag =>
    tag.name.toLowerCase().includes(lowerKeyword)
  );

  // 按来源过滤
  if (params.source) {
    result = result.filter(tag => tag.source === params.source);
  }

  return {
    data: result,
    total: result.length
  };
}
