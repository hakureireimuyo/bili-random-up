/**
 * Storage helpers based on chrome.storage.local.
 */

export interface StorageArea {
  get: (keys?: string | string[] | Record<string, unknown>) => Promise<Record<string, unknown>>;
  set: (items: Record<string, unknown>) => Promise<void>;
}

export interface StorageProvider {
  local: StorageArea;
}

export interface UP {
  mid: number;
  name: string;
  face: string;
  sign: string;
  follow_time: number;
}

export interface Video {
  bvid: string;
  aid: number;
  title: string;
  play: number;
  duration: number;
  pubdate: number;
  tags: string[];
}

export interface UPCache {
  upList: UP[];
  lastUpdate: number;
}

export interface VideoCacheEntry {
  videos: Video[];
  lastUpdate: number;
}

export type VideoCache = Record<string, VideoCacheEntry>;

export interface UserInterest {
  tag: string;
  score: number;
}

export type InterestProfile = Record<string, UserInterest>;

interface StorageOptions {
  storage?: StorageProvider;
}

function getDefaultStorage(): StorageProvider {
  return chrome.storage as StorageProvider;
}

declare const chrome: { storage: StorageProvider };

/**
 * Set a value in storage.
 */
export async function setValue<T>(
  key: string,
  value: T,
  options: StorageOptions = {}
): Promise<void> {
  const storage = options.storage ?? getDefaultStorage();
  console.log("[Storage] Set", key);
  await storage.local.set({ [key]: value });
}

/**
 * Get a value from storage.
 */
export async function getValue<T>(
  key: string,
  options: StorageOptions = {}
): Promise<T | null> {
  const storage = options.storage ?? getDefaultStorage();
  const result = await storage.local.get(key);
  const value = result[key] as T | undefined;
  return value ?? null;
}

/**
 * Save UP list cache.
 */
export async function saveUPList(
  upList: UP[],
  options: StorageOptions = {}
): Promise<void> {
  const payload: UPCache = { upList, lastUpdate: Date.now() };
  await setValue("upList", payload, options);
}

/**
 * Load UP list cache.
 */
export async function loadUPList(
  options: StorageOptions = {}
): Promise<UPCache | null> {
  return getValue<UPCache>("upList", options);
}

/**
 * Save video cache for a specific UP.
 */
export async function saveVideoCache(
  mid: number,
  videos: Video[],
  options: StorageOptions = {}
): Promise<void> {
  const cache = (await getValue<VideoCache>("videoCache", options)) ?? {};
  cache[String(mid)] = { videos, lastUpdate: Date.now() };
  await setValue("videoCache", cache, options);
}

/**
 * Load video cache for a specific UP.
 */
export async function loadVideoCache(
  mid: number,
  options: StorageOptions = {}
): Promise<VideoCacheEntry | null> {
  const cache = await getValue<VideoCache>("videoCache", options);
  if (!cache) {
    return null;
  }
  return cache[String(mid)] ?? null;
}

/**
 * Update interest score for a tag.
 */
export async function updateInterest(
  tag: string,
  score: number,
  options: StorageOptions = {}
): Promise<UserInterest> {
  const profile = (await getValue<InterestProfile>("interestProfile", options)) ?? {};
  const existing = profile[tag]?.score ?? 0;
  const next: UserInterest = { tag, score: existing + score };
  profile[tag] = next;
  await setValue("interestProfile", profile, options);
  return next;
}
