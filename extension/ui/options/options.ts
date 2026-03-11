/**
 * Options page logic.
 */

import { getValue, setValue } from "../../storage/storage.js";

export type HomeMode = "random_up" | "recommend";
export type ClassifyMode = "tag" | "llm";

export interface Settings {
  homeMode: HomeMode;
  classifyMode: ClassifyMode;
  cacheHours: number;
  userId: number | null;
  apiBaseUrl: string;
  apiModel: string;
  apiKey: string;
}

export const DEFAULT_SETTINGS: Settings = {
  homeMode: "random_up",
  classifyMode: "tag",
  cacheHours: 24,
  userId: null,
  apiBaseUrl: "https://api.openai.com",
  apiModel: "gpt-4o-mini",
  apiKey: ""
};

export function normalizeSettings(input: Partial<Settings>): Settings {
  const homeMode =
    input.homeMode === "recommend" || input.homeMode === "random_up"
      ? input.homeMode
      : DEFAULT_SETTINGS.homeMode;
  const classifyMode =
    input.classifyMode === "llm" || input.classifyMode === "tag"
      ? input.classifyMode
      : DEFAULT_SETTINGS.classifyMode;
  const cacheHoursRaw = Number(input.cacheHours ?? DEFAULT_SETTINGS.cacheHours);
  const cacheHours = Math.min(168, Math.max(1, cacheHoursRaw));
  const userIdRaw = Number(input.userId);
  const userId =
    Number.isFinite(userIdRaw) && userIdRaw > 0 ? userIdRaw : null;
  const apiBaseUrl = String(input.apiBaseUrl ?? DEFAULT_SETTINGS.apiBaseUrl).trim();
  const apiModel = String(input.apiModel ?? DEFAULT_SETTINGS.apiModel).trim();
  const apiKey = String(input.apiKey ?? DEFAULT_SETTINGS.apiKey).trim();

  return {
    homeMode,
    classifyMode,
    cacheHours,
    userId,
    apiBaseUrl,
    apiModel,
    apiKey
  };
}

function showStatus(text: string): void {
  const status = document.getElementById("status");
  if (status) {
    status.textContent = text;
  }
}

async function loadSettings(): Promise<Settings> {
  const saved = (await getValue<Settings>("settings")) ?? DEFAULT_SETTINGS;
  return normalizeSettings(saved);
}

async function saveSettings(settings: Settings): Promise<void> {
  await setValue("settings", settings);
}

export async function initOptions(): Promise<void> {
  if (typeof document === "undefined") {
    return;
  }

  const homeModeEl = document.getElementById("home-mode") as HTMLSelectElement | null;
  const classifyModeEl = document.getElementById("classify-mode") as HTMLSelectElement | null;
  const cacheHoursEl = document.getElementById("cache-hours") as HTMLInputElement | null;
  const userIdEl = document.getElementById("user-id") as HTMLInputElement | null;
  const apiBaseUrlEl = document.getElementById("api-base-url") as HTMLInputElement | null;
  const apiModelEl = document.getElementById("api-model") as HTMLInputElement | null;
  const apiKeyEl = document.getElementById("api-key") as HTMLInputElement | null;
  const saveBtn = document.getElementById("save-btn");

  const settings = await loadSettings();
  if (homeModeEl) homeModeEl.value = settings.homeMode;
  if (classifyModeEl) classifyModeEl.value = settings.classifyMode;
  if (cacheHoursEl) cacheHoursEl.value = String(settings.cacheHours);
  if (userIdEl && settings.userId) userIdEl.value = String(settings.userId);
  if (apiBaseUrlEl) apiBaseUrlEl.value = settings.apiBaseUrl;
  if (apiModelEl) apiModelEl.value = settings.apiModel;
  if (apiKeyEl) apiKeyEl.value = settings.apiKey;

  saveBtn?.addEventListener("click", async () => {
    const next = normalizeSettings({
      homeMode: (homeModeEl?.value as HomeMode) ?? DEFAULT_SETTINGS.homeMode,
      classifyMode:
        (classifyModeEl?.value as ClassifyMode) ?? DEFAULT_SETTINGS.classifyMode,
      cacheHours: Number(cacheHoursEl?.value ?? DEFAULT_SETTINGS.cacheHours),
      userId: Number(userIdEl?.value ?? DEFAULT_SETTINGS.userId),
      apiBaseUrl: String(apiBaseUrlEl?.value ?? DEFAULT_SETTINGS.apiBaseUrl),
      apiModel: String(apiModelEl?.value ?? DEFAULT_SETTINGS.apiModel),
      apiKey: String(apiKeyEl?.value ?? DEFAULT_SETTINGS.apiKey)
    });
    await saveSettings(next);
    showStatus("已保存");
  });
}

if (typeof document !== "undefined") {
  void initOptions();
}
