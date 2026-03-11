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

const popupHtmlPath = join(distExtension, "ui", "popup", "popup.html");
const optionsHtmlPath = join(distExtension, "ui", "options", "options.html");

const popupHtml = readFileSync(popupHtmlPath, "utf-8").replace(/\.ts"/g, ".js\"");
writeFileSync(popupHtmlPath, popupHtml);

const optionsHtml = readFileSync(optionsHtmlPath, "utf-8").replace(/\.ts"/g, ".js\"");
writeFileSync(optionsHtmlPath, optionsHtml);
