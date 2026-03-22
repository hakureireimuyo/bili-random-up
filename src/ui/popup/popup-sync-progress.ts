import { addRuntimeListener, hasChromeRuntime, removeRuntimeListener } from "./popup-runtime.js";

type ProgressPayload = {
  current: number;
  total: number;
  title?: string;
  detail?: string;
  text?: string;
  stopping?: boolean;
};
type ProgressMessage = { type: string; payload?: unknown };

let syncProgressListener: ((message: unknown) => void) | null = null;
let syncProgressTimeoutId: number | null = null;

export function showSyncProgress(): void {
  const button = document.getElementById("btn-sync-favorites");
  if (button) {
    button.classList.add("is-running");
  }
}

export function hideSyncProgress(): void {
  const button = document.getElementById("btn-sync-favorites");
  if (button) {
    button.classList.remove("is-running", "is-stopping");
  }
  setSyncButtonText("同步收藏", "同步B站收藏到本地", "开始");
  setSyncProgressFill(0);
  if (syncProgressTimeoutId !== null) {
    clearTimeout(syncProgressTimeoutId);
    syncProgressTimeoutId = null;
  }
}

function setSyncButtonText(title: string, detail: string, count: string): void {
  const titleEl = document.getElementById("sync-button-title");
  const detailEl = document.getElementById("sync-button-detail");
  const countEl = document.getElementById("sync-button-count");

  if (titleEl) titleEl.textContent = title;
  if (detailEl) detailEl.textContent = detail;
  if (countEl) countEl.textContent = count;
}

function setSyncProgressFill(percentage: number): void {
  const progressFill = document.getElementById("sync-button-fill");
  if (progressFill) {
    progressFill.style.width = `${percentage}%`;
  }
}

export function updateSyncProgress(payload: ProgressPayload): void {
  const button = document.getElementById("btn-sync-favorites");
  if (button) {
    button.classList.toggle("is-stopping", Boolean(payload.stopping));
  }

  const title = payload.title ?? (payload.stopping ? "正在停止同步" : "同步收藏");
  const detail = payload.detail ?? payload.text ?? "准备中...";
  const count = payload.total > 0 ? `${payload.current}/${payload.total}` : payload.stopping ? "停止中" : "运行中";
  const percentage = payload.total > 0 ? (payload.current / payload.total) * 100 : 12;

  setSyncButtonText(title, detail, count);
  setSyncProgressFill(percentage);
}

function detachSyncListener(): void {
  if (syncProgressListener) {
    removeRuntimeListener(syncProgressListener);
    syncProgressListener = null;
  }
}

export function bindSyncProgressListener(onComplete: () => void): void {
  if (!hasChromeRuntime()) {
    return;
  }

  detachSyncListener();
  syncProgressListener = (message: unknown) => {
    const msg = message as ProgressMessage;
    if (msg.type === "sync_progress") {
      const payload = msg.payload as ProgressPayload;
      showSyncProgress();
      updateSyncProgress(payload);
      return;
    }
    if (msg.type === "sync_complete") {
      hideSyncProgress();
      detachSyncListener();
      onComplete();
    }
  };
  addRuntimeListener(syncProgressListener);
}

export function armSyncProgressTimeout(): void {
  syncProgressTimeoutId = window.setTimeout(() => {
    hideSyncProgress();
    detachSyncListener();
  }, 5 * 60 * 1000);
}
