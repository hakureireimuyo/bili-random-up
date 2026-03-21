/**
 * InterestStats
 * 兴趣统计页面主入口
 */

import { InterestStats } from "./interest-stats-component.js";

let interestStatsInstance: InterestStats | null = null;

async function initInterestStats(): Promise<void> {
  if (interestStatsInstance) {
    return; // 已初始化，不再重复初始化
  }

  interestStatsInstance = new InterestStats({
    containerId: 'interest-container',
    maxTopInterests: 20,
    maxGraphNodes: 50,
    chartDays: 30
  });

  await interestStatsInstance.render();

  // 绑定事件
  bindEvents();
}

function bindEvents(): void {
  const refreshBtn = document.getElementById('refresh-interest');
  const initBtn = document.getElementById('initialize-interest');

  refreshBtn?.addEventListener('click', async () => {
    await refresh();
  });

  initBtn?.addEventListener('click', async () => {
    await initialize();
  });
}

async function refresh(): Promise<void> {
  const response = await chrome.runtime.sendMessage({
    type: 'get_interest_stats'
  }) as { success?: boolean } | undefined;

  if (response) {
    await interestStatsInstance?.render();
  }
}

async function initialize(): Promise<void> {
  const response = await chrome.runtime.sendMessage({
    type: 'initialize_interest_system'
  }) as { success?: boolean } | undefined;

  if (response?.success) {
    alert('兴趣系统初始化成功');
    await interestStatsInstance?.render();
  } else {
    alert('兴趣系统初始化失败');
  }
}

// 页面加载完成后初始化
if (typeof document !== "undefined") {
  void initInterestStats();
}
