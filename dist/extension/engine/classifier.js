/**
 * UP classification engine.
 */
import { getUPInfo, getUPVideos, getUPVideosForClassification, getVideoTags } from "../api/bili-api.js";
import { chatComplete, parseTagsFromContent } from "../engine/llm-client.js";
/**
 * Extract top tags from videos based on frequency.
 */
export function extractTopTags(videos, topN = 5) {
    const counts = {};
    for (const video of videos) {
        for (const tag of video.tags || []) {
            if (!tag)
                continue;
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
export function sampleVideos(videos, n = 5) {
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
export async function collectVideoTags(videos, options = {}) {
    const getVideoTagsFn = options.getVideoTagsFn ?? getVideoTags;
    const tags = [];
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
export async function classifyWithLLM(upProfile, videos, existingTags = []) {
    const titles = videos.map((video) => video.title).slice(0, 10);
    const existing = existingTags.length > 0 ? existingTags.join("、") : "无";
    const prompt = [
        "You are a content classifier.",
        "Return a JSON array of 3 to 5 short Chinese tags.",
        "Prefer existing tags when appropriate and avoid near-duplicate synonyms.",
        `UP: ${upProfile.name}`,
        `Bio: ${upProfile.sign}`,
        `Existing tags: ${existing}`,
        `Video titles: ${titles.join(" | ")}`
    ].join("\n");
    console.log("[Classifier] LLM classification", upProfile.mid, {
        existingTags: existingTags.length,
        titleSamples: titles.length
    });
    const content = await chatComplete([
        { role: "system", content: "Classify Bilibili UP content into tags." },
        { role: "user", content: prompt }
    ]);
    if (!content) {
        console.log("[Classifier] LLM empty response", upProfile.mid);
        return [];
    }
    const tags = parseTagsFromContent(content);
    console.log("[Classifier] LLM tags", upProfile.mid, tags);
    return tags;
}
/**
 * Merge tag stats with LLM tags.
 */
export function mergeTags(tagStats, llmTags) {
    const merged = [];
    const seen = new Set();
    for (const tag of [...tagStats, ...llmTags]) {
        if (!seen.has(tag)) {
            seen.add(tag);
            merged.push(tag);
        }
    }
    return merged;
}
function limitTags(tags, max = 5) {
    return tags.slice(0, Math.max(0, max));
}
/**
 * Classify a UP with tag stats and optional LLM tags.
 */
export async function classifyUP(mid, options = {}) {
    const useAPIMethod = options.useAPIMethod ?? false;
    const maxVideos = options.maxVideos ?? 20;
    // 根据选项选择使用API方法还是原有方法
    const getUPVideosFn = options.getUPVideosFn ??
        (useAPIMethod
            ? (value) => getUPVideosForClassification(value, maxVideos)
            : (value) => getUPVideos(value));
    const getUPInfoFn = options.getUPInfoFn ?? ((value) => getUPInfo(value));
    const classifyWithLLMFn = options.classifyWithLLMFn ?? classifyWithLLM;
    const existingTags = options.existingTags ?? [];
    console.log("[Classifier] Classify UP", mid, "Method:", useAPIMethod ? "API" : "Original");
    const videos = await getUPVideosFn(mid);
    const videoCount = videos.length;
    // 如果使用API方法且没有提供自定义getUPVideosFn，视频已经包含标签，不需要再次获取
    let collectedTags = [];
    if (useAPIMethod && !options.getUPVideosFn) {
        // API方法返回的视频已经包含标签
        collectedTags = videos.flatMap(v => v.tags || []);
    }
    else {
        // 使用自定义getUPVideosFn或原有方法需要单独获取标签
        const sampled = sampleVideos(videos, 5);
        collectedTags = await collectVideoTags(sampled, options);
    }
    const tagStats = extractTopTags([{ bvid: "tags", title: "tags", tags: collectedTags }], 5);
    console.log("[Classifier] Tag stats", mid, tagStats);
    const upProfile = await getUPInfoFn(mid);
    if (!upProfile) {
        console.log("[Classifier] Missing UP profile", mid);
    }
    if (existingTags.length > 0) {
        console.log("[Classifier] Skip LLM (existing tags)", mid, existingTags);
    }
    const sampled = sampleVideos(videos, 5);
    const llmTags = upProfile && existingTags.length === 0
        ? await classifyWithLLMFn(upProfile, sampled, existingTags)
        : [];
    const tags = limitTags(mergeTags(tagStats, llmTags), 5);
    let confidence = 0.3;
    if (tagStats.length > 0 && llmTags.length > 0) {
        confidence = 0.8;
    }
    else if (tagStats.length > 0 || llmTags.length > 0) {
        confidence = 0.5;
    }
    return { mid, tags, confidence, videoCount };
}
