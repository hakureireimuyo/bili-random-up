/**
 * 分类管理器
 * 负责分类列表的渲染和交互
 */

import type { CategoryInfo, TagInfo } from "./types.js";
import type { ServiceContainer } from "./services.js";
import type { ID } from "../../database/types/base.js";
import { colorFromTag } from "../../utils/tag-utils.js";
import { createDragGhost, getDragContext, setDragContext, type DragContext } from "../../utils/drag-utils.js";

type RenderFn = () => void | Promise<void>;

/**
 * 分类管理器
 */
export class CategoryManager {
  private services: ServiceContainer;
  private currentKeyword = "";

  constructor(services: ServiceContainer) {
    this.services = services;
  }

  /**
   * 获取所有分类
   */
  async getAllCategories(): Promise<CategoryInfo[]> {
    const categories = await this.services.categoryRepo.getAllCategories();
    return categories.map(cat => ({
      categoryId: cat.id,
      name: cat.name,
      description: cat.description,
      tagIds: cat.tagIds
    }));
  }

  /**
   * 按关键词获取分类
   */
  async getCategoriesByKeyword(keyword: string = ""): Promise<CategoryInfo[]> {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const categories = await this.getAllCategories();

    if (!normalizedKeyword) {
      return categories;
    }

    return categories.filter(category =>
      category.name.toLowerCase().includes(normalizedKeyword) ||
      (category.description || "").toLowerCase().includes(normalizedKeyword)
    );
  }

  /**
   * 创建新分类
   */
  async createCategory(name: string, description?: string): Promise<ID> {
    return await this.services.categoryRepo.createCategory({
      name,
      description,
      tagIds: []
    });
  }

  /**
   * 根据名称获取或创建分类
   */
  async ensureCategory(name: string, description?: string): Promise<{ categoryId: ID; created: boolean }> {
    const normalizedName = name.trim();
    if (!normalizedName) {
      throw new Error("分区名称不能为空");
    }

    const categories = await this.getAllCategories();
    const existing = categories.find(category => category.name === normalizedName);
    if (existing) {
      return { categoryId: existing.categoryId, created: false };
    }

    const categoryId = await this.createCategory(normalizedName, description);
    return { categoryId, created: true };
  }

  /**
   * 向分类添加标签
   */
  async addTagsToCategory(categoryId: ID, tagIds: ID[]): Promise<void> {
    const existingTags = await this.services.categoryRepo.getCategoryTags(categoryId);
    const uniqueTagIds = tagIds.filter(tagId => !existingTags.includes(tagId));
    if (uniqueTagIds.length === 0) {
      return;
    }
    await this.services.categoryRepo.addTagsToCategory(categoryId, uniqueTagIds);
  }

  /**
   * 从分类移除标签
   */
  async removeTagsFromCategory(categoryId: ID, tagIds: ID[]): Promise<void> {
    await this.services.categoryRepo.removeTagsFromCategory(categoryId, tagIds);
  }

  /**
   * 删除分类
   */
  async deleteCategory(categoryId: ID): Promise<void> {
    await this.services.categoryRepo.deleteCategory(categoryId);
  }

  /**
   * 渲染分类列表
   */
  async renderCategories(onChanged: RenderFn, keyword: string = this.currentKeyword): Promise<void> {
    this.currentKeyword = keyword.trim();
    const categories = await this.getCategoriesByKeyword(this.currentKeyword);
    const container = document.getElementById("category-list");
    if (!container) return;

    container.innerHTML = "";

    for (const category of categories) {
      const categoryElement = await this.renderCategoryItem(category, onChanged);
      container.appendChild(categoryElement);
    }

    // 渲染分页控件
    this.renderPagination(categories.length);
  }

  /**
   * 渲染分类项
   */
  private async renderCategoryItem(category: CategoryInfo, onChanged: RenderFn): Promise<HTMLElement> {
    const categoryElement = document.createElement("div");
    categoryElement.className = "category-item";

    // 创建分类头部
    const categoryHeader = document.createElement("div");
    categoryHeader.className = "category-header";
    categoryHeader.draggable = true;
    categoryHeader.addEventListener('dragstart', (e) => {
      e.stopPropagation();
      const context: DragContext = {
        categoryId: category.categoryId,
        categoryName: category.name,
        categoryTagIds: [...category.tagIds],
        dropped: false,
        isCategory: true
      };
      setDragContext(context);
      createDragGhost(e as DragEvent, category.name);
    });

    const categoryName = document.createElement("div");
    categoryName.className = "category-name";
    categoryName.textContent = category.name;
    categoryHeader.appendChild(categoryName);

    const removeBtn = document.createElement("button");
    removeBtn.className = "category-remove";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", async () => {
      if (confirm(`确定要删除分类 "${category.name}" 吗?`)) {
        try {
          await this.deleteCategory(category.categoryId);
          onChanged();
        } catch (error) {
          console.error('[CategoryManager] 删除分类失败:', error);
          alert('删除分类失败');
        }
      }
    });
    categoryHeader.appendChild(removeBtn);
    categoryElement.appendChild(categoryHeader);

    if (category.description) {
      const categoryDesc = document.createElement("div");
      categoryDesc.className = "category-description";
      categoryDesc.textContent = category.description;
      categoryElement.appendChild(categoryDesc);
    }

    const tagsContainer = document.createElement("div");
    tagsContainer.className = "category-tags";
    this.setupCategoryDropZone(tagsContainer, category, onChanged);

    if (category.tagIds && category.tagIds.length > 0) {
      const tagsMap = await this.services.tagRepo.getTags(category.tagIds);

      for (const tagId of category.tagIds) {
        const tag = tagsMap.get(tagId);
        if (tag) {
          const tagElement = this.createCategoryTagElement(category, tag, onChanged);
          tagsContainer.appendChild(tagElement);
        }
      }
    } else {
      const emptyHint = document.createElement("div");
      emptyHint.className = "category-empty";
      emptyHint.textContent = "拖拽标签到这里";
      tagsContainer.appendChild(emptyHint);
    }

    categoryElement.appendChild(tagsContainer);

    return categoryElement;
  }

  private createCategoryTagElement(category: CategoryInfo, tag: TagInfo, onChanged: RenderFn): HTMLElement {
    const tagElement = document.createElement("span");
    tagElement.className = "tag-pill";
    tagElement.textContent = tag.name;
    tagElement.style.backgroundColor = colorFromTag(tag.name);
    tagElement.draggable = true;

    tagElement.addEventListener('dragstart', (e) => {
      const context: DragContext = {
        tagId: tag.tagId,
        tagName: tag.name,
        dropped: false
      };
      setDragContext(context);
      createDragGhost(e as DragEvent, tag.name);
    });

    tagElement.addEventListener('dragend', () => {
      setTimeout(async () => {
        const context = getDragContext();
        if (context && context.tagId === tag.tagId && !context.dropped) {
          await this.removeTagsFromCategory(category.categoryId, [tag.tagId]);
          await this.renderCategories(onChanged, this.currentKeyword);
        }
      }, 0);
    });

    return tagElement;
  }

  private setupCategoryDropZone(
    tagsContainer: HTMLElement,
    category: CategoryInfo,
    onChanged: RenderFn
  ): void {
    tagsContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      tagsContainer.classList.add('drag-over');
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    });

    tagsContainer.addEventListener('dragleave', (e) => {
      if (!tagsContainer.contains(e.relatedTarget as Node)) {
        tagsContainer.classList.remove('drag-over');
      }
    });

    tagsContainer.addEventListener('drop', async (e) => {
      e.preventDefault();
      tagsContainer.classList.remove('drag-over');

      const context = getDragContext();
      if (!context || context.isFilterTag || context.isCategory || !context.tagId) {
        return;
      }

      await this.addTagsToCategory(category.categoryId, [context.tagId]);
      context.dropped = true;
      setDragContext(context);
      await this.renderCategories(onChanged, this.currentKeyword);
    });
  }

  /**
   * 添加分类（兼容旧接口）
   */
  async addCategoryCompat(name: string, onChanged: RenderFn): Promise<void> {
    await this.createCategory(name);
    onChanged();
  }

  /**
   * 删除分类（兼容旧接口）
   */
  async removeCategoryCompat(categoryId: ID, onChanged: RenderFn): Promise<void> {
    await this.deleteCategory(categoryId);
    onChanged();
  }

  /**
   * 添加标签到分类（兼容旧接口）
   */
  async addTagToCategoryCompat(categoryId: ID, tagId: ID, onChanged: RenderFn): Promise<void> {
    await this.addTagsToCategory(categoryId, [tagId]);
    onChanged();
  }

  /**
   * 从分类中移除标签（兼容旧接口）
   */
  async removeTagFromCategoryCompat(categoryId: ID, tagId: ID, onChanged: RenderFn): Promise<void> {
    await this.removeTagsFromCategory(categoryId, [tagId]);
    onChanged();
  }

  /**
   * 渲染分页控件
   */
  private renderPagination(totalCount: number): void {
    const paginationContainer = document.getElementById("category-pagination");
    if (!paginationContainer) return;

    paginationContainer.innerHTML = `<div class='pagination-info'>共 ${totalCount} 个分区</div>`;
  }
}
