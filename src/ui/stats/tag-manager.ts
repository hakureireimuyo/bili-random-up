import { TagRepository, TagSource,ID,CreatorRepository } from "../../database/index.js";
import type { TagInfo } from "./types.js";


type RenderFn = () => void | Promise<void>;

const tagRepo = new TagRepository();
const creatorpo= new CreatorRepository();
/**
 * 获取所有标签
 */
export async function getAllTags(): Promise<TagInfo[]> {
  const result = await tagRepo.getAllTags();
  return result.items.map(tag => ({
    tagId: tag.tagId,
    name: tag.name,
    source: tag.source
  }));
}

/**
 * 创建新标签
 */
export async function createTag(name: string, source: TagSource = TagSource.USER): Promise<ID> {
  return await tagRepo.createTag(name, source);
}

/**
 * 搜索标签
 */
export async function searchTags(keyword: string): Promise<TagInfo[]> {
  const result = await tagRepo.searchTags(keyword);
  return result.items.map(tag => ({
    tagId: tag.tagId,
    name: tag.name,
    source: tag.source
  }));
}

/**
 * 批量获取标签
 */
export async function getTagsByIds(tagIds: ID[]): Promise<Map<ID, TagInfo>> {
  const tags = await tagRepo.getTags(tagIds);
  const result = new Map<ID, TagInfo>();
  tags.forEach(tag => {
    result.set(tag.tagId, {
      tagId: tag.tagId,
      name: tag.name,
      source: tag.source
    });
  });
  return result;
}

/**
 * 渲染标签药丸
 */
export async function renderTagPill(
  tag: TagInfo,
  options?: {
    count?: number;
    onDetached?: () => void;
    isAuto?: boolean;
    creatorId?: ID;
    onRemove?: (creatorId: ID, tagName: string) => Promise<void>;
  }
): Promise<HTMLSpanElement> {
  const pill = document.createElement("span");
  pill.className = "tag-pill";
  
  const pillContent = document.createElement("span");
  pillContent.className = "tag-pill-content";
  pillContent.textContent = tag.name;
  pill.appendChild(pillContent);
  
  if (options?.count !== undefined) {
    const countBadge = document.createElement("span");
    countBadge.className = "tag-pill-count";
    countBadge.textContent = options.count.toString();
    pill.appendChild(countBadge);
  }
  
  if (options?.onRemove && options.creatorId) {
    const removeBtn = document.createElement("button");
    removeBtn.className = "tag-pill-remove";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", async () => {
      await options.onRemove!(options.creatorId!, tag.name);
      options.onDetached?.();
    });
    pill.appendChild(removeBtn);
  }
  
  return pill;
}

/**
 * 渲染自动标签药丸
 */
export async function renderAutoTagPill(tag: TagInfo, count: number): Promise<HTMLSpanElement> {
  return renderTagPill(tag, { count, isAuto: true });
}

/**
 * 添加标签到UP主
 */
export async function addTagToUp(
  creatorId: ID,
  tagId: ID,
  onChanged?: RenderFn
): Promise<void> {
  const tag = await tagRepo.getById(tagId)
  if (!tag) return;
  await creatorpo.addTag(creatorId,tag);
  onChanged?.();
}

/**
 * 从UP主移除标签
 */
export async function removeTagFromUp(
  creatorId: ID,
  tagId: ID,
  onChanged?: RenderFn
): Promise<void> {
  const tag = await tagRepo.getById(tagId)
  if (!tag) return;
  await creatorpo.removeTag(creatorId, tag);
  onChanged?.();
}

/**
 * 添加自定义标签
 */
export async function addCustomTag(
  creatorId: ID,
  tagName: string,
  onChanged?: RenderFn
): Promise<void> {
  const tagId = await createTag(tagName, TagSource.USER);
  await addTagToUp(creatorId, tagId, onChanged);
}

/**
 * 渲染标签列表
 */
export async function renderTagList(): Promise<void> {
  const tags = await getAllTags();
  const container = document.getElementById("tag-list-container");
  if (!container) return;
  
  container.innerHTML = "";
  
  for (const tag of tags) {
    const pill = await renderTagPill(tag);
    container.appendChild(pill);
  }
}
