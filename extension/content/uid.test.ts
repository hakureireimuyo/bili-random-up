import { extractUidFromWindow } from "../content/uid-core.js";
import { assert, test } from "../tests/test-runner.js";

test("extractUidFromWindow returns uid", () => {
  const uid = extractUidFromWindow({
    __INITIAL_STATE__: { user: { mid: 123 } }
  } as unknown as Window & { __INITIAL_STATE__?: { user?: { mid?: number } } });
  assert(uid === 123, "expected uid 123");
});

test("extractUidFromWindow handles missing", () => {
  const uid = extractUidFromWindow({} as Window & { __INITIAL_STATE__?: { user?: { mid?: number } } });
  assert(uid === null, "expected null");
});
