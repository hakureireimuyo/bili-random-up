import {
  __resetRateLimiter,
  apiRequest,
  getFollowedUPs,
  getUPInfo,
  getUPVideos,
  getVideoTags,
  rateLimiter
} from "../api/bili-api.js";
import { assert, test } from "../tests/test-runner.js";

function createFetchOk(payload: unknown) {
  return async () => ({
    ok: true,
    status: 200,
    json: async () => payload
  });
}

function createFetchFail(status: number) {
  return async () => ({
    ok: false,
    status,
    json: async () => ({})
  });
}

test("apiRequest returns data on success", async () => {
  const fetchFn = createFetchOk({ data: { value: 1 } });
  const data = await apiRequest<{ data: { value: number } }>("/ok", { fetchFn });
  assert(data?.data.value === 1, "expected payload value 1");
});

test("apiRequest returns null on failure", async () => {
  const fetchFn = createFetchFail(500);
  const data = await apiRequest("/fail", { fetchFn });
  assert(data === null, "expected null for failed request");
});

test("getFollowedUPs returns list", async () => {
  const fetchFn = createFetchOk({ data: { list: [{ mid: 1, name: "UP" }] } });
  const list = await getFollowedUPs(123, { fetchFn });
  assert(list.length === 1, "expected one UP");
  assert(list[0].mid === 1, "expected mid 1");
});

test("getUPVideos returns list", async () => {
  const fetchFn = createFetchOk({
    data: { list: { vlist: [{ bvid: "BV1", aid: 2, title: "A" }] } }
  });
  const list = await getUPVideos(1, { fetchFn });
  assert(list.length === 1, "expected one video");
  assert(list[0].bvid === "BV1", "expected BV1");
});

test("getVideoTags returns tag names", async () => {
  const fetchFn = createFetchOk({ data: [{ tag_name: "AI" }] });
  const tags = await getVideoTags("BV1", { fetchFn });
  assert(tags.length === 1, "expected one tag");
  assert(tags[0] === "AI", "expected AI tag");
});

test("getUPInfo returns profile", async () => {
  const fetchFn = createFetchOk({ data: { mid: 2, name: "UP2" } });
  const info = await getUPInfo(2, { fetchFn });
  assert(info?.mid === 2, "expected mid 2");
});

test("rateLimiter enforces delay", async () => {
  __resetRateLimiter();
  const start = Date.now();
  await rateLimiter(50);
  await rateLimiter(50);
  const elapsed = Date.now() - start;
  assert(elapsed >= 50, "expected at least 50ms between requests");
});
