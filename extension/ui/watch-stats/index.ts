import { getValue, loadUPList } from "../../storage/storage";
import { formatSeconds, formatTime, getRecentDays } from "./utils";
import { renderHeatmap } from "./heatmap";
import { renderLineChart } from "./line-chart";
import { renderTagList, renderUPList, renderVideoList } from "./list-renderer";
import { initVideoSearch, initTagSearch } from "./search";
import type { WatchStats } from "../../background/modules/common-types";
import type { UP } from "../../storage/storage";

let refreshInterval: number | null = null;

/**
 * 刷新统计数据
 */
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

  // 加载已关注的UP列表
  const upCache = await loadUPList();
  const upInfoMap = new Map<number, UP>();
  if (upCache?.upList) {
    for (const up of upCache.upList) {
      upInfoMap.set(up.mid, up);
    }
  }

  console.log("[WatchStats UI] Retrieved stats:", stats);
  const todayKey = getRecentDays(1)[0];
  const last7Days = getRecentDays(7);
  const total7Days = last7Days.reduce((sum, day) => sum + (stats.dailySeconds[day] ?? 0), 0);

  // 更新统计卡片
  const totalEl = document.getElementById("stat-total");
  const todayEl = document.getElementById("stat-today");
  const sevenEl = document.getElementById("stat-7days");
  const updateEl = document.getElementById("stat-update");

  if (totalEl) totalEl.textContent = formatSeconds(stats.totalSeconds);
  if (todayEl) todayEl.textContent = formatSeconds(stats.dailySeconds[todayKey] ?? 0);
  if (sevenEl) sevenEl.textContent = formatSeconds(total7Days);
  if (updateEl) updateEl.textContent = formatTime(stats.lastUpdate || null);

  // 渲染热力图和折线图
  renderHeatmap(stats.dailySeconds);
  renderLineChart(stats.dailySeconds);

  // 渲染标签列表
  renderTagList(stats);

  // 渲染UP列表
  renderUPList(stats, upInfoMap);

  // 渲染视频列表
  renderVideoList(stats);

  // 初始化视频搜索功能
  initVideoSearch(stats);

  // 初始化标签搜索功能
  initTagSearch(stats);

  // 显示原始数据（调试用）
  const rawEl = document.getElementById("raw-stats");
  if (rawEl) {
    rawEl.textContent = JSON.stringify(stats, null, 2);
  }
}

/**
 * 初始化观看统计页面
 */
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

  // 窗口大小改变时重新绘制折线图
  let resizeTimeout: number | null = null;
  window.addEventListener("resize", () => {
    if (resizeTimeout !== null) {
      clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(async () => {
      const stats = await getValue<WatchStats>("watchStats");
      if (stats) {
        renderLineChart(stats.dailySeconds);
      }
      resizeTimeout = null;
    }, 250);
  });
}

// 页面加载时初始化
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
