/**
 * Bilibili API wrappers.
 */
const DEFAULT_MIN_INTERVAL_MS = 200;
let lastRequestAt = 0;
/**
 * Simple delay helper.
 */
export function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Rate limiter for API requests.
 */
export async function rateLimiter(minIntervalMs = DEFAULT_MIN_INTERVAL_MS) {
    const now = Date.now();
    const waitTime = Math.max(0, lastRequestAt + minIntervalMs - now);
    if (waitTime > 0) {
        console.log("[API] Rate limit wait", waitTime);
        await delay(waitTime);
    }
    lastRequestAt = Date.now();
}
/**
 * Unified API request helper.
 */
export async function apiRequest(url, options = {}) {
    const fetchFn = options.fetchFn || fetch;
    const fetchInit = {
        credentials: "include",
        mode: "cors",
        headers: {
            Accept: "application/json, text/plain, */*"
        },
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
                return fallback ?? null;
            }
            return null;
        }
        const data = (await response.json());
        return data;
    }
    catch (error) {
        console.error("[API] Request error", error, url);
        return null;
    }
}
/**
 * Fetch followed UP list for a user.
 */
export async function getFollowedUPs(uid, options = {}) {
    const pageSize = 50;
    const all = [];
    let page = 1;
    while (true) {
        const url = `https://api.bilibili.com/x/relation/followings?vmid=${uid}&pn=${page}&ps=${pageSize}&order=desc`;
        const data = await apiRequest(url, options);
        const list = data?.data?.list;
        if (!Array.isArray(list) || list.length === 0) {
            break;
        }
        all.push(...list);
        if (list.length < pageSize) {
            break;
        }
        page += 1;
    }
    return all;
}
/**
 * Fetch videos of a specific UP.
 */
export async function getUPVideos(mid, options = {}) {
    const url = `https://api.bilibili.com/x/space/arc/search?mid=${mid}&pn=1&ps=30&order=pubdate`;
    const data = await apiRequest(url, options);
    const list = data?.data?.list?.vlist;
    return Array.isArray(list) ? list : [];
}
/**
 * Fetch tags for a video by bvid.
 */
export async function getVideoTags(bvid, options = {}) {
    const url = `https://api.bilibili.com/x/tag/archive/tags?bvid=${bvid}`;
    const data = await apiRequest(url, options);
    const tags = data?.data;
    if (!Array.isArray(tags)) {
        return [];
    }
    return tags
        .map((tag) => tag?.tag_name)
        .filter((tagName) => Boolean(tagName));
}
/**
 * Fetch profile info for a specific UP.
 */
export async function getUPInfo(mid, options = {}) {
    const url = `https://api.bilibili.com/x/space/acc/info?mid=${mid}`;
    const data = await apiRequest(url, options);
    return data?.data ?? null;
}
/**
 * Reset internal rate limiter (for tests).
 */
export function __resetRateLimiter() {
    lastRequestAt = 0;
}
