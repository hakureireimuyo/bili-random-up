import { formatSeconds } from "./utils";
import type { WatchStats } from "../../background/modules/common-types";
import type { UP } from "../../storage/storage";

/**
 * 初始化视频搜索功能
 */
export function initVideoSearch(stats: WatchStats): void {
  const searchInput = document.getElementById("video-search") as HTMLInputElement;
  const resultsContainer = document.getElementById("video-search-results");

  if (!searchInput || !resultsContainer) return;

  // 初始显示所有视频（按观看时长排序）
  renderVideoResults(stats, resultsContainer, "");

  // 添加搜索事件
  searchInput.addEventListener("input", (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase();
    renderVideoResults(stats, resultsContainer, query);
  });
}

/**
 * 渲染视频搜索结果
 */
function renderVideoResults(
  stats: WatchStats,
  container: HTMLElement,
  query: string
): void {
  container.innerHTML = "";

  const videoRows = Object.entries(stats.videoSeconds)
    .filter(([bvid]) => {
      const title = stats.videoTitles[bvid] ?? bvid;
      return title.toLowerCase().includes(query);
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  if (videoRows.length === 0) {
    const item = document.createElement("div");
    item.className = "list-item";
    item.textContent = "暂无数据";
    container.appendChild(item);
    return;
  }

  for (const [bvid, seconds] of videoRows) {
    const item = document.createElement("div");
    item.className = "list-item clickable";
    item.style.cursor = "pointer";

    const title = document.createElement("span");
    title.textContent = stats.videoTitles[bvid] ?? bvid;
    title.style.flex = "1";

    const duration = document.createElement("span");
    duration.textContent = formatSeconds(seconds);
    duration.style.fontWeight = "600";

    item.appendChild(title);
    item.appendChild(duration);

    // 点击跳转
    item.addEventListener("click", () => {
      window.open(`https://www.bilibili.com/video/${bvid}`, "_blank");
    });

    container.appendChild(item);
  }
}

/**
 * 初始化标签搜索功能
 */
export function initTagSearch(stats: WatchStats): void {
  const searchInput = document.getElementById("tag-search") as HTMLInputElement;
  const resultsContainer = document.getElementById("tag-search-results");

  if (!searchInput || !resultsContainer) return;

  // 计算所有标签的统计信息
  const tagStats = calculateTagStats(stats);

  // 初始显示所有标签（按观看时长排序）
  renderTagResults(tagStats, resultsContainer, "");

  // 添加搜索事件
  searchInput.addEventListener("input", (e) => {
    const query = (e.target as HTMLInputElement).value.toLowerCase();
    renderTagResults(tagStats, resultsContainer, query);
  });
}

/**
 * 计算标签统计信息
 */
function calculateTagStats(stats: WatchStats): Map<string, { seconds: number; videoCount: number }> {
  const tagStats = new Map<string, { seconds: number; videoCount: number }>();

  for (const [videoKey, tags] of Object.entries(stats.videoTags)) {
    const seconds = stats.videoSeconds[videoKey] ?? 0;
    for (const tag of tags || []) {
      const existing = tagStats.get(tag) ?? { seconds: 0, videoCount: 0 };
      tagStats.set(tag, {
        seconds: existing.seconds + seconds,
        videoCount: existing.videoCount + 1
      });
    }
  }

  return tagStats;
}

/**
 * 渲染标签搜索结果
 */
function renderTagResults(
  tagStats: Map<string, { seconds: number; videoCount: number }>,
  container: HTMLElement,
  query: string
): void {
  container.innerHTML = "";

  const tagRows = Array.from(tagStats.entries())
    .filter(([tag]) => tag.toLowerCase().includes(query))
    .sort((a, b) => b[1].seconds - a[1].seconds)
    .slice(0, 20);

  if (tagRows.length === 0) {
    const item = document.createElement("div");
    item.className = "list-item";
    item.textContent = "暂无数据";
    container.appendChild(item);
    return;
  }

  for (const [tag, stats] of tagRows) {
    const item = document.createElement("div");
    item.className = "list-item";

    const label = document.createElement("span");
    label.textContent = tag;

    const valueContainer = document.createElement("span");
    valueContainer.style.display = "flex";
    valueContainer.style.gap = "12px";

    const value = document.createElement("span");
    value.textContent = formatSeconds(stats.seconds);
    value.style.fontWeight = "600";

    const extra = document.createElement("span");
    extra.textContent = `视频: ${stats.videoCount}`;
    extra.style.color = "#6b7280";

    valueContainer.appendChild(value);
    valueContainer.appendChild(extra);

    item.appendChild(label);
    item.appendChild(valueContainer);

    container.appendChild(item);
  }
}
