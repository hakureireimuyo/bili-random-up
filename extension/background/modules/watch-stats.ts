import { getValue, setValue } from "../../storage/storage.js";
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
  console.log("[WatchStats] Updating stats with payload:", payload);
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
    lastUpdate: existingStats?.lastUpdate ?? 0
  };
  console.log("[WatchStats] Current stats before update:", stats);

  const delta = Math.max(0, payload.watchedSeconds || 0);
  if (delta <= 0) {
    return;
  }

  const dateKey = toLocalDateKey(payload.timestamp);
  stats.totalSeconds += delta;
  stats.dailySeconds[dateKey] = (stats.dailySeconds[dateKey] ?? 0) + delta;

  const videoKey = payload.bvid || payload.title || "unknown";

  // 判断是否是第一次观看
  const isFirstWatch = !stats.videoFirstWatched[videoKey];
  if (isFirstWatch) {
    stats.videoFirstWatched[videoKey] = payload.timestamp;
    stats.videoWatchCount[videoKey] = 1; // 第一次观看，次数设为1
    console.log("[WatchStats] First time watching video:", videoKey);
    
    // 只在第一次观看时更新视频标题、标签和UP信息
    if (payload.title) {
      stats.videoTitles[videoKey] = payload.title;
    }
    if (payload.tags && payload.tags.length > 0) {
      stats.videoTags[videoKey] = Array.from(new Set(payload.tags));
    }
    if (payload.upMid) {
      stats.videoUpIds[videoKey] = payload.upMid;
      // 第一次观看时，初始化UP的观看时长
      const upKey = String(payload.upMid);
      stats.upSeconds[upKey] = (stats.upSeconds[upKey] ?? 0) + delta;
    }
    // 第一次观看时也更新视频观看时长
    stats.videoSeconds[videoKey] = (stats.videoSeconds[videoKey] ?? 0) + delta;
  } else {
    // 不是第一次观看，只更新视频观看时长和UP观看时长（如果UP已存在）
    stats.videoSeconds[videoKey] = (stats.videoSeconds[videoKey] ?? 0) + delta;
    if (payload.upMid && stats.videoUpIds[videoKey]) {
      const upKey = String(payload.upMid);
      stats.upSeconds[upKey] = (stats.upSeconds[upKey] ?? 0) + delta;
    }
    
    // 判断是否完整看完视频（观看时长 >= 视频总时长的90%）
    const currentTotalWatched = stats.videoSeconds[videoKey] ?? 0;
    const videoDuration = payload.duration ?? 0;
    const completionThreshold = videoDuration * 0.9; // 90%算完整看完
    
    // 计算已经完整看完的次数
    const completedCount = Math.floor(currentTotalWatched / completionThreshold);
    const previousCount = stats.videoWatchCount[videoKey] ?? 1;
    
    // 如果完整看完的次数大于当前记录的次数，更新观看次数
    if (completedCount > previousCount) {
      stats.videoWatchCount[videoKey] = completedCount;
      console.log(`[WatchStats] Video ${videoKey} completed ${completedCount} times`);
    }
  }

  stats.lastUpdate = Date.now();
  console.log("[WatchStats] Stats after update:", stats);
  await setValueFn("watchStats", stats);
  console.log("[WatchStats] Stats saved to storage");
}
