/**
 * CategoryRepositoryImpl 实现
 * 实现标签分区相关的数据库操作
 */

import { Category } from '../types/semantic.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';
import { generateId } from './id-generator.js';
import {ID} from "../types/base.js"

/**
 * CategoryRepositoryImpl 实现类
 */
export class CategoryRepositoryImpl {
  /**
   * 创建分区
   */
  async createCategory(category: Omit<Category, 'id' | 'createdAt'>): Promise<ID> {
    const id = generateId();
    const newCategory: Category = {
      id,
      ...category,
      createdAt: Date.now()
    };
    await DBUtils.add(STORE_NAMES.CATEGORIES, newCategory);
    return id;
  }

  /**
   * 批量创建分区
   */
  async createCategories(categories: Omit<Category, 'id' | 'createdAt'>[]): Promise<ID[]> {
    const ids: ID[] = [];
    const newCategories: Category[] = categories.map(category => {
      const id = generateId();
      ids.push(id);
      return { id, ...category, createdAt: Date.now() };
    });
    await DBUtils.addBatch(STORE_NAMES.CATEGORIES, newCategories);
    return ids;
  }

  /**
   * 获取分区
   */
  async getCategory(categoryId: ID): Promise<Category | null> {
    return DBUtils.get<Category>(STORE_NAMES.CATEGORIES, categoryId);
  }

  /**
   * 获取所有分区
   */
  async getAllCategories(): Promise<Category[]> {
    return DBUtils.getAll<Category>(STORE_NAMES.CATEGORIES);
  }

  /**
   * 分页获取分区
   * @param page 页码，从0开始
   * @param pageSize 每页数量
   */
  async getCategoriesByPage(page: number, pageSize: number): Promise<Category[]> {
    const allCategories = await this.getAllCategories();
    const startIndex = page * pageSize;
    const endIndex = startIndex + pageSize;
    return allCategories.slice(startIndex, endIndex);
  }
  /**
   * 更新分区
   */
  async updateCategory(categoryId: ID, updates: Partial<Omit<Category, 'id' | 'createdAt'>>): Promise<void> {
    const existing = await this.getCategory(categoryId);
    if (!existing) {
      throw new Error(`Category not found: ${categoryId}`);
    }
    const updated: Category = {
      ...existing,
      ...updates
    };
    await DBUtils.put(STORE_NAMES.CATEGORIES, updated);
  }

  /**
   * 删除分区
   */
  async deleteCategory(categoryId: ID): Promise<void> {
    await DBUtils.delete(STORE_NAMES.CATEGORIES, categoryId);
  }

  /**
   * 向分区添加标签
   */
  async addTagsToCategory(categoryId: ID, tagIds: ID[]): Promise<void> {
    const existing = await this.getCategory(categoryId);
    if (!existing) {
      throw new Error(`Category not found: ${categoryId}`);
    }

    // 合并标签列表，不去重
    const updatedTagIds = [...existing.tagIds, ...tagIds];
    await this.updateCategory(categoryId, { tagIds: updatedTagIds });
  }

  /**
   * 从分区移除标签
   */
  async removeTagsFromCategory(categoryId: ID, tagIds: ID[]): Promise<void> {
    const existing = await this.getCategory(categoryId);
    if (!existing) {
      throw new Error(`Category not found: ${categoryId}`);
    }

    const updatedTagIds = existing.tagIds.filter(id => !tagIds.includes(id));
    await this.updateCategory(categoryId, { tagIds: updatedTagIds });
  }

  /**
   * 清空分区的所有标签
   */
  async clearCategoryTags(categoryId: ID): Promise<void> {
    await this.updateCategory(categoryId, { tagIds: [] });
  }

  /**
   * 获取分区的所有标签
   */
  async getCategoryTags(categoryId: ID): Promise<ID[]> {
    const category = await this.getCategory(categoryId);
    return category?.tagIds ?? [];
  }

  /**
   * 检查标签是否在分区中
   */
  async isTagInCategory(categoryId: ID, tagId: ID): Promise<boolean> {
    const tags = await this.getCategoryTags(categoryId);
    return tags.includes(tagId);
  }
}
