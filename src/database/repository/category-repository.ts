/**
 * CategoryRepository - 分类数据仓库
 * 作为对外接口层，只负责将 UI 请求转为数据请求描述
 */

import type { Category } from '../types/semantic.js';
import { CategoryRepository as CategoryRepositoryImpl } from '../implementations/category-repository.impl.js';

/**
 * CategoryRepository 类
 * 职责:
 * 1. 将 UI 请求转为数据请求描述
 * 2. 不直接操作 cache
 * 3. 不直接访问 DB
 * 4. 不做复杂逻辑
 */
export class CategoryRepository {
  private impl: CategoryRepositoryImpl;

  constructor() {
    this.impl = new CategoryRepositoryImpl();
  }

  /**
   * 创建分类
   * @param name 分类名称
   * @returns 分类ID
   */
  async createCategory(name: string): Promise<string> {
    return this.impl.createCategory({ name, tagIds: [] });
  }

  /**
   * 获取所有分类
   * @returns 分类列表
   */
  async getAllCategories(): Promise<Category[]> {
    return this.impl.getAllCategories();
  }

  /**
   * 根据 ID 获取分类
   * @param categoryId 分类ID
   * @returns 分类对象
   */
  async getCategory(categoryId: string): Promise<Category | null> {
    return this.impl.getCategory(categoryId);
  }

  /**
   * 删除分类
   * @param categoryId 分类ID
   * @returns 是否成功
   */
  async deleteCategory(categoryId: string): Promise<void> {
    return this.impl.deleteCategory(categoryId);
  }

  /**
   * 向分类添加标签
   * @param categoryId 分类ID
   * @param tagId 标签ID
   */
  async addTagToCategory(categoryId: string, tagId: string): Promise<void> {
    return this.impl.addTagsToCategory(categoryId, [tagId]);
  }

  /**
   * 从分类移除标签
   * @param categoryId 分类ID
   * @param tagId 标签ID
   */
  async removeTagFromCategory(categoryId: string, tagId: string): Promise<void> {
    return this.impl.removeTagsFromCategory(categoryId, [tagId]);
  }
}

// 导出单例实例
export const categoryRepository = new CategoryRepository();
