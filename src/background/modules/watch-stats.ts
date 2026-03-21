import { getValue, setValue, saveUPList, loadUPList, addTagsToLibrary, getTagLibrary, updateUPTagWeights, type UP, type AppTag as Tag } from "../../database/implementations/index.js";
import type { BackgroundOptions, WatchProgressPayload, WatchStats } from "./common-types.js";

function toLocalDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export async function updateWatchStats(
  payload: WatchProgressPayload,
  options: BackgroundOptions = {}
): Promise<void> {
  console.log("[WatchStats] Updating watch time stats with payload:", payload);
  const getValueFn = options.getValueFn ?? ((key: string) => getValue(key));
  const setValueFn = options.setValueFn ?? ((key: string, value: unknown) => setValue(key, value));

  const delta = Math.max(0, payload.watchedSeconds || 0);
  if (delta <= 0) {
    return;
  }

  const existingStats = await getValueFn("watchStats") as WatchStats | null;
  const stats: WatchStats = {
    totalSeconds: (existingStats?.totalSeconds ?? 0) + delta,
    dailySeconds: existingStats?.dailySeconds ?? {},
    upSeconds: existingStats?.upSeconds ?? {},
    videoSeconds: existingStats?.videoSeconds ?? {},
    videoTitles: existingStats?.videoTitles ?? {},
    videoTags: existingStats?.videoTags ?? {},
    videoUpIds: existingStats?.videoUpIds ?? {},
    videoWatchCount: existingStats?.videoWatchCount ?? {},
    videoFirstWatched: existingStats?.videoFirstWatched ?? {},
    videoCreatedAt: existingStats?.videoCreatedAt ?? {},
    lastUpdate: Date.now()
  };

  // 更新总观看时长
  stats.totalSeconds += delta;

  // 更新每日观看时长
  const dateKey = toLocalDateKey(payload.timestamp);
  stats.dailySeconds[dateKey] = (stats.dailySeconds[dateKey] ?? 0) + delta;

  // 更新视频和UP的观看时长
  const videoKey = payload.bvid || payload.title || "unknown";
  stats.videoSeconds[videoKey] = (stats.videoSeconds[videoKey] ?? 0) + delta;

  if (payload.upMid) {
    const upKey = String(payload.upMid);
    stats.upSeconds[upKey] = (stats.upSeconds[upKey] ?? 0) + delta;
  }

  console.log("[WatchStats] Watch time stats updated:", stats);
  await setValueFn("watchStats", stats);
  console.log("[WatchStats] Watch time stats saved to storage");
}

/**
 * 初始化视频信息（第一次观看时调用）
 */
export async function initializeVideoInfo(
  payload: WatchProgressPayload,
  options: BackgroundOptions = {}
): Promise<void> {
  console.log("[WatchStats] Initializing video info with payload:", payload);
  const getValueFn = options.getValueFn ?? ((key: string) => getValue(key));
  const setValueFn = options.setValueFn ?? ((key: string, value: unknown) => setValue(key, value));

  const existingStats = await getValueFn("watchStats") as WatchStats | null;
  const stats: WatchStats = {
    totalSeconds: existingStats?.totalSeconds ?? 0,
    dailySeconds: existingStats?.dailySeconds ?? {},
    upSeconds: existingStats?.upSeconds ?? {},
    videoSeconds: existingStats?.videoSeconds ?? {},
    videoTitles: existingStats?.videoTitles ?? {},
    videoTags: existingStats?.videoTags ?? {},
    videoUpIds: existingStats?.videoUpIds ?? {},
    videoWatchCount: existingStats?.videoWatchCount ?? {},
    videoFirstWatched: existingStats?.videoFirstWatched ?? {},
    videoCreatedAt: existingStats?.videoCreatedAt ?? {},
    lastUpdate: existingStats?.lastUpdate ?? 0
  };

  const videoKey = payload.bvid || payload.title || "unknown";

  // 检查是否已经初始化过
  if (stats.videoFirstWatched[videoKey]) {
    console.log("[WatchStats] Video already initialized:", videoKey);
    return;
  }

  // 初始化视频信息
  stats.videoFirstWatched[videoKey] = payload.timestamp;
  stats.videoWatchCount[videoKey] = 1;
  // 确保 videoCreatedAt 已定义
  if (!stats.videoCreatedAt) {
    stats.videoCreatedAt = {};
  }
  stats.videoCreatedAt[videoKey] = Date.now();

  if (payload.title) {
    stats.videoTitles[videoKey] = payload.title;
  }

  if (payload.upMid) {
    stats.videoUpIds[videoKey] = payload.upMid;
  }

  console.log("[WatchStats] Video info initialized:", videoKey);
  await setValueFn("watchStats", stats);
  console.log("[WatchStats] Video info saved to storage");
}

/**
 * 处理UP信息（添加新UP或更新现有UP）
 */
export async function processUPInfo(
  payload: WatchProgressPayload,
  options: BackgroundOptions = {}
): Promise<void> {
  if (!payload.upMid) {
    return;
  }

  const getValueFn = options.getValueFn ?? ((key: string) => getValue(key));
  const settings = (await getValueFn("settings")) as { userId?: number } | null;
  const currentUserId = settings?.userId;
  if (currentUserId && payload.upMid === currentUserId) {
    console.log("[WatchStats] Skipping current user record:", payload.upMid);
    return;
  }

  console.log("[WatchStats] Processing UP info:", payload.upMid);
  const cache = await loadUPList();
  const existingUP = cache?.upList.find(up => up.mid === payload.upMid);

  if (!existingUP) {
    // UP不存在于数据库中，添加并标记为未关注
    console.log("[WatchStats] Adding new UP to database:", payload.upMid);
    const newUP: UP = {
      mid: payload.upMid,
      name: payload.upName || "",
      face: payload.upFace || "",
      sign: "",
      follow_time: 0,
      is_followed: false
    };
    const currentUPList = cache?.upList ?? [];
    await saveUPList([...currentUPList, newUP]);
    console.log("[WatchStats] New UP added to database:", payload.upMid);
  } else {
    // 更新现有UP的信息（如果需要）
    let needUpdate = false;
    if (payload.upName && existingUP.name !== payload.upName) {
      existingUP.name = payload.upName;
      needUpdate = true;
    }
    if (payload.upFace && existingUP.face !== payload.upFace) {
      existingUP.face = payload.upFace;
      needUpdate = true;
    }
    if (needUpdate) {
      await saveUPList(cache?.upList ?? []);
      console.log("[WatchStats] UP info updated:", payload.upMid);
    }
  }
}

/**
 * 处理视频标签（添加到标签库并更新UP的标签权重）
 */
export async function processVideoTags(
  payload: WatchProgressPayload,
  options: BackgroundOptions = {}
): Promise<void> {
  if (!payload.tags || payload.tags.length === 0) {
    return;
  }

  console.log("[WatchStats] Processing video tags:", payload.tags);

  // 将标签添加到标签库，并获取标签ID（程序自动收集的标签）
  const tags = await addTagsToLibrary(payload.tags, false);
  const tagIds = tags.map(tag => tag.id);

  // 更新视频的标签信息
  const getValueFn = options.getValueFn ?? ((key: string) => getValue(key));
  const setValueFn = options.setValueFn ?? ((key: string, value: unknown) => setValue(key, value));

  const existingStats = await getValueFn("watchStats") as WatchStats | null;
  const stats: WatchStats = {
    totalSeconds: existingStats?.totalSeconds ?? 0,
    dailySeconds: existingStats?.dailySeconds ?? {},
    upSeconds: existingStats?.upSeconds ?? {},
    videoSeconds: existingStats?.videoSeconds ?? {},
    videoTitles: existingStats?.videoTitles ?? {},
    videoTags: existingStats?.videoTags ?? {},
    videoUpIds: existingStats?.videoUpIds ?? {},
    videoWatchCount: existingStats?.videoWatchCount ?? {},
    videoFirstWatched: existingStats?.videoFirstWatched ?? {},
    videoCreatedAt: existingStats?.videoCreatedAt ?? {},
    lastUpdate: existingStats?.lastUpdate ?? 0
  };

  const videoKey = payload.bvid || payload.title || "unknown";
  stats.videoTags[videoKey] = tagIds;

  // 如果有UP，更新UP的标签权重
  if (payload.upMid) {
    await updateUPTagWeights(payload.upMid, tagIds, false);
    console.log(`[WatchStats] Updated tag weights for UP ${payload.upMid}`);
  }

  console.log("[WatchStats] Video tags processed");
  await setValueFn("watchStats", stats);
  console.log("[WatchStats] Video tags saved to storage");
}
