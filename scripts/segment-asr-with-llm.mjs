import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
loadEnv(path.join(root, ".env.local"));

const args = parseArgs(process.argv.slice(2));
const model = args.model || "deepseek-v4-flash";
const provider = args.provider || "aliyun";
const sourcePath = path.resolve(root, args.source || latestResult(provider));
const promptPath = path.resolve(root, args.prompt || "prompts/asr-segmentation-only.md");
const outDir = path.resolve(root, args.out || "asr-results/llm-segmentation");

if (!process.env.DASHSCOPE_API_KEY) fail("Missing DASHSCOPE_API_KEY in .env.local.");
if (!existsSync(sourcePath)) fail(`ASR source not found: ${sourcePath}`);
if (!existsSync(promptPath)) fail(`Prompt not found: ${promptPath}`);
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const asr = JSON.parse(readFileSync(sourcePath, "utf8"));
const prompt = readFileSync(promptPath, "utf8").trim();
const sentences = extractSentences(asr);
const maxChars = Number(args.maxChars || 300);
const targetChars = Number(args.targetChars || 250);
const minChars = Number(args.minChars || 60);
if (!sentences.length) fail("No ASR sentences found in source file.");

const input = JSON.stringify(sentences, null, 2);
const startedAt = Date.now();
console.log(`Calling ${model} for ${sentences.length} ASR sentences...`);
let llmElapsedMs = 0;
let grouped = null;
if (args.grouped) {
  const groupedPath = path.resolve(root, args.grouped);
  const previous = JSON.parse(readFileSync(groupedPath, "utf8"));
  grouped = previous.raw_llm || previous;
  llmElapsedMs = previous.llm_elapsed_ms ?? 0;
  console.log(`Reusing previous grouping: ${groupedPath}`);
} else {
  const responseText = await callDashScope(model, prompt, input);
  llmElapsedMs = Date.now() - startedAt;
  grouped = parseJsonResponse(responseText);
}
const paragraphs = mergeShortParagraphs(
  splitOversizedParagraphs(buildParagraphs(grouped, sentences), sentences, {
    maxChars,
    targetChars,
  }),
  { maxChars, minChars },
);

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const jsonPath = path.join(outDir, `${model}-${stamp}.json`);
const mdPath = path.join(outDir, `${model}-${stamp}.md`);
const metadata = {
  model,
  source: path.relative(root, sourcePath),
  asr_elapsed_ms: asr.elapsed_ms ?? null,
  llm_elapsed_ms: llmElapsedMs,
  sentence_count: sentences.length,
  paragraph_count: paragraphs.length,
  max_chars: maxChars,
  target_chars: targetChars,
  min_chars: minChars,
};

await writeFile(
  jsonPath,
  JSON.stringify(
    {
      ...metadata,
      paragraphs,
      raw_llm: grouped,
    },
    null,
    2,
  ),
  "utf8",
);

await writeFile(mdPath, renderMarkdown(metadata, paragraphs), "utf8");

console.log(`JSON: ${jsonPath}`);
console.log(`Markdown: ${mdPath}`);
console.log(`LLM elapsed: ${(llmElapsedMs / 1000).toFixed(1)}s`);

async function callDashScope(selectedModel, systemPrompt, userInput) {
  const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Group these ASR sentences into readable paragraphs. Return JSON only.\n\n${userInput}`,
        },
      ],
      temperature: Number(args.temperature || 0),
      response_format: { type: "json_object" },
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
  if (!content) throw new Error(`Model returned no content: ${JSON.stringify(json)}`);
  return content;
}

function extractSentences(json) {
  if (json.provider === "aliyun") {
    const items = json.result?.transcript?.transcripts?.[0]?.sentences || [];
    return items.map((item, index) => ({
      id: Number(item.sentence_id ?? index + 1),
      speaker: `SPEAKER_${String(Number(item.speaker_id ?? 0) + 1).padStart(2, "0")}`,
      start_ms: Number(item.begin_time ?? 0),
      end_ms: Number(item.end_time ?? 0),
      text: item.text || "",
    }));
  }
  fail(`Unsupported provider in source: ${json.provider}`);
}

function parseJsonResponse(text) {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    throw new Error(`Could not parse model JSON: ${error.message}\n${text}`);
  }
}

function buildParagraphs(grouped, sourceSentences) {
  if (!Array.isArray(grouped?.paragraphs)) {
    throw new Error("Model JSON must contain paragraphs array.");
  }

  const byId = new Map(sourceSentences.map((sentence) => [sentence.id, sentence]));
  const seen = new Set();
  const paragraphs = grouped.paragraphs.map((paragraph, index) => {
    if (!Array.isArray(paragraph.ids) || paragraph.ids.length === 0) {
      throw new Error(`Paragraph ${index + 1} has no ids.`);
    }

    const ids = paragraph.ids.map(Number);
    const sentences = ids.map((id) => {
      if (!byId.has(id)) throw new Error(`Unknown sentence id: ${id}`);
      if (seen.has(id)) throw new Error(`Duplicate sentence id: ${id}`);
      seen.add(id);
      return byId.get(id);
    });

    const speakerSet = [...new Set(sentences.map((sentence) => sentence.speaker))];
    return {
      index: index + 1,
      ids,
      start_ms: sentences[0].start_ms,
      end_ms: sentences.at(-1).end_ms,
      speakers: speakerSet,
      char_count: countChineseLikeChars(sentences.map((sentence) => sentence.text).join("")),
      text: sentences.map((sentence) => sentence.text).join(""),
      reason: String(paragraph.reason || ""),
    };
  });

  const missing = sourceSentences.map((sentence) => sentence.id).filter((id) => !seen.has(id));
  if (missing.length) throw new Error(`Missing sentence ids: ${missing.join(", ")}`);
  return paragraphs;
}

function splitOversizedParagraphs(paragraphs, sourceSentences, options) {
  const byId = new Map(sourceSentences.map((sentence) => [sentence.id, sentence]));
  const output = [];

  for (const paragraph of paragraphs) {
    if (paragraph.char_count <= options.maxChars || paragraph.ids.length <= 1) {
      output.push(paragraph);
      continue;
    }

    let group = [];
    let count = 0;
    for (const id of paragraph.ids) {
      const sentence = byId.get(id);
      const sentenceChars = countChineseLikeChars(sentence.text);
      if (group.length > 0 && count >= 120 && count + sentenceChars > options.targetChars) {
        output.push(paragraphFromSentences(group, `${paragraph.reason}; length fallback split`));
        group = [];
        count = 0;
      }
      group.push(sentence);
      count += sentenceChars;
    }

    if (group.length > 0) {
      output.push(paragraphFromSentences(group, `${paragraph.reason}; length fallback split`));
    }
  }

  return output.map((paragraph, index) => ({
    ...paragraph,
    index: index + 1,
  }));
}

function mergeShortParagraphs(paragraphs, options) {
  const output = [];

  for (const paragraph of paragraphs) {
    const previous = output.at(-1);
    if (
      previous &&
      paragraph.char_count < options.minChars &&
      previous.char_count + paragraph.char_count <= options.maxChars
    ) {
      output[output.length - 1] = mergeParagraphs(previous, paragraph);
      continue;
    }
    output.push(paragraph);
  }

  return output.map((paragraph, index) => ({
    ...paragraph,
    index: index + 1,
  }));
}

function mergeParagraphs(left, right) {
  return {
    index: 0,
    ids: [...left.ids, ...right.ids],
    start_ms: left.start_ms,
    end_ms: right.end_ms,
    speakers: [...new Set([...left.speakers, ...right.speakers])],
    char_count: left.char_count + right.char_count,
    text: `${left.text}${right.text}`,
    reason: `${left.reason}; short paragraph fallback merge`,
  };
}

function paragraphFromSentences(sentences, reason) {
  return {
    index: 0,
    ids: sentences.map((sentence) => sentence.id),
    start_ms: sentences[0].start_ms,
    end_ms: sentences.at(-1).end_ms,
    speakers: [...new Set(sentences.map((sentence) => sentence.speaker))],
    char_count: countChineseLikeChars(sentences.map((sentence) => sentence.text).join("")),
    text: sentences.map((sentence) => sentence.text).join(""),
    reason,
  };
}

function renderMarkdown(metadata, paragraphs) {
  const lines = [
    "# Paraformer + DeepSeek-v4-flash segmentation",
    "",
    `Source: ${metadata.source}`,
    `ASR elapsed: ${metadata.asr_elapsed_ms ? `${(metadata.asr_elapsed_ms / 1000).toFixed(1)}s` : "-"}`,
    `LLM elapsed: ${(metadata.llm_elapsed_ms / 1000).toFixed(1)}s`,
    `Sentences: ${metadata.sentence_count}`,
    `Paragraphs: ${metadata.paragraph_count}`,
    "",
  ];

  for (const paragraph of paragraphs) {
    lines.push(
      `## ${formatTime(paragraph.start_ms)} - ${formatTime(paragraph.end_ms)} | ${paragraph.speakers.join(", ")} | ${paragraph.char_count} chars`,
      "",
      paragraph.text,
      "",
    );
  }

  return `${lines.join("\n")}\n`;
}

function countChineseLikeChars(text) {
  return text.replace(/\s+/g, "").length;
}

function formatTime(ms) {
  const total = Math.max(0, Math.round(Number(ms || 0) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function latestResult(selectedProvider) {
  const dir = path.join(root, "asr-results");
  if (!existsSync(dir)) return null;
  const fileName = readdirSync(dir)
    .filter((name) => name.startsWith(`${selectedProvider}-`) && name.endsWith(".json"))
    .sort((a, b) => statSync(path.join(dir, b)).mtimeMs - statSync(path.join(dir, a)).mtimeMs)[0];
  return fileName ? path.join("asr-results", fileName) : null;
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
