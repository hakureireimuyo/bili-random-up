import type { ID, PaginationResult } from "../../database/types/base.js";
import type { CollectionType } from "../../database/types/collection.js";

export type FavoritesCollectionSelection = ID | "all";

export interface FavoriteCollectionSummary {
  collectionId: ID;
  name: string;
  description?: string;
  type: CollectionType;
  videoCount: number;
  validVideoCount: number;
  invalidVideoCount: number;
  lastAddedAt?: number;
}

export interface FavoriteTagSummary {
  tagId: ID;
  name: string;
  count: number;
}

export interface FavoriteVideoListItem {
  videoId: ID;
  creatorId: ID;
  creatorName: string;
  title: string;
  description: string;
  duration: number;
  publishTime: number;
  bv: string;
  coverUrl?: string;
  tagIds: ID[];
  tags: FavoriteTagSummary[];
  collections: FavoriteCollectionSummary[];
  addedAt: number;
}

export interface FavoriteVideoQuery {
  collectionType: CollectionType;
  selectedCollectionId: FavoritesCollectionSelection;
  keyword: string;
  includeTagIds: ID[];
  excludeTagIds: ID[];
  page: number;
  pageSize: number;
}

export interface FavoriteVideoQueryResult extends PaginationResult<FavoriteVideoListItem> {
  availableCollectionIds: ID[];
}

export interface FavoritesPageState {
  loading: boolean;
  error?: string;
  collectionType: CollectionType;
  selectedCollectionId: FavoritesCollectionSelection;
  searchKeyword: string;
  tagKeyword: string;
  includeTagIds: ID[];
  excludeTagIds: ID[];
  currentPage: number;
  pageSize: number;
}
