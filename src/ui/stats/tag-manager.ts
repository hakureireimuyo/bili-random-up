
import { createDragGhost, getDragContext, removeDragGhost, setDragContext } from "./drag.js";
import { colorFromTag, normalizeTag } from "./helpers.js";
import { getInputValue } from "./dom.js";
import { creatorRepository, tagRepository } from "../../database/repository/index.js";
import { buildSearchUrl } from '../../utls/url-builder.js';
import { TagSource } from '../../database/types/base.js';
import { Tag } from '../../database/types/semantic.js';

type RenderFn = () => void | Promise<void>;

function resolveDetach(): boolean {
  return Boolean(getDragContext() && !getDragContext()?.dropped);
}

export async function renderTagPill(
  tag: Tag,
  options?: {
    count?: number;
    onDetached?: () => void;
    isAuto?: boolean;
    creatorId?: string;
    onRemove?: (creatorId: string, tagName: string) => Promise<void>;
  }
): Promise<HTMLSpanElement> {
  const {
    count,
    onDetached,
    isAuto = false,
    creatorId,
    onRemove
  } = options ?? {};

  const tagName = tag.name
  const tagId = tag.tagId

  const pill = document.createElement("span");
  pill.className = isAuto ? "tag-pill tag-pill-auto" : "tag-pill";
  pill.textContent = count !== undefined ? `${tagName} (${count})` : tagName;
  pill.style.backgroundColor = colorFromTag(tagName);
  pill.draggable = true;
  pill.dataset.tagId = tagId;
  pill.dataset.tagName = tagName;

  if (isAuto) {
    pill.style.cursor = "grab";
    const icon = document.createElement("i");
    icon.className = "auto-tag-icon";
    icon.textContent = "✧";
    pill.appendChild(icon);
  }

  pill.addEventListener("click", () => {
    const keyword = encodeURIComponent(tagName);
    window.open(buildSearchUrl(keyword), "_blank", "noreferrer");
  });

  pill.addEventListener("dragstart", (e) => {
    if (e.dataTransfer) {
      // 传输标签 ID 和名称
      const dragData = JSON.stringify({ tagId, tagName });
      e.dataTransfer.setData("application/x-bili-tag", dragData);
      e.dataTransfer.effectAllowed = isAuto ? "copy" : "move";
    }
    createDragGhost(e, tagName);
    if (isAuto) {
      setDragContext({ tagId, tagName, dropped: false });
      pill.style.cursor = "grabbing";
    } else {
      setDragContext({ tagId, tagName, originUpMid: creatorId, dropped: false });
    }
  });

  pill.addEventListener("dragend", () => {
    removeDragGhost();
    if (isAuto) {
      setDragContext(null);
      pill.style.cursor = "grab";
    } else {
      if (creatorId !== undefined && onRemove) {
        if (getDragContext()?.originUpMid === creatorId && !getDragContext()?.dropped) {
          void onRemove(creatorId, tagName);
        }
      } else if (onDetached && resolveDetach()) {
        onDetached();
      }
      setDragContext(null);
    }
  });

  return pill;
}

export async function renderAutoTagPill(tag: Tag, count: number): Promise<HTMLSpanElement> {
  return renderTagPill(tag, { count, isAuto: true });
}

export async function addTagToUp(
  creatorId: string,
  tagId: string,
  onChanged?: RenderFn
): Promise<void> {
  // 添加标签到UP主
  await creatorRepository.addTag(creatorId,tagId,TagSource.USER);

  if (onChanged) {
    await onChanged();
  }
}

export async function removeTagFromUp(
  creatorId: string,
  tagid: string,
  onChanged?: RenderFn
): Promise<void> {
  await creatorRepository.removeTag(creatorId, tagid);

  if (onChanged) {
    await onChanged();
  }
}

export async function addCustomTag(
  creatorId: string,
  tagName: string, 
  onChanged?: RenderFn
): Promise<void> {
  const tagId = await tagRepository.createTag(tagName, TagSource.USER);
  await creatorRepository.addTag(creatorId, tagId, TagSource.USER);
  if (onChanged) {
    await onChanged();
  }
}

export async function renderTagList(): Promise<void> {
  const container = document.getElementById("tag-list");
  if (!container) {
    return;
  }

  container.innerHTML = "";

  // 获取搜索关键词并使用数据层的高效搜索方法
  const searchTerm = getInputValue("tag-search").trim();
  const allTagsResult = await tagRepository.query({ 
    source: TagSource.USER,
    keyword: searchTerm 
  });

  if (allTagsResult.data.length === 0) {
    const item = document.createElement("div");
    item.className = "list-item";
    item.textContent = searchTerm ? "未找到匹配的标签" : "暂无分类词条";
    container.appendChild(item);
    return;
  }

  // 渲染
  for (const tag of allTagsResult.data) {
    const item = document.createElement("div");
    item.className = "list-item";
    const label = document.createElement("span");
    label.appendChild(await renderTagPill(tag));
    item.appendChild(label);
    container.appendChild(item);
  }
}
