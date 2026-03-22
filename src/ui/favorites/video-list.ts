import type { FavoritesState, AggregatedVideo } from "./types.js";
import { formatDuration, colorFromTag } from "./helpers.js";
import { DBUtils, STORE_NAMES } from "../../database/indexeddb/index.js";
import type { Tag } from "../../database/types/semantic.js";
import { VideoRepository } from "../../database/implementations/video-repository.impl.js";
import { Platform } from "../../database/types/base.js";

type RefreshFn = () => void;
const videoRepository = new VideoRepository();
const BILIBILI = Platform.BILIBILI;

// 标签缓存
const tagCache = new Map<string, string>();
const pictureCache = new Map<string, string>();
const pictureLoadTasks = new Map<string, Promise<string | null>>();

/**
 * 获取标签名称
 */
async function getTagName(tagId: string): Promise<string> {
  // 先从缓存中查找
  if (tagCache.has(tagId)) {
    return tagCache.get(tagId)!;
  }

  // 从数据库中获取
  try {
    const tag = await DBUtils.get<Tag>(STORE_NAMES.TAGS, tagId);
    const tagName = tag?.name || tagId;
    tagCache.set(tagId, tagName);
    return tagName;
  } catch (error) {
    console.error('[VideoList] Error getting tag name:', error);
    return tagId;
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to convert blob to data URL"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

async function savePictureToDatabase(videoId: string, picture: string): Promise<void> {
  await videoRepository.updateVideoPicture(videoId, BILIBILI, picture);
}

async function fetchAndCachePicture(video: AggregatedVideo): Promise<string | null> {
  if (video.picture) {
    pictureCache.set(video.videoId, video.picture);
    return video.picture;
  }

  if (!video.coverUrl) {
    return null;
  }
  const coverUrl = video.coverUrl;

  const cachedPicture = pictureCache.get(video.videoId);
  if (cachedPicture) {
    video.picture = cachedPicture;
    return cachedPicture;
  }

  const existingTask = pictureLoadTasks.get(video.videoId);
  if (existingTask) {
    return existingTask;
  }

  const task = (async () => {
    try {
      const response = await fetch(coverUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch cover: ${response.status}`);
      }

      const picture = await blobToDataUrl(await response.blob());
      pictureCache.set(video.videoId, picture);
      video.picture = picture;
      await savePictureToDatabase(video.videoId, picture);
      return picture;
    } catch (error) {
      console.warn("[VideoList] Error caching cover image:", video.videoId, error);
      return null;
    } finally {
      pictureLoadTasks.delete(video.videoId);
    }
  })();

  pictureLoadTasks.set(video.videoId, task);
  return task;
}

function bindCoverImage(img: HTMLImageElement, video: AggregatedVideo): void {
  const cachedPicture = video.picture || pictureCache.get(video.videoId);
  if (cachedPicture) {
    video.picture = cachedPicture;
    img.src = cachedPicture;
    return;
  }

  if (!video.coverUrl) {
    img.src = "";
    return;
  }

  img.loading = "lazy";
  img.decoding = "async";
  img.src = video.coverUrl;

  void fetchAndCachePicture(video).then((picture) => {
    if (!picture) {
      return;
    }

    if (img.src !== picture) {
      img.src = picture;
    }
  });
}

export async function createVideoCard(video: AggregatedVideo): Promise<HTMLElement> {
  const card = document.createElement('div');
  card.className = 'video-card';

  // 封面链接
  const coverLink = document.createElement('a');
  coverLink.href = `https://www.bilibili.com/video/${video.videoId}`;
  coverLink.target = '_blank';
  coverLink.rel = 'noreferrer';

  const cover = document.createElement('div');
  cover.className = 'video-cover';
  const img = document.createElement('img');
  img.alt = video.title;
  bindCoverImage(img, video);
  cover.appendChild(img);
  coverLink.appendChild(cover);
  card.appendChild(coverLink);

  // 信息
  const info = document.createElement('div');
  info.className = 'video-info';

  // 标题链接
  const titleLink = document.createElement('a');
  titleLink.href = `https://www.bilibili.com/video/${video.videoId}`;
  titleLink.target = '_blank';
  titleLink.rel = 'noreferrer';
  titleLink.className = 'video-title';
  titleLink.textContent = video.title;
  info.appendChild(titleLink);

  // 描述
  const desc = document.createElement('div');
  desc.className = 'video-description';
  desc.textContent = video.description.substring(0, 100) + (video.description.length > 100 ? '...' : '');
  info.appendChild(desc);

  // 元数据
  const meta = document.createElement('div');
  meta.className = 'video-meta';

  // UP主链接
  const upLink = document.createElement('a');
  upLink.href = `https://space.bilibili.com/${video.creatorId}`;
  upLink.target = '_blank';
  upLink.rel = 'noreferrer';
  upLink.textContent = video.creatorName || video.creatorId;
  meta.appendChild(document.createTextNode('创作者: '));
  meta.appendChild(upLink);
  meta.appendChild(document.createTextNode(` | 时长: ${formatDuration(video.duration)}`));
  info.appendChild(meta);

  // 标签
  if (video.tags && video.tags.length > 0) {
    const tags = document.createElement('div');
    tags.className = 'video-tags';

    // 获取标签名称
    const tagPromises = video.tags.map(async (tagId) => {
      const tagName = await getTagName(tagId);
      const tagLink = document.createElement('a');
      tagLink.href = `https://search.bilibili.com/all?keyword=${encodeURIComponent(tagName)}`;
      tagLink.target = '_blank';
      tagLink.rel = 'noreferrer';
      tagLink.className = 'video-tag tag-pill';
      tagLink.textContent = tagName;
      tagLink.style.backgroundColor = colorFromTag(tagName);
      tagLink.draggable = true;

      // 拖拽事件
      tagLink.addEventListener("dragstart", (e) => {
        if (e.dataTransfer) {
          e.dataTransfer.setData("application/x-bili-tag", tagId);
          e.dataTransfer.effectAllowed = "copy";
        }
      });

      return tagLink;
    });

    const tagElements = await Promise.all(tagPromises);
    tagElements.forEach(tag => tags.appendChild(tag));
    info.appendChild(tags);
  }

  card.appendChild(info);

  return card;
}

export async function renderVideos(state: FavoritesState, elements: Record<string, HTMLElement | null>): Promise<void> {
  console.log('[VideoList] Rendering videos...');
  console.log('[VideoList] Total videos:', state.filteredVideos.length);
  console.log('[VideoList] Current page:', state.currentPage);
  console.log('[VideoList] Page size:', state.pageSize);

  if (elements.videoList) {
    elements.videoList.innerHTML = '';
  }

  // 计算当前页的视频
  const start = state.currentPage * state.pageSize;
  const end = start + state.pageSize;
  const pageVideos = state.filteredVideos.slice(start, end);

  console.log('[VideoList] Page videos:', pageVideos);

  if (pageVideos.length === 0) {
    console.log('[VideoList] No videos to display');
    if (elements.empty) elements.empty.style.display = 'block';
    if (elements.pagination) elements.pagination.style.display = 'none';
    return;
  }

  if (elements.empty) elements.empty.style.display = 'none';

  // 渲染视频卡片
  const cardPromises = pageVideos.map(async (video) => {
    const card = await createVideoCard(video);
    elements.videoList?.appendChild(card);
    return card;
  });

  await Promise.all(cardPromises);

  console.log('[VideoList] Rendered', pageVideos.length, 'videos');
}

export async function changePage(state: FavoritesState, delta: number, refresh: RefreshFn): Promise<void> {
  const total = state.filteredVideos.length;
  const totalPages = Math.ceil(total / state.pageSize);
  const newPage = state.currentPage + delta;

  if (newPage < 0 || newPage >= totalPages) return;

  state.currentPage = newPage;
  await refresh();
}
