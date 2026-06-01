import { existsSync, mkdirSync, openAsBlob, readFileSync, statSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
loadEnv(path.join(root, ".env.local"));

const args = parseArgs(process.argv.slice(2));
if (args.help || (!args.provider && !args.file && !args.url)) {
  printHelp();
  process.exit(0);
}

const provider = args.provider || "openai";
const outDir = path.resolve(root, args.out || "asr-results");

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const startedAt = Date.now();
const result =
  provider === "openai"
    ? await runOpenAI(args)
    : provider === "aliyun"
      ? await runAliyun(args)
      : provider === "doubao"
        ? await runDoubaoStandard(args)
        : fail(`未知 provider: ${provider}。可选：openai / aliyun / doubao`);

const fileBase = `${provider}-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const outputPath = path.join(outDir, `${fileBase}.json`);
await writeFile(
  outputPath,
  JSON.stringify(
    {
      provider,
      elapsed_ms: Date.now() - startedAt,
      input: {
        file: args.file || null,
        url: args.url || null,
      },
      result,
    },
    null,
    2,
  ),
);

console.log(`完成：${outputPath}`);

async function runOpenAI(options) {
  requireEnv("OPENAI_API_KEY");
  if (!options.file) {
    fail("OpenAI 需要本地音频文件：npm run asr:test -- --provider openai --file 音频路径");
  }

  const filePath = path.resolve(root, options.file);
  if (!existsSync(filePath)) fail(`找不到音频文件：${filePath}`);

  const size = statSync(filePath).size;
  if (size > 25 * 1024 * 1024) {
    fail("OpenAI 单文件上限通常是 25MB。请先切成小片段再测。");
  }

  const form = new FormData();
  form.set("model", options.model || "gpt-4o-transcribe");
  form.set("file", await openAsBlob(filePath), path.basename(filePath));
  form.set("response_format", "json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: form,
  });

  return readJsonOrFail(response, "OpenAI 转写失败");
}

async function runAliyun(options) {
  requireEnv("DASHSCOPE_API_KEY");
  if (!options.url) {
    fail("阿里云 Paraformer 需要公网可访问的音频 URL：npm run asr:test -- --provider aliyun --url https://...");
  }

  const submit = await fetch(
    "https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model: options.model || "paraformer-v2",
        input: { file_urls: [options.url] },
        parameters: {
          channel_id: [0],
          language_hints: ["zh", "en"],
          diarization_enabled: true,
          ...(options.speakers ? { speaker_count: Number(options.speakers) } : {}),
        },
      }),
    },
  );

  const submitJson = await readJsonOrFail(submit, "阿里云提交任务失败");
  const taskId = submitJson?.output?.task_id;
  if (!taskId) return { submit: submitJson };
  console.log(`阿里云任务 ID：${taskId}`);

  const task = await pollAliyunTask(taskId, Number(options.maxAttempts || 60));
  const first = task?.output?.results?.find((item) => item.transcription_url);
  let transcript = null;
  if (first?.transcription_url) {
    const transcriptResponse = await fetch(first.transcription_url);
    transcript = await readJsonOrFail(transcriptResponse, "阿里云下载转写结果失败");
  }

  return { submit: submitJson, task, transcript };
}

async function pollAliyunTask(taskId, maxAttempts) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await sleep(3000);
    const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.DASHSCOPE_API_KEY}`,
      },
    });
    const json = await readJsonOrFail(response, "阿里云查询任务失败");
    const status = json?.output?.task_status;
    if (status === "SUCCEEDED" || status === "FAILED" || status === "CANCELED") {
      return json;
    }
    console.log(`阿里云任务处理中：${status || "UNKNOWN"}，第 ${attempt} 次查询`);
  }
  fail("阿里云任务等待超时。可以稍后用控制台查看任务，或换短音频测试。");
}

async function runDoubaoStandard(options) {
  requireEnv("DOUBAO_API_KEY");
  if (!options.url) {
    fail("豆包标准版需要公网音频 URL：npm run asr:test -- --provider doubao --url https://...");
  }

  const taskId = crypto.randomUUID();
  const headers = {
    "Content-Type": "application/json",
    "X-Api-Key": process.env.DOUBAO_API_KEY,
    "X-Api-Resource-Id": options.resource || "volc.seedasr.auc",
    "X-Api-Request-Id": taskId,
    "X-Api-Sequence": "-1",
  };

  const submit = await fetch(
    "https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        user: {
          uid: "podmark-test",
        },
        audio: {
          url: options.url,
          format: options.format || guessAudioFormat(options.url),
        },
        request: {
          model_name: options.model || "bigmodel",
          ssd_version: "200",
          enable_itn: true,
          enable_punc: true,
          enable_ddc: false,
          enable_speaker_info: true,
          enable_channel_split: false,
          show_utterances: true,
          enable_lid: true,
          vad_segment: true,
          sensitive_words_filter: "",
        },
      }),
    },
  );

  const submitHeaders = readDoubaoHeaders(submit);
  await readTextOrFail(submit, "豆包提交任务失败");

  if (submitHeaders.api_status_code !== "20000000") {
    fail(`豆包提交任务失败：${JSON.stringify(submitHeaders, null, 2)}`);
  }

  const queryHeaders = {
    "Content-Type": "application/json",
    "X-Api-Key": process.env.DOUBAO_API_KEY,
    "X-Api-Resource-Id": options.resource || "volc.seedasr.auc",
    "X-Api-Request-Id": taskId,
  };

  for (let attempt = 1; attempt <= 80; attempt += 1) {
    await sleep(3000);
    const query = await fetch("https://openspeech.bytedance.com/api/v3/auc/bigmodel/query", {
      method: "POST",
      headers: queryHeaders,
      body: "{}",
    });
    const queryMeta = readDoubaoHeaders(query);
    const body = await readJsonOrFail(query, "豆包查询任务失败");
    if (queryMeta.api_status_code === "20000000") {
      return { task_id: taskId, submit: submitHeaders, query: queryMeta, body };
    }
    if (queryMeta.api_status_code !== "20000001" && queryMeta.api_status_code !== "20000002") {
      fail(`豆包查询失败：${JSON.stringify({ query: queryMeta, body }, null, 2)}`);
    }
    console.log(`豆包任务处理中：${queryMeta.api_message || queryMeta.api_status_code}，第 ${attempt} 次查询`);
  }

  fail("豆包任务等待超时。");
}

function readDoubaoHeaders(response) {
  return {
    api_status_code: response.headers.get("X-Api-Status-Code"),
    api_message: response.headers.get("X-Api-Message"),
    tt_logid: response.headers.get("X-Tt-Logid"),
  };
}

async function readJsonOrFail(response, message) {
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    fail(`${message}：HTTP ${response.status}\n${JSON.stringify(json, null, 2)}`);
  }

  return json;
}

async function readTextOrFail(response, message) {
  const text = await response.text();
  if (!response.ok) {
    fail(`${message}：HTTP ${response.status}\n${text}`);
  }
  return text;
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

function guessAudioFormat(url) {
  const clean = url.split("?")[0].toLowerCase();
  const ext = path.extname(clean).replace(".", "");
  return ext || "mp3";
}

function requireEnv(name) {
  if (!process.env[name]) fail(`缺少 ${name}。请先填到 .env.local。`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printHelp() {
  console.log(`
用法：

1. 测 OpenAI，本地音频文件即可：
   npm run asr:test -- --provider openai --file "C:\\音频\\test.mp3"

2. 测阿里云，需要公网音频链接：
   npm run asr:test -- --provider aliyun --url "https://example.com/test.mp3"

3. 测豆包标准版，需要公网音频链接：
   npm run asr:test -- --provider doubao --url "https://example.com/test.mp3"

结果会保存到 asr-results 文件夹。
`);
}
