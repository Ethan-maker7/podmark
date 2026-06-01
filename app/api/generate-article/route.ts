import { NextResponse } from "next/server";

type TranscriptSection = {
  startTime: string;
  endTime: string;
  speaker: string;
  text: string;
};

type Sentence = {
  begin_time: number;
  end_time: number;
  text: string;
  speaker_id?: number;
};

type DoubaoUtterance = {
  start_time: number;
  end_time: number;
  text: string;
  speaker?: string | number;
  additions?: {
    speaker?: string | number;
  };
};

type NormalizedSentence = {
  id: number;
  startTime: string;
  endTime: string;
  speaker: string;
  text: string;
};

const aiPrompt = `
你是 PodMark 的 AI 播客导读助手。

请根据播客资料和逐字稿，生成适合用户快速理解、回看和收藏的内容导读。

输入可能包含：
1. episodeMeta：节目元信息，可能包括 podcastTitle、episodeTitle、description、hosts、guests、timeline、shownotes
2. transcript：逐字稿片段，每段包含 startTime、endTime、speaker、text

请输出合法 JSON：

{
  "summary": "",
  "speakerNames": {
    "Speaker A": "",
    "Speaker B": ""
  },
  "outline": [
    {
      "startTime": "",
      "endTime": "",
      "title": "",
      "summary": ""
    }
  ],
  "quotes": [
    {
      "startTime": "",
      "endTime": "",
      "quote": ""
    }
  ]
}

生成要求：

0. 资料使用规则

- transcript 是最终事实依据。
- episodeMeta 只能作为理解节目背景、人物称呼、主题方向和章节结构的参考。
- 如果 episodeMeta 和 transcript 不一致，以 transcript 为准。
- 不要把 episodeMeta 中出现但 transcript 没有展开的内容写成重点。
- quotes 只能从 transcript 中提取，不能从 episodeMeta 中提取。

1. 小宇宙资料使用规则

- episodeMeta.title、podcastTitle、hosts、guests 可以用于理解节目背景、人物称呼和主题方向。
- episodeMeta.description 可以用于理解节目意图、主题背景和重要信息，但它通常带有宣传、引荐或第一人称表达。
- 生成 summary 时可以参考 description 中的信息，但必须改写成第三方导读。
- 不要照搬 description 原句。
- 不要保留宣传口吻。
- 不要使用第一人称引荐语气。
- episodeMeta.timeline 或 shownotes 可以作为 outline 的重要参考。
- 如果其中已经有清晰的章节、时间轴或主题层级，outline 可以较大程度沿用它的结构、顺序和主题划分。
- 但每个章节的 startTime、endTime、title 和 summary 必须结合 transcript 校验和重写。

2. 人物称呼规则

- 不要在输出中使用 Speaker A、Speaker B、Speaker C 这类机械标签。
- 如果逐字稿或 episodeMeta 中明确出现姓名、身份或称呼，可以使用。
- 如果无法判断具体姓名或身份，使用自然称呼，例如“主持人”“嘉宾”“受访者”“几位说话人”。
- 不要根据语气、内容风格推断真实身份。
- 不要凭空编造人物身份或关系。
- 请输出 speakerNames，用于把 Speaker A、Speaker B、Speaker C 显示成更自然的人物名或称呼。
- speakerNames 的 key 必须是 transcript 中出现的 speaker，value 可以是明确姓名，也可以是“主持人”“嘉宾”“受访者”等自然称呼。
- 如果无法判断，不要硬猜具体姓名，可以保留为自然称呼。

3. summary｜AI 导读

- 生成 100-200 字的第三方导读。
- 根据 transcript 的实际内容，概括这段播客主要聊了什么、展开了哪些话题、讨论重点在哪里。
- 可以参考 episodeMeta.description 的信息密度和主题线索，但不能照搬它的句子和宣传语气。
- 抓大放小，不做信息重复，也不写成故事复述。
- 可以有一定文字美感，但不要过度升华。
- 导读要让用户看完后知道：这段内容大致在聊什么，以及是否值得继续听。

4. outline｜内容导航

- 根据内容自然切分为 3-5 个章节。
- 如果 episodeMeta.timeline 或 shownotes 已经提供清晰时间轴，可以较大程度参考它的结构、顺序和主题划分。
- 如果没有可用时间轴，则按 transcript 中的话题变化、故事推进、观点转折或讨论重点切分。
- 每个章节对应一个相对完整的时间段。
- startTime 和 endTime 必须使用 transcript 中已有的时间，或使用 episodeMeta.timeline 中能够被 transcript 对应上的时间。
- outline 必须覆盖 transcript 的主要时间范围，不要只总结前半段内容。
- 第一条 outline 的 startTime 应接近 transcript 第一段的 startTime。
- 最后一条 outline 的 endTime 必须接近 transcript 最后一段的 endTime。
- 如果后半段内容较零散，也要合并成最后一个章节，不能遗漏一整段尾部内容。
- 除非最后内容只是片尾音乐、广告或无实质闲聊，否则最后一条 outline 不能提前结束。
- title 要像播客 App 的章节标题，具体、有信息量、有产品感。
- title 不要写成单个抽象词，也不要写成“讨论了某某问题”。
- title 最好能让用户一眼知道：点进去会听到什么，以及这一段为什么值得听。
- summary 用不超过 3 句话自然说明该章节的内容和看点。
- summary 直接进入具体内容，不要总是用“这一部分……”开头。
- summary 中不要机械使用 Speaker A/B/C，要根据上下文使用自然称呼或人物姓名。

5. quotes｜金句

- 提取 3 条适合收藏的句子。
- 每条包含 startTime、endTime、quote。
- startTime 和 endTime 必须使用 transcript 中已有的时间，方便前端跳转。
- 金句必须基于 transcript 中的真实表达，可以轻微整理口头语、重复词或明显 ASR 错误。
- 金句可以是一句话，也可以是连续的两到三句话。
- 每条金句建议控制在 20-80 字之间。
- 优先选择表达完整、有情绪、有判断、有细腻感受或启发性的内容。
- 不要只选很短的口号式句子。
- 不要只选单纯交代事件、人物或时间的信息句。
- 不要把多个不连续的句子拼接成一句。
- 不要直接编造 transcript 里没有的新句子。

只输出 JSON，不要输出解释、Markdown 或代码块。
`.trim();

export async function POST(request: Request) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing DASHSCOPE_API_KEY." }, { status: 500 });
  }

  const body = (await request.json()) as {
    episodeMeta?: Record<string, unknown>;
    audioUrl?: string | null;
    model?: string;
    asrProvider?: "aliyun" | "doubao";
    asrModel?: string;
    skipGuide?: boolean;
  };

  if (!body.audioUrl) {
    return NextResponse.json({ error: "Missing audioUrl." }, { status: 400 });
  }

  try {
    const timingsStartedAt = Date.now();
    const model = body.model || "qwen3.7-max";
    const asrProvider = body.asrProvider || "aliyun";
    const asrModel = body.asrModel || "fun-asr";
    const asrStartedAt = Date.now();
    const sentences =
      asrProvider === "doubao"
        ? await transcribeWithDoubao(body.audioUrl)
        : await transcribeWithAliyun(apiKey, body.audioUrl, asrModel);
    const segmentationStartedAt = Date.now();
    const transcript = segmentTranscript(sentences);
    const guideStartedAt = Date.now();
    if (body.skipGuide) {
      return NextResponse.json({
        transcript,
        guide: null,
        timings: {
          asrProvider,
          asrModel: asrProvider === "aliyun" ? asrModel : "volc.seedasr.auc",
          asrMs: segmentationStartedAt - asrStartedAt,
          segmentationMs: guideStartedAt - segmentationStartedAt,
          guideMs: 0,
          totalMs: Date.now() - timingsStartedAt,
        },
      });
    }
    const guide = await generateGuide(apiKey, model, body.episodeMeta ?? null, transcript);
    return NextResponse.json({
      transcript,
      guide,
      timings: {
        asrProvider,
        asrModel: asrProvider === "aliyun" ? asrModel : "volc.seedasr.auc",
        asrMs: segmentationStartedAt - asrStartedAt,
        segmentationMs: guideStartedAt - segmentationStartedAt,
        guideMs: Date.now() - guideStartedAt,
        totalMs: Date.now() - timingsStartedAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Article generation failed." },
      { status: 502 },
    );
  }
}

async function transcribeWithAliyun(apiKey: string, audioUrl: string, model: string) {
  const submitResponse = await fetch("https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify({
      model,
      input: { file_urls: [audioUrl] },
      parameters: {
        channel_id: [0],
        language_hints: ["zh", "en"],
        diarization_enabled: true,
      },
    }),
  });

  const submit = await readJson(submitResponse, "Aliyun ASR submit failed.");
  const taskId = submit?.output?.task_id;
  if (!taskId) throw new Error("Aliyun ASR did not return task_id.");

  const task = await pollAliyunTask(apiKey, taskId);
  const result = task?.output?.results?.find((item: { transcription_url?: string }) => item.transcription_url);
  if (!result?.transcription_url) throw new Error("Aliyun ASR did not return transcription_url.");

  const transcriptResponse = await fetch(result.transcription_url);
  const transcriptJson = await readJson(transcriptResponse, "Aliyun ASR transcript download failed.");
  const sentences = transcriptJson?.transcripts?.[0]?.sentences as Sentence[] | undefined;
  if (!sentences?.length) throw new Error("Aliyun ASR returned empty transcript.");

  return normalizeSentences(sentences);
}

async function transcribeWithDoubao(audioUrl: string) {
  const apiKey = process.env.DOUBAO_API_KEY;
  if (!apiKey) throw new Error("Missing DOUBAO_API_KEY.");

  const taskId = crypto.randomUUID();
  const resourceId = "volc.seedasr.auc";
  const submitResponse = await fetch("https://openspeech.bytedance.com/api/v3/auc/bigmodel/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
      "X-Api-Resource-Id": resourceId,
      "X-Api-Request-Id": taskId,
      "X-Api-Sequence": "-1",
    },
    body: JSON.stringify({
      user: { uid: "podmark" },
      audio: {
        url: audioUrl,
        format: guessAudioFormat(audioUrl),
      },
      request: {
        model_name: "bigmodel",
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
  });

  const submitHeaders = readDoubaoHeaders(submitResponse);
  await readJsonOrText(submitResponse, "Doubao ASR submit failed.");
  if (submitHeaders.statusCode !== "20000000") {
    throw new Error(`Doubao ASR submit failed. ${JSON.stringify(submitHeaders)}`);
  }

  const result = await pollDoubaoTask(apiKey, resourceId, taskId);
  const utterances = result?.body?.result?.utterances as DoubaoUtterance[] | undefined;
  if (utterances?.length) return normalizeDoubaoUtterances(utterances);

  const text = result?.body?.result?.text;
  if (typeof text === "string" && text.trim()) {
    return [
      {
        id: 1,
        startTime: "00:00",
        endTime: formatMs(Number(result?.body?.audio_info?.duration ?? 0)),
        speaker: "Speaker A",
        text,
      },
    ];
  }

  throw new Error("Doubao ASR returned empty transcript.");
}

async function pollDoubaoTask(apiKey: string, resourceId: string, taskId: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    await sleep(3000);
    const response = await fetch("https://openspeech.bytedance.com/api/v3/auc/bigmodel/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey,
        "X-Api-Resource-Id": resourceId,
        "X-Api-Request-Id": taskId,
      },
      body: "{}",
    });
    const headers = readDoubaoHeaders(response);
    const body = await readJsonOrText(response, "Doubao ASR polling failed.");
    if (headers.statusCode === "20000000") return { headers, body };
    if (headers.statusCode !== "20000001" && headers.statusCode !== "20000002") {
      throw new Error(`Doubao ASR polling failed. ${JSON.stringify({ headers, body }).slice(0, 500)}`);
    }
  }

  throw new Error("Doubao ASR timeout.");
}

function readDoubaoHeaders(response: Response) {
  return {
    statusCode: response.headers.get("X-Api-Status-Code"),
    message: response.headers.get("X-Api-Message"),
    logId: response.headers.get("X-Tt-Logid"),
  };
}

async function pollAliyunTask(apiKey: string, taskId: string) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    await sleep(3000);
    const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = await readJson(response, "Aliyun ASR polling failed.");
    const status = json?.output?.task_status;
    if (status === "SUCCEEDED") return json;
    if (status === "FAILED" || status === "CANCELED") throw new Error(`Aliyun ASR task ${status}.`);
  }

  throw new Error("Aliyun ASR timeout.");
}

async function generateGuide(
  apiKey: string,
  model: string,
  episodeMeta: Record<string, unknown> | null,
  transcript: TranscriptSection[],
) {
  const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(60_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: aiPrompt },
        {
          role: "user",
          content: `以下是输入内容：\n\n${JSON.stringify({ episodeMeta, transcript }, null, 2)}`,
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  const json = await readJson(response, "AI guide generation failed.");
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI guide returned empty content.");

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("AI guide returned invalid JSON.");
  }
}

function normalizeSentences(sentences: Sentence[]): NormalizedSentence[] {
  return sentences.map((sentence, index) => {
    const speakerId = sentence.speaker_id ?? 0;
    return {
      id: index + 1,
      startTime: formatMs(sentence.begin_time),
      endTime: formatMs(sentence.end_time),
      speaker: `Speaker ${String.fromCharCode(65 + speakerId)}`,
      text: sentence.text,
    };
  });
}

function normalizeDoubaoUtterances(utterances: DoubaoUtterance[]): NormalizedSentence[] {
  return utterances.map((utterance, index) => {
    const speakerId = utterance.additions?.speaker ?? utterance.speaker ?? 0;
    return {
      id: index + 1,
      startTime: formatMs(utterance.start_time),
      endTime: formatMs(utterance.end_time),
      speaker: `Speaker ${speakerId}`,
      text: utterance.text,
    };
  });
}

function segmentTranscript(sentences: NormalizedSentence[]): TranscriptSection[] {
  const sections: TranscriptSection[] = [];
  let current: NormalizedSentence[] = [];

  for (const sentence of sentences) {
    const previous = current.at(-1);
    const currentTextLength = current.reduce((total, item) => total + item.text.length, 0);
    const nextLength = currentTextLength + sentence.text.length;
    const speakerChanged = previous ? previous.speaker !== sentence.speaker : false;
    const shouldMergeShortFeedback =
      speakerChanged && isShortFeedback(sentence.text) && currentTextLength > 0 && currentTextLength < 260;
    const shouldCutForSpeaker = current.length > 0 && speakerChanged && !shouldMergeShortFeedback;
    const shouldCutForLength =
      current.length > 0 && nextLength > 320 && isCompleteSentence(previous?.text ?? "");
    const mustCutForLength = current.length > 0 && nextLength > 420;

    if (shouldCutForSpeaker || shouldCutForLength || mustCutForLength) {
      sections.push(joinSentences(current));
      current = [sentence];
    } else {
      current.push(sentence);
    }
  }

  if (current.length) sections.push(joinSentences(current));

  return sections;
}

function isShortFeedback(text: string) {
  const normalized = text.trim().replace(/[。！？!?，,、\s"“”‘’]/g, "");
  if (!normalized || normalized.length > 10) return false;
  return /^(嗯+|啊+|哦+|对+|是+|好+|没错|确实|可以|哈哈+|呵呵+|对的|是的|明白|理解)$/.test(normalized);
}

function isCompleteSentence(text: string) {
  return /[。！？!?]["”’）)]?$/.test(text.trim());
}

function joinSentences(sentences: NormalizedSentence[]): TranscriptSection {
  const first = sentences[0];
  const last = sentences.at(-1) ?? first;
  const speakerCounts = new Map<string, number>();

  for (const sentence of sentences) {
    speakerCounts.set(sentence.speaker, (speakerCounts.get(sentence.speaker) ?? 0) + sentence.text.length);
  }

  const speaker =
    [...speakerCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? first.speaker;

  return {
    startTime: first.startTime,
    endTime: last.endTime,
    speaker,
    text: sentences.map((sentence) => sentence.text).join(""),
  };
}

function formatMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

async function readJson(response: Response, message: string) {
  const text = await response.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`${message} ${JSON.stringify(json).slice(0, 500)}`);
  }

  return json;
}

async function readJsonOrText(response: Response, message: string) {
  const text = await response.text();
  let body: any;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    throw new Error(`${message} ${JSON.stringify(body).slice(0, 500)}`);
  }

  return body;
}

function guessAudioFormat(url: string) {
  const pathname = url.split("?")[0].toLowerCase();
  const match = pathname.match(/\.([a-z0-9]+)$/);
  return match?.[1] || "mp3";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
