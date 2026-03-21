import { getAppState, setAppState, clearAppStateByPrefix } from "../app-state.js";
import { DBUtils, STORE_NAMES } from "../indexeddb/index.js";
import { Platform, TagSource } from "../types/base.js";
import type { Creator as DBCreator, CreatorTagWeight as DBCreatorTagWeight } from "../types/creator.js";
import type { Category as DBCategory, Tag as DBTag } from "../types/semantic.js";
import type {
  AppCategory as Category,
  AppTag as Tag,
  AppVideo as Video,
  CategoryLibrary,
  InterestProfile,
  TagLibrary,
  UPCache,
  UPFaceDataCacheEntry,
  UPTagCache,
  UPTagWeights,
  UP,
  UserInterest,
  VideoCacheEntry
} from "../types/app.js";
import { CategoryRepository } from "./category-repository.impl.js";
import { CreatorRepository } from "./creator-repository.impl.js";
import { InterestScoreRepository } from "./interest-score-repository.impl.js";
import { TagRepository } from "./tag-repository.impl.js";

const creatorRepository = new CreatorRepository();
const tagRepository = new TagRepository();
const categoryRepository = new CategoryRepository();
const interestRepository = new InterestScoreRepository();
const BILIBILI = Platform.BILIBILI;

let allCreatorsCache: DBCreator[] | null = null;
let tagLibraryCache: TagLibrary | null = null;

function invalidateCreatorCache(): void {
  allCreatorsCache = null;
}

function invalidateTagCache(): void {
  tagLibraryCache = null;
}

function tagCountKey(): string {
  return "tagCounts";
}

function manualTagsKey(mid: number): string {
  return `up_manual_tags:${mid}`;
}

function videoCacheKey(mid: number): string {
  return `video_cache:${mid}`;
}

function faceCacheKey(mid: number): string {
  return `up_face:${mid}`;
}

function toLegacyUP(creator: DBCreator): UP {
  return {
    mid: Number(creator.creatorId),
    name: creator.name,
    face: creator.avatar,
    sign: creator.description,
    follow_time: creator.followTime,
    is_followed: creator.isFollowing === 1
  };
}

function toDBCreator(up: UP): DBCreator {
  return {
    creatorId: String(up.mid),
    platform: BILIBILI,
    name: up.name,
    avatar: up.face_data || up.face,
    isLogout: 0,
    description: up.sign,
    createdAt: Date.now(),
    followTime: up.follow_time,
    isFollowing: up.is_followed ? 1 : 0,
    tagWeights: []
  };
}

function toLegacyTag(tag: DBTag, counts: Record<string, number>): Tag {
  return {
    id: tag.tagId,
    name: tag.name,
    created_at: tag.createdAt,
    editable: tag.source === TagSource.USER,
    count: counts[tag.tagId] ?? (tag.source === TagSource.SYSTEM ? 1 : 0)
  };
}

async function getTagCounts(): Promise<Record<string, number>> {
  return (await getAppState<Record<string, number>>(tagCountKey())) ?? {};
}

async function saveTagCounts(counts: Record<string, number>): Promise<void> {
  await setAppState(tagCountKey(), counts);
}

async function ensureCreator(mid: number): Promise<DBCreator> {
  const existing = await creatorRepository.getCreator(String(mid), BILIBILI);
  if (existing) {
    return existing;
  }
  const creator = toDBCreator({
    mid,
    name: "",
    face: "",
    sign: "",
    follow_time: 0,
    is_followed: false
  });
  await creatorRepository.upsertCreator(creator);
  return creator;
}

async function getAllBilibiliCreators(): Promise<DBCreator[]> {
  if (allCreatorsCache) {
    return allCreatorsCache;
  }
  allCreatorsCache = await creatorRepository.getAllCreators(BILIBILI);
  return allCreatorsCache;
}

async function getTagsByIds(tagIds: string[]): Promise<Record<string, DBTag>> {
  const tags = await tagRepository.getTags([...new Set(tagIds)]);
  return Object.fromEntries(tags.map((tag) => [tag.tagId, tag]));
}

export async function getTagLibrary(): Promise<TagLibrary> {
  if (tagLibraryCache) {
    return tagLibraryCache;
  }
  const [tags, counts] = await Promise.all([tagRepository.getAllTags(), getTagCounts()]);
  tagLibraryCache = Object.fromEntries(tags.map((tag) => [tag.tagId, toLegacyTag(tag, counts)]));
  return tagLibraryCache;
}

export async function saveTagLibrary(library: TagLibrary): Promise<void> {
  await DBUtils.clear(STORE_NAMES.TAGS);
  await saveTagCounts(Object.fromEntries(Object.values(library).map((tag) => [tag.id, tag.count])));
  for (const tag of Object.values(library)) {
    await DBUtils.put<DBTag>(STORE_NAMES.TAGS, {
      tagId: tag.id,
      name: tag.name,
      source: tag.editable ? TagSource.USER : TagSource.SYSTEM,
      createdAt: tag.created_at
    });
  }
  invalidateTagCache();
}

export async function addTagToLibrary(name: string, editable: boolean = true): Promise<Tag> {
  const normalized = name.trim();
  const existing = await tagRepository.findTagByName(normalized);
  const counts = await getTagCounts();
  if (existing) {
    if (!editable && existing.source === TagSource.SYSTEM) {
      counts[existing.tagId] = (counts[existing.tagId] ?? 0) + 1;
      await saveTagCounts(counts);
    }
    return toLegacyTag(existing, counts);
  }

  const createdAt = Date.now();
  const tagId = await tagRepository.createTag({
    name: normalized,
    source: editable ? TagSource.USER : TagSource.SYSTEM,
    createdAt
  });
  counts[tagId] = editable ? 0 : 1;
  await saveTagCounts(counts);
  invalidateTagCache();
  return { id: tagId, name: normalized, created_at: createdAt, editable, count: counts[tagId] };
}

export async function addTagsToLibrary(names: string[], editable: boolean = true): Promise<Tag[]> {
  const result: Tag[] = [];
  for (const name of names) {
    result.push(await addTagToLibrary(name, editable));
  }
  return result;
}

export async function getTagById(id: string): Promise<Tag | null> {
  const [tag, counts] = await Promise.all([tagRepository.getTag(id), getTagCounts()]);
  return tag ? toLegacyTag(tag, counts) : null;
}

export async function getTagIdByName(name: string): Promise<string | null> {
  return (await tagRepository.findTagByName(name))?.tagId ?? null;
}

export async function getTagsSortedByCount(editable?: boolean): Promise<Tag[]> {
  const library = Object.values(await getTagLibrary());
  const filtered = editable === undefined ? library : library.filter((tag) => tag.editable === editable);
  return filtered.sort((a, b) => b.count - a.count);
}

export async function getUPTagWeights(mid: number): Promise<UPTagWeights | null> {
  const creator = await creatorRepository.getCreator(String(mid), BILIBILI);
  if (!creator) {
    return null;
  }
  return {
    mid,
    tags: creator.tagWeights.map((tagWeight) => ({
      tag_id: tagWeight.tagId,
      weight: tagWeight.count,
      editable: tagWeight.source === TagSource.USER
    })),
    lastUpdate: Date.now()
  };
}

export async function updateUPTagWeights(mid: number, tagIds: string[], editable: boolean = true): Promise<void> {
  const creator = await ensureCreator(mid);
  const weights = new Map<string, DBCreatorTagWeight>(creator.tagWeights.map((item) => [item.tagId, item]));
  for (const tagId of tagIds) {
    const existing = weights.get(tagId);
    if (existing) {
      existing.count += 1;
      existing.source = editable ? TagSource.USER : existing.source;
      continue;
    }
    weights.set(tagId, {
      tagId,
      source: editable ? TagSource.USER : TagSource.SYSTEM,
      count: editable ? 0 : 1,
      createdAt: Date.now()
    });
  }
  await creatorRepository.upsertCreator({ ...creator, tagWeights: Array.from(weights.values()) });
  invalidateCreatorCache();
}

export async function clearUPTagWeights(mid: number): Promise<void> {
  const creator = await creatorRepository.getCreator(String(mid), BILIBILI);
  if (creator) {
    await creatorRepository.upsertCreator({ ...creator, tagWeights: [] });
    invalidateCreatorCache();
  }
}

export async function getUPTagCounts(): Promise<UPTagCache> {
  const creators = await getAllBilibiliCreators();
  return Object.fromEntries(
    creators.map((creator) => [
      creator.creatorId,
      {
        tags: creator.tagWeights.map((tagWeight) => ({
          tag: tagWeight.tagId,
          count: tagWeight.count,
          editable: tagWeight.source === TagSource.USER
        })),
        lastUpdate: Date.now()
      }
    ])
  );
}

export async function getUPManualTags(mid: number): Promise<string[]> {
  return (await getAppState<string[]>(manualTagsKey(mid))) ?? [];
}

export async function getAllUPManualTags(): Promise<Record<string, string[]>> {
  const creators = await getAllBilibiliCreators();
  const entries = await Promise.all(
    creators.map(async (creator) => [creator.creatorId, await getUPManualTags(Number(creator.creatorId))] as const)
  );
  return Object.fromEntries(entries.filter(([, tagIds]) => tagIds.length > 0));
}

export async function setUPManualTags(mid: number, tagIds: string[]): Promise<void> {
  await setAppState(manualTagsKey(mid), tagIds);
  const creator = await ensureCreator(mid);
  const manualWeights = tagIds.map((tagId) => ({ tagId, source: TagSource.USER, count: 0, createdAt: Date.now() }));
  const systemWeights = creator.tagWeights.filter((tagWeight) => tagWeight.source !== TagSource.USER);
  await creatorRepository.upsertCreator({ ...creator, tagWeights: [...systemWeights, ...manualWeights] });
  invalidateCreatorCache();
}

export async function addTagToUPManualTags(mid: number, tagId: string): Promise<void> {
  const existing = await getUPManualTags(mid);
  if (!existing.includes(tagId)) {
    await setUPManualTags(mid, [...existing, tagId]);
  }
}

export async function removeTagFromUPManualTags(mid: number, tagId: string): Promise<void> {
  const existing = await getUPManualTags(mid);
  await setUPManualTags(mid, existing.filter((item) => item !== tagId));
}

export async function getCategoryLibrary(): Promise<CategoryLibrary> {
  const categories = await categoryRepository.getAllCategories();
  return Object.fromEntries(
    categories.map((category) => [
      category.id,
      { id: category.id, name: category.name, tag_ids: category.tagIds, created_at: category.createdAt }
    ])
  );
}

export async function saveCategoryLibrary(library: CategoryLibrary): Promise<void> {
  await DBUtils.clear(STORE_NAMES.CATEGORIES);
  for (const category of Object.values(library)) {
    await DBUtils.put<DBCategory>(STORE_NAMES.CATEGORIES, {
      id: category.id,
      name: category.name,
      tagIds: category.tag_ids,
      createdAt: category.created_at
    });
  }
}

export async function createCategory(name: string, tagIds: string[] = []): Promise<Category> {
  const createdAt = Date.now();
  const id = await categoryRepository.createCategory({ name, tagIds, createdAt });
  return { id, name, tag_ids: tagIds, created_at: createdAt };
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await categoryRepository.deleteCategory(categoryId);
}

export async function addTagToCategory(categoryId: string, tagId: string): Promise<void> {
  await categoryRepository.addTagsToCategory(categoryId, [tagId]);
}

export async function removeTagFromCategory(categoryId: string, tagId: string): Promise<void> {
  await categoryRepository.removeTagsFromCategory(categoryId, [tagId]);
}

export async function saveUPList(upList: UP[]): Promise<void> {
  const incomingIds = new Set(upList.map((up) => String(up.mid)));
  const existing = await getAllBilibiliCreators();
  for (const creator of existing) {
    if (!incomingIds.has(creator.creatorId)) {
      await creatorRepository.deleteCreator(creator.creatorId, BILIBILI);
    }
  }
  for (const up of upList) {
    const existingCreator = await creatorRepository.getCreator(String(up.mid), BILIBILI);
    const nextCreator = {
      ...(existingCreator ?? toDBCreator(up)),
      ...toDBCreator(up),
      tagWeights: existingCreator?.tagWeights ?? []
    };
    await creatorRepository.upsertCreator(nextCreator);
  }
  invalidateCreatorCache();
}

export async function loadUPList(): Promise<UPCache | null> {
  const creators = await getAllBilibiliCreators();
  if (creators.length === 0) {
    return null;
  }
  const upList = creators.map(toLegacyUP);
  return {
    upList,
    lastUpdate: Math.max(...upList.map((up) => up.follow_time || 0), 0)
  };
}

export async function getFollowedUPList(): Promise<UP[]> {
  const creators = await creatorRepository.getFollowingCreators(BILIBILI);
  return creators.map(toLegacyUP);
}

export async function updateUPFollowStatus(mid: number, isFollowed: boolean): Promise<void> {
  const creator = await creatorRepository.getCreator(String(mid), BILIBILI);
  if (!creator) {
    return;
  }
  await creatorRepository.upsertCreator({
    ...creator,
    isFollowing: isFollowed ? 1 : 0,
    followTime: isFollowed ? Date.now() : creator.followTime
  });
  invalidateCreatorCache();
}

export async function saveVideoCache(mid: number, videos: Video[]): Promise<void> {
  await setAppState(videoCacheKey(mid), { videos, lastUpdate: Date.now() } satisfies VideoCacheEntry);
}

export async function loadVideoCache(mid: number): Promise<VideoCacheEntry | null> {
  return getAppState<VideoCacheEntry>(videoCacheKey(mid));
}

export async function updateInterest(tag: string, score: number): Promise<UserInterest> {
  const legacyTag = await addTagToLibrary(tag, false);
  const existing = await interestRepository.getInterestScore(legacyTag.id);
  await interestRepository.updateInterestScore({
    tagId: legacyTag.id,
    score: (existing?.score ?? 0) + score,
    shortTermScore: (existing?.shortTermScore ?? 0) + score,
    longTermScore: (existing?.longTermScore ?? 0) + score
  });
  return { tag, score: (existing?.score ?? 0) + score };
}

export async function saveUPFaceData(mid: number, faceData: string): Promise<void> {
  await setAppState(faceCacheKey(mid), { mid, face_data: faceData, lastUpdate: Date.now() } satisfies UPFaceDataCacheEntry);
}

export async function getUPFaceData(mid: number): Promise<string | null> {
  const entry = await getAppState<UPFaceDataCacheEntry>(faceCacheKey(mid));
  return entry?.face_data ?? null;
}

export async function saveMultipleUPFaceData(faceDataMap: Record<number, string>): Promise<void> {
  for (const [mid, faceData] of Object.entries(faceDataMap)) {
    await saveUPFaceData(Number(mid), faceData);
  }
}

export async function clearUPFaceData(mid: number): Promise<void> {
  await setAppState(faceCacheKey(mid), null);
}

export async function getClassifyStatus(): Promise<{ lastUpdate: number } | null> {
  return getAppState<{ lastUpdate: number }>("classifyStatus");
}

export async function setClassifyStatus(lastUpdate: number): Promise<void> {
  await setAppState("classifyStatus", { lastUpdate });
}

async function getLegacyCategories(): Promise<{ id: string; name: string; tags: string[] }[]> {
  const categories = await categoryRepository.getAllCategories();
  const tagIds = [...new Set(categories.flatMap((category) => category.tagIds))];
  const tagsById = await getTagsByIds(tagIds);
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    tags: category.tagIds.map((tagId) => tagsById[tagId]?.name ?? tagId)
  }));
}

async function saveLegacyCategories(categories: { id: string; name: string; tags: string[] }[]): Promise<void> {
  await DBUtils.clear(STORE_NAMES.CATEGORIES);
  for (const category of categories) {
    const tagIds = (await addTagsToLibrary(category.tags)).map((tag) => tag.id);
    await DBUtils.put<DBCategory>(STORE_NAMES.CATEGORIES, {
      id: category.id,
      name: category.name,
      tagIds,
      createdAt: Date.now()
    });
  }
}

export async function setValue<T>(key: string, value: T): Promise<void> {
  if (key === "classifyStatus") {
    await setClassifyStatus((value as { lastUpdate: number }).lastUpdate);
    return;
  }
  if (key === "categories") {
    await saveLegacyCategories((value as { id: string; name: string; tags: string[] }[]) ?? []);
    return;
  }
  if (key === "upManualTagsCache") {
    await clearAppStateByPrefix("up_manual_tags:");
    return;
  }
  if (key === "upTagWeightsCache") {
    const creators = await getAllBilibiliCreators();
    for (const creator of creators) {
      await creatorRepository.upsertCreator({ ...creator, tagWeights: [] });
    }
    return;
  }
  await setAppState(key, value);
}

export async function getValue<T>(key: string): Promise<T | null> {
  if (key === "classifyStatus") {
    return (await getClassifyStatus()) as T | null;
  }
  if (key === "upList") {
    return (await loadUPList()) as T | null;
  }
  if (key === "interestProfile") {
    const scores = await interestRepository.getAllInterestScores();
    const tags = await getTagsByIds(scores.map((score) => score.tagId));
    const profile: InterestProfile = {};
    for (const score of scores) {
      const name = tags[score.tagId]?.name;
      if (name) {
        profile[name] = { tag: name, score: score.score };
      }
    }
    return profile as T;
  }
  if (key === "categories") {
    return (await getLegacyCategories()) as T;
  }
  return getAppState<T>(key);
}
