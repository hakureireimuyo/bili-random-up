import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

function findTestFiles(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...findTestFiles(fullPath));
    } else if (entry.endsWith(".test.js")) {
      files.push(fullPath);
    }
  }
  return files;
}

const root = resolve(process.cwd(), "dist", "extension");
const runnerPath = join(root, "tests", "test-runner.js");
const runnerModule = await import(pathToFileURL(runnerPath).href);
const testFiles = findTestFiles(root);

if (testFiles.length === 0) {
  console.log("[Test] No test files found.");
  process.exit(0);
}

for (const file of testFiles) {
  console.log(`[Test] Running ${file}`);
  await import(pathToFileURL(file).href);
}

await runnerModule.runTests();
