/**
 * 评论相关 API
 */

import { apiRequest, type ApiRequestOptions } from "./request.js";

/**
 * 获取评论列表
 * @param oid 视频ID
 * @param type 类型（1表示视频）
 * @param options API请求选项
 */
export async function getComments(
  oid: string,
  type = 1,
  options: ApiRequestOptions = {}
): Promise<any[]> {
  const url = `https://api.bilibili.com/x/v2/reply/main?oid=${oid}&type=${type}`;
  const data = await apiRequest<{ data?: { replies?: any[] } }>(url, options);
  return data?.data?.replies ?? [];
}
