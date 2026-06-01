import { existsSync, mkdirSync } from "node:fs";
import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));

if (!args.file) {
  console.error('用法：node scripts/extract-docx-text-js.mjs --file "音频测试\\随机波动稿子.docx"');
  process.exit(1);
}

const filePath = path.resolve(root, args.file);
if (!existsSync(filePath)) {
  console.error(`找不到文件：${filePath}`);
  process.exit(1);
}

const outDir = path.resolve(root, args.out || "asr-results");
mkdirSync(outDir, { recursive: true });
const outputPath = path.join(outDir, args.name || "reference-transcript.txt");
const tmpRoot = path.join(root, ".tmp");
mkdirSync(tmpRoot, { recursive: true });
const tmpDir = await mkdtemp(path.join(tmpRoot, "docx-"));

try {
  const zipPath = path.join(tmpDir, "source.zip");
  const unzipDir = path.join(tmpDir, "unzipped");
  await copyFile(filePath, zipPath);

  mkdirSync(unzipDir, { recursive: true });
  const expanded = spawnSync("tar", ["-xf", zipPath, "-C", unzipDir], { encoding: "utf8" });

  if (expanded.status !== 0) {
    throw new Error(expanded.error?.message || expanded.stderr || expanded.stdout || `Archive extraction failed with status ${expanded.status}`);
  }

  const xml = await readFile(path.join(unzipDir, "word", "document.xml"), "utf8");
  const paragraphs = [...xml.matchAll(/<w:p[\s\S]*?<\/w:p>/g)]
    .map((match) => {
      const text = [...match[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)]
        .map((item) => decodeXml(item[1]))
        .join("")
        .trim();
      return text;
    })
    .filter(Boolean);

  await writeFile(outputPath, paragraphs.join("\n\n") + "\n", "utf8");
  console.log(outputPath);
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}

function decodeXml(text) {
  return text
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
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
