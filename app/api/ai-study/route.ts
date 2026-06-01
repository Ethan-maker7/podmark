import { NextResponse } from "next/server";

const prompt = `
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

summary 好例子：

“这期节目从吴心越在县级市养老院的长期田野观察聊起，进入老年人、家属、护理员和养老机构共同构成的照护现场。对话讨论了普通人的养老选择、失能之后的生活质量、照护关系中的风险与尊严，以及社会如何想象脆弱和晚年。它关心的不是如何逃离老年，而是当衰弱不可避免时，我们还能如何理解一种有质量的生活。”

“这期节目用‘天气’来形容20岁的状态：潮湿、模糊、阴晴不定。几位女生从各自的生长痛、孤独感和事与愿违聊起，又借歌曲回到少女时代，重新看见自由、告别和自我拯救的时刻。对话后半段转向梦想与现实的落差、平凡感的接受，以及安稳和冒险之间的选择。”

“这期节目从电影《我，许可》和文淇的表演聊起，讨论新一代年轻人‘已经知道很多’之后仍然要面对的现实落差。对话围绕自我许可、身体经验、家庭关系、愤怒背后的委屈，以及年轻人如何在清醒和承担之间生活展开。后半段转向文淇本人，呈现她对表演、表达、社会认可和自我要求的思考。”

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

outline 好例子：

{
  "startTime": "04:30",
  "endTime": "18:40",
  "title": "养老院里的晚年，为什么不只是一个家庭选择",
  "summary": "从田野观察进入养老院现场，老人为何来到这里，背后牵连着家庭责任、失能照护和普通人的现实处境。父母不愿拖累子女，也让养老选择不再只是个人决定。"
}

{
  "startTime": "00:34",
  "endTime": "12:31",
  "title": "20岁的潮湿时刻，如何落到具体的生长痛里",
  "summary": "梅雨、薄雾和多云被用来形容20岁的状态：还没准备好，却已经被推着做选择。几位说话人通过“雨滴收集瓶”分享生长痛、孤独感和事与愿违，把迷茫落到具体的情绪瞬间里。"
}

{
  "startTime": "03:05:54",
  "endTime": "03:19:45",
  "title": "Agent时代的追赶，为什么已经从预训练转向后训练",
  "summary": "对话回到大模型竞争的当前格局：Pre-train 的代差正在缩小，真正的分水岭转向 Agent 的 Post-train、RL scaling 和基础设施敏捷性。接下来的几个月，会考验团队能否快速拥抱新范式。"
}

{
  "startTime": "01:52",
  "endTime": "33:22",
  "title": "知道一切之后，年轻人为什么仍然会被现实卡住",
  "summary": "从电影《我，许可》和高校路演聊起，对话讨论新一代年轻人如何过早拥有解释世界的概念，却依然会在身体、家庭和制度里遭遇“不被许可”的时刻。许可的愤怒、拧巴和松动，不只是角色性格，也折射出一种清醒之后仍然难以行动的现实处境。"
}

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
- 如果原文里有一段表达本身很完整，可以保留为较长金句，让用户收藏时仍能看懂语境。

只输出 JSON，不要输出解释、Markdown 或代码块。
`.trim();

export async function POST(request: Request) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing DASHSCOPE_API_KEY." }, { status: 500 });
  }

  const body = (await request.json()) as {
    episodeMeta?: Record<string, unknown>;
    transcript?: Array<{ startTime: string; endTime?: string; speaker: string; text: string }>;
    model?: string;
  };

  if (!body.transcript?.length) {
    return NextResponse.json({ error: "Missing transcript." }, { status: 400 });
  }

  const input = {
    episodeMeta: body.episodeMeta ?? null,
    transcript: body.transcript,
  };

  const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: body.model || "qwen3.7-max",
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: `以下是输入内容：\n\n${JSON.stringify(input, null, 2)}`,
        },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  const text = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  if (!response.ok) {
    return NextResponse.json({ error: "AI study generation failed.", detail: json }, { status: response.status });
  }

  const content = (json as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ error: "Model returned empty content.", detail: json }, { status: 502 });
  }

  try {
    return NextResponse.json(JSON.parse(content));
  } catch {
    return NextResponse.json({ error: "Model returned invalid JSON.", content }, { status: 502 });
  }
}
