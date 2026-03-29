import type { ID, Platform, Timestamp } from "./base.js";
import type { CollectionType } from "./collection.js";

export interface FavoriteVideoEntry {
  favoriteEntryId: ID;
  videoId: ID;
  platform: Platform;
  bv: string;
  title: string;
  description: string;
  creatorId: ID;
  creatorName: string;
  duration: number;
  publishTime: Timestamp;
  tags: ID[];
  tagNames: string[];
  coverUrl?: string;
  picture?: ID;
  addedAt: Timestamp;
  collectionIds: ID[];
  collectionNames: string[];
  collectionTypes: CollectionType[];
}
