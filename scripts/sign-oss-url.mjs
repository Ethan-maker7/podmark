import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import OSS from "ali-oss";

const root = process.cwd();
loadEnv(path.join(root, ".env.local"));

const args = parseArgs(process.argv.slice(2));
if (args.help || (!args.object && !args.find)) {
  printHelp();
  process.exit(0);
}

for (const name of [
  "ALIYUN_OSS_ACCESS_KEY_ID",
  "ALIYUN_OSS_ACCESS_KEY_SECRET",
  "ALIYUN_OSS_BUCKET",
  "ALIYUN_OSS_REGION",
]) {
  if (!process.env[name]) {
    console.error(`缺少 ${name}，请先填到 .env.local。`);
    process.exit(1);
  }
}

const client = new OSS({
  region: process.env.ALIYUN_OSS_REGION,
  accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
  bucket: process.env.ALIYUN_OSS_BUCKET,
});

let objectName = args.object;
if (!objectName) {
  const result = await client.list({ "max-keys": 1000 });
  const matches = (result.objects || []).filter((item) => item.name.includes(args.find));
  if (matches.length === 0) {
    console.error(`没有找到包含 "${args.find}" 的对象。`);
    process.exit(1);
  }
  matches.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
  objectName = matches[0].name;
  console.log(`找到对象：${objectName}`);
}

const expiresSeconds = Number(args.expires || 24 * 60 * 60);
const url = client.signatureUrl(objectName, {
  expires: expiresSeconds,
  method: "GET",
});

console.log(url);

function loadEnv(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function printHelp() {
  console.log(`
用法：
  node scripts/sign-oss-url.mjs --find "随机波动"
  node scripts/sign-oss-url.mjs --object "path/audio.mp3"
`);
}
