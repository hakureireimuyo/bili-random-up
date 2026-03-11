import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { resolve, join } from "node:path";

const root = process.cwd();
const srcExtension = resolve(root, "extension");
const distExtension = resolve(root, "dist", "extension");

mkdirSync(distExtension, { recursive: true });

cpSync(join(srcExtension, "ui"), join(distExtension, "ui"), { recursive: true });

const manifestPath = join(srcExtension, "manifest.tson");
const manifestJson = JSON.parse(readFileSync(manifestPath, "utf-8"));

manifestJson.background.service_worker = "background/service-worker.js";
manifestJson.content_scripts = manifestJson.content_scripts.map((script) => ({
  ...script,
  js: script.js.map((item) => item.replace(/\.ts$/, ".js"))
}));

writeFileSync(join(distExtension, "manifest.json"), JSON.stringify(manifestJson, null, 2));