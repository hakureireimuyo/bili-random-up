/**
 * UID detection helpers for tests.
 */

export function extractUidFromWindow(
  win: Window & { __INITIAL_STATE__?: { user?: { mid?: number } } }
): number | null {
  const mid = win.__INITIAL_STATE__?.user?.mid;
  return typeof mid === "number" && mid > 0 ? mid : null;
}
