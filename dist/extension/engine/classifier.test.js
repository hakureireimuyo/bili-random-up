import { classifyUP, collectVideoTags, extractTopTags, mergeTags, sampleVideos } from "../engine/classifier.js";
import { assert, test } from "../tests/test-runner.js";
test("extractTopTags returns most frequent tags", () => {
    const tags = extractTopTags([
        { bvid: "1", title: "A", tags: ["AI", "Tech"] },
        { bvid: "2", title: "B", tags: ["AI"] },
        { bvid: "3", title: "C", tags: ["Music"] }
    ]);
    assert(tags[0] === "AI", "expected AI first");
});
test("sampleVideos returns requested count", () => {
    const originalRandom = Math.random;
    Math.random = () => 0.1;
    const videos = [
        { bvid: "1", title: "A", tags: [] },
        { bvid: "2", title: "B", tags: [] },
        { bvid: "3", title: "C", tags: [] }
    ];
    const sample = sampleVideos(videos, 2);
    Math.random = originalRandom;
    assert(sample.length === 2, "expected two samples");
});
test("collectVideoTags aggregates tags", async () => {
    const tags = await collectVideoTags([
        { bvid: "1", title: "A", tags: [] },
        { bvid: "2", title: "B", tags: [] }
    ], {
        getVideoTagsFn: async (bvid) => (bvid === "1" ? ["AI"] : ["Tech"])
    });
    assert(tags.length === 2, "expected two tags");
});
test("mergeTags merges unique tags", () => {
    const merged = mergeTags(["AI", "Tech"], ["Tech", "Music"]);
    assert(merged.length === 3, "expected 3 unique tags");
});
test("classifyUP returns tags and confidence", async () => {
    const result = await classifyUP(1, {
        getUPVideosFn: async () => [
            { bvid: "1", title: "A", tags: [] },
            { bvid: "2", title: "B", tags: [] }
        ],
        getVideoTagsFn: async () => ["AI"],
        getUPInfoFn: async () => ({ mid: 1, name: "UP", sign: "", face: "" }),
        classifyWithLLMFn: async () => ["Tech"]
    });
    assert(result.tags.length >= 1, "expected tags");
    assert(result.confidence >= 0.5, "expected confidence");
});
