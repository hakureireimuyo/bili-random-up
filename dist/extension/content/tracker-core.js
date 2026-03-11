/**
 * Tracker helpers for tests.
 */
export function extractBvidFromUrl(url) {
    const match = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
    return match ? match[1] : null;
}
export function watchRatio(currentTime, duration) {
    if (duration <= 0) {
        return 0;
    }
    return Math.min(1, Math.max(0, currentTime / duration));
}
export function trackVideoPlayback(video, bvid, sendFn) {
    let sent = false;
    const buildWatchEvent = (currentTime, duration) => ({
        bvid,
        watch_time: currentTime,
        duration,
        ratio: watchRatio(currentTime, duration)
    });
    const maybeSend = () => {
        if (sent)
            return;
        const event = buildWatchEvent(video.currentTime, video.duration);
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
