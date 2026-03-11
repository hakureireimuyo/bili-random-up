"use strict";
/**
 * Track video pages and report watch events.
 */
function extractBvidFromUrl(url) {
    const match = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}
function watchRatio(currentTime, duration) {
    if (duration <= 0) {
        return 0;
    }
    return Math.min(1, Math.max(0, currentTime / duration));
}
function detectVideoElement() {
    return document.querySelector("video");
}
function buildWatchEvent(bvid, currentTime, duration) {
    return {
        bvid,
        watch_time: currentTime,
        duration,
        ratio: watchRatio(currentTime, duration)
    };
}
function sendWatchEvent(event) {
    console.log("[Tracker] Send watch event", event);
    chrome.runtime.sendMessage({ type: "watch_event", payload: event });
}
function trackVideoPlayback(video, bvid, sendFn) {
    let sent = false;
    const maybeSend = () => {
        if (sent)
            return;
        const event = buildWatchEvent(bvid, video.currentTime, video.duration);
        if (event.watch_time <= 0) {
            return;
        }
        sent = true;
        sendFn(event);
    };
    video.addEventListener("ended", maybeSend);
    video.addEventListener("pause", () => {
        const ratio = watchRatio(video.currentTime, video.duration);
        if (ratio >= 0.9) {
            maybeSend();
        }
    });
}
function initTracker() {
    if (typeof window === "undefined" || typeof document === "undefined") {
        return;
    }
    const bvid = extractBvidFromUrl(window.location.href);
    if (!bvid) {
        return;
    }
    console.log(`[Tracker] Video detected: ${bvid}`);
    const video = detectVideoElement();
    if (!video) {
        console.log("[Tracker] Video element not found");
        return;
    }
    trackVideoPlayback(video, bvid, sendWatchEvent);
}
if (typeof window !== "undefined" && typeof document !== "undefined") {
    initTracker();
}
