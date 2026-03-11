import { buildInterestRows, formatRecommendTitle, sortInterests } from "../popup/popup.js";
import { assert, test } from "../../tests/test-runner.js";

test("sortInterests sorts by score desc", () => {
  const rows = sortInterests({
    AI: { tag: "AI", score: 2 },
    Music: { tag: "Music", score: 5 }
  });
  assert(rows[0].tag === "Music", "expected Music first");
});

test("buildInterestRows normalizes ratio", () => {
  const rows = buildInterestRows({
    AI: { tag: "AI", score: 2 },
    Music: { tag: "Music", score: 4 }
  });
  const music = rows.find((row) => row.tag === "Music");
  const ai = rows.find((row) => row.tag === "AI");
  assert(music?.ratio === 1, "expected top ratio 1");
  assert(ai?.ratio === 0.5, "expected ratio 0.5");
});

test("formatRecommendTitle handles empty", () => {
  assert(formatRecommendTitle("") === "-", "expected dash");
});
