/**
 * CategoryRepository 实现
 * 实现标签分区相关的数据库操作
 */

// 接口已移除，直接实现功能
import { Category } from '../types/semantic.js';
import { DBUtils, STORE_NAMES } from '../indexeddb/index.js';

/**
 * CategoryRepository 实现类
 */
export class CategoryRepository {
  /**
   * 创建分区
   */
  async createCategory(category: Omit<Category, 'id' | 'createdAt'>): Promise<string> {
    const id = `category_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
  async createCategories(categories: Omit<Category, 'id' | 'createdAt'>[]): Promise<string[]> {
    const ids: string[] = [];
    const newCategories: Category[] = categories.map(category => {
      const id = `category_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      ids.push(id);
      return { id, ...category, createdAt: Date.now() };
    });
    await DBUtils.addBatch(STORE_NAMES.CATEGORIES, newCategories);
    return ids;
  }

  /**
   * 获取分区
   */
  async getCategory(categoryId: string): Promise<Category | null> {
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
  async updateCategory(categoryId: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>): Promise<void> {
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
  async deleteCategory(categoryId: string): Promise<void> {
    await DBUtils.delete(STORE_NAMES.CATEGORIES, categoryId);
  }



  /**
   * 向分区添加标签
   */
  async addTagsToCategory(categoryId: string, tagIds: string[]): Promise<void> {
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
  async removeTagsFromCategory(categoryId: string, tagIds: string[]): Promise<void> {
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
  async clearCategoryTags(categoryId: string): Promise<void> {
    await this.updateCategory(categoryId, { tagIds: [] });
  }

  /**
   * 获取分区的所有标签
   */
  async getCategoryTags(categoryId: string): Promise<string[]> {
    const category = await this.getCategory(categoryId);
    return category?.tagIds ?? [];
  }

  /**
   * 检查标签是否在分区中
   */
  async isTagInCategory(categoryId: string, tagId: string): Promise<boolean> {
    const tags = await this.getCategoryTags(categoryId);
    return tags.includes(tagId);
  }
}
