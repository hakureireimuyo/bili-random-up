import { extractUidFromMessage, extractUidFromWindow } from "../content/uid-core.js";
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
test("extractUidFromMessage returns uid", () => {
    const uid = extractUidFromMessage({ source: "bde", type: "uid_detected", uid: 88 });
    assert(uid === 88, "expected uid 88");
});
test("extractUidFromMessage rejects invalid", () => {
    const uid = extractUidFromMessage({ source: "other", type: "uid_detected", uid: 1 });
    assert(uid === null, "expected null");
});
