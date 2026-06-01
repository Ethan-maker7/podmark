export type PodcastDocument = {
  id: string;
  sourceUrl: string;
  platform: "xiaoyuzhou";
  title: string;
  showName: string;
  coverUrl?: string;
  duration?: number;
  audioUrl?: string;
  createdAt: string;
  updatedAt: string;
  status: "mock" | "resolving" | "ready" | "failed";
  transcriptSource: "mock" | "asr" | "imported";
  audioStatus: "available" | "unavailable" | "blocked";
  aiGuide: AILearningGuide;
  transcript: TranscriptSegment[];
};

export type TranscriptSegment = {
  id: string;
  podcastId: string;
  startTime: number;
  endTime?: number;
  text: string;
};

export type AILearningGuide = {
  summary: string;
  outline: {
    id: string;
    title: string;
    time: number;
    description?: string;
  }[];
  quotes: {
    id: string;
    text: string;
    time: number;
  }[];
  moments: {
    id: string;
    title: string;
    time: number;
    description?: string;
  }[];
};

export type Highlight = {
  id: string;
  podcastId: string;
  segmentId: string;
  selectedText: string;
  color: "yellow" | "blue" | "green" | "pink";
  startOffset?: number;
  endOffset?: number;
  createdAt: string;
};

export type Excerpt = {
  id: string;
  podcastId: string;
  segmentId: string;
  selectedText: string;
  time: number;
  sourceType: "user_selected" | "ai_quote";
  createdAt: string;
};

export type Note = {
  id: string;
  podcastId: string;
  segmentId: string;
  excerptId?: string;
  selectedText: string;
  content: string;
  tags: string[];
  time: number;
  createdAt: string;
  updatedAt: string;
};

export const mockPodcast: PodcastDocument = {
  id: "demo-product-thinking",
  sourceUrl: "https://www.xiaoyuzhoufm.com/episode/mock",
  platform: "xiaoyuzhou",
  title: "一次真正有效的学习，往往从重新组织材料开始",
  showName: "晚点学习室",
  coverUrl:
    "https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=900&q=85",
  duration: 4380,
  createdAt: "2026-05-25T08:30:00.000Z",
  updatedAt: "2026-05-25T08:30:00.000Z",
  status: "mock",
  transcriptSource: "mock",
  audioStatus: "unavailable",
  aiGuide: {
    summary:
      "这一期围绕信息摄入、主动阅读和长期记忆展开。嘉宾认为，播客真正产生学习价值，不在于听完多少内容，而在于能否把片段重新组织成自己的问题、判断和行动线索。",
    outline: [
      {
        id: "outline-1",
        title: "为什么听过不等于学过",
        time: 82,
        description: "从信息消费和学习沉淀的差异切入。",
      },
      {
        id: "outline-2",
        title: "把播客拆成可阅读的材料",
        time: 548,
        description: "讨论文字稿、时间戳和上下文如何帮助复盘。",
      },
      {
        id: "outline-3",
        title: "高亮和笔记的真正作用",
        time: 1320,
        description: "标注不是收藏句子，而是建立个人理解。",
      },
      {
        id: "outline-4",
        title: "AI 应该辅助进入内容",
        time: 2418,
        description: "AI Guide 负责降低理解门槛，而不是代替学习。",
      },
    ],
    quotes: [
      {
        id: "quote-1",
        text: "真正的学习痕迹，不是你保存了什么，而是你改变了哪些判断。",
        time: 1382,
      },
      {
        id: "quote-2",
        text: "AI 最好的位置，是站在阅读入口旁边，而不是站到阅读者前面。",
        time: 2494,
      },
      {
        id: "quote-3",
        text: "把一段声音变成可回看的对象，学习才开始有了复利。",
        time: 3262,
      },
    ],
    moments: [
      {
        id: "moment-1",
        title: "关于信息消费焦虑的判断",
        time: 412,
        description: "嘉宾解释为什么越听越多，反而越觉得没有积累。",
      },
      {
        id: "moment-2",
        title: "高亮、摘录和笔记的边界",
        time: 1520,
        description: "区分原文标记、收藏材料和个人理解。",
      },
      {
        id: "moment-3",
        title: "一个播客阅读器应该克制",
        time: 2874,
        description: "产品不应该把 AI 输出堆满，而应该保护阅读节奏。",
      },
    ],
  },
  transcript: [
    {
      id: "seg-1",
      podcastId: "demo-product-thinking",
      startTime: 82,
      endTime: 176,
      text: "很多人会把听播客当成一种学习，但听完之后真正留下来的东西其实很少。问题不是播客没有价值，而是声音天然是流动的，它很难被重新定位、反复咀嚼，也很难和你已有的问题建立连接。",
    },
    {
      id: "seg-2",
      podcastId: "demo-product-thinking",
      startTime: 548,
      endTime: 690,
      text: "如果我们把一集播客变成带时间戳的阅读材料，事情会发生变化。你可以跳回某个段落，可以只看和自己有关的部分，也可以把一个观点从对话里抽出来，放进自己的知识结构里。",
    },
    {
      id: "seg-3",
      podcastId: "demo-product-thinking",
      startTime: 968,
      endTime: 1088,
      text: "好的文字稿不应该像字幕文件。字幕是为了跟随播放，阅读稿是为了帮助理解。它需要段落，需要留白，需要把语气词和重复表达处理到不干扰阅读，但又保留说话者的真实语感。",
    },
    {
      id: "seg-4",
      podcastId: "demo-product-thinking",
      startTime: 1320,
      endTime: 1460,
      text: "高亮本身没有价值。真正有价值的是你为什么高亮，以及这段内容之后会被你如何使用。颜色只是一个入口，它应该引导你区分重要、启发、行动和金句，而不是把页面染得很热闹。",
    },
    {
      id: "seg-5",
      podcastId: "demo-product-thinking",
      startTime: 1520,
      endTime: 1668,
      text: "摘录和笔记也需要分开。摘录是把原文收进来，笔记是把自己的理解写出去。前者帮助你保存材料，后者帮助你形成判断。一个学习产品如果混淆这两件事，用户最后只会得到一堆漂亮但无法复用的收藏。",
    },
    {
      id: "seg-6",
      podcastId: "demo-product-thinking",
      startTime: 2418,
      endTime: 2564,
      text: "AI 在这里应该非常克制。它可以先告诉你这期节目大概讲什么，哪些地方值得回听，哪些句子可能值得收藏。但它不应该替你完成理解。否则用户看完 AI 摘要就离开了，阅读器反而失去了存在感。",
    },
    {
      id: "seg-7",
      podcastId: "demo-product-thinking",
      startTime: 2874,
      endTime: 3028,
      text: "我会更喜欢一种安静的工具感。它不急着把所有功能都推到你面前，而是在你选中一段话、想做点什么的时候，才把高亮、摘录、写笔记这些动作轻轻递出来。",
    },
    {
      id: "seg-8",
      podcastId: "demo-product-thinking",
      startTime: 3262,
      endTime: 3408,
      text: "播客的复利来自可回看。你第一次听到的是声音，第二次看到的是结构，第三次留下来的才可能是你自己的理解。这个过程越顺滑，用户越有可能真的把内容变成自己的东西。",
    },
  ],
};

export const mockHighlights: Highlight[] = [
  {
    id: "highlight-1",
    podcastId: "demo-product-thinking",
    segmentId: "seg-4",
    selectedText: "颜色只是一个入口，它应该引导你区分重要、启发、行动和金句",
    color: "blue",
    startOffset: 72,
    endOffset: 99,
    createdAt: "2026-05-25T09:08:00.000Z",
  },
];

export const mockNotes: Note[] = [
  {
    id: "note-1",
    podcastId: "demo-product-thinking",
    segmentId: "seg-5",
    selectedText: "摘录是把原文收进来，笔记是把自己的理解写出去。",
    content: "这个区分适合放进产品交互里：摘录按钮应该轻，笔记入口应该承载用户的主动表达。",
    tags: ["产品思维", "学习方法"],
    time: 1520,
    createdAt: "2026-05-25T09:15:00.000Z",
    updatedAt: "2026-05-25T09:15:00.000Z",
  },
  {
    id: "note-2",
    podcastId: "demo-product-thinking",
    segmentId: "seg-6",
    selectedText: "AI 在这里应该非常克制。",
    content: "AI Guide 不能抢阅读器主角位置，可以作为右侧辅助和入口。",
    tags: ["AI", "交互设计"],
    time: 2418,
    createdAt: "2026-05-25T09:20:00.000Z",
    updatedAt: "2026-05-25T09:20:00.000Z",
  },
];

export const mockExcerpts: Excerpt[] = [
  {
    id: "excerpt-1",
    podcastId: "demo-product-thinking",
    segmentId: "seg-8",
    selectedText: "播客的复利来自可回看。",
    time: 3262,
    sourceType: "user_selected",
    createdAt: "2026-05-25T09:22:00.000Z",
  },
];
