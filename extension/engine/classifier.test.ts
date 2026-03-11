import {
  classifyUP,
  collectVideoTags,
  extractTopTags,
  mergeTags,
  sampleVideos
} from "../engine/classifier.js";
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
  const tags = await collectVideoTags(
    [
      { bvid: "1", title: "A", tags: [] },
      { bvid: "2", title: "B", tags: [] }
    ],
    {
      getVideoTagsFn: async (bvid: string) => (bvid === "1" ? ["AI"] : ["Tech"])
    }
  );
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
    classifyWithLLMFn: async (_profile, _videos, existingTags) =>
      existingTags && existingTags.length > 0 ? existingTags : ["Tech"],
    existingTags: ["AI"]
  });
  assert(result.tags.length >= 1, "expected tags");
  assert(result.tags.length <= 5, "expected max 5 tags");
  assert(result.confidence >= 0.5, "expected confidence");
  assert(result.videoCount === 2, "expected video count");
});

test("classifyUP skips LLM when existing tags present", async () => {
  let called = 0;
  const result = await classifyUP(1, {
    getUPVideosFn: async () => [{ bvid: "1", title: "A", tags: [] }],
    getVideoTagsFn: async () => ["AI"],
    getUPInfoFn: async () => ({ mid: 1, name: "UP", sign: "", face: "" }),
    classifyWithLLMFn: async () => {
      called += 1;
      return ["Tech"];
    },
    existingTags: ["已有"]
  });
  assert(called === 0, "expected LLM skipped");
  assert(result.tags.length >= 1, "expected tags");
});
