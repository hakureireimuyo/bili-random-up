/**
 * 弹幕相关 API
 */

import { apiRequest, type ApiRequestOptions } from "./request.js";

export interface Danmaku {
  p: string;
  content: string;
}

/**
 * 获取弹幕列表
 * @param cid 视频CID
 * @param options API请求选项
 */
export async function getDanmakuList(
  cid: string,
  options: ApiRequestOptions = {}
): Promise<Danmaku[]> {
  const url = `https://api.bilibili.com/x/v1/dm/list.so?oid=${cid}`;
  const data = await apiRequest<string>(url, options);

  if (!data) {
    return [];
  }

  // 解析XML格式的弹幕数据
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(data, "text/xml");
  const danmakuElements = xmlDoc.getElementsByTagName("d");

  const danmakus: Danmaku[] = [];
  for (let i = 0; i < danmakuElements.length; i++) {
    const element = danmakuElements[i];
    const p = element.getAttribute("p");
    const content = element.textContent || "";
    if (p) {
      danmakus.push({ p, content });
    }
  }

  return danmakus;
}
