import { getFavoritesManager } from "./FavoritesManager.js";

export async function initFavorites(): Promise<void> {
  await getFavoritesManager().init();
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void initFavorites(), { once: true });
  } else {
    void initFavorites();
  }
}
