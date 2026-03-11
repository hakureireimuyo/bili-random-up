/**
 * Recommendation engine.
 */
import { getUPVideos } from "../api/bili-api.js";
import { getValue, loadVideoCache, updateInterest } from "../storage/storage.js";
const DEFAULT_INTEREST_WEIGHT = 0.6;
const DEFAULT_POPULARITY_WEIGHT = 0.2;
const DEFAULT_FRESHNESS_WEIGHT = 0.2;
const DEFAULT_FRESHNESS_WINDOW_DAYS = 30;
/**
 * Update interest scores from a watch event.
 */
export async function updateInterestFromWatch(event, options = {}) {
    const updateInterestFn = options.updateInterestFn ?? updateInterest;
    if (event.duration <= 0 || event.watch_time <= 0) {
        return [];
    }
    const ratio = Math.min(1, event.watch_time / event.duration);
    const updated = [];
    for (const tag of event.tags || []) {
        if (!tag)
            continue;
        console.log("[Recommender] Update interest", tag, ratio);
        const next = await updateInterestFn(tag, ratio);
        updated.push(next);
    }
    return updated;
}
/**
 * Score a UP based on overlap between UP tags and user interest.
 */
export function scoreUP(upTags, userInterest) {
    let score = 0;
    for (const tag of upTags) {
        const interest = userInterest[tag];
        if (interest) {
            score += interest.score;
        }
    }
    return score;
}
function computeFreshnessScore(pubdate, nowMs) {
    if (!pubdate) {
        return 0;
    }
    const ageMs = Math.max(0, nowMs - pubdate * 1000);
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const normalized = 1 - Math.min(1, ageDays / DEFAULT_FRESHNESS_WINDOW_DAYS);
    return Math.max(0, normalized);
}
function computePopularityScore(play, maxPlay) {
    if (!play || maxPlay <= 0) {
        return 0;
    }
    return Math.min(1, play / maxPlay);
}
function computeInterestScore(tags, profile) {
    let score = 0;
    for (const tag of tags || []) {
        const interest = profile[tag];
        if (interest) {
            score += interest.score;
        }
    }
    return score;
}
/**
 * Recommend a UP based on interest and tag profiles.
 */
export async function recommendUP(options = {}) {
    const getValueFn = options.getValueFn ?? getValue;
    const randomFn = options.randomFn ?? Math.random;
    const upCache = await getValueFn("upList");
    const upTags = await getValueFn("upTags");
    const interestProfile = (await getValueFn("interestProfile")) ?? {};
    const upList = upCache?.upList ?? [];
    if (upList.length === 0) {
        return null;
    }
    if (!upTags || Object.keys(interestProfile).length === 0) {
        return randomUP(upList, { randomFn });
    }
    let best = null;
    let bestScore = -1;
    for (const up of upList) {
        const tags = upTags[String(up.mid)] ?? [];
        const score = scoreUP(tags, interestProfile);
        if (score > bestScore) {
            bestScore = score;
            best = up;
        }
    }
    return best ?? randomUP(upList, { randomFn });
}
/**
 * Recommend a video from a UP using interest/popularity/freshness.
 */
export async function recommendVideo(mid, options = {}) {
    const loadVideoCacheFn = options.loadVideoCacheFn ?? loadVideoCache;
    const getUPVideosFn = options.getUPVideosFn ?? getUPVideos;
    const getValueFn = options.getValueFn ?? getValue;
    const nowFn = options.nowFn ?? Date.now;
    const cached = await loadVideoCacheFn(mid);
    const videos = cached?.videos ?? (await getUPVideosFn(mid));
    if (videos.length === 0) {
        return null;
    }
    const interestProfile = (await getValueFn("interestProfile")) ?? {};
    const maxPlay = Math.max(...videos.map((video) => video.play || 0), 0);
    const nowMs = nowFn();
    let best = null;
    for (const video of videos) {
        const interestScore = computeInterestScore(video.tags || [], interestProfile);
        const popularityScore = computePopularityScore(video.play, maxPlay);
        const freshnessScore = computeFreshnessScore(video.pubdate, nowMs);
        const score = DEFAULT_INTEREST_WEIGHT * interestScore +
            DEFAULT_POPULARITY_WEIGHT * popularityScore +
            DEFAULT_FRESHNESS_WEIGHT * freshnessScore;
        if (!best || score > best.score) {
            best = { video, score };
        }
    }
    return best?.video ?? null;
}
/**
 * Pick a random UP.
 */
export function randomUP(upList, options = {}) {
    if (upList.length === 0) {
        return null;
    }
    const randomFn = options.randomFn ?? Math.random;
    const index = Math.floor(randomFn() * upList.length);
    return upList[index] ?? null;
}
/**
 * Pick a random video.
 */
export function randomVideo(videos, options = {}) {
    if (videos.length === 0) {
        return null;
    }
    const randomFn = options.randomFn ?? Math.random;
    const index = Math.floor(randomFn() * videos.length);
    return videos[index] ?? null;
}
