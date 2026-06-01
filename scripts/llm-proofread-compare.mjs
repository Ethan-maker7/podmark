import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
loadEnv(path.join(root, ".env.local"));

const args = parseArgs(process.argv.slice(2));
const outDir = path.resolve(root, args.out || "asr-results/llm-proofread");
mkdirSync(outDir, { recursive: true });

const models = (args.models || "qwen-plus,qwen-max,qwen-turbo")
  .split(",")
  .map((model) => model.trim())
  .filter(Boolean);

const promptPath = path.resolve(root, args.prompt || "prompts/asr-conservative-proofread.md");
const sourcePath = path.resolve(root, args.source || "asr-results/random-readable-sections.json");
const referencePath = args.reference ? path.resolve(root, args.reference) : null;

if (!process.env.DASHSCOPE_API_KEY) fail("缺少 DASHSCOPE_API_KEY，请先填到 .env.local。");
if (!existsSync(promptPath)) fail(`找不到提示词文件：${promptPath}`);
if (!existsSync(sourcePath)) fail(`找不到 ASR 输入文件：${sourcePath}`);

const prompt = readFileSync(promptPath, "utf8").trim();
const sourceText = readSourceText(sourcePath);
const referenceText = referencePath && existsSync(referencePath) ? readFileSync(referencePath, "utf8").trim() : "";

const runSummary = [];
for (const model of models) {
  const startedAt = Date.now();
  console.log(`调用 ${model}...`);
  try {
    const output = await callDashScope(model, prompt, sourceText);
    const elapsedMs = Date.now() - startedAt;
    const outputPath = path.join(outDir, `${model}-proofread.md`);
    await writeFile(outputPath, output.trim() + "\n", "utf8");
    runSummary.push({
      model,
      status: "ok",
      elapsed_ms: elapsedMs,
      output_file: path.relative(root, outputPath),
      chars: output.length,
      rough_reference_overlap: referenceText ? roughOverlap(output, referenceText) : null,
    });
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    runSummary.push({
      model,
      status: "error",
      elapsed_ms: elapsedMs,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const summaryPath = path.join(outDir, "summary.json");
await writeFile(summaryPath, JSON.stringify(runSummary, null, 2), "utf8");
console.log(summaryPath);

async function callDashScope(model, systemPrompt, inputText) {
  const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `下面是 ASR 转写稿，请按系统规则做保守校对。不要参考任何外部资料。\n\n${inputText}`,
        },
      ],
      temperature: Number(args.temperature || 0.1),
    }),
  });

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(json)}`);
  }

  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error(`模型没有返回正文：${JSON.stringify(json)}`);
  return content;
}

function readSourceText(filePath) {
  const raw = readFileSync(filePath, "utf8");
  if (filePath.endsWith(".json")) {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      return data.map((item) => `${item.speaker || "SPEAKER"}：${item.text}`).join("\n\n");
    }
  }
  return raw.trim();
}

function roughOverlap(a, b) {
  const normalize = (text) => text.replace(/\s+/g, "").slice(0, 8000);
  const aa = normalize(a);
  const bb = normalize(b);
  if (!aa || !bb) return 0;
  const grams = new Set();
  for (let i = 0; i < aa.length - 1; i += 1) grams.add(aa.slice(i, i + 2));
  let hit = 0;
  let total = 0;
  for (let i = 0; i < bb.length - 1; i += 1) {
    total += 1;
    if (grams.has(bb.slice(i, i + 2))) hit += 1;
  }
  return Number((hit / Math.max(total, 1)).toFixed(4));
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

function fail(message) {
  console.error(message);
  process.exit(1);
}
