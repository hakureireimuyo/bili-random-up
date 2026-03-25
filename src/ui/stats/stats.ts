
import { bindPageActions } from "./page-actions.js";
import { addCategory, renderCategories } from "./category-manager.js";
import { clearFilters, renderFilterTags, setupDragAndDrop } from "./filter-manager.js";
import { createInitialState,  creatorToCacheData } from "./helpers.js";
import {getInputValue, setText, updateToggleLabel } from "./dom.js"
import { addCustomTag, renderTagList } from "./tag-manager.js";
import type { Category, StatsState, TagDisplayData } from "./types.js";
import { refreshUpList } from "./up-list.js";
import { creatorRepository } from "../../database/repository/index.js";

async function rerenderPage(state: StatsState): Promise<void> {
  const refreshOnly = () => refreshUpList(state, () => rerenderPage(state));
  refreshOnly();
  await renderTagList();
  await renderCategories(state, () => rerenderPage(state));
  void renderFilterTags(state, refreshOnly);
}

function bindInputs(state: StatsState): void {
  const tagSearchInput = document.getElementById("tag-search") as HTMLInputElement | null;
  tagSearchInput?.addEventListener("input", () => void renderTagList());

  const upSearchInput = document.getElementById("up-search") as HTMLInputElement | null;
  upSearchInput?.addEventListener("input", () => refreshUpList(state, () => rerenderPage(state)));

  const showFollowedToggle = document.getElementById("show-followed-toggle") as HTMLInputElement | null;
  showFollowedToggle?.addEventListener("change", (e) => {
    state.showFollowedOnly = (e.target as HTMLInputElement).checked;
    refreshUpList(state, () => rerenderPage(state));
  });

  const addTagBtn = document.getElementById("btn-add-tag");
  addTagBtn?.addEventListener("click", async () => {
    const tagName = getInputValue("tag-search").trim();
    if (!tagName) {
      return;
    }
    // 注意：这里需要指定要添加标签的creatorId，当前实现中需要从UI获取
    // 暂时使用空字符串，实际使用时需要修改
    await addCustomTag("", tagName, async () => await renderTagList());
  });

  const categorySearchInput = document.getElementById("category-search") as HTMLInputElement | null;
  categorySearchInput?.addEventListener("input", () => void renderCategories(state, () => rerenderPage(state)));

  const addCategoryBtn = document.getElementById("btn-add-category");
  addCategoryBtn?.addEventListener("click", async () => {
    const value = getInputValue("category-search").trim();
    if (!value) {
      return;
    }
    await addCategory(state, value, async () => await renderCategories(state, () => rerenderPage(state)));
    if (categorySearchInput) {
      categorySearchInput.value = "";
    }
  });

  const clearFilterBtn = document.getElementById("btn-clear-filter");
  clearFilterBtn?.addEventListener("click", async () => {
    await clearFilters(state, () => refreshUpList(state, () => rerenderPage(state)));
  });
}

async function loadState(state: StatsState): Promise<void> {
  console.log('[loadState] 开始加载状态');

  // 从数据层获取统计数据
  console.log('[loadState] 获取统计数据');
  const stats = await creatorRepository.loadStats(state.platform);
  console.log('[loadState] 统计数据:', stats);

  // 更新UI显示
  setText("stat-up-count", String(stats.followedCount + stats.unfollowedCount));
  setText("stat-followed-count", String(stats.followedCount));
  setText("stat-unfollowed-count", String(stats.unfollowedCount));
}

export async function initStats(): Promise<void> {
  console.log('[initStats] 开始初始化统计页面');

  if (typeof document === "undefined") {
    console.log('[initStats] document 不存在，跳过初始化');
    return;
  }

  console.log('[initStats] 创建初始状态');
  const state = createInitialState("bilibili");

  console.log('[initStats] 绑定页面动作');
  bindPageActions();

  console.log('[initState] 开始加载状态');
  await loadState(state);

  console.log('[initStats] 状态加载完成');

  console.log('[initStats] 设置拖拽和输入');
  setupDragAndDrop(state, () => refreshUpList(state, () => rerenderPage(state)));
  bindInputs(state);
  updateToggleLabel(state.showFollowedOnly);

  console.log('[initStats] 开始渲染页面');
  await rerenderPage(state);

  console.log('[initStats] 初始化完成');
}

// 页面加载完成后自动初始化
if (typeof document !== 'undefined') {
  console.log('[stats.ts] 页面加载完成，准备初始化');

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[stats.ts] DOMContentLoaded 事件触发');
      void initStats();
    });
  } else {
    console.log('[stats.ts] DOM 已就绪，直接初始化');
    void initStats();
  }
}
