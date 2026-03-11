/**
 * Storage helpers based on chrome.storage.local.
 */
function getDefaultStorage() {
    return chrome.storage;
}
/**
 * Set a value in storage.
 */
export async function setValue(key, value, options = {}) {
    const storage = options.storage ?? getDefaultStorage();
    console.log("[Storage] Set", key);
    await storage.local.set({ [key]: value });
}
/**
 * Get a value from storage.
 */
export async function getValue(key, options = {}) {
    const storage = options.storage ?? getDefaultStorage();
    const result = await storage.local.get(key);
    const value = result[key];
    return value ?? null;
}
/**
 * Save UP list cache.
 */
export async function saveUPList(upList, options = {}) {
    const payload = { upList, lastUpdate: Date.now() };
    await setValue("upList", payload, options);
}
/**
 * Load UP list cache.
 */
export async function loadUPList(options = {}) {
    return getValue("upList", options);
}
/**
 * Save video cache for a specific UP.
 */
export async function saveVideoCache(mid, videos, options = {}) {
    const cache = (await getValue("videoCache", options)) ?? {};
    cache[String(mid)] = { videos, lastUpdate: Date.now() };
    await setValue("videoCache", cache, options);
}
/**
 * Load video cache for a specific UP.
 */
export async function loadVideoCache(mid, options = {}) {
    const cache = await getValue("videoCache", options);
    if (!cache) {
        return null;
    }
    return cache[String(mid)] ?? null;
}
/**
 * Update interest score for a tag.
 */
export async function updateInterest(tag, score, options = {}) {
    const profile = (await getValue("interestProfile", options)) ?? {};
    const existing = profile[tag]?.score ?? 0;
    const next = { tag, score: existing + score };
    profile[tag] = next;
    await setValue("interestProfile", profile, options);
    return next;
}
