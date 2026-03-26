import { 
  QueryService,
  CacheManager,
  BaseBookManager,
  Book,
  type BookQueryResult,
  type IIndexConverter,
  type IQueryService,
  type IDataRepository,
  type BookType
} from "../../database/index.js";
import type { Creator, ID, Platform } from "../../database/types/index.js";
import type { StatsState, PaginationState } from "./types.js";
import type { ServiceContainer } from "./services.js";
import type { 
  QueryCondition,
  TagExpression
} from "../../database/query-server/index.js";
import type { CreatorIndex } from "../../database/query-server/cache/types.js";
import { updateToggleLabel } from "../../utls/dom-utils.js";
import { createDragGhost, setDragContext, type DragContext } from "../../utls/drag-utils.js";
import { colorFromTag } from "../../utls/tag-utils.js";

type RenderFn = () => void;

let paginationState: PaginationState = {
  currentPage: 0,
  pageSize: 50,
  totalPages: 0,
  totalItems: 0
};

let services: ServiceContainer | null = null;
let queryService: QueryService | null = null;
let bookManager: BaseBookManager<Creator, CreatorIndex> | null = null;
let currentBook: BookType<Creator> | null = null;

/**
 * 创作者索引转换器
 * 将 Creator 转换为 CreatorIndex
 */
class CreatorIndexConverter implements IIndexConverter<Creator, CreatorIndex> {
  toIndex(data: Creator): CreatorIndex {
    return {
      creatorId: data.creatorId,
      name: data.name,
      tags: data.tagWeights.map(tw => tw.tagId),
      isFollowing: data.isFollowing === 1
    };
  }

  getId(data: Creator): number {
    return data.creatorId;
  }
}

/**
 * 创作者查询服务适配器
 * 将 QueryService 适配为 IQueryService 接口
 */
class CreatorQueryServiceAdapter implements IQueryService<CreatorIndex> {
  private queryService: QueryService;

  constructor(queryService: QueryService) {
    this.queryService = queryService;
  }

  async queryIds(condition: QueryCondition): Promise<number[]> {
    return await this.queryService.queryResultIds(condition);
  }
}

/**
 * 初始化服务
 */
export function initUpListServices(container: ServiceContainer): void {
  services = container;
  queryService = new QueryService(services.creatorRepo);

  // 初始化 BookManager
  const cacheManager = CacheManager.getInstance();
  const dataCache = cacheManager.getCreatorDataCache();
  const indexCache = cacheManager.getIndexCache();
  const indexConverter = new CreatorIndexConverter();
  const queryServiceAdapter = new CreatorQueryServiceAdapter(queryService);

  bookManager = new BaseBookManager<Creator, CreatorIndex>(
    dataCache,
    indexCache,
    services.creatorRepo as unknown as IDataRepository<Creator>,
    indexConverter,
    queryServiceAdapter
  );
}

/**
 * 获取服务容器
 */
function getServices(): ServiceContainer {
  if (!services) {
    throw new Error('UpList services not initialized. Call initUpListServices first.');
  }
  return services;
}

/**
 * 获取查询服务
 */
function getQueryService(): QueryService {
  if (!queryService) {
    throw new Error('QueryService not initialized. Call initUpListServices first.');
  }
  return queryService;
}

/**
 * 获取 BookManager
 */
function getBookManager(): BaseBookManager<Creator, CreatorIndex> {
  if (!bookManager) {
    throw new Error('BookManager not initialized. Call initUpListServices first.');
  }
  return bookManager;
}

/**
 * 获取筛选后的创作者列表
 */
export async function getFilteredCreators(
  state: StatsState,
  pagination: PaginationState
): Promise<{ creators: Creator[]; total: number }> {
  // 构建查询条件
  const queryCondition = buildQueryCondition(state);

  // 获取或创建 Book
  if (!currentBook) {
    currentBook = await getBookManager().createBook(queryCondition, {
      pageSize: pagination.pageSize
    });
  } else {
    // 更新现有 Book 的索引
    await currentBook.updateIndex(queryCondition);
  }

  // 更新分页状态
  paginationState.totalItems = currentBook.state.totalRecords;
  paginationState.totalPages = currentBook.state.totalPages;

  // 如果没有结果，返回空列表
  if (currentBook.state.totalRecords === 0) {
    return {
      creators: [],
      total: 0
    };
  }

  // 确保当前页码有效
  if (pagination.currentPage >= paginationState.totalPages) {
    paginationState.currentPage = Math.max(0, paginationState.totalPages - 1);
  }

  // 获取分页数据
  const result = await currentBook.getPage(paginationState.currentPage, {
    pageSize: pagination.pageSize,
    preloadNext: true,
    preloadCount: 1
  });

  return {
    creators: result.items,
    total: result.state.totalRecords
  };
}

/**
 * 构建查询条件
 */
function buildQueryCondition(state: StatsState): QueryCondition {
  const condition: QueryCondition = {
    platform: state.platform,
    isFollowing: state.showFollowedOnly ? 1 : 0
  };

  // 添加搜索关键词（如果有）
  if (state.searchKeyword && state.searchKeyword.trim()) {
    (condition as any).keyword = state.searchKeyword.trim();
  }

  // 构建标签表达式
  const tagExpressions: TagExpression[] = [];

  // 处理包含标签（AND 操作）
  if (state.filters.includeTags.length > 0) {
    tagExpressions.push({
      tagId: state.filters.includeTags.length === 1 
        ? state.filters.includeTags[0] 
        : state.filters.includeTags,
      operator: 'AND'
    });
  }

  // 处理排除标签（NOT 操作）
  if (state.filters.excludeTags.length > 0) {
    tagExpressions.push({
      tagId: state.filters.excludeTags.length === 1 
        ? state.filters.excludeTags[0] 
        : state.filters.excludeTags,
      operator: 'NOT'
    });
  }

  // 处理分类标签
  state.filters.includeCategoryTags.forEach(category => {
    if (category.tagIds.length > 0) {
      tagExpressions.push({
        tagId: category.tagIds.length === 1 
          ? category.tagIds[0] 
          : category.tagIds,
        operator: 'AND'
      });
    }
  });

  state.filters.excludeCategoryTags.forEach(category => {
    if (category.tagIds.length > 0) {
      tagExpressions.push({
        tagId: category.tagIds.length === 1 
          ? category.tagIds[0] 
          : category.tagIds,
        operator: 'NOT'
      });
    }
  });

  // 如果有标签表达式，添加到条件中
  if (tagExpressions.length > 0) {
    (condition as any).tagExpressions = tagExpressions;
  }

  return condition;
}

/**
 * 刷新UP列表
 */
export function refreshUpList(state: StatsState, rerender: RenderFn): void {
  void renderUpList(state, rerender);
  updateToggleLabel(state.showFollowedOnly);
}

/**
 * 渲染UP列表
 */
export async function renderUpList(state: StatsState, rerender: RenderFn): Promise<void> {
  const container = document.getElementById("up-list");
  if (!container) return;

  // 显示加载状态
  container.innerHTML = '<div class="loading">加载中...</div>';

  try {
    const { creators, total } = await getFilteredCreators(state, paginationState);
    
    // 更新分页状态
    paginationState.totalItems = total;
    paginationState.totalPages = Math.ceil(total / paginationState.pageSize);

    // 清空容器
    container.innerHTML = "";

    // 渲染UP列表
    for (const creator of creators) {
      const creatorElement = document.createElement("div");
      creatorElement.className = "up-item";

      // 创建头像元素（暂时不加载头像）
      const avatarContainer = document.createElement("div");
      avatarContainer.className = "up-avatar-container";
      // 暂时不创建头像元素，避免加载错误
      creatorElement.appendChild(avatarContainer);

      // 创建UP主信息元素
      const creatorInfo = document.createElement("div");
      creatorInfo.className = "up-info";

      // 名称和关注状态
      const nameRow = document.createElement("div");
      nameRow.className = "up-name-row";
      
      const creatorName = document.createElement("div");
      creatorName.className = "up-name";
      creatorName.textContent = creator.name;
      nameRow.appendChild(creatorName);

      // 关注状态标签
      const followBadge = document.createElement("span");
      followBadge.className = creator.isFollowing ? "up-follow-badge followed" : "up-follow-badge unfollowed";
      followBadge.textContent = creator.isFollowing ? "已关注" : "未关注";
      nameRow.appendChild(followBadge);

      creatorInfo.appendChild(nameRow);

      // 简介显示
      if (creator.description) {
        const creatorDesc = document.createElement("div");
        creatorDesc.className = "up-description";
        creatorDesc.textContent = creator.description.length > 100 
          ? creator.description.substring(0, 100) + "..." 
          : creator.description;
        creatorInfo.appendChild(creatorDesc);
      }

      // 标签显示
      if (creator.tagWeights && creator.tagWeights.length > 0) {
        const tagsContainer = document.createElement("div");
        tagsContainer.className = "up-tags";
        
        // 按权重排序，取前5个标签
        const sortedTags = [...creator.tagWeights]
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        // 获取标签名称
        const tagIds = sortedTags.map(t => t.tagId);
        const tagsMap = await getServices().tagRepo.getTags(tagIds);
        
        for (const tagWeight of sortedTags) {
          const tag = tagsMap.get(tagWeight.tagId);
          const tagName = tag?.name || String(tagWeight.tagId);
          
          const tagElement = document.createElement("span");
          tagElement.className = tagWeight.source === 'user' 
            ? "tag-pill tag-pill-user" 
            : "tag-pill tag-pill-auto";
          tagElement.textContent = `${tagName}${tagWeight.count > 0 ? ` (${tagWeight.count})` : ''}`;
          
          // 设置标签颜色
          tagElement.style.backgroundColor = colorFromTag(tagName);
          
          // 添加拖拽属性
          tagElement.draggable = true;
          
          // 拖拽开始事件
          tagElement.addEventListener('dragstart', (e) => {
            const context: DragContext = {
              tagId: tagWeight.tagId,
              tagName: tagName,
              originUpMid: creator.creatorId,
              dropped: false
            };
            setDragContext(context);
            createDragGhost(e, tagName);
            
            if (e.dataTransfer) {
              e.dataTransfer.effectAllowed = 'copy';
            }
            
            tagElement.classList.add('dragging');
          });
          
          // 拖拽结束事件
          tagElement.addEventListener('dragend', () => {
            tagElement.classList.remove('dragging');
            setDragContext(null);
          });
          
          tagsContainer.appendChild(tagElement);
        }
        
        creatorInfo.appendChild(tagsContainer);
      }

      creatorElement.appendChild(creatorInfo);
      container.appendChild(creatorElement);
    }

    // 渲染分页控件
    renderPagination(container, total, paginationState.currentPage, paginationState.totalPages, rerender);
  } catch (error) {
    console.error('[up-list] 渲染UP列表失败:', error);
    container.innerHTML = '<div class="error">加载失败</div>';
  }
}

/**
 * 渲染分页控件
 */
function renderPagination(
  container: HTMLElement,
  total: number,
  currentPage: number,
  totalPages: number,
  rerender: RenderFn
): void {
  const paginationContainer = document.createElement("div");
  paginationContainer.className = "pagination";

  // 上一页按钮
  const prevBtn = document.createElement("button");
  prevBtn.className = "pagination-btn";
  prevBtn.textContent = "上一页";
  prevBtn.disabled = currentPage === 0;
  prevBtn.addEventListener("click", () => {
    if (currentPage > 0) {
      paginationState.currentPage = currentPage - 1;
      rerender();
    }
  });
  paginationContainer.appendChild(prevBtn);

  // 页码信息
  const pageInfo = document.createElement("span");
  pageInfo.className = "pagination-info";
  pageInfo.textContent = `${currentPage + 1} / ${totalPages || 1}`;
  paginationContainer.appendChild(pageInfo);

  // 下一页按钮
  const nextBtn = document.createElement("button");
  nextBtn.className = "pagination-btn";
  nextBtn.textContent = "下一页";
  nextBtn.disabled = currentPage >= totalPages - 1;
  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages - 1) {
      paginationState.currentPage = currentPage + 1;
      rerender();
    }
  });
  paginationContainer.appendChild(nextBtn);

  container.appendChild(paginationContainer);
}
