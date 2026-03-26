import type { StatsState, FilterState } from "./types.js";
import type { ServiceContainer } from "./services.js";
import { resetFilters } from "./helpers.js";
import { ID } from "../../database/types/index.js";
import { getDragContext, setDragContext } from "../../utls/drag-utils.js";

type RefreshFn = () => void;

let services: ServiceContainer | null = null;

/**
 * 初始化服务
 */
export function initFilterManagerServices(container: ServiceContainer): void {
  services = container;
}

/**
 * 获取服务容器
 */
function getServices(): ServiceContainer {
  if (!services) {
    throw new Error('FilterManager services not initialized. Call initFilterManagerServices first.');
  }
  return services;
}

/**
 * 添加包含标签
 */
export function addIncludeTag(state: StatsState, tagId: ID): void {
  if (!state.filters.includeTags.includes(tagId)) {
    state.filters.includeTags.push(tagId);
  }
}

/**
 * 移除包含标签
 */
export function removeIncludeTag(state: StatsState, tagId: ID): void {
  state.filters.includeTags = state.filters.includeTags.filter(id => id !== tagId);
}

/**
 * 添加排除标签
 */
export function addExcludeTag(state: StatsState, tagId: ID): void {
  if (!state.filters.excludeTags.includes(tagId)) {
    state.filters.excludeTags.push(tagId);
  }
}

/**
 * 移除排除标签
 */
export function removeExcludeTag(state: StatsState, tagId: ID): void {
  state.filters.excludeTags = state.filters.excludeTags.filter(id => id !== tagId);
}

/**
 * 清除所有筛选
 */
export function clearAllFilters(state: StatsState): void {
  resetFilters(state.filters);
}

/**
 * 检查是否有活动筛选
 */
export function hasActiveFilters(state: StatsState): boolean {
  return (
    state.filters.includeTags.length > 0 ||
    state.filters.excludeTags.length > 0 ||
    state.filters.includeCategories.length > 0 ||
    state.filters.excludeCategories.length > 0
  );
}

/**
 * 渲染筛选标签
 */
export async function renderFilterTags(state: StatsState, refresh: RefreshFn): Promise<void> {
  const container = document.getElementById("filter-tags-container");
  if (!container) return;

  container.innerHTML = "";

  // 渲染包含标签
  if (state.filters.includeTags.length > 0) {
    const includeSection = document.createElement("div");
    includeSection.className = "filter-section";
    includeSection.innerHTML = "<div class=\"filter-section-title\">包含标签:</div>";

    const tagsContainer = document.createElement("div");
    tagsContainer.className = "filter-tags";

    // 获取标签名称
    const includeTagsMap = await getServices().tagRepo.getTags(state.filters.includeTags);

    for (const tagId of state.filters.includeTags) {
      const tag = includeTagsMap.get(tagId);
      const tagName = tag?.name || String(tagId);
      
      const tagElement = document.createElement("span");
      tagElement.className = "filter-tag include-tag";
      tagElement.textContent = tagName;

      const removeBtn = document.createElement("button");
      removeBtn.className = "filter-tag-remove";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", () => {
        removeIncludeTag(state, tagId);
        refresh();
      });

      tagElement.appendChild(removeBtn);
      tagsContainer.appendChild(tagElement);
    }

    includeSection.appendChild(tagsContainer);
    container.appendChild(includeSection);
  }

  // 渲染排除标签
  if (state.filters.excludeTags.length > 0) {
    const excludeSection = document.createElement("div");
    excludeSection.className = "filter-section";
    excludeSection.innerHTML = "<div class=\"filter-section-title\">排除标签:</div>";

    const tagsContainer = document.createElement("div");
    tagsContainer.className = "filter-tags";

    // 获取标签名称
    const excludeTagsMap = await getServices().tagRepo.getTags(state.filters.excludeTags);

    for (const tagId of state.filters.excludeTags) {
      const tag = excludeTagsMap.get(tagId);
      const tagName = tag?.name || String(tagId);
      
      const tagElement = document.createElement("span");
      tagElement.className = "filter-tag exclude-tag";
      tagElement.textContent = tagName;

      const removeBtn = document.createElement("button");
      removeBtn.className = "filter-tag-remove";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", () => {
        removeExcludeTag(state, tagId);
        refresh();
      });

      tagElement.appendChild(removeBtn);
      tagsContainer.appendChild(tagElement);
    }

    excludeSection.appendChild(tagsContainer);
    container.appendChild(excludeSection);
  }
}

/**
 * 清除所有筛选
 */
export async function clearFilters(state: StatsState, refresh: RefreshFn): Promise<void> {
  clearAllFilters(state);
  refresh();
}

/**
 * 设置拖拽功能
 */
export function setupDragAndDrop(state: StatsState, refresh: RefreshFn): void {
  const includeZone = document.getElementById("filter-include-tags");
  const excludeZone = document.getElementById("filter-exclude-tags");

  if (!includeZone || !excludeZone) {
    console.warn('[filter-manager] 过滤区域未找到');
    return;
  }

  // 设置包含区域的拖拽事件
  setupDropZone(includeZone, state, refresh, 'include');

  // 设置排除区域的拖拽事件
  setupDropZone(excludeZone, state, refresh, 'exclude');
}

/**
 * 设置拖放区域
 */
function setupDropZone(
  zone: HTMLElement,
  state: StatsState,
  refresh: RefreshFn,
  type: 'include' | 'exclude'
): void {
  // 阻止默认行为，允许放置
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    zone.classList.add('drag-over');
  });

  // 拖拽离开时移除样式
  zone.addEventListener('dragleave', (e) => {
    if (!zone.contains(e.relatedTarget as Node)) {
      zone.classList.remove('drag-over');
    }
  });

  // 处理放置事件
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');

    const context = getDragContext();
    if (!context || !context.tagId) {
      return;
    }

    // 更新过滤状态
    if (type === 'include') {
      addIncludeTag(state, context.tagId);
    } else {
      addExcludeTag(state, context.tagId);
    }

    // 标记已放置
    context.dropped = true;
    setDragContext(context);

    // 刷新显示
    refresh();
  });
}
