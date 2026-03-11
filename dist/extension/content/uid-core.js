/**
 * UID detection helpers for tests.
 */
export function extractUidFromWindow(win) {
    const mid = win.__INITIAL_STATE__?.user?.mid;
    return typeof mid === "number" && mid > 0 ? mid : null;
}
export function extractUidFromMessage(data) {
    const payload = data;
    if (payload?.source !== "bde" || payload?.type !== "uid_detected") {
        return null;
    }
    const uid = payload.uid;
    return typeof uid === "number" && uid > 0 ? uid : null;
}
