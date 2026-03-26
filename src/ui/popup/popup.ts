import { navigateToStats, navigateToTestTools, navigateToOptions } from "./popup-progress.js";
import { openExtensionPage } from "./popup-runtime.js";

function formatTime(timestamp: number | null): string {
  if (!timestamp) {
    return "-";
  }
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${date
    .getHours()
    .toString()
    .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function setText(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
}

async function loadStatus(): Promise<void> {

}

function bindButtons(): void {
  document.getElementById("btn-stats")?.addEventListener("click", () => navigateToStats());
  document.getElementById("btn-watch-stats")?.addEventListener("click", () => navigateToTestTools());
  document.getElementById("btn-favorites")?.addEventListener("click", () => navigateToTestTools());
  document.getElementById("btn-interest-stats")?.addEventListener("click", () => navigateToTestTools());
  document.getElementById("btn-settings")?.addEventListener("click", () => navigateToOptions());
}

export function initPopup(): void {
  if (typeof document === "undefined") {
    return;
  }
  bindButtons();
  void loadStatus();
}

if (typeof document !== "undefined") {
  initPopup();
}
