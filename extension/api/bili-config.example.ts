/**
 * B站API配置示例文件
 * 
 * 使用方法：
 * 1. 复制此文件为 bili-config.ts
 * 2. 填入你的Cookie和其他认证信息
 */

import { BiliAuthConfig } from "./bili-config.js";

export const authConfig: BiliAuthConfig = {
  // 从浏览器开发者工具中复制的Cookie
  // 必须包含：SESSDATA, bili_jct, DedeUserID 等关键字段
  cookie: 'SESSDATA=YOUR_SESSDATA_HERE; bili_jct=YOUR_BILI_JCT_HERE; DedeUserID=YOUR_DEDEUSERID_HERE; ...',

  // 可选：自定义请求头
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.bilibili.com'
  }
};

/**
 * 获取认证头
 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json'
  };

  if (authConfig.cookie) {
    headers['Cookie'] = authConfig.cookie;
  }

  if (authConfig.headers) {
    Object.assign(headers, authConfig.headers);
  }

  return headers;
}

/**
 * 设置认证配置
 */
export function setAuthConfig(config: Partial<BiliAuthConfig>): void {
  Object.assign(authConfig, config);
}
