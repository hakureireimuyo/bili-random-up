/**
 * Background service worker initialization.
 */
import { getFollowedUPs, getUPVideos, getVideoTags } from "../api/bili-api.js";
import { classifyUP } from "../engine/classifier.js";
import { randomUP, randomVideo, recommendUP, recommendVideo, updateInterestFromWatch } from "../engine/recommender.js";
import { getValue, saveUPList, setValue } from "../storage/storage.js";
export const ALARM_UPDATE_UP_LIST = "update_up_list";
export const ALARM_CLASSIFY_UPS = "classify_ups";
/**
 * Schedule periodic alarms.
 */
export function scheduleAlarms(alarms) {
    console.log("[Background] Schedule alarms");
    alarms.create(ALARM_UPDATE_UP_LIST, { periodInMinutes: 24 * 60 });
    alarms.create(ALARM_CLASSIFY_UPS, { periodInMinutes: 7 * 24 * 60 });
}
/**
 * Update followed UP list.
 */
export async function updateUpListTask(options = {}) {
    const getFollowedUPsFn = options.getFollowedUPsFn ?? getFollowedUPs;
    const saveUPListFn = options.saveUPListFn ?? saveUPList;
    const getValueFn = options.getValueFn ?? ((key) => getValue(key));
    const settings = (await getValueFn("settings"));
    const uid = options.uid ?? (await getValueFn("userId")) ?? settings?.userId;
    const uidValue = typeof uid === "number" ? uid : Number(uid);
    if (!uidValue || Number.isNaN(uidValue)) {
        console.warn("[Background] Missing userId for update");
        return false;
    }
    const upList = await getFollowedUPsFn(uidValue);
    await saveUPListFn(upList);
    console.log("[Background] Updated UP list", upList.length);
    return true;
}
/**
 * Classify UPs in batches and store tags.
 */
export async function classifyUpTask(options = {}) {
    const classifyUPFn = options.classifyUPFn ?? classifyUP;
    const getValueFn = options.getValueFn ?? ((key) => getValue(key));
    const setValueFn = options.setValueFn ?? ((key, value) => setValue(key, value));
    const batchSize = options.batchSize ?? 10;
    const cache = (await getValueFn("upList"));
    const list = cache?.upList ?? [];
    if (list.length === 0) {
        console.log("[Background] No UPs to classify");
        return 0;
    }
    const upTags = (await getValueFn("upTags")) ?? {};
    const batch = list.slice(0, batchSize);
    let processed = 0;
    for (const up of batch) {
        const profile = await classifyUPFn(up.mid);
        upTags[String(up.mid)] = profile.tags;
        processed += 1;
    }
    await setValueFn("upTags", upTags);
    await setValueFn("classifyStatus", { lastUpdate: Date.now() });
    console.log("[Background] Classified UPs", processed);
    return processed;
}
/**
 * Handle alarm events.
 */
export async function handleAlarm(alarm, options = {}) {
    if (alarm.name === ALARM_UPDATE_UP_LIST) {
        await updateUpListTask(options);
        return;
    }
    if (alarm.name === ALARM_CLASSIFY_UPS) {
        await classifyUpTask(options);
    }
}
function toVideoUrl(bvid) {
    return `https://www.bilibili.com/video/${bvid}`;
}
function toUpUrl(mid) {
    return `https://space.bilibili.com/${mid}`;
}
/**
 * Handle runtime messages.
 */
export async function handleMessage(message, options = {}) {
    const getValueFn = options.getValueFn ?? ((key) => getValue(key));
    const getUPVideosFn = options.getUPVideosFn ?? getUPVideos;
    const getVideoTagsFn = options.getVideoTagsFn ?? getVideoTags;
    const recommendUPFn = options.recommendUPFn ?? recommendUP;
    const recommendVideoFn = options.recommendVideoFn ?? recommendVideo;
    const updateInterestFromWatchFn = options.updateInterestFromWatchFn ?? updateInterestFromWatch;
    const randomUPFn = options.randomUPFn ?? randomUP;
    const randomVideoFn = options.randomVideoFn ?? randomVideo;
    if (!message || !message.type) {
        return;
    }
    if (message.type === "watch_event") {
        const payload = message.payload;
        if (!payload?.bvid) {
            return;
        }
        const tags = await getVideoTagsFn(payload.bvid);
        await updateInterestFromWatchFn({
            tags,
            watch_time: payload.watch_time ?? 0,
            duration: payload.duration ?? 0
        });
        return null;
    }
    if (message.type === "detect_uid") {
        const payload = message.payload;
        if (!payload?.uid) {
            return null;
        }
        const setValueFn = options.setValueFn ?? ((key, value) => setValue(key, value));
        const settings = (await getValueFn("settings"));
        const nextSettings = { ...(settings ?? {}), userId: payload.uid };
        await setValueFn("settings", nextSettings);
        await setValueFn("userId", payload.uid);
        console.log("[Background] Updated userId", payload.uid);
        return null;
    }
    const tabs = options.tabs ?? (typeof chrome !== "undefined" ? chrome.tabs : undefined);
    if (!tabs) {
        console.log("[Background] Tabs unavailable");
        return null;
    }
    if (message.type === "random_up") {
        const cache = (await getValueFn("upList"));
        const upList = cache?.upList ?? [];
        const up = randomUPFn(upList);
        if (up) {
            tabs.update({ url: toUpUrl(up.mid) });
        }
        return null;
    }
    if (message.type === "random_video") {
        const cache = (await getValueFn("upList"));
        const upList = cache?.upList ?? [];
        const up = randomUPFn(upList);
        if (!up)
            return;
        const videos = await getUPVideosFn(up.mid);
        const video = randomVideoFn(videos);
        if (video) {
            tabs.update({ url: toVideoUrl(video.bvid) });
        }
        return null;
    }
    if (message.type === "update_up_list") {
        await updateUpListTask(options);
        return null;
    }
    if (message.type === "classify_ups") {
        await classifyUpTask(options);
        return null;
    }
    if (message.type === "recommend_video") {
        const up = await recommendUPFn();
        if (!up)
            return null;
        const video = await recommendVideoFn(up.mid);
        if (video) {
            const url = toVideoUrl(video.bvid);
            tabs.update({ url });
            return { title: video.title, url };
        }
    }
    return null;
}
export function initBackground() {
    console.log("[Background] Extension started");
    if (typeof chrome === "undefined" || !chrome.alarms) {
        console.log("[Background] Alarms unavailable");
    }
    else {
        scheduleAlarms(chrome.alarms);
        chrome.alarms.onAlarm.addListener((alarm) => {
            void handleAlarm(alarm);
        });
    }
    if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
        chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
            void handleMessage(message)
                .then((result) => sendResponse(result))
                .catch(() => sendResponse(null));
            return true;
        });
    }
}
if (typeof chrome !== "undefined") {
    initBackground();
}
