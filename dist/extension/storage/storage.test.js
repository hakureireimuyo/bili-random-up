import { getValue, loadUPList, loadVideoCache, saveUPList, saveVideoCache, setValue, updateInterest } from "../storage/storage.js";
import { assert, test } from "../tests/test-runner.js";
class MemoryStorageArea {
    constructor() {
        this.store = {};
    }
    async get(keys) {
        if (!keys) {
            return { ...this.store };
        }
        if (typeof keys === "string") {
            return { [keys]: this.store[keys] };
        }
        if (Array.isArray(keys)) {
            const result = {};
            for (const key of keys) {
                result[key] = this.store[key];
            }
            return result;
        }
        return { ...keys, ...this.store };
    }
    async set(items) {
        for (const [key, value] of Object.entries(items)) {
            this.store[key] = value;
        }
    }
}
function createStorage() {
    return { local: new MemoryStorageArea() };
}
test("setValue and getValue roundtrip", async () => {
    const storage = createStorage();
    await setValue("k1", { value: 42 }, { storage });
    const value = await getValue("k1", { storage });
    assert(value?.value === 42, "expected value 42");
});
test("saveUPList stores cache", async () => {
    const storage = createStorage();
    await saveUPList([{ mid: 1, name: "UP", face: "", sign: "", follow_time: 1 }], {
        storage
    });
    const cache = await loadUPList({ storage });
    assert(cache?.upList.length === 1, "expected one UP");
    assert(typeof cache?.lastUpdate === "number", "expected timestamp");
});
test("saveVideoCache stores per-mid cache", async () => {
    const storage = createStorage();
    await saveVideoCache(1, [{ bvid: "BV1", aid: 1, title: "V", play: 1, duration: 1, pubdate: 1, tags: [] }], { storage });
    const cache = await loadVideoCache(1, { storage });
    assert(cache?.videos.length === 1, "expected one video");
    assert(cache?.videos[0].bvid === "BV1", "expected BV1");
});
test("updateInterest accumulates score", async () => {
    const storage = createStorage();
    const first = await updateInterest("AI", 1, { storage });
    assert(first.score === 1, "expected score 1");
    const second = await updateInterest("AI", 2, { storage });
    assert(second.score === 3, "expected score 3");
});
