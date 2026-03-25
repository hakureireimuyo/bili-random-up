import type { StatsState, UPDisplayData } from "./types.js";
import type { Creator } from "../../database/types/creator.js";
import type { PaginatedResult } from "../../database/manager/types.js";
import type { TagExpression } from "../../database/query/creator/creator-query-engine.js";
import { getDragContext } from "./drag.js";
import { creatorToCacheData } from "./helpers.js";
import { getInputValue, updateToggleLabel } from "./dom.js";
import { addTagToUp, renderTagPill, removeTagFromUp } from "./tag-manager.js";
import { creatorRepository, tagRepository } from "../../database/repository/index.js";
import { buildUserSpaceUrl } from '../../utls/url-builder.js';

type RenderFn = () => void;

let paginationState = {
  currentPage: 0,
  pageSize: 50,
  totalPages: 0,
  totalItems: 0
};

/**
 * 从Creator对象提取用户标签ID列表
 */
function extractUserTags(creator: Creator): string[] {
  return creator.tagWeights
    .filter(tw => tw.source === 'user')
    .map(tw => tw.tagId);
}

/**
 * 将Creator对象转换为UPDisplayData
 */
function creatorToUPDisplayData(creator: Creator): UPDisplayData {
  return {
    ...creatorToCacheData(creator),
    tags: extractUserTags(creator)
  };
}

/**
 * 从查询层获取过滤后的UP列表（带分页）
 */
async function fetchFilteredUpList(state: StatsState, page: number = 0): Promise<PaginatedResult<UPDisplayData>> {
  console.log('[fetchFilteredUpList] 查询参数:', {
    platform: state.platform,
    isFollowing: state.showFollowedOnly,
    keyword: getInputValue("up-search"),
    page,
    pageSize: paginationState.pageSize,
    filters: state.filters
  });

  // 将UI层的筛选条件转换为标签表达式
  const tagExpressions: TagExpression[] = [];
  
  // 处理包含的标签（AND条件）- 必须包含所有指定标签
  if (state.filters.includeTags.length > 0) {
    tagExpressions.push({
      operator: 'and',
      tagIds: state.filters.includeTags
    });
  }
  
  // 处理包含的分类标签列表（OR条件）- 至少包含其中一个标签
  for (const categoryTag of state.filters.includeCategoryTags) {
    if (categoryTag.tagIds.length > 0) {
      tagExpressions.push({
        operator: 'or',
        tagIds: categoryTag.tagIds
      });
    }
  }
  
  // 处理排除的标签（NOT条件）- 不包含任何指定标签
  if (state.filters.excludeTags.length > 0) {
    tagExpressions.push({
      operator: 'not',
      tagIds: state.filters.excludeTags
    });
  }
  
  // 处理排除的分类标签列表（NOT条件）
  // 对于排除的分类，需要确保不包含列表中的任何一个标签
  for (const categoryTag of state.filters.excludeCategoryTags) {
    if (categoryTag.tagIds.length > 0) {
      tagExpressions.push({
        operator: 'not',
        tagIds: categoryTag.tagIds
      });
    }
  }

  // 使用Repository接口获取数据
  const result = await creatorRepository.query({
    keyword: getInputValue("up-search"),
    isFollowing: state.showFollowedOnly,
    page,
    pageSize: paginationState.pageSize,
    tagExpressions: tagExpressions.length > 0 ? tagExpressions : undefined
  });

  // 将Creator对象转换为UPDisplayData
  const data = result.data.map(creatorToUPDisplayData);
  const totalPages = Math.ceil(result.total / result.pageSize);

  console.log('[fetchFilteredUpList] 总数:', result.total, '总页数:', totalPages);
  console.log('[fetchFilteredUpList] 当前页获取到的UP数量:', data.length);
  if (data.length > 0) {
    console.log('[fetchFilteredUpList] 第一个UP:', data[0]);
  }

  return {
    ...result,
    data,
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    hasNext: result.hasNext,
    hasPrev: result.hasPrev
  };
}

function setupUpTagDropZone(tagsEl: HTMLElement, creatorId: string, state: StatsState, rerender: RenderFn): void {
  tagsEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    tagsEl.classList.add("drag-over");
  });
  tagsEl.addEventListener("dragleave", () => {
    tagsEl.classList.remove("drag-over");
  });
  tagsEl.addEventListener("drop", (e) => {
    e.preventDefault();
    tagsEl.classList.remove("drag-over");
    const tagData = e.dataTransfer?.getData("application/x-bili-tag") ?? e.dataTransfer?.getData("text/plain");
    if (!tagData) {
      return;
    }

    // 解析标签数据（可能是JSON字符串或纯文本）
    let tagName = tagData;
    try {
      const parsed = JSON.parse(tagData);
      if (parsed.tagName) {
        tagName = parsed.tagName;
      }
    } catch {
      // 如果解析失败，直接使用原始数据作为标签名
    }

    const currentDrag = getDragContext();
    if (currentDrag) {
      currentDrag.dropped = true;
    }

    // 使用局部刷新函数替代整个列表的重新渲染
    void addTagToUp(creatorId, tagName, async () => {
      await refreshUpTags(tagsEl, creatorId, state, rerender);
    });
  });
}

async function renderUpTagPill(tagId: string, creatorId: string, state: StatsState, rerender: RenderFn): Promise<HTMLSpanElement> {
  const tag = creatorRepository.getCreator(creatorId)?.tagWeights.find(tw => tw.tagId === tagId);
  if (!tag) {
    const pill = document.createElement("span");
    pill.className = "tag-pill";
    pill.textContent = tagId;
    return pill;
  }
  
  const tagData = tagRepository.getTag(tagId);
  if (!tagData) {
    const pill = document.createElement("span");
    pill.className = "tag-pill";
    pill.textContent = tagId;
    return pill;
  }
  
  return renderTagPill(tagData, {
    creatorId,
    onRemove: async (cid, tagName) => {
      const tagsEl = document.querySelector(`[data-creator-id="${cid}"] .up-tags`) as HTMLElement;
      if (tagsEl) {
        await removeTagFromUp(cid, tagId, async () => {
          await refreshUpTags(tagsEl, cid, state, rerender);
        });
      }
    }
  });
}

/**
 * 局部刷新UP主的标签区域
 */
async function refreshUpTags(tagsEl: HTMLElement, creatorId: string, state: StatsState, rerender: RenderFn): Promise<void> {
  const creator = creatorRepository.getCreator(creatorId);
  const tagIds = creator?.tagWeights.map(tw => tw.tagId) || [];

  // 清空容器内容，而不是直接设置textContent，以保留事件监听器
  tagsEl.innerHTML = "";

  if (tagIds.length === 0) {
    const emptyText = document.createElement("span");
    emptyText.textContent = "暂无分类";
    tagsEl.appendChild(emptyText);
  } else {
    for (const tagId of tagIds) {
      const pill = await renderUpTagPill(tagId, creatorId, state, rerender);
      tagsEl.appendChild(pill);
    }
  }
}

export function refreshUpList(state: StatsState, rerender: RenderFn): void {
  void renderUpList(state, rerender);
  updateToggleLabel(state.showFollowedOnly);
}

export async function renderUpList(state: StatsState, rerender: RenderFn): Promise<void> {
  const container = document.getElementById("up-list");
  if (!container) {
    return;
  }

  // 从Repository获取过滤后的UP列表
  const result = await fetchFilteredUpList(state, paginationState.currentPage);

  console.log('[renderUpList] 获取到的列表长度:', result.data.length);

  // 更新分页状态
  paginationState.totalItems = result.total;
  paginationState.totalPages = Math.ceil(result.total / result.pageSize);

  if (result.data.length === 0) {
    console.log('[renderUpList] 列表为空，显示"暂无关注UP"');
    container.innerHTML = "";
    const item = document.createElement("div");
    item.className = "list-item";
    item.textContent = "暂无关注UP";
    container.appendChild(item);
    return;
  }

  // 清空容器
  container.innerHTML = "";

  // 渲染UP列表
  const fragment = document.createDocumentFragment();
  for (const up of result.data) {
    const item = document.createElement("div");
    item.className = "up-item";
    item.dataset.creatorId = up.creatorId;

    const avatarLink = document.createElement("a");
    avatarLink.href = buildUserSpaceUrl(up.creatorId);
    avatarLink.target = "_blank";
    avatarLink.rel = "noreferrer";

    const avatar = document.createElement("img");
    avatar.className = "up-avatar";
    avatar.alt = up.name;

    // 使用getAvatarBinary方法获取头像，该方法会自动处理本地缓存和远程下载
    void (async () => {
      try {
        const avatarBlob = await creatorRepository.getAvatarBinary(up.creatorId, state.platform);
        if (avatarBlob) {
          avatar.src = URL.createObjectURL(avatarBlob);
        }
      } catch (error) {
        console.error(`[up-list] Failed to load avatar for UP: ${up.name}`, error);
      }
    })();

    avatarLink.appendChild(avatar);

    // 头像加载失败处理
    avatar.onerror = async () => {
      console.warn(`[up-list] Failed to load avatar for UP: ${up.name}`);
    };

    const info = document.createElement("div");
    info.className = "up-info";

    const name = document.createElement("a");
    name.className = "up-name";
    name.href = buildUserSpaceUrl(up.creatorId);
    name.target = "_blank";
    name.rel = "noreferrer";
    name.textContent = up.name;

    info.appendChild(name);

    // 按需获取UP的标签数据
    const tagsContainer = document.createElement("div");
    tagsContainer.className = "up-tags";
    setupUpTagDropZone(tagsContainer, up.creatorId, state, rerender);

    // 异步加载标签数据
    void (async () => {
      const creator = creatorRepository.getCreator(up.creatorId);
      const tagIds = creator?.tagWeights.map(tw => tw.tagId) || [];
      // 清空容器内容，而不是直接设置textContent，以保留事件监听器
      tagsContainer.innerHTML = "";
      if (tagIds.length === 0) {
        const emptyText = document.createElement("span");
        emptyText.textContent = "暂无分类";
        tagsContainer.appendChild(emptyText);
      } else {
        for (const tagId of tagIds) {
          const pill = await renderUpTagPill(tagId, up.creatorId, state, rerender);
          tagsContainer.appendChild(pill);
        }
      }
    })();

    info.appendChild(tagsContainer);
    item.appendChild(avatarLink);
    item.appendChild(info);
    fragment.appendChild(item);
  }

  container.appendChild(fragment);

  // 渲染分页控件
  renderPagination(container, result.total, result.page, paginationState.totalPages, rerender);

  // 预加载下一页的头像
  if (result.hasNext) {
    void (async () => {
      try {
        const nextPageResult = await fetchFilteredUpList(state, paginationState.currentPage + 1);
        const creatorIds = nextPageResult.data
          .map(up => up.creatorId)
          .filter((id): id is string => !!id);

        if (creatorIds.length > 0) {
          await creatorRepository.getAvatarBinaries(creatorIds, state.platform);
        }
      } catch (error) {
        console.error('[up-list] Failed to preload next page avatars:', error);
      }
    })();
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
  // 移除旧的分页控件
  const oldPagination = container.querySelector('.pagination');
  if (oldPagination) {
    oldPagination.remove();
  }

  if (totalPages <= 1) {
    return;
  }

  const pagination = document.createElement('div');
  pagination.className = 'pagination';

  // 上一页按钮
  const prevBtn = document.createElement('button');
  prevBtn.className = 'pagination-btn';
  prevBtn.textContent = '上一页';
  prevBtn.disabled = currentPage === 0;
  prevBtn.onclick = () => {
    if (currentPage > 0) {
      paginationState.currentPage = currentPage - 1;
      rerender();
    }
  };
  pagination.appendChild(prevBtn);

  // 页码信息
  const pageInfo = document.createElement('span');
  pageInfo.className = 'pagination-info';
  pageInfo.textContent = `${currentPage + 1} / ${totalPages}`;
  pagination.appendChild(pageInfo);

  // 下一页按钮
  const nextBtn = document.createElement('button');
  nextBtn.className = 'pagination-btn';
  nextBtn.textContent = '下一页';
  nextBtn.disabled = currentPage >= totalPages - 1;
  nextBtn.onclick = () => {
    if (currentPage < totalPages - 1) {
      paginationState.currentPage = currentPage + 1;
      rerender();
    }
  };
  pagination.appendChild(nextBtn);

  container.appendChild(pagination);
}
