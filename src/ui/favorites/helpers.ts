import type { FavoritesPageState } from "./types.js";

export function createInitialFavoritesState(): FavoritesPageState {
  return {
    loading: false,
    collectionType: "user",
    selectedCollectionId: "all",
    searchKeyword: "",
    tagKeyword: "",
    includeTagIds: [],
    excludeTagIds: [],
    currentPage: 0,
    pageSize: 10
  };
}

export function resetFavoriteFilters(state: FavoritesPageState): void {
  state.searchKeyword = "";
  state.tagKeyword = "";
  state.includeTagIds = [];
  state.excludeTagIds = [];
  state.currentPage = 0;
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatDate(timestamp?: number): string {
  if (!timestamp) {
    return "-";
  }

  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function parseFavoriteSearch(keyword: string): { titleTerms: string[]; creatorTerms: string[] } {
  const tokens = keyword
    .split(/\s+/)
    .map(token => token.trim())
    .filter(Boolean);

  const creatorTerms: string[] = [];
  const titleTerms: string[] = [];

  tokens.forEach((token) => {
    if (token.startsWith("@") && token.length > 1) {
      creatorTerms.push(token.slice(1).toLowerCase());
    } else {
      titleTerms.push(token.toLowerCase());
    }
  });

  return { titleTerms, creatorTerms };
}
