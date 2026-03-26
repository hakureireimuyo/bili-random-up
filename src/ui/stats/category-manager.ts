import { CategoryRepositoryImpl } from "../../database/index.js";
import type { CategoryInfo, TagInfo} from "./types.js";
import { ID } from '../../database/types/base.js'

type RenderFn = () => void;

const categoryRepo = new CategoryRepositoryImpl();

/**
 * 获取所有分类
 */
export async function getAllCategories(): Promise<CategoryInfo[]> {
  const categories = await categoryRepo.getAllCategories();
  return categories.map(cat => ({
    categoryId: cat.id,
    name: cat.name,
    description: cat.description,
    tagIds: cat.tagIds
  }));
}

/**
 * 创建新分类
 */
export async function createCategory(name: string, description?: string): Promise<ID> {
  return await categoryRepo.createCategory({
    name,
    description,
    tagIds: []
  });
}

/**
 * 向分类添加标签
 */
export async function addTagsToCategory(categoryId: ID, tagIds: ID[]): Promise<void> {
  await categoryRepo.addTagsToCategory(categoryId, tagIds);
}

/**
 * 从分类移除标签
 */
export async function removeTagsFromCategory(categoryId: ID, tagIds: ID[]): Promise<void> {
  await categoryRepo.removeTagsFromCategory(categoryId, tagIds);
}

/**
 * 删除分类
 */
export async function deleteCategory(categoryId: ID): Promise<void> {
  await categoryRepo.deleteCategory(categoryId);
}

/**
 * 添加分类
 */
export async function addCategory(state: any, name: string, onChanged: RenderFn): Promise<void> {
  await createCategory(name);
  onChanged();
}

/**
 * 删除分类
 */
export async function removeCategory(state: any, categoryId: ID, onChanged: RenderFn): Promise<void> {
  await deleteCategory(categoryId);
  onChanged();
}

/**
 * 添加标签到分类
 */
export async function addTagToCategory(state: any, categoryId: ID, tagId: ID, onChanged: RenderFn): Promise<void> {
  await addTagsToCategory(categoryId, [tagId]);
  onChanged();
}

/**
 * 从分类中移除标签
 */
export async function removeTagFromCategory(
  state: any,
  categoryId: ID,
  tagId: ID,
  onChanged: RenderFn
): Promise<void> {
  await removeTagsFromCategory(categoryId, [tagId]);
  onChanged();
}

/**
 * 渲染分类列表
 */
export async function renderCategories(state: any, onChanged: RenderFn): Promise<void> {
  const categories = await getAllCategories();
  const container = document.getElementById("category-list-container");
  if (!container) return;
  
  container.innerHTML = "";
  
  for (const category of categories) {
    const categoryElement = document.createElement("div");
    categoryElement.className = "category-item";
    
    const categoryName = document.createElement("div");
    categoryName.className = "category-name";
    categoryName.textContent = category.name;
    categoryElement.appendChild(categoryName);
    
    if (category.description) {
      const categoryDesc = document.createElement("div");
      categoryDesc.className = "category-description";
      categoryDesc.textContent = category.description;
      categoryElement.appendChild(categoryDesc);
    }
    
    const removeBtn = document.createElement("button");
    removeBtn.className = "category-remove-btn";
    removeBtn.textContent = "删除";
    removeBtn.addEventListener("click", async () => {
      if (confirm(`确定要删除分类 "${category.name}" 吗?`)) {
        await removeCategory(state, category.categoryId, onChanged);
      }
    });
    categoryElement.appendChild(removeBtn);
    
    container.appendChild(categoryElement);
  }
}
