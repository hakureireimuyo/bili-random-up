import { readFileSync } from "node:fs";
import { argv, exit } from "node:process";
import { resolve } from "node:path";

const mid = Number(argv[2] ?? "");
if (!mid || Number.isNaN(mid)) {
  console.log("Usage: node scripts/probe-bili-api.js <mid>");
  exit(1);
}

const configPath = resolve(process.cwd(), "config", "bili.config.json");
let sessdata = "";
try {
  const raw = readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw);
  sessdata = String(parsed.sessdata ?? "");
} catch {
  sessdata = "";
}

if (!sessdata) {
  console.log("Missing sessdata in config/bili.config.json");
  console.log("Please set sessdata value and retry.");
  exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "Accept": "application/json, text/plain, */*",
  "Cookie": `SESSDATA=${sessdata}`
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function probe(url) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await sleep(800);
    const res = await fetch(url, { headers, method: "GET" });
    const text = await res.text();
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }

    console.log("URL:", url);
    console.log("Status:", res.status);
    if (parsed) {
      console.log("Code:", parsed.code, "Message:", parsed.message);
    }
    console.log("Body:", text.slice(0, 300));
    console.log("----");

    if (parsed && parsed.code === -799) {
      if (attempt < 3) {
        const waitMs = 2000 * attempt;
        console.log(`Rate limited (-799). Retry in ${waitMs}ms (attempt ${attempt + 1}/3)...`);
        await sleep(waitMs);
        continue;
      }
    }

    return parsed;
  }

  return null;
}

async function fetchTags(bvid) {
  const url = `https://api.bilibili.com/x/tag/archive/tags?bvid=${bvid}`;
  const data = await probe(url);
  const tags = Array.isArray(data?.data)
    ? data.data.map((t) => t?.tag_name).filter(Boolean)
    : [];
  return tags;
}

const infoUrl = `https://api.bilibili.com/x/space/acc/info?mid=${mid}`;
const videosUrl = `https://api.bilibili.com/x/space/arc/search?mid=${mid}&pn=1&ps=30&order=pubdate`;

const info = await probe(infoUrl);
const videos = await probe(videosUrl);

const vlist = videos?.data?.list?.vlist ?? [];
const sample = vlist.slice(0, 3);

if (sample.length > 0) {
  console.log("Sample videos:");
  for (const video of sample) {
    const tags = await fetchTags(video.bvid);
    console.log(`- ${video.title}`);
    console.log(`  bvid: ${video.bvid}`);
    console.log(`  tags: ${tags.join(", ") || "(none)"}`);
  }
}
