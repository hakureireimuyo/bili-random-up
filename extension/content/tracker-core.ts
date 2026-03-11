/**
 * Tracker helpers for tests.
 */

export interface WatchEvent {
  bvid: string;
  watch_time: number;
  duration: number;
  ratio: number;
}

export function extractBvidFromUrl(url: string): string | null {
  const match = url.match(/\/video\/(BV[a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export function watchRatio(currentTime: number, duration: number): number {
  if (duration <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, currentTime / duration));
}

export function trackVideoPlayback(
  video: HTMLVideoElement,
  bvid: string,
  sendFn: (event: WatchEvent) => void
): void {
  let sent = false;

  const buildWatchEvent = (currentTime: number, duration: number): WatchEvent => ({
    bvid,
    watch_time: currentTime,
    duration,
    ratio: watchRatio(currentTime, duration)
  });

  const maybeSend = () => {
    if (sent) return;
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
