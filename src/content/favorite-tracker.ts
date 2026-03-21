/**
 * 收藏追踪器
 * 监听B站页面的收藏操作，同步到本地数据库
 */

interface FavoriteEvent {
  bvid: string;
  title: string;
  action: "add" | "remove";
  timestamp: number;
}

// 使用tracker.ts中已定义的extractBvidFromUrl函数

function detectFavoriteButton(): HTMLElement | null {
  // B站收藏按钮的选择器
  const selectors = [
    ".toolbar-left .collect",
    ".video-toolbar .collect",
    ".action-item.collect"
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) {
      return el as HTMLElement;
    }
  }

  return null;
}

function sendFavoriteMessage(event: FavoriteEvent): void {
  console.log("[FavoriteTracker] Sending favorite event:", event);

  try {
    if (typeof chrome === "undefined" || typeof chrome.runtime?.sendMessage !== "function") {
      return;
    }

    chrome.runtime.sendMessage(
      { type: "favorite_action", payload: event },
      (response) => {
        if (chrome.runtime.lastError) {
          const errorMsg = chrome.runtime.lastError.message || "";
          if (!errorMsg.includes("Extension context invalidated")) {
            console.warn("[FavoriteTracker] Failed to send favorite event:", chrome.runtime.lastError);
          }
        }
      }
    );
  } catch (error) {
    console.warn("[FavoriteTracker] Failed to send favorite event:", error);
  }
}

function setupFavoriteObserver(): void {
  const favoriteButton = detectFavoriteButton();
  if (!favoriteButton) {
    console.log("[FavoriteTracker] Favorite button not found, retrying...");
    setTimeout(setupFavoriteObserver, 1000);
    return;
  }

  console.log("[FavoriteTracker] Favorite button found, setting up observer");

  // 使用MutationObserver监听收藏按钮状态变化
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes" && mutation.attributeName === "class") {
        const target = mutation.target as HTMLElement;
        const isFavorited = target.classList.contains("on");

        // 获取当前视频信息
        const url = window.location.href;
        const bvid = extractBvidFromUrl(url);

        if (!bvid) {
          return;
        }

        const titleElement = document.querySelector("h1.video-title, h1.title");
        const title = titleElement?.textContent?.trim() || "";

        // 发送收藏事件
        sendFavoriteMessage({
          bvid,
          title,
          action: isFavorited ? "add" : "remove",
          timestamp: Date.now()
        });
      }
    });
  });

  // 开始观察
  observer.observe(favoriteButton, {
    attributes: true,
    attributeFilter: ["class"]
  });

  console.log("[FavoriteTracker] Observer setup complete");
}

// 页面加载完成后设置观察器
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupFavoriteObserver);
} else {
  setupFavoriteObserver();
}

// 监听URL变化（SPA页面）
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log("[FavoriteTracker] URL changed, reinitializing...");
    setupFavoriteObserver();
  }
}).observe(document, { subtree: true, childList: true });
