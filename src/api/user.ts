/**
 * 用户和关注相关 API
 */

import type {
  FollowingUp,
  UpDetailInfo,
  VideoInfo,
  UserStatInfo
} from "./types.js";
import { apiRequest, type ApiRequestOptions } from "./request.js";

/**
 * 获取用户关注的UP主列表
 * @param uid 用户ID
 * @param options API请求选项
 * @param existingUPs 现有UP列表用于增量更新（可选）
 * @returns 包含所有UP和新UP数量的对象
 */
export async function getFollowedUPs(
  uid: number,
  options: ApiRequestOptions = {},
  existingUPs?: FollowingUp[]
): Promise<{ upList: FollowingUp[]; newCount: number }> {
  const pageSize = 50;
  const all: FollowingUp[] = [];
  const existingSet = new Set(existingUPs?.map(up => up.mid) || []);
  const existingUPMap = new Map(existingUPs?.map(up => [up.mid, up]) || []);
  let page = 1;
  const existingInBatchThreshold = 10; // 批次中存在10个已存储的UP时停止拉取
  let isIncremental = false; // 是否为增量更新

  while (true) {
    const url = `https://api.bilibili.com/x/relation/followings?vmid=${uid}&pn=${page}&ps=${pageSize}&order=desc`;
    const data = await apiRequest<{ list: FollowingUp[] }>(url, options);
    const list = data?.list;
    if (!Array.isArray(list) || list.length === 0) {
      break;
    }

    // Map API response to FollowingUp interface
    const upList: FollowingUp[] = list.map((item) => ({
      mid: item.mid,
      uname: item.uname,
      face: item.face
    }));

    // 判断是否为增量更新：当前批次中至少10个已关注的UP
    const existingInBatch = upList.filter(up => existingSet.has(up.mid)).length;
    if (existingInBatch >= existingInBatchThreshold) {
      isIncremental = true;
      console.log(`[API] Page ${page}: Detected incremental update (${existingInBatch} existing UPs in batch, threshold=${existingInBatchThreshold})`);
      // 如果是增量更新且当前批次中有足够多的已存在UP，停止拉取
      break;
    }

    all.push(...upList);
    if (list.length < pageSize) {
      break;
    }
    page += 1;
  }

  // 合并策略：
  // 1. 如果是增量更新，保留本地已有数据，只添加新的UP
  // 2. 如果不是增量更新，使用新获取的数据
  let finalUPList: FollowingUp[];

  if (isIncremental && existingUPs && existingUPs.length > 0) {
    // 增量更新：合并本地已有数据和新数据
    const mergedUPMap = new Map(existingUPMap); // 复制本地数据

    // 添加新获取的UP数据（已存在的会更新，不存在的会添加）
    for (const up of all) {
      mergedUPMap.set(up.mid, up);
    }

    finalUPList = Array.from(mergedUPMap.values());
    console.log(`[API] Incremental update: merged ${existingUPs.length} existing + ${all.length} fetched = ${finalUPList.length} total`);
  } else {
    // 全量更新：使用新获取的数据
    finalUPList = all;
    console.log(`[API] Full update: using ${all.length} fetched UPs`);
  }

  // Calculate new UPs (相对于本地已有数据)
  const newUPs = finalUPList.filter(up => !existingSet.has(up.mid));
  console.log("[API] Total UPs fetched:", all.length, "New UPs:", newUPs.length, "Is Incremental:", isIncremental);

  return { upList: finalUPList, newCount: newUPs.length };
}

/**
 * Fetch videos of a specific UP.
 */
export async function getUPVideos(
  mid: number,
  options: ApiRequestOptions = {}
): Promise<VideoInfo[]> {
  const url = `https://api.bilibili.com/x/space/arc/search?mid=${mid}&pn=1&ps=30&order=pubdate`;
  const data = await apiRequest<{ data?: { list?: { vlist?: any[] } } }>(
    url,
    options
  );
  const list = data?.data?.list?.vlist;
  if (!Array.isArray(list)) {
    return [];
  }

  // 将原始数据映射到 VideoInfo 结构
  return list.map((item) => ({
    bvid: item.bvid,
    title: item.title,
    pic: item.pic,
    pubdate: item.created || item.pubdate,
    duration: item.length || item.duration,
    owner: {
      mid: item.mid || mid,
      name: item.author || item.owner?.name || '',
      face: item.face || item.owner?.face || ''
    }
  }));
}

/**
 * 获取UP主详细信息
 * @param mid UP主ID
 * @param options API请求选项
 */
export async function getUPInfo(
  mid: number,
  options: ApiRequestOptions = {}
): Promise<UpDetailInfo | null> {
  const url = `https://api.bilibili.com/x/space/acc/info?mid=${mid}`;
  const data = await apiRequest<UpDetailInfo>(url, options);
  return data ?? null;
}

/**
 * 获取粉丝数量
 * @param vmid 用户ID
 * @param options API请求选项
 */
export async function getFollowStat(
  vmid: number,
  options: ApiRequestOptions = {}
): Promise<UserStatInfo | null> {
  const url = `https://api.bilibili.com/x/relation/stat?vmid=${vmid}`;
  const data = await apiRequest<{ data?: UserStatInfo }>(url, options);
  return data?.data ?? null;
}
