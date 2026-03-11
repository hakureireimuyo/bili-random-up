import {
  extractBvidFromUrl,
  trackVideoPlayback,
  watchRatio
} from "../content/tracker-core.js";
import { assert, test } from "../tests/test-runner.js";

class FakeVideo {
  currentTime = 0;
  duration = 0;
  listeners: Record<string, (() => void)[]> = {};

  addEventListener(event: string, handler: () => void) {
    this.listeners[event] = this.listeners[event] ?? [];
    this.listeners[event].push(handler);
  }

  emit(event: string) {
    for (const handler of this.listeners[event] ?? []) {
      handler();
    }
  }
}

test("extractBvidFromUrl returns BV id", () => {
  const bvid = extractBvidFromUrl("https://www.bilibili.com/video/BV1abc123");
  assert(bvid === "BV1abc123", "expected BV1abc123");
});

test("watchRatio clamps values", () => {
  assert(watchRatio(50, 100) === 0.5, "expected 0.5");
  assert(watchRatio(150, 100) === 1, "expected 1");
  assert(watchRatio(-1, 100) === 0, "expected 0");
});

test("trackVideoPlayback sends event on ended", () => {
  const video = new FakeVideo();
  video.currentTime = 80;
  video.duration = 100;
  let sent = 0;
  trackVideoPlayback(video as unknown as HTMLVideoElement, "BV1", () => {
    sent += 1;
  });
  video.emit("ended");
  assert(sent === 1, "expected one event sent");
});

test("trackVideoPlayback sends event on pause near completion", () => {
  const video = new FakeVideo();
  video.currentTime = 95;
  video.duration = 100;
  let sent = 0;
  trackVideoPlayback(video as unknown as HTMLVideoElement, "BV1", () => {
    sent += 1;
  });
  video.emit("pause");
  assert(sent === 1, "expected one event sent");
});
