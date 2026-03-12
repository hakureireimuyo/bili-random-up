import { getValue } from "../../storage/storage.js";

interface WatchStats {
  totalSeconds: number;
  dailySeconds: Record<string, number>;
  upSeconds: Record<string, number>;
  videoSeconds: Record<string, number>;
  videoTitles: Record<string, string>;
  videoTags: Record<string, string[]>;
  videoUpIds: Record<string, number>;
  videoWatchCount: Record<string, number>;
  videoFirstWatched: Record<string, number>;
  lastUpdate: number;
}

function formatSeconds(total: number): string {
  const safe = Math.max(0, Math.floor(total));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatTime(timestamp: number | null): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${date
    .getHours()
    .toString()
    .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function getRecentDays(count: number): string[] {
  const days: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    days.push(`${date.getFullYear()}-${month}-${day}`);
  }
  return days;
}

function renderList(
  containerId: string,
  rows: Array<{ label: string; value: number }>
): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  if (rows.length === 0) {
    const item = document.createElement("div");
    item.className = "list-item";
    item.textContent = "暂无数据";
    container.appendChild(item);
    return;
  }
  for (const row of rows) {
    const item = document.createElement("div");
    item.className = "list-item";
    const label = document.createElement("span");
    label.textContent = row.label;
    const value = document.createElement("span");
    value.textContent = formatSeconds(row.value);
    item.appendChild(label);
    item.appendChild(value);
    container.appendChild(item);
  }
}

function renderKeyValueList(
  containerId: string,
  rows: Array<{ label: string; value: string }>
): void {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  if (rows.length === 0) {
    const item = document.createElement("div");
    item.className = "list-item";
    item.textContent = "暂无数据";
    container.appendChild(item);
    return;
  }
  for (const row of rows) {
    const item = document.createElement("div");
    item.className = "list-item";
    const label = document.createElement("span");
    label.textContent = row.label;
    const value = document.createElement("span");
    value.textContent = row.value;
    item.appendChild(label);
    item.appendChild(value);
    container.appendChild(item);
  }
}

function buildTopRows(
  data: Record<string, number>,
  labelMap?: Record<string, string>,
  limit = 10
): Array<{ label: string; value: number }> {
  return Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, value]) => ({
      label: labelMap?.[key] ?? key,
      value
    }));
}

let refreshInterval: number | null = null;

async function refreshStats(): Promise<void> {
  console.log("[WatchStats UI] Refreshing stats...");
  const stats =
    (await getValue<WatchStats>("watchStats")) ?? {
      totalSeconds: 0,
      dailySeconds: {},
      upSeconds: {},
      videoSeconds: {},
      videoTitles: {},
      videoTags: {},
      videoUpIds: {},
      videoWatchCount: {},
      videoFirstWatched: {},
      lastUpdate: 0
    };
  console.log("[WatchStats UI] Retrieved stats:", stats);
  const todayKey = getRecentDays(1)[0];
  const last7Days = getRecentDays(7);
  const total7Days = last7Days.reduce((sum, day) => sum + (stats.dailySeconds[day] ?? 0), 0);

  const totalEl = document.getElementById("stat-total");
  const todayEl = document.getElementById("stat-today");
  const sevenEl = document.getElementById("stat-7days");
  const updateEl = document.getElementById("stat-update");

  if (totalEl) totalEl.textContent = formatSeconds(stats.totalSeconds);
  if (todayEl) todayEl.textContent = formatSeconds(stats.dailySeconds[todayKey] ?? 0);
  if (sevenEl) sevenEl.textContent = formatSeconds(total7Days);
  if (updateEl) updateEl.textContent = formatTime(stats.lastUpdate || null);

  const dailyRows = last7Days
    .map((day) => ({
      label: day,
      value: stats.dailySeconds[day] ?? 0
    }))
    .reverse();

  renderList("daily-list", dailyRows);
  const tagTotals: Record<string, number> = {};
  const tagVideoCounts: Record<string, number> = {};
  for (const [videoKey, tags] of Object.entries(stats.videoTags)) {
    const seconds = stats.videoSeconds[videoKey] ?? 0;
    for (const tag of tags || []) {
      tagTotals[tag] = (tagTotals[tag] ?? 0) + seconds;
      tagVideoCounts[tag] = (tagVideoCounts[tag] ?? 0) + 1;
    }
  }

  const tagRows = Object.entries(tagTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, seconds]) => ({
      label: tag,
      value: seconds,
      extra: `视频: ${tagVideoCounts[tag] ?? 0}`
    }));
  
  // 自定义渲染标签列表
  const tagListContainer = document.getElementById("tag-list");
  if (tagListContainer) {
    tagListContainer.innerHTML = "";
    if (tagRows.length === 0) {
      const item = document.createElement("div");
      item.className = "list-item";
      item.textContent = "暂无数据";
      tagListContainer.appendChild(item);
    } else {
      for (const row of tagRows) {
        const item = document.createElement("div");
        item.className = "list-item";
        const label = document.createElement("span");
        label.textContent = row.label;
        const valueContainer = document.createElement("span");
        valueContainer.style.display = "flex";
        valueContainer.style.gap = "12px";
        const value = document.createElement("span");
        value.textContent = formatSeconds(row.value);
        const extra = document.createElement("span");
        extra.textContent = row.extra;
        extra.style.color = "#6b7280";
        valueContainer.appendChild(value);
        valueContainer.appendChild(extra);
        item.appendChild(label);
        item.appendChild(valueContainer);
        tagListContainer.appendChild(item);
      }
    }
  }
  renderList("up-list", buildTopRows(stats.upSeconds));
  renderList("video-list", buildTopRows(stats.videoSeconds, stats.videoTitles));

  const rawEl = document.getElementById("raw-stats");
  if (rawEl) {
    rawEl.textContent = JSON.stringify(stats, null, 2);
  }

  const videoDetailRows = Object.keys(stats.videoSeconds)
    .sort((a, b) => (stats.videoSeconds[b] ?? 0) - (stats.videoSeconds[a] ?? 0))
    .map((key) => {
      const title = stats.videoTitles[key] ?? key;
      const upId = stats.videoUpIds[key] ?? 0;
      const watchCount = stats.videoWatchCount[key] ?? 1;
      const firstWatched = stats.videoFirstWatched[key] ? formatTime(stats.videoFirstWatched[key]) : "-";
      const avgTime = watchCount > 0 ? (stats.videoSeconds[key] ?? 0) / watchCount : 0;
      return {
        label: `${title}`,
        value: {
          total: formatSeconds(stats.videoSeconds[key] ?? 0),
          count: watchCount,
          avg: formatSeconds(avgTime),
          up: upId,
          first: firstWatched
        }
      };
    });
  
  // 自定义渲染视频明细
  const videoDetailContainer = document.getElementById("video-detail");
  if (videoDetailContainer) {
    videoDetailContainer.innerHTML = "";
    if (videoDetailRows.length === 0) {
      const item = document.createElement("div");
      item.className = "list-item";
      item.textContent = "暂无数据";
      videoDetailContainer.appendChild(item);
    } else {
      for (const row of videoDetailRows) {
        const item = document.createElement("div");
        item.className = "list-item";
        const label = document.createElement("span");
        label.textContent = row.label;
        const valueContainer = document.createElement("span");
        
        const total = document.createElement("span");
        total.textContent = `时长: ${row.value.total}`;
        
        const count = document.createElement("span");
        count.className = "highlight";
        count.textContent = `次数: ${row.value.count}`;
        
        const avg = document.createElement("span");
        avg.className = "detail-info";
        avg.textContent = `平均: ${row.value.avg}`;
        
        const up = document.createElement("span");
        up.className = "detail-info";
        up.textContent = `UP: ${row.value.up}`;
        
        const first = document.createElement("span");
        first.className = "detail-info";
        first.textContent = `首次: ${row.value.first}`;
        
        valueContainer.appendChild(total);
        valueContainer.appendChild(count);
        valueContainer.appendChild(avg);
        valueContainer.appendChild(up);
        valueContainer.appendChild(first);
        
        item.appendChild(label);
        item.appendChild(valueContainer);
        videoDetailContainer.appendChild(item);
      }
    }
  }

  // 计算每个UP的视频数量
  const upVideoCounts: Record<string, number> = {};
  const upTagStats: Record<string, Record<string, number>> = {};
  
  for (const [videoKey, upId] of Object.entries(stats.videoUpIds)) {
    const upKey = String(upId);
    upVideoCounts[upKey] = (upVideoCounts[upKey] ?? 0) + 1;
    
    // 统计UP的标签
    const tags = stats.videoTags[videoKey] ?? [];
    const duration = stats.videoSeconds[videoKey] ?? 0;
    for (const tag of tags) {
      if (!upTagStats[upKey]) {
        upTagStats[upKey] = {};
      }
      upTagStats[upKey][tag] = (upTagStats[upKey][tag] ?? 0) + duration;
    }
  }
  
  const upDetailRows = Object.keys(stats.upSeconds)
    .sort((a, b) => (stats.upSeconds[b] ?? 0) - (stats.upSeconds[a] ?? 0))
    .map((key) => {
      const videoCount = upVideoCounts[key] ?? 0;
      const topTags = Object.entries(upTagStats[key] ?? {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag]) => tag)
        .join(", ");
      return {
        label: `UP ${key}`,
        value: {
          total: formatSeconds(stats.upSeconds[key] ?? 0),
          count: videoCount,
          tags: topTags || "-"
        }
      };
    });
  
  // 自定义渲染UP明细
  const upDetailContainer = document.getElementById("up-detail");
  if (upDetailContainer) {
    upDetailContainer.innerHTML = "";
    if (upDetailRows.length === 0) {
      const item = document.createElement("div");
      item.className = "list-item";
      item.textContent = "暂无数据";
      upDetailContainer.appendChild(item);
    } else {
      for (const row of upDetailRows) {
        const item = document.createElement("div");
        item.className = "list-item";
        const label = document.createElement("span");
        label.textContent = row.label;
        const valueContainer = document.createElement("span");
        
        const total = document.createElement("span");
        total.textContent = `时长: ${row.value.total}`;
        
        const count = document.createElement("span");
        count.className = "highlight";
        count.textContent = `视频: ${row.value.count}`;
        
        const tags = document.createElement("span");
        tags.className = "detail-info";
        tags.textContent = `热门标签: ${row.value.tags}`;
        
        valueContainer.appendChild(total);
        valueContainer.appendChild(count);
        valueContainer.appendChild(tags);
        
        item.appendChild(label);
        item.appendChild(valueContainer);
        upDetailContainer.appendChild(item);
      }
    }
  }
}

async function initWatchStats(): Promise<void> {
  // 添加刷新按钮事件
  const refreshBtn = document.getElementById("btn-refresh");
  refreshBtn?.addEventListener("click", () => {
    void refreshStats();
  });

  // 初始加载数据
  await refreshStats();

  // 设置自动刷新（每5秒刷新一次）
  refreshInterval = window.setInterval(() => {
    void refreshStats();
  }, 5000);
}

if (typeof document !== "undefined") {
  void initWatchStats();
  // 页面卸载时清除定时器
  window.addEventListener("beforeunload", () => {
    if (refreshInterval !== null) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  });
}
