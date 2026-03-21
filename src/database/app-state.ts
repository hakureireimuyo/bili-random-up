import { DBUtils, STORE_NAMES } from "./indexeddb/index.js";

interface AppMetaRecord<T = unknown> {
  key: string;
  value: T;
  updatedAt: number;
}

const appStateCache = new Map<string, unknown>();
const missingKeys = new Set<string>();

export async function setAppState<T>(key: string, value: T): Promise<void> {
  await DBUtils.put<AppMetaRecord<T>>(STORE_NAMES.APP_META, {
    key,
    value,
    updatedAt: Date.now()
  });
  appStateCache.set(key, value);
  missingKeys.delete(key);
}

export async function getAppState<T>(key: string): Promise<T | null> {
  if (appStateCache.has(key)) {
    return appStateCache.get(key) as T;
  }
  if (missingKeys.has(key)) {
    return null;
  }
  const record = await DBUtils.get<AppMetaRecord<T>>(STORE_NAMES.APP_META, key);
  if (!record) {
    missingKeys.add(key);
    return null;
  }
  appStateCache.set(key, record.value);
  return record.value;
}

export async function deleteAppState(key: string): Promise<void> {
  await DBUtils.delete(STORE_NAMES.APP_META, key);
  appStateCache.delete(key);
  missingKeys.add(key);
}

export async function clearAppStateByPrefix(prefix: string): Promise<void> {
  const records = await DBUtils.getAll<AppMetaRecord>(STORE_NAMES.APP_META);
  const keys = records.filter((record) => record.key.startsWith(prefix)).map((record) => record.key);
  if (keys.length > 0) {
    await DBUtils.deleteBatch(STORE_NAMES.APP_META, keys);
  }
  for (const key of Array.from(appStateCache.keys())) {
    if (key.startsWith(prefix)) {
      appStateCache.delete(key);
      missingKeys.add(key);
    }
  }
}

export function clearAppStateCache(): void {
  appStateCache.clear();
  missingKeys.clear();
}
