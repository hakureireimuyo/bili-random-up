import { extractUidFromWindow } from "../content/uid-core.js";
import { assert, test } from "../tests/test-runner.js";
test("extractUidFromWindow returns uid", () => {
    const uid = extractUidFromWindow({
        __INITIAL_STATE__: { user: { mid: 123 } }
    });
    assert(uid === 123, "expected uid 123");
});
test("extractUidFromWindow handles missing", () => {
    const uid = extractUidFromWindow({});
    assert(uid === null, "expected null");
});
