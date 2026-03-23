/**
 * 基础请求工具
 */

import type { BiliResponse } from "./types.js";
import { getValue } from "../database/implementations/index.js";

export type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface ApiRequestOptions {
  fetchFn?: FetchFn;
  fetchInit?: RequestInit;
  fallbackRequest?: (url: string) => Promise<unknown | null>;
}

const DEFAULT_MIN_INTERVAL_MS = 200;
let lastRequestAt = 0;

/**
 * Simple delay helper.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Rate limiter for API requests.
 */
export async function rateLimiter(
  minIntervalMs: number = DEFAULT_MIN_INTERVAL_MS
): Promise<void> {
  const now = Date.now();
  const waitTime = Math.max(0, lastRequestAt + minIntervalMs - now);
  if (waitTime > 0) {
    console.log("[API] Rate limit wait", waitTime);
    await delay(waitTime);
  }
  lastRequestAt = Date.now();
}

/**
 * Reset internal rate limiter (for tests).
 */
export function __resetRateLimiter(): void {
  lastRequestAt = 0;
}

/**
 * Get authentication headers
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Accept": "application/json, text/plain, */*",
    "Content-Type": "application/json"
  };

  try {
    const settings = await getValue<{ biliCookie?: string }>("settings");
    if (settings?.biliCookie) {
      headers["Cookie"] = settings.biliCookie;
    }
  } catch (error) {
    console.error("[API] Failed to get settings:", error);
  }

  return headers;
}

/**
 * Unified API request helper.
 */
export async function apiRequest<T>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T | null> {
  const fetchFn = options.fetchFn || (fetch as unknown as FetchFn);
  const authHeaders = await getAuthHeaders();
  const fetchInit: RequestInit = {
    credentials: "include",
    mode: "cors",
    headers: authHeaders,
    ...(options.fetchInit ?? {})
  };
  try {
    await rateLimiter();
    console.log("[API] Request", url);
    const response = await fetchFn(url, fetchInit);
    if (!response.ok) {
      console.error("[API] Request failed", response.status, url);
      if (response.status === 412 && options.fallbackRequest) {
        const fallback = await options.fallbackRequest(url);
        return (fallback as T | null) ?? null;
      }
      return null;
    }
    const data = (await response.json()) as BiliResponse<T>;
    // 检查API返回的code
    if (data.code !== 0) {
      console.error("[API] API error", data.code, data.message, url);
      return null;
    }
    return data.data;
  } catch (error) {
    console.error("[API] Request error", error, url);
    return null;
  }
}

export type { ApiRequestOptions };
