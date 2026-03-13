/**
 * Track video pages and report watch events.
 */

interface WatchProgress {
  bvid: string;
  title: string;
  upMid?: number;
  upName?: string;
  upFace?: string;
  tags: string[];
  watchedSeconds: number;
  duration: number;
  timestamp: number;
}

function extractBvidFromUrl(url: string): string | null {
  const match = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function detectVideoElement(): HTMLVideoElement | null {
  return document.querySelector("video");
}

function sendWatchProgress(event: WatchProgress): void {
  console.log("[Tracker] Send watch progress", event);
  try {
    if (typeof chrome === "undefined" || typeof chrome.runtime?.sendMessage !== "function") {
      return;
    }
    chrome.runtime.sendMessage({ type: "watch_progress", payload: event }, (response) => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message || "";
        // 忽略扩展上下文失效的错误（扩展重新加载时的正常现象）
        if (errorMsg.includes("Extension context invalidated")) {
          console.log("[Tracker] Extension context invalidated, this is expected during reload");
        } else {
          console.warn("[Tracker] Send watch progress failed:", chrome.runtime.lastError);
        }
      }
    });
  } catch (error) {
    console.warn("[Tracker] Send watch progress failed", error);
  }
}

function sendInitializeVideoInfo(event: WatchProgress): void {
  console.log("[Tracker] Send initialize video info", event);
  try {
    if (typeof chrome === "undefined" || typeof chrome.runtime?.sendMessage !== "function") {
      return;
    }
    chrome.runtime.sendMessage({ type: "initialize_video_info", payload: event }, (response) => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message || "";
        if (errorMsg.includes("Extension context invalidated")) {
          console.log("[Tracker] Extension context invalidated, this is expected during reload");
        } else {
          console.warn("[Tracker] Send initialize video info failed:", chrome.runtime.lastError);
        }
      }
    });
  } catch (error) {
    console.warn("[Tracker] Send initialize video info failed", error);
  }
}

function sendProcessUPInfo(event: WatchProgress): void {
  console.log("[Tracker] Send process UP info", event);
  try {
    if (typeof chrome === "undefined" || typeof chrome.runtime?.sendMessage !== "function") {
      return;
    }
    chrome.runtime.sendMessage({ type: "process_up_info", payload: event }, (response) => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message || "";
        if (errorMsg.includes("Extension context invalidated")) {
          console.log("[Tracker] Extension context invalidated, this is expected during reload");
        } else {
          console.warn("[Tracker] Send process UP info failed:", chrome.runtime.lastError);
        }
      }
    });
  } catch (error) {
    console.warn("[Tracker] Send process UP info failed", error);
  }
}

function sendProcessVideoTags(event: WatchProgress): void {
  console.log("[Tracker] Send process video tags", event);
  try {
    if (typeof chrome === "undefined" || typeof chrome.runtime?.sendMessage !== "function") {
      return;
    }
    chrome.runtime.sendMessage({ type: "process_video_tags", payload: event }, (response) => {
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message || "";
        if (errorMsg.includes("Extension context invalidated")) {
          console.log("[Tracker] Extension context invalidated, this is expected during reload");
        } else {
          console.warn("[Tracker] Send process video tags failed:", chrome.runtime.lastError);
        }
      }
    });
  } catch (error) {
    console.warn("[Tracker] Send process video tags failed", error);
  }
}

interface VideoMeta {
  title: string;
  upMid?: number;
  upName?: string;
  upFace?: string;
  tags: string[];
}

function extractVideoMeta(): VideoMeta {
  // 检查页面是否加载完成
  if (document.readyState !== 'complete') {
    console.log("[Tracker] Page not fully loaded, waiting...");
    // 返回空对象，稍后会重试
    return {
      title: "",
      upMid: undefined,
      upName: undefined,
      upFace: undefined,
      tags: []
    };
  }

  const titleSelectors = [
    "h1.video-title",
    "h1.title",
    ".video-title",
    "h1"
  ];
  let title = "";
  for (const selector of titleSelectors) {
    const el = document.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text) {
      title = text;
      break;
    }
  }
  if (!title) {
    const docTitle = document.title || "";
    title = docTitle.split("_")[0].split("-")[0].trim();
  }

  let upMid: number | undefined = undefined;
  const win = window as unknown as {
    __INITIAL_STATE__?: { videoData?: { owner?: { mid?: number; name?: string; face?: string } }; tags?: Array<{ tag_name?: string }> };
  };
  console.log("[Tracker] __INITIAL_STATE__ exists:", !!win.__INITIAL_STATE__);
  console.log("[Tracker] __INITIAL_STATE__.videoData exists:", !!win.__INITIAL_STATE__?.videoData);
  console.log("[Tracker] __INITIAL_STATE__.videoData.owner exists:", !!win.__INITIAL_STATE__?.videoData?.owner);
  console.log("[Tracker] __INITIAL_STATE__.videoData.owner:", win.__INITIAL_STATE__?.videoData?.owner);

  const stateMid = win.__INITIAL_STATE__?.videoData?.owner?.mid;
  if (typeof stateMid === "number") {
    upMid = stateMid;
  } else {
    const upLink = document.querySelector('a[href*="space.bilibili.com"]') as HTMLAnchorElement | null;
    const match = upLink?.href?.match(/space\.bilibili\.com\/(\d+)/);
    if (match) {
      upMid = Number(match[1]);
    }
  }

  const tags = new Set<string>();
  for (const tag of win.__INITIAL_STATE__?.tags ?? []) {
    if (tag.tag_name) {
      tags.add(tag.tag_name);
    }
  }
  
  // 提取UP名称
  let upName: string | undefined = undefined;
  const videoDataOwner = win.__INITIAL_STATE__?.videoData?.owner;
  if (videoDataOwner?.name) {
    upName = videoDataOwner.name;
  } else {
    // 如果从__INITIAL_STATE__中获取不到，尝试从页面中提取
    const upNameElement = document.querySelector('.up-name, .author-name, [class*="author"], [class*="up-name"], [class*="uploader"]');
    if (upNameElement) {
      upName = upNameElement.textContent?.trim();
    }
  }
  
  // 提取UP头像
  let upFace: string | undefined = undefined;
  console.log("[Tracker] Extracting UP face, videoDataOwner.face:", videoDataOwner?.face);

  if (videoDataOwner?.face) {
    upFace = videoDataOwner.face;
    console.log("[Tracker] UP face from __INITIAL_STATE__:", upFace);
  } else {
    // 如果从__INITIAL_STATE__中获取不到，尝试从页面中提取
    // 尝试多个选择器来查找头像元素
    const selectors = [
      '.bili-avatar', 
      'bili-avatar-img bili-avatar-face bili-avatar-img-radius'
    ];

    // 首先尝试使用XPath查找头像
    console.log("[Tracker] Trying to find avatar with XPath");
    try {
      const xpathResult = document.evaluate(
        '/html/body/div[2]/div[2]/div[2]/div/div[1]/div[1]/div[1]/div/a/div/img',
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      const imgElement = xpathResult.singleNodeValue as HTMLImageElement | null;
      if (imgElement) {
        upFace = imgElement.src;
        console.log("[Tracker] UP face from XPath:", upFace);
        // 确保URL包含协议部分
        if (upFace && upFace.startsWith('//')) {
          upFace = 'https:' + upFace;
          console.log("[Tracker] UP face after adding protocol:", upFace);
        }
      } else {
        console.log("[Tracker] XPath did not find avatar element");
      }
    } catch (error) {
      console.error("[Tracker] Error finding avatar with XPath:", error);
    }

    // 如果XPath没有找到，尝试CSS选择器
    if (!upFace) {
      console.log("[Tracker] XPath failed, trying CSS selectors");
      for (const selector of selectors) {
        console.log("[Tracker] Trying selector:", selector);
        const element = document.querySelector(selector) as HTMLImageElement | null;
        if (element) {
          console.log("[Tracker] Found element with selector:", selector, "Tag:", element.tagName);

          // 如果找到的是img元素，直接获取src
          if (element.tagName === 'IMG') {
            upFace = element.src;
            console.log("[Tracker] UP face from img element:", upFace);
          } else {
            // 如果找到的是容器元素，查找内部的img
            const img = element.querySelector('img') as HTMLImageElement | null;
            if (img) {
              upFace = img.src;
              console.log("[Tracker] UP face from container img:", upFace);
            }
          }

          // 确保URL包含协议部分
          if (upFace && upFace.startsWith('//')) {
            upFace = 'https:' + upFace;
            console.log("[Tracker] UP face after adding protocol:", upFace);
          }

          // 如果找到了头像，就不再尝试其他选择器
          if (upFace) {
            break;
          }
        }
      }
    }

    console.log("[Tracker] Final UP face value:", upFace);
  }
  const tagElements = document.querySelectorAll('a[href*="/tag/"], a[href*="search?keyword="], .tag-link, .tag-item');
  for (const el of Array.from(tagElements)) {
    const text = el.textContent?.trim();
    if (text) {
      tags.add(text);
    }
  }

  return { title, upMid, upName, upFace, tags: Array.from(tags) };
}

function trackVideoPlayback(
  video: HTMLVideoElement,
  bvid: string,
  sendFn: (event: WatchProgress) => void
): void {
  let lastTime = video.currentTime;
  let accumulated = 0;
  let lastSentAt = Date.now();
  let cachedMeta: VideoMeta | null = null;

  const refreshMeta = () => {
    cachedMeta = extractVideoMeta();
    // 如果页面未加载完成，设置定时器稍后重试
    if (!cachedMeta.title && document.readyState !== 'complete') {
      console.log("[Tracker] Page not loaded, scheduling retry...");
      setTimeout(refreshMeta, 1000);
    }
  };

  const flush = (reason: string) => {
    if (accumulated < 1) {
      return;
    }
    // 只在初始化时提取一次元数据，避免重复查询DOM
    const meta = cachedMeta ?? extractVideoMeta();

    // 如果元数据不完整（页面未加载完成），跳过本次发送
    if (!meta.title) {
      console.log("[Tracker] Meta incomplete, skipping flush:", meta);
      return;
    }

    const event: WatchProgress = {
      bvid,
      title: meta.title,
      upMid: meta.upMid,
      upName: meta.upName,
      upFace: meta.upFace,
      tags: meta.tags,
      watchedSeconds: accumulated,
      duration: Number.isFinite(video.duration) ? video.duration : 0,
      timestamp: Date.now()
    };
    console.log("[Tracker] Flush watch progress", reason, event);
    sendFn(event);
    accumulated = 0;
    lastSentAt = Date.now();
  };

  refreshMeta();
  
  // 初始化视频信息、UP信息和标签（只执行一次）
  // 等待页面加载完成后再初始化
  const initializeWhenReady = () => {
    if (!cachedMeta || !cachedMeta.title) {
      console.log("[Tracker] Meta not ready, waiting...");
      setTimeout(initializeWhenReady, 500);
      return;
    }

    const meta: VideoMeta = cachedMeta;
    const initEvent: WatchProgress = {
      bvid,
      title: meta.title,
      upMid: meta.upMid,
      upName: meta.upName,
      upFace: meta.upFace,
      tags: meta.tags,
      watchedSeconds: 0,
      duration: Number.isFinite(video.duration) ? video.duration : 0,
      timestamp: Date.now()
    };
    
    // 初始化视频信息
    sendInitializeVideoInfo(initEvent);
    
    // 处理UP信息
    if (meta.upMid) {
      sendProcessUPInfo(initEvent);
    }
    
    // 处理视频标签
    if (meta.tags && meta.tags.length > 0) {
      sendProcessVideoTags(initEvent);
    }
  };

  // 开始初始化流程
  initializeWhenReady();

  video.addEventListener("timeupdate", () => {
    if (video.seeking) {
      lastTime = video.currentTime;
      return;
    }
    if (!video.paused) {
      const delta = video.currentTime - lastTime;
      if (delta > 0 && delta < 5) {
        accumulated += delta;
      }
      lastTime = video.currentTime;
      const now = Date.now();
      if (accumulated >= 5 || now - lastSentAt >= 15000) {
        flush("tick");
      }
    }
  });

  video.addEventListener("pause", () => flush("pause"));
  video.addEventListener("ended", () => flush("ended"));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      flush("hidden");
    }
  });
  window.addEventListener("beforeunload", () => flush("unload"));
}

function initTracker(): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const bvid = extractBvidFromUrl(window.location.href);
  if (!bvid) {
    return;
  }
  console.log(`[Tracker] Video detected: ${bvid}`);
  const video = detectVideoElement();
  if (!video) {
    console.log("[Tracker] Video element not found");
    return;
  }
  trackVideoPlayback(video, bvid, sendWatchProgress);
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  initTracker();
}
