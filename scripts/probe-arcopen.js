import { readFileSync } from "node:fs";
import { argv, exit } from "node:process";
import { resolve } from "node:path";
import { createHmac, createHash } from "node:crypto";

const mid = argv[2] ?? "";
const resourceId = argv[3] ?? "";

const configPath = resolve(process.cwd(), "config", "bili.config.json");
let config = {};
try {
  const raw = readFileSync(configPath, "utf-8");
  config = JSON.parse(raw);
} catch {
  config = {};
}

const accessKeyId = String(config.accessKeyId ?? "").trim();
const appSecret = String(config.appSecret ?? "").trim();
const accessToken = String(config.accessToken ?? "").trim();

if (!accessKeyId || !appSecret || !accessToken) {
  console.log("Missing accessKeyId/appSecret/accessToken in config/bili.config.json");
  exit(1);
}

const host = "https://member.bilibili.com";

function md5(content) {
  return createHash("md5").update(content, "utf8").digest("hex");
}

function hmacSha256(key, data) {
  return createHmac("sha256", key).update(data, "utf8").digest("hex");
}

function buildHeaders(body) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Date.now().toString();
  const contentMd5 = md5(body ?? "");

  const signHeaders = {
    "x-bili-accesskeyid": accessKeyId,
    "x-bili-content-md5": contentMd5,
    "x-bili-signature-method": "HMAC-SHA256",
    "x-bili-signature-nonce": nonce,
    "x-bili-signature-version": "2.0",
    "x-bili-timestamp": timestamp
  };

  const signString = Object.keys(signHeaders)
    .sort()
    .map((key) => `${key}:${signHeaders[key]}`)
    .join("\n");

  const authorization = hmacSha256(appSecret, signString);

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-bili-accesskeyid": accessKeyId,
    "x-bili-content-md5": contentMd5,
    "x-bili-signature-method": "HMAC-SHA256",
    "x-bili-signature-nonce": nonce,
    "x-bili-signature-version": "2.0",
    "x-bili-timestamp": timestamp,
    Authorization: authorization,
    "access-token": accessToken
  };
}

async function request(path) {
  const url = `${host}${path}`;
  const headers = buildHeaders("");
  const res = await fetch(url, { method: "GET", headers });
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
  console.log("Body:", text.slice(0, 400));
  console.log("----");
  return parsed;
}

await request("/arcopen/fn/user/account/info");
await request("/arcopen/fn/archive/viewlist?pn=1&ps=20&status=all");
if (resourceId) {
  await request(`/arcopen/fn/archive/view?resource_id=${resourceId}`);
}