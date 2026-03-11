"use strict";
/**
 * Detect Bilibili user UID from page context.
 */
function extractUidFromWindow(win) {
    const mid = win.__INITIAL_STATE__?.user?.mid;
    return typeof mid === "number" && mid > 0 ? mid : null;
}
function initUidDetector() {
    if (typeof window === "undefined") {
        return;
    }
    const uid = extractUidFromWindow(window);
    if (!uid) {
        return;
    }
    console.log("[UID] Detected user", uid);
    chrome.runtime.sendMessage({ type: "detect_uid", payload: { uid } });
}
if (typeof window !== "undefined") {
    initUidDetector();
}
