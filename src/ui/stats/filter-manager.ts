
import { getDragContext } from "./drag.js";
import { colorFromTag, removeFromList, resetFilters } from "./helpers.js";
import { tagRepository, categoryRepository } from "../../database/repository/index.js";
import type { StatsState } from "./types.js";

type RefreshFn = () => void;

async function getTagName(tagId: string): Promise<string> {
  const tag = tagRepository.getTag(tagId);
  return tag?.name || tagId;
}

function createFilterTag(tagId: string, type: "include" | "exclude", state: StatsState, refresh: RefreshFn): HTMLElement {
  const tagEl = document.createElement("div");
  tagEl.className = "filter-tag";
  tagEl.textContent = tagId; // 初始显示tagId，异步加载后会更新
  tagEl.style.backgroundColor = colorFromTag(tagId);
  tagEl.dataset.tagId = tagId;
  
  // 异步获取标签名称
  void getTagName(tagId).then(tagName => {
    tagEl.textContent = tagName;
  });

  const removeBtn = document.createElement("span");
  removeBtn.className = "remove-tag";
  removeBtn.textContent = "×";
  removeBtn.addEventListener("click", () => {
    // 立即移除 DOM 元素
    tagEl.remove();

    // 更新状态
    if (type === "include") {
      state.filters.includeTags = removeFromList(state.filters.includeTags, tagId);
    } else {
      state.filters.excludeTags = removeFromList(state.filters.excludeTags, tagId);
    }

    // 只刷新 UP 列表，不重新渲染筛选标签
    refresh();
  });

  tagEl.appendChild(removeBtn);
  return tagEl;
}

async function createFilterCategory(
  categoryId: string,
  type: "include" | "exclude",
  state: StatsState,
  refresh: RefreshFn
): Promise<HTMLElement> {
  const category = await categoryRepository.getCategory(categoryId);
  const categoryEl = document.createElement("div");
  categoryEl.className = "filter-tag filter-tag-category";
  categoryEl.style.backgroundColor = "#2b6cff";
  categoryEl.style.color = "#fff";
  categoryEl.textContent = category?.name ?? "未知分区";

  const removeBtn = document.createElement("span");
  removeBtn.className = "remove-tag";
  removeBtn.textContent = "×";
  removeBtn.addEventListener("click", () => {
    // 立即移除 DOM 元素
    categoryEl.remove();

    // 更新状态
    if (type === "include") {
      state.filters.includeCategories = removeFromList(state.filters.includeCategories, categoryId);
    } else {
      state.filters.excludeCategories = removeFromList(state.filters.excludeCategories, categoryId);
    }

    // 只刷新 UP 列表，不重新渲染筛选标签
    refresh();
  });

  categoryEl.appendChild(removeBtn);
  return categoryEl;
}

export async function renderFilterTags(state: StatsState, refresh: RefreshFn): Promise<void> {
  const includeContainer = document.getElementById("filter-include-tags");
  const excludeContainer = document.getElementById("filter-exclude-tags");
  if (!includeContainer || !excludeContainer) {
    return;
  }

  includeContainer.innerHTML = "";
  excludeContainer.innerHTML = "";

  for (const tag of state.filters.includeTags) {
    includeContainer.appendChild(createFilterTag(tag, "include", state, refresh));
  }
  for (const tag of state.filters.excludeTags) {
    excludeContainer.appendChild(createFilterTag(tag, "exclude", state, refresh));
  }
  for (const categoryId of state.filters.includeCategories) {
    includeContainer.appendChild(await createFilterCategory(categoryId, "include", state, refresh));
  }
  for (const categoryId of state.filters.excludeCategories) {
    excludeContainer.appendChild(await createFilterCategory(categoryId, "exclude", state, refresh));
  }
}

async function applyCategoryFilter(state: StatsState, categoryId: string, type: "include" | "exclude"): Promise<void> {
  // 获取分类信息
  const category = await categoryRepository.getCategory(categoryId);
  if (!category) {
    return;
  }

  if (type === "include") {
    // 添加分类ID到包含列表
    if (!state.filters.includeCategories.includes(categoryId)) {
      state.filters.includeCategories.push(categoryId);
    }
    // 从排除列表中移除
    state.filters.excludeCategories = removeFromList(state.filters.excludeCategories, categoryId);
    // 添加分类的标签列表（OR条件）
    state.filters.includeCategoryTags = state.filters.includeCategoryTags.filter(ct => ct.categoryId !== categoryId);
    state.filters.includeCategoryTags.push({
      categoryId,
      tagIds: category.tagIds
    });
    // 从排除标签列表中移除
    state.filters.excludeCategoryTags = state.filters.excludeCategoryTags.filter(ct => ct.categoryId !== categoryId);
    return;
  }

  // 添加分类ID到排除列表
  if (!state.filters.excludeCategories.includes(categoryId)) {
    state.filters.excludeCategories.push(categoryId);
  }
  // 从包含列表中移除
  state.filters.includeCategories = removeFromList(state.filters.includeCategories, categoryId);
  // 添加分类的标签列表（NOT条件）
  state.filters.excludeCategoryTags = state.filters.excludeCategoryTags.filter(ct => ct.categoryId !== categoryId);
  state.filters.excludeCategoryTags.push({
    categoryId,
    tagIds: category.tagIds
  });
  // 从包含标签列表中移除
  state.filters.includeCategoryTags = state.filters.includeCategoryTags.filter(ct => ct.categoryId !== categoryId);
}

function applyTagFilter(state: StatsState, tagId: string, type: "include" | "exclude"): void {
  if (type === "include") {
    state.filters.excludeTags = removeFromList(state.filters.excludeTags, tagId);
    if (!state.filters.includeTags.includes(tagId)) {
      state.filters.includeTags.push(tagId);
    }
    return;
  }

  state.filters.includeTags = removeFromList(state.filters.includeTags, tagId);
  if (!state.filters.excludeTags.includes(tagId)) {
    state.filters.excludeTags.push(tagId);
  }
}

export function setupDragAndDrop(state: StatsState, refresh: RefreshFn): void {
  const includeZone = document.getElementById("filter-include-tags");
  const excludeZone = document.getElementById("filter-exclude-tags");
  if (!includeZone || !excludeZone) {
    return;
  }

  const zones = [
    { element: includeZone, type: "include" as const },
    { element: excludeZone, type: "exclude" as const }
  ];

  for (const zone of zones) {
    zone.element.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.element.classList.add("drag-over");
    });
    zone.element.addEventListener("dragleave", () => {
      zone.element.classList.remove("drag-over");
    });
    zone.element.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.element.classList.remove("drag-over");

      const categoryTagData = e.dataTransfer?.getData("application/x-bili-category-tag");
      if (categoryTagData) {
        try {
          const payload = JSON.parse(categoryTagData) as { categoryId?: string };
          if (payload.categoryId) {
            void applyCategoryFilter(state, payload.categoryId, zone.type).then(() => {
              void renderFilterTags(state, refresh);
              refresh();
            });
          }
        } catch {
          return;
        }
        return;
      }

      const tagData = e.dataTransfer?.getData("application/x-bili-tag") ?? e.dataTransfer?.getData("text/plain");
      if (!tagData) {
        return;
      }

      // 解析标签 ID 和名称
      let tagId: string;
      try {
        const parsed = JSON.parse(tagData);
        if (parsed.tagId) {
          tagId = parsed.tagId;
        } else {
          // 兼容旧格式（仅标签名称）- 直接使用tagName作为tagId
          tagId = parsed.tagName || tagData;
        }
      } catch {
        // 如果不是 JSON 格式，直接使用原始数据作为tagId
        tagId = tagData;
      }

      const currentDrag = getDragContext();
      if (currentDrag) {
        currentDrag.dropped = true;
      }

      applyTagFilter(state, tagId, zone.type);
      void renderFilterTags(state, refresh);
      refresh();
    });
  }
}

export async function clearFilters(state: StatsState, refresh: RefreshFn): Promise<void> {
  resetFilters(state.filters);
  await renderFilterTags(state, refresh);
  refresh();
}
