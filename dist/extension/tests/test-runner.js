/**
 * Minimal test runner utilities.
 */
const tests = [];
export function test(name, run) {
    tests.push({ name, run });
}
export function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}
export async function runTests() {
    let passed = 0;
    for (const t of tests) {
        try {
            await t.run();
            console.log(`[Test] PASS ${t.name}`);
            passed += 1;
        }
        catch (error) {
            console.error(`[Test] FAIL ${t.name}`, error);
        }
    }
    console.log(`[Test] Done ${passed}/${tests.length}`);
}
