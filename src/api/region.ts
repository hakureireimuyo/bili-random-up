/**
 * 分区相关 API
 */

import type { VideoInfo } from "./types.js";
import { apiRequest, type ApiRequestOptions } from "./request.js";

/**
 * 获取分区视频
 * @param rid 分区ID
 * @param pn 页码
 * @param ps 每页数量
 * @param options API请求选项
 */
export async function getRegionVideos(
  rid: string,
  pn = 1,
  ps = 20,
  options: ApiRequestOptions = {}
): Promise<VideoInfo[]> {
  const url = `https://api.bilibili.com/x/web-interface/dynamic/region?rid=${rid}&pn=${pn}&ps=${ps}`;
  const data = await apiRequest<{ data?: { archives?: any[] } }>(url, options);
  const archives = data?.data?.archives;
  if (!Array.isArray(archives)) {
    return [];
  }

  // 将原始数据映射到 VideoInfo 结构
  return archives.map((item) => ({
    bvid: item.bvid,
    title: item.title,
    pic: item.pic,
    pubdate: item.pubdate,
    duration: item.duration,
    owner: {
      mid: item.owner?.mid,
      name: item.owner?.name,
      face: item.owner?.face
    }
  }));
}

/**
 * 获取排行榜
 * @param rid 分区ID
 * @param day 天数
 * @param options API请求选项
 */
export async function getRanking(
  rid = "0",
  day = 3,
  options: ApiRequestOptions = {}
): Promise<VideoInfo[]> {
  const url = `https://api.bilibili.com/x/web-interface/ranking?rid=${rid}&day=${day}`;
  const data = await apiRequest<{ data?: { list?: any[] } }>(url, options);
  const list = data?.data?.list;
  if (!Array.isArray(list)) {
    return [];
  }

  // 将原始数据映射到 VideoInfo 结构
  return list.map((item) => ({
    bvid: item.bvid,
    title: item.title,
    pic: item.pic,
    pubdate: item.pubdate,
    duration: item.duration,
    owner: {
      mid: item.owner?.mid,
      name: item.owner?.name,
      face: item.owner?.face
    }
  }));
}
