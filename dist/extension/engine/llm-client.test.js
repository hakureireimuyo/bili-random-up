import { buildChatRequestBody, parseTagsFromContent } from "../engine/llm-client.js";
import { assert, test } from "../tests/test-runner.js";
test("parseTagsFromContent parses JSON array", () => {
    const tags = parseTagsFromContent("[\"AI\", \"编程\"]");
    assert(tags.length === 2, "expected two tags");
    assert(tags[0] === "AI", "expected AI");
});
test("parseTagsFromContent parses line list", () => {
    const tags = parseTagsFromContent("AI\n编程\n音乐");
    assert(tags.length === 3, "expected three tags");
});
test("buildChatRequestBody builds payload", () => {
    const body = buildChatRequestBody("gpt-4o-mini", [
        { role: "user", content: "hello" }
    ]);
    assert(body.model === "gpt-4o-mini", "expected model");
});
