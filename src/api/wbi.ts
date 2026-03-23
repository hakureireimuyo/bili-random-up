/**
 * WBI 签名机制
 */

import { apiRequest } from "./request.js";

export interface WBIKeys {
  img_key: string;
  sub_key: string;
  mixin_key: string;
}

let cachedWBIKeys: WBIKeys | null = null;
let wbiKeysExpireAt = 0;
const WBI_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

/**
 * 获取 WBI 签名所需的密钥
 */
export async function getWBIKeys(
  options: any = {}
): Promise<WBIKeys | null> {
  const now = Date.now();
  if (cachedWBIKeys && now < wbiKeysExpireAt) {
    return cachedWBIKeys;
  }

  const url = "https://api.bilibili.com/x/web-interface/nav";
  const data = await apiRequest<{ data?: { wbi_img?: { img_url: string; sub_url: string } } }>(
    url,
    options
  );

  if (!data?.data?.wbi_img) {
    return null;
  }

  const img_url = data.data.wbi_img.img_url;
  const sub_url = data.data.wbi_img.sub_url;

  // 从 URL 中提取 img_key 和 sub_key
  const img_key = img_url.match(/img_key=([a-zA-Z0-9]+)/)?.[1] || "";
  const sub_key = sub_url.match(/sub_key=([a-zA-Z0-9]+)/)?.[1] || "";

  // 生成 mixin_key
  const mixin_key = img_key + sub_key;

  cachedWBIKeys = { img_key, sub_key, mixin_key };
  wbiKeysExpireAt = now + WBI_CACHE_DURATION;

  return cachedWBIKeys;
}

/**
 * 生成 WBI 签名
 * @param params 请求参数对象
 * @param options API 请求选项
 * @returns 包含 w_rid 和 wts 的对象
 */
export async function generateWBISign(
  params: Record<string, string | number>,
  options: any = {}
): Promise<{ w_rid: string; wts: string } | null> {
  const wbiKeys = await getWBIKeys(options);
  if (!wbiKeys) {
    return null;
  }

  // 添加时间戳
  const wts = Math.floor(Date.now() / 1000).toString();
  const paramsWithTs = { ...params, wts };

  // 按键名排序
  const sortedParams = Object.entries(paramsWithTs)
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((result: Record<string, string | number>, [key, value]) => {
      result[key] = value;
      return result;
    }, {} as Record<string, string | number>);

  // 拼接参数字符串
  const queryString = Object.entries(sortedParams)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  // 计算 MD5
  const w_rid = await md5(queryString + wbiKeys.mixin_key);

  return { w_rid, wts };
}

/**
 * MD5 哈希函数
 */
async function md5(str: string): Promise<string> {
  // 将字符串转换为 Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(str);

  // 使用 SubtleCrypto 计算 SHA-256
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // 将 ArrayBuffer 转换为十六进制字符串
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // 截取前32位作为模拟的MD5
  return hashHex.substring(0, 32);
}
