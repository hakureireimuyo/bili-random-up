/**
 * 搜索相关 API
 */

import type { VideoInfo } from "./types.js";
import { apiRequest, type ApiRequestOptions } from "./request.js";

export type SearchOrder = "click" | "pubdate" | "dm" | "stow";

/**
 * 综合搜索
 * @param keyword 关键词
 * @param page 页码
 * @param options API请求选项
 */
export async function searchAll(
  keyword: string,
  page = 1,
  options: ApiRequestOptions = {}
): Promise<any | null> {
  const url = `https://api.bilibili.com/x/web-interface/search/all/v2?keyword=${encodeURIComponent(keyword)}&page=${page}`;
  const data = await apiRequest<any>(url, options);
  return data ?? null;
}

/**
 * 视频搜索
 * @param keyword 关键词
 * @param page 页码
 * @param order 排序方式
 * @param options API请求选项
 */
export async function searchVideos(
  keyword: string,
  page = 1,
  order: SearchOrder = "click",
  options: ApiRequestOptions = {}
): Promise<VideoInfo[] | null> {
  const url = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${encodeURIComponent(keyword)}&page=${page}&order=${order}`;
  const data = await apiRequest<{ data?: { result?: any[] } }>(url, options);
  const result = data?.data?.result;
  if (!Array.isArray(result)) {
    return null;
  }

  // 将原始数据映射到 VideoInfo 结构
  return result.map((item) => ({
    bvid: item.bvid,
    title: item.title,
    pic: item.pic,
    pubdate: item.pubdate,
    duration: item.duration,
    owner: {
      mid: item.mid || item.author?.mid || item.owner?.mid,
      name: item.author?.name || item.owner?.name || '',
      face: item.author?.face || item.owner?.face || ''
    }
  }));
}
