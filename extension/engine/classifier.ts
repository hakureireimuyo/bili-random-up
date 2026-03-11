/**
 * UP classification engine.
 */

import { getUPInfo, getUPVideos, getVideoTags } from "../api/bili-api.js";
import { chatComplete, parseTagsFromContent } from "../engine/llm-client.js";

export interface Video {
  bvid: string;
  title: string;
  tags: string[];
}

export interface UPProfile {
  mid: number;
  name: string;
  sign: string;
  face: string;
}

export interface UPTagProfile {
  mid: number;
  tags: string[];
  confidence: number;
}

interface ClassifierOptions {
  getUPVideosFn?: (mid: number) => Promise<Video[]>;
  getVideoTagsFn?: (bvid: string) => Promise<string[]>;
  getUPInfoFn?: (mid: number) => Promise<UPProfile | null>;
  classifyWithLLMFn?: (upProfile: UPProfile, videos: Video[]) => Promise<string[]>;
}

/**
 * Extract top tags from videos based on frequency.
 */
export function extractTopTags(videos: Video[], topN: number = 5): string[] {
  const counts: Record<string, number> = {};
  for (const video of videos) {
    for (const tag of video.tags || []) {
      if (!tag) continue;
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([tag]) => tag);
}

/**
 * Sample videos for analysis.
 */
export function sampleVideos(videos: Video[], n: number = 5): Video[] {
  if (videos.length <= n) {
    return [...videos];
  }
  const pool = [...videos];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

/**
 * Collect tags for a list of videos via API.
 */
export async function collectVideoTags(
  videos: Video[],
  options: ClassifierOptions = {}
): Promise<string[]> {
  const getVideoTagsFn = options.getVideoTagsFn ?? getVideoTags;
  const tags: string[] = [];
  for (const video of videos) {
    console.log("[Classifier] Collect tags", video.bvid);
    const videoTags = await getVideoTagsFn(video.bvid);
    tags.push(...videoTags);
  }
  return tags;
}

/**
 * LLM classification entry (placeholder).
 */
export async function classifyWithLLM(
  upProfile: UPProfile,
  videos: Video[]
): Promise<string[]> {
  const titles = videos.map((video) => video.title).slice(0, 10);
  const prompt = [
    "You are a content classifier.",
    "Return a JSON array of short Chinese tags.",
    `UP: ${upProfile.name}`,
    `Bio: ${upProfile.sign}`,
    `Video titles: ${titles.join(" | ")}`
  ].join("\n");

  console.log("[Classifier] LLM classification", upProfile.mid, videos.length);
  const content = await chatComplete([
    { role: "system", content: "Classify Bilibili UP content into tags." },
    { role: "user", content: prompt }
  ]);
  if (!content) {
    return [];
  }
  return parseTagsFromContent(content);
}

/**
 * Merge tag stats with LLM tags.
 */
export function mergeTags(tagStats: string[], llmTags: string[]): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const tag of [...tagStats, ...llmTags]) {
    if (!seen.has(tag)) {
      seen.add(tag);
      merged.push(tag);
    }
  }
  return merged;
}

/**
 * Classify a UP with tag stats and optional LLM tags.
 */
export async function classifyUP(
  mid: number,
  options: ClassifierOptions = {}
): Promise<UPTagProfile> {
  const getUPVideosFn =
    options.getUPVideosFn ?? ((value: number) => getUPVideos(value));
  const getUPInfoFn =
    options.getUPInfoFn ?? ((value: number) => getUPInfo(value));
  const classifyWithLLMFn = options.classifyWithLLMFn ?? classifyWithLLM;

  console.log("[Classifier] Classify UP", mid);
  const videos = await getUPVideosFn(mid);
  const sampled = sampleVideos(videos, 5);
  const collectedTags = await collectVideoTags(sampled, options);
  const tagStats = extractTopTags(
    [{ bvid: "tags", title: "tags", tags: collectedTags }],
    5
  );

  const upProfile = await getUPInfoFn(mid);
  const llmTags = upProfile ? await classifyWithLLMFn(upProfile, sampled) : [];
  const tags = mergeTags(tagStats, llmTags);

  let confidence = 0.3;
  if (tagStats.length > 0 && llmTags.length > 0) {
    confidence = 0.8;
  } else if (tagStats.length > 0 || llmTags.length > 0) {
    confidence = 0.5;
  }

  return { mid, tags, confidence };
}
