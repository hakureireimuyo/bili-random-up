import { randomUP, randomVideo, recommendUP, recommendVideo, scoreUP, updateInterestFromWatch } from "../engine/recommender.js";
import { assert, test } from "../tests/test-runner.js";
function createStorage(initial = {}) {
    const store = { ...initial };
    return {
        async getValue(key) {
            return store[key] ?? null;
        },
        async setValue(key, value) {
            store[key] = value;
        }
    };
}
test("updateInterestFromWatch accumulates per tag", async () => {
    const storage = createStorage({ interestProfile: {} });
    const updated = await updateInterestFromWatch({ tags: ["AI", "Tech"], watch_time: 50, duration: 100 }, {
        updateInterestFn: async (tag, score) => {
            const profile = (await storage.getValue("interestProfile")) ?? {};
            const next = { tag, score: (profile[tag]?.score ?? 0) + score };
            profile[tag] = next;
            await storage.setValue("interestProfile", profile);
            return next;
        }
    });
    assert(updated.length === 2, "expected two updates");
});
test("scoreUP sums interest overlap", () => {
    const score = scoreUP(["AI", "Game"], {
        AI: { tag: "AI", score: 2 },
        Game: { tag: "Game", score: 1 }
    });
    assert(score === 3, "expected score 3");
});
test("randomUP picks deterministic item", () => {
    const up = randomUP([
        { mid: 1, name: "A", face: "", sign: "", follow_time: 1 },
        { mid: 2, name: "B", face: "", sign: "", follow_time: 2 }
    ], { randomFn: () => 0.9 });
    assert(up?.mid === 2, "expected mid 2");
});
test("randomVideo picks deterministic item", () => {
    const video = randomVideo([
        { bvid: "1", aid: 1, title: "A", play: 1, duration: 1, pubdate: 1, tags: [] },
        { bvid: "2", aid: 2, title: "B", play: 1, duration: 1, pubdate: 1, tags: [] }
    ], { randomFn: () => 0.1 });
    assert(video?.bvid === "1", "expected bvid 1");
});
test("recommendUP returns highest score UP", async () => {
    const storage = createStorage({
        upList: {
            upList: [
                { mid: 1, name: "A", face: "", sign: "", follow_time: 1 },
                { mid: 2, name: "B", face: "", sign: "", follow_time: 2 }
            ]
        },
        upTags: { "1": ["AI"], "2": ["Music"] },
        interestProfile: { AI: { tag: "AI", score: 2 } }
    });
    const up = await recommendUP({
        getValueFn: (key) => storage.getValue(key)
    });
    assert(up?.mid === 1, "expected mid 1");
});
test("recommendVideo selects by score", async () => {
    const storage = createStorage({
        interestProfile: { AI: { tag: "AI", score: 2 } }
    });
    const video = await recommendVideo(1, {
        loadVideoCacheFn: async () => ({
            videos: [
                {
                    bvid: "1",
                    aid: 1,
                    title: "A",
                    play: 10,
                    duration: 1,
                    pubdate: 1700000000,
                    tags: ["AI"]
                },
                {
                    bvid: "2",
                    aid: 2,
                    title: "B",
                    play: 100,
                    duration: 1,
                    pubdate: 1600000000,
                    tags: []
                }
            ],
            lastUpdate: 0
        }),
        getUPVideosFn: async () => [],
        getValueFn: (key) => storage.getValue(key),
        nowFn: () => 1700000000 * 1000
    });
    assert(video?.bvid === "1", "expected interest-weighted bvid 1");
});
