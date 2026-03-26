
import { Platform } from "../../database/types/base.js";
import { renderCategories, createCategory } from "./category-manager.js";
import { renderFilterTags, setupDragAndDrop, clearFilters, initFilterManagerServices } from "./filter-manager.js";
import { createInitialState, setLoading, setError, createInitialPagination } from "./helpers.js";
import { updateToggleLabel } from "../../utls/dom-utils.js";
import { renderTagList, createTag } from "./tag-manager.js";
import type { StatsState, PaginationState } from "./types.js";
import { refreshUpList, initUpListServices } from "./up-list.js";
import { getServiceContainer } from "./services.js";

// 全局状态
let state: StatsState;
let pagination: PaginationState;

/**
 * 初始化统计页面
 */
export async function initStats(): Promise<void> {
  if (typeof document === "undefined") {
    return;
  }

  try {
    // 创建初始状态
    state = createInitialState(Platform.BILIBILI);
    pagination = createInitialPagination();

    // 初始化服务容器
    const services = getServiceContainer();
    initFilterManagerServices(services);
    initUpListServices(services);

    // 绑定事件
    bindPageActions();
    bindInputs();

    // 设置拖拽功能
    setupDragAndDrop(state, () => rerenderPage());

    // 加载数据
    await loadData();
  } catch (error) {
    console.error('[initStats] 初始化失败:', error);
    setError(state, error instanceof Error ? error.message : '未知错误');
  }
}

/**
 * 加载数据
 */
async function loadData(): Promise<void> {
  setLoading(state, true);

  try {
    // 并行加载所有数据
    await Promise.all([
      renderTagList(),
      renderCategories(state, () => rerenderPage()),
      refreshUpList(state, () => rerenderPage())
    ]);
  } catch (error) {
    console.error('[loadData] 加载数据失败:', error);
    setError(state, error instanceof Error ? error.message : '加载失败');
  } finally {
    setLoading(state, false);
  }
}

/**
 * 重新渲染页面
 */
async function rerenderPage(): Promise<void> {
  const refreshOnly = () => refreshUpList(state, () => rerenderPage());
  refreshOnly();
  await renderTagList();
  await renderCategories(state, () => rerenderPage());
  void renderFilterTags(state, refreshOnly);
}

/**
 * 绑定页面操作
 */
function bindPageActions(): void {
  // 绑定添加标签按钮
  const addTagBtn = document.getElementById('btn-add-tag');
  addTagBtn?.addEventListener('click', async () => {
    const tagName = prompt('请输入标签名称:');
    if (tagName) {
      try {
        await createTag(tagName);
        await renderTagList();
      } catch (error) {
        console.error('[bindPageActions] 添加标签失败:', error);
        setError(state, error instanceof Error ? error.message : '添加标签失败');
      }
    }
  });

  // 绑定添加分类按钮
  const addCategoryBtn = document.getElementById('btn-add-category');
  addCategoryBtn?.addEventListener('click', async () => {
    const categoryName = prompt('请输入分类名称:');
    if (categoryName) {
      try {
        await createCategory(categoryName);
        await renderCategories(state, () => rerenderPage());
      } catch (error) {
        console.error('[bindPageActions] 添加分类失败:', error);
        setError(state, error instanceof Error ? error.message : '添加分类失败');
      }
    }
  });

  // 绑定清除筛选按钮
  const clearFilterBtn = document.getElementById('btn-clear-filter');
  clearFilterBtn?.addEventListener('click', () => {
    clearFilters(state, () => rerenderPage());
  });
}

/**
 * 绑定输入事件
 */
function bindInputs(): void {
  // 绑定搜索框
  const searchInput = document.getElementById('up-search');
  searchInput?.addEventListener('input', debounce((e) => {
    const keyword = (e.target as HTMLInputElement).value.trim();
    state.searchKeyword = keyword;
    refreshUpList(state, () => rerenderPage());
  }, 300));

  // 绑定关注筛选开关
  const followToggle = document.getElementById('show-followed-toggle');
  followToggle?.addEventListener('change', (e) => {
    state.showFollowedOnly = (e.target as HTMLInputElement).checked;
    refreshUpList(state, () => rerenderPage());
  });
}

/**
 * 防抖函数
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// 页面加载完成后自动初始化
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void initStats());
  } else {
    void initStats();
  }
}

