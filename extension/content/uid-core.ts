/**
 * UID detection helpers for tests.
 */

export function extractUidFromWindow(
  win: Window & { __INITIAL_STATE__?: { user?: { mid?: number } } }
): number | null {
  const mid = win.__INITIAL_STATE__?.user?.mid;
  return typeof mid === "number" && mid > 0 ? mid : null;
}

export function extractUidFromMessage(data: unknown): number | null {
  const payload = data as { source?: string; type?: string; uid?: unknown };
  if (payload?.source !== "bde" || payload?.type !== "uid_detected") {
    return null;
  }
  const uid = payload.uid;
  return typeof uid === "number" && uid > 0 ? uid : null;
}
