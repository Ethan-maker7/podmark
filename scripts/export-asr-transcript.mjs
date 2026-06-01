import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));
const provider = args.provider || "aliyun";
const file = args.file || latestResult(provider);

if (!file) {
  console.error(`找不到 ${provider} 的结果文件。`);
  process.exit(1);
}

const sourcePath = path.resolve(root, file);
const json = JSON.parse(readFileSync(sourcePath, "utf8"));
const segments = extractSegments(json);
const outDir = path.resolve(root, args.out || "asr-results");
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const outputPath = path.join(outDir, `${provider}-transcript.md`);
const lines = [
  `# ${provider} transcript`,
  "",
  `Source: ${path.relative(root, sourcePath)}`,
  `Elapsed: ${(json.elapsed_ms / 1000).toFixed(1)}s`,
  `Segments: ${segments.length}`,
  "",
];

for (const segment of segments) {
  lines.push(`## ${formatTime(segment.start)} - ${formatTime(segment.end)} | Speaker ${segment.speaker}`);
  lines.push("");
  lines.push(segment.text);
  lines.push("");
}

await writeFile(outputPath, lines.join("\n"), "utf8");
console.log(outputPath);

function latestResult(provider) {
  const dir = path.join(root, "asr-results");
  if (!existsSync(dir)) return null;
  const fileName = readdirSync(dir)
    .filter((name) => name.startsWith(`${provider}-`) && name.endsWith(".json"))
    .sort((a, b) => statSync(path.join(dir, b)).mtimeMs - statSync(path.join(dir, a)).mtimeMs)[0];
  return fileName ? path.join("asr-results", fileName) : null;
}

function extractSegments(json) {
  if (json.provider === "aliyun") {
    const sentences = json.result?.transcript?.transcripts?.[0]?.sentences || [];
    return sentences.map((item) => ({
      start: item.begin_time,
      end: item.end_time,
      speaker: item.speaker_id ?? "-",
      text: item.text || "",
    }));
  }

  if (json.provider === "doubao") {
    const utterances = json.result?.body?.result?.utterances || [];
    return utterances.map((item) => ({
      start: item.start_time,
      end: item.end_time,
      speaker: item.additions?.speaker ?? item.speaker ?? "-",
      text: item.text || "",
    }));
  }

  return [];
}

function formatTime(ms) {
  const total = Math.max(0, Math.round(Number(ms || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
