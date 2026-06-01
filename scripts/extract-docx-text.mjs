import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const args = parseArgs(process.argv.slice(2));

if (!args.file) {
  console.error('用法：node scripts/extract-docx-text.mjs --file "C:\\path\\稿子.docx"');
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
const python = args.python || "C:\\Users\\86177\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";

const code = `
import sys, zipfile, xml.etree.ElementTree as ET
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
with zipfile.ZipFile(sys.argv[1]) as z:
    xml = z.read('word/document.xml')
root = ET.fromstring(xml)
parts = []
for p in root.findall('.//w:p', ns):
    texts = []
    for node in p.findall('.//w:t', ns):
        if node.text:
            texts.append(node.text)
    text = ''.join(texts).strip()
    if text:
        parts.append(text)
print("\\n\\n".join(parts))
`;

const result = spawnSync(python, ["-c", code, filePath], {
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});

if (result.status !== 0) {
  console.error(result.error?.message || result.stderr || result.stdout || "未知错误");
  process.exit(result.status || 1);
}

await writeFile(outputPath, result.stdout.trim() + "\n", "utf8");
console.log(outputPath);

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
