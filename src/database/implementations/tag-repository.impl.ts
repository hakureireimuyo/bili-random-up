/**
 * TagRepository 实现（针对IndexedDB优化版）
 * 专注于获取全部数据、分页获取数据、基于索引的增删改查以及特定数据结构特有的方法
 */

// 接口已移除，直接实现功能
import { Tag, TagStats } from '../types/semantic.js';
import { TagSource, PaginationParams, PaginationResult } from '../types/base.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';

export class TagRepository {

  /**
   * 名称规范化
   */
  private normalize(name: string): string {
    return name.trim().toLowerCase();
  }

  // ====== 创建操作 ======

  /**
   * 创建标签（单个）
   */
  async createTag(tag: Omit<Tag, 'tagId'>): Promise<string> {
    const name = this.normalize(tag.name);

    // 使用索引检查是否已存在
    const existing = await DBUtils.getOneByIndex<Tag>(
      STORE_NAMES.TAGS,
      'name',
      name
    );

    if (existing) return existing.tagId;

    const newTag: Tag = {
      tagId: crypto.randomUUID(),
      ...tag,
      name
    };

    try {
      await DBUtils.add(STORE_NAMES.TAGS, newTag);
      return newTag.tagId;
    } catch (err: any) {
      if (err.name === 'ConstraintError') {
        // 约束错误时再次检查，确保返回正确的ID
        const existing = await DBUtils.getOneByIndex<Tag>(
          STORE_NAMES.TAGS,
          'name',
          name
        );
        if (existing) return existing.tagId;
      }
      throw err;
    }
  }

  /**
   * 使用指定ID创建标签
   */
  async createTagWithId(tag: Tag): Promise<void> {
    const name = this.normalize(tag.name);

    // 使用索引检查是否已存在
    const existing = await DBUtils.getOneByIndex<Tag>(
      STORE_NAMES.TAGS,
      'name',
      name
    );

    if (existing) return;

    await DBUtils.add(STORE_NAMES.TAGS, {
      ...tag,
      name
    });
  }

  /**
   * 批量创建标签（使用cursor优化）
   */
  async createTags(tags: Omit<Tag, 'tagId'>[]): Promise<string[]> {
    if (tags.length === 0) return [];
    
    // 使用cursor优化的大批量创建
    return this.createTagsByCursor(tags);
  }

  /**
   * 大批量：cursor 优化版本
   */
  private async createTagsByCursor(tags: Omit<Tag, 'tagId'>[]): Promise<string[]> {
    const resultIds: string[] = [];

    // 1️⃣ 标准化 + 去重
    const normalizedMap = new Map<string, Omit<Tag, 'tagId'>>();

    for (const tag of tags) {
      const name = this.normalize(tag.name);
      if (!normalizedMap.has(name)) {
        normalizedMap.set(name, { ...tag, name });
      }
    }

    const targetNames = new Set(normalizedMap.keys());

    // 2️⃣ cursor 扫描 index
    const existingMap = new Map<string, Tag>();

    await DBUtils.cursor<Tag>(
      STORE_NAMES.TAGS,
      (value) => {
        const name = value.name;

        if (targetNames.has(name)) {
          existingMap.set(name, value);

          // 如果找到所有匹配项，提前终止遍历
          if (existingMap.size === targetNames.size) {
            return false;
          }
        }
      },
      'name'
    );

    // 3️⃣ 构建新增数据
    const newTags: Tag[] = [];

    for (const [name, tag] of normalizedMap.entries()) {
      const existing = existingMap.get(name);

      if (existing) {
        resultIds.push(existing.tagId);
      } else {
        const tagId = crypto.randomUUID();

        newTags.push({
          tagId,
          ...tag
        });

        resultIds.push(tagId);
      }
    }

    // 4️⃣ 批量写入
    if (newTags.length > 0) {
      try {
        await DBUtils.addBatch(STORE_NAMES.TAGS, newTags);
      } catch (err: any) {
        if (err.name === 'ConstraintError') {
          // 如果批量添加失败，尝试逐个添加
          for (const tag of newTags) {
            try {
              await DBUtils.add(STORE_NAMES.TAGS, tag);
            } catch {
              // 忽略错误，继续处理下一个
            }
          }
        } else {
          throw err;
        }
      }
    }

    return resultIds;
  }

  /**
   * 批量创建（带ID）
   */
  async createTagsWithIds(tags: Tag[]): Promise<string[]> {
    if (tags.length === 0) return [];
    
    const createdIds: string[] = [];
    
    // 批量处理以提高性能
    const batchPromises = tags.map(async (tag) => {
      const name = this.normalize(tag.name);

      // 使用索引检查是否已存在
      const existing = await DBUtils.getOneByIndex<Tag>(
        STORE_NAMES.TAGS,
        'name',
        name
      );

      if (!existing) {
        await DBUtils.add(STORE_NAMES.TAGS, {
          ...tag,
          name
        });
        return tag.tagId;
      }
      return null;
    });
    
    const results = await Promise.all(batchPromises);
    return results.filter(id => id !== null) as string[];
  }

  // ====== 查询操作 ======

  /**
   * 获取标签
   */
  async getTag(tagId: string): Promise<Tag | null> {
    // 使用主键查询，这是IndexedDB最高效的查询方式
    return DBUtils.get<Tag>(STORE_NAMES.TAGS, tagId);
  }

  /**
   * 批量获取标签
   */
  async getTags(tagIds: string[]): Promise<Tag[]> {
    if (tagIds.length === 0) return [];
    
    // 使用批量获取优化性能
    return DBUtils.getBatch<Tag>(STORE_NAMES.TAGS, tagIds);
  }

  /**
   * 通过名称查找
   */
  async findTagByName(name: string): Promise<Tag | null> {
    // 使用索引查询，比全表扫描高效
    return DBUtils.getOneByIndex<Tag>(
      STORE_NAMES.TAGS,
      'name',
      this.normalize(name)
    );
  }

  /**
   * 获取所有标签（分页）
   */
  async getAllTags(pagination?: PaginationParams): Promise<PaginationResult<Tag>> {
    // 获取所有数据
    const allTags = await DBUtils.getAll<Tag>(STORE_NAMES.TAGS);
    
    // 如果没有分页参数，返回全部数据
    if (!pagination) {
      return {
        items: allTags,
        total: allTags.length,
        page: 0,
        pageSize: allTags.length,
        totalPages: 1
      };
    }
    
    // 应用分页
    const start = pagination.page * pagination.pageSize;
    const end = start + pagination.pageSize;
    const paginatedTags = allTags.slice(start, end);
    
    return {
      items: paginatedTags,
      total: allTags.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(allTags.length / pagination.pageSize)
    };
  }

  /**
   * 按来源获取标签（优化分版）
   * 使用游标实现高效分页，避免一次性加载所有数据
   */
  async getTagsBySource(source: TagSource, pagination?: PaginationParams): Promise<PaginationResult<Tag>> {
    if (!pagination) {
      // 如果没有分页参数，获取全部数据
      const tags = await DBUtils.getByIndex<Tag>(
        STORE_NAMES.TAGS,
        'source',
        source
      );
      
      return {
        items: tags,
        total: tags.length,
        page: 0,
        pageSize: tags.length,
        totalPages: 1
      };
    }
    
    // 使用游标实现高效分页
    const items: Tag[] = [];
    const skipCount = pagination.page * pagination.pageSize;
    let processedCount = 0;
    
    await DBUtils.cursor<Tag>(
      STORE_NAMES.TAGS,
      (value) => {
        // 只处理指定来源的标签
        if (value.source === source) {
          processedCount++;
          
          // 跳过前面的项
          if (processedCount > skipCount) {
            items.push(value);
            
            // 如果获取足够的项目，停止遍历
            if (items.length >= pagination.pageSize) {
              return false;
            }
          }
        }
      },
      'source'
    );
    
    // 计算总数（需要额外查询）
    const total = await DBUtils.countByIndex(STORE_NAMES.TAGS, 'source', source);
    
    return {
      items,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize)
    };
  }

  /**
   * 搜索标签（前缀匹配）
   */
  async searchTags(
    keyword: string,
    pagination?: PaginationParams
  ): Promise<PaginationResult<Tag>> {
    const normalized = this.normalize(keyword);

    // 使用范围查询优化搜索性能
    const range = IDBKeyRange.bound(
      normalized,
      normalized + '\uffff'
    );

    // 使用索引获取匹配的标签
    const items = await DBUtils.getByIndexRange<Tag>(
      STORE_NAMES.TAGS,
      'name',
      range
    );
    
    // 如果没有分页参数，返回全部数据
    if (!pagination) {
      return {
        items,
        total: items.length,
        page: 0,
        pageSize: items.length,
        totalPages: 1
      };
    }
    
    // 应用分页
    const start = pagination.page * pagination.pageSize;
    const end = start + pagination.pageSize;
    const paginatedItems = items.slice(start, end);
    
    return {
      items: paginatedItems,
      total: items.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(items.length / pagination.pageSize)
    };
  }

  // ====== 更新操作 ======

  /**
   * 更新标签
   */
  async updateTag(
    tagId: string,
    updates: Partial<Omit<Tag, 'tagId' | 'createdAt'>>
  ): Promise<void> {
    // 先获取现有标签
    const existing = await this.getTag(tagId);
    if (!existing) throw new Error(`Tag not found: ${tagId}`);

    // 系统标签不可修改
    if (existing.source === 'system') {
      throw new Error('System tag cannot be modified');
    }

    // 如果更新名称，检查唯一性
    if (updates.name) {
      const name = this.normalize(updates.name);

      // 使用索引检查名称是否已存在
      const other = await DBUtils.getOneByIndex<Tag>(
        STORE_NAMES.TAGS,
        'name',
        name
      );

      if (other && other.tagId !== tagId) {
        throw new Error('Tag name already exists');
      }

      updates.name = name;
    }

    // 更新标签
    await DBUtils.put(STORE_NAMES.TAGS, {
      ...existing,
      ...updates
    });
  }

  // ====== 删除操作 ======

  /**
   * 删除标签
   */
  async deleteTag(tagId: string): Promise<void> {
    // 检查标签是否存在
    const existing = await this.getTag(tagId);
    if (!existing) throw new Error(`Tag not found: ${tagId}`);
    
    // 系统标签不可删除
    if (existing.source === 'system') {
      throw new Error('System tag cannot be deleted');
    }
    
    // 使用主键删除，这是最高效的删除方式
    await DBUtils.delete(STORE_NAMES.TAGS, tagId);
  }

  /**
   * 批量删除标签
   */
  async deleteTags(tagIds: string[]): Promise<void> {
    if (tagIds.length === 0) return;
    
    // 批量删除以提高性能
    await DBUtils.deleteBatch(STORE_NAMES.TAGS, tagIds);
  }

  // ====== 特定数据结构特有的方法 ======

  /**
   * 获取系统标签
   */
  async getSystemTags(pagination?: PaginationParams): Promise<PaginationResult<Tag>> {
    return this.getTagsBySource(TagSource.SYSTEM, pagination);
  }

  /**
   * 获取用户标签
   */
  async getUserTags(pagination?: PaginationParams): Promise<PaginationResult<Tag>> {
    return this.getTagsBySource(TagSource.USER, pagination);
  }

  /**
   * 获取热门标签（基于名称长度，作为示例）
   */
  async getPopularTags(pagination?: PaginationParams): Promise<PaginationResult<Tag>> {
    // 获取所有标签
    const allTags = await DBUtils.getAll<Tag>(STORE_NAMES.TAGS);
    
    // 简单按名称长度排序（仅作为示例，实际应用中可能需要其他标准）
    const sortedTags = [...allTags].sort((a, b) => {
      // 简单的热度算法：名称长度越长，热度越高
      return b.name.length - a.name.length;
    });
    
    // 如果没有分页参数，返回全部数据
    if (!pagination) {
      return {
        items: sortedTags,
        total: sortedTags.length,
        page: 0,
        pageSize: sortedTags.length,
        totalPages: 1
      };
    }
    
    // 应用分页
    const start = pagination.page * pagination.pageSize;
    const end = start + pagination.pageSize;
    const paginatedTags = sortedTags.slice(start, end);
    
    return {
      items: paginatedTags,
      total: sortedTags.length,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(sortedTags.length / pagination.pageSize)
    };
  }

  /**
   * 获取标签统计（占位）
   */
  async getTagStats(tagId: string): Promise<TagStats | null> {
    // 在实际应用中，这可能需要从其他存储获取统计信息
    return null;
  }

  /**
   * 批量获取标签统计（占位）
   */
  async getTagsStats(tagIds: string[]): Promise<TagStats[]> {
    // 在实际应用中，这可能需要从其他存储批量获取统计信息
    return [];
  }
}