import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import OSS from "ali-oss";

const root = process.cwd();
loadEnv(path.join(root, ".env.local"));

const args = parseArgs(process.argv.slice(2));
if (args.help || !args.file) {
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

const filePath = path.resolve(root, args.file);
if (!existsSync(filePath)) {
  console.error(`找不到音频文件：${filePath}`);
  process.exit(1);
}

const client = new OSS({
  region: process.env.ALIYUN_OSS_REGION,
  accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET,
  bucket: process.env.ALIYUN_OSS_BUCKET,
});

const objectName =
  args.object ||
  `podmark-asr-test/${new Date().toISOString().slice(0, 10)}/${path.basename(filePath)}`;

console.log(`上传中：${filePath}`);
console.log(`OSS 对象：${objectName}`);

await client.put(objectName, filePath, {
  headers: {
    "Content-Type": contentTypeFor(filePath),
  },
});

const expiresSeconds = Number(args.expires || 24 * 60 * 60);
const url = client.signatureUrl(objectName, {
  expires: expiresSeconds,
  method: "GET",
});

console.log("\n临时音频 URL：");
console.log(url);

function contentTypeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".m4a") return "audio/mp4";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".flac") return "audio/flac";
  return "application/octet-stream";
}

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
  npm run audio:upload -- --file "音频测试\\岩中花述—测试.MP3"

可选：
  --expires 86400       临时 URL 有效秒数，默认 24 小时
  --object "path.mp3"   指定 OSS 里的文件名
`);
}
