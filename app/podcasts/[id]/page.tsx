"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  BookMarked,
  BookOpen,
  Copy,
  Highlighter,
  ListTree,
  Pause,
  Play,
  Sparkles,
  Tags,
  Volume2,
} from "lucide-react";
import {
  ARTICLE_STORAGE_PREFIX,
  AUTO_GENERATE_ARTICLE_KEY,
  LAST_PARSED_EPISODE_KEY,
  LEARNING_STORAGE_PREFIX,
  LIBRARY_STORAGE_KEY,
  type LibraryEntry,
  type ParsedEpisode,
  type StoredArticle,
  type StoredLearning,
  type StoredLearningNote,
} from "@/lib/parsed-episode";
import { SHOWCASE_EPISODE_ID, showcaseEpisode, showcaseGuide, showcaseTranscriptSections } from "@/lib/showcase";

const showcaseEpisodeId = SHOWCASE_EPISODE_ID;

const outlineItems = [
  {
    time: "00:00 - 08:12",
    title: "为什么需要把播客重新变成可阅读的材料",
    summary: "开场讨论播客在通勤和碎片时间里很容易被听完，却很难留下可复习、可引用的学习痕迹。",
  },
  {
    time: "08:13 - 18:40",
    title: "注意力被算法切碎之后，我们如何重新建立判断",
    summary: "这一段围绕信息密度、社交媒体和深度思考展开，强调主动整理比被动接收更重要。",
  },
  {
    time: "18:41 - 31:20",
    title: "从听见到理解：标注让灵感变成知识资产",
    summary: "嘉宾讨论划线、笔记和复听如何共同构成学习闭环，让一段音频真正进入自己的知识库。",
  },
  {
    time: "31:21 - 56:12",
    title: "在嘈杂环境里保留一块安静的阅读空间",
    summary: "结尾回到产品理念：AI 负责整理结构，人负责判断、标记和长期回看。",
  },
];

type TranscriptSection = {
  time: string;
  speaker: string;
  text: string;
  title?: string;
  active?: boolean;
};

type LearningItem = {
  id: string;
  type: "highlight" | "tag";
  time: string;
  text: string;
  tag?: string;
};

type LearningNote = StoredLearningNote;

type AIGuide = {
  summary: string;
  speakerNames?: Record<string, string>;
  outline: Array<{
    startTime: string;
    endTime: string;
    title: string;
    summary: string;
  }>;
  quotes: Array<{
    startTime: string;
    endTime: string;
    quote: string;
  }>;
};

type GeneratedArticle = {
  transcript: Array<{
    startTime: string;
    endTime: string;
    speaker: string;
    text: string;
  }>;
  guide?: AIGuide | null;
};

const tagOptions = ["观点", "案例", "问题", "金句", "待复习"];

const transcriptSections: TranscriptSection[] = [
  {
    time: "04:12",
    speaker: "主持人",
    title: "重新进入这一期播客",
    text: "欢迎来到这一期 PodMark 深度阅读。今天，我们不只是把播客放在耳边听完，而是试着把那些值得停下来的片段重新放到眼前。很多内容只有在被看见、被标记、被重新组织之后，才会真正变成可以复习的知识。",
  },
  {
    time: "08:45",
    speaker: "嘉宾",
    title: "注意力和判断力",
    text: "在当今这个算法驱动的时代，我们的注意力像被撕裂的碎片。每一声通知、每一次无限滚动，都在侵蚀我们构建深层思考的能力。真正属于我们的，是我们如何判断，以及我们愿意把注意力交给什么。",
  },
  {
    time: "12:38",
    speaker: "主持人",
    title: "从听见到标记",
    text: "这就是为什么我们构建了这种阅读模式。与其让音频在耳边匆匆掠过，不如停下来，标记出那些击中你灵魂的段落。当你真正与文字产生碰撞时，知识才开始沉淀。",
    active: true,
  },
  {
    time: "23:18",
    speaker: "嘉宾",
    title: "给自己一块安静的空间",
    text: "当我们谈论宁静时，指的不是环境的寂静，而是内在秩序。就像一个精心整理的图书馆，无论外界如何喧闹，你内心深处始终有一个可以退守和重新整理的地方。",
  },
];

const randomWaveTranscriptSections: TranscriptSection[] = [
  {
    time: "00:00",
    speaker: "SPEAKER_01",
    text: "什么事情？我觉得他只是因为我爸爸打麻将又打的特别晚，然后就我妈妈会把这个门窗锁起来，然后我爸爸晚上就会去叫门，叫门可能有时候我妈不去开，为我在家我就会去开，然后就会听到一些吵架等等。然后我听到我朋友这么跟我说，就是一般听到一个很离谱的消息，它大概率就是真的。但是我又不敢去找任何人确定这件事情。然后当时我是总之我一直拖到了我必须要离开家去北京上学的前一天晚上，我爸爸也还不在。",
  },
  {
    time: "00:37",
    speaker: "SPEAKER_01",
    text: "然后我就跟我同样面色凝重的跟我妈说，我说我有个事情想问你，然后我说我听我听叉叉叉说我爸有一个小孩刚满月，然后我妈对我妈我就是我看我妈妈的脸色，就我问之前就觉得90%左右是真的，然后我看我妈妈的脸色就知道好百分之百这件事情是真的。然后我妈妈就让我给我爸爸打电话，就把他喊回来。嗯，整个过程其实就是也没有人也没有办法跟我解释前后是什么。总之这件事情呢是我爸爸跟一个可能在类似于有一点点掺黄色的那样的ktv工作的女性有了一个小孩是个儿子。然后那个时候然后她给这对母子在那个小镇上租了个房子，然后刚好在我在家我听到那个消息的时间是因为我爸爸也许因为生了个儿子非常高兴，所以他在镇上给这个小孩摆了满月酒。",
  },
  {
    time: "01:42",
    speaker: "SPEAKER_01",
    text: "就我们那边对满月也是有一些活动的，摆了满月酒，但是估计邀请的都是她，就是邀请的人里面是。总之我外婆整个家族是无人知情的，我觉得要做到这一点也很不容易。这里面肯定有一些难男相互的部分，因为不然这么小的一个地方怎么可能做到这么大的一件事情。然后我外婆整个家令人知晓，然后这件事情唯一知道最早知道人是我妈。就是在这个女性怀孕的时候，我妈妈就知道了，我爸爸说的是啊怀孕了这个孩子要不要不要留下来，我妈说了算。而我妈就觉得很荒谬，就是好像要把这个可能让一个孩子流产的罪责让她承担，总之就是还是要了这个小孩。然后我爸爸他可能就是以一种我就是想要一个儿子，然后这个小孩生下来之后，就我们带回家自己养。",
  },
  {
    time: "02:36",
    speaker: "SPEAKER_01",
    text: "有点像就是把这个女性作为一个工具，以这样的说法来诓骗我妈吧。我觉得但其实实际上这个这个男孩也没有真正的在我家生活过多久，就可能在她满一岁左右，有那么半年的时间在我家待过。然后后来还是被她妈妈带走了。反正我问过我爸爸很多事情，但是在当时都是一个情绪比较激烈的欧巴，是一个我觉得他在脾气上不是一个那么典型的闽南男人，他没有就是没有过暴力行为。但是是我可能因为他家里最小的儿子就是那种被保护着长大，所以是一个性格很软弱的不负责任的人。所以反而是我在跟他讲话的时候，我会摔东西，我会我会说一些情绪比较激烈的一起去死啊等等这样的话。然后我爸爸就是就是只会沉默，或者说那你觉得要怎么办呢？",
  },
  {
    time: "03:34",
    speaker: "SPEAKER_01",
    text: "我在这之前都会觉得我整体的生生活是幸福的，然后我应该就是在这个春节回家去翻我高中时候写的日记本，还看到应该高二还是高三的时候。因为那个时候我上高中，然后每次周末回家的时候，我爸爸会开车来载我。我还有一个片段就讲说我躺在爸爸的后座上感到很安心，就那种对在爸爸车后座可以安心睡觉的那一个画面，在我高中的日记本上。然后我这次回去翻到，我又觉得非常荒谬。因为在这件事情之后，我就觉得都是假象。就是我小时候可能也是真心觉得我爸爸是爱我的就宠我的，然后会觉得都是假象，也会觉得真的非常的不负责任。然后很多的追问是要不到一个答案的。",
  },
  {
    time: "04:21",
    speaker: "SPEAKER_01",
    text: "我觉得很明白是指我可以用一种抽离的态度说。他就是这样的人，那他的问题跟我没关系。这件事情我觉得后来给我造成的一个影响是我可能很长时间都会觉得，我作为他的女儿，我是女孩这件事情对他来说是不是一个失望。对，因为他看起来花费了这么大的力气，犯下了这么大的错误，要给自己生一个儿子。",
  },
  {
    time: "04:53",
    speaker: "SPEAKER_02",
    text: "是大家会很容易的觉得错也都在爸爸身上了，妈妈很受伤害。但这件事情里你和妈妈的关系其实也变复杂了。",
  },
  {
    time: "05:04",
    speaker: "SPEAKER_01",
    text: "嗯，是的。因为我妈妈我爸妈没有离婚，就很多时候其实我能够比较抽离的看待我爸爸。因为我没有跟他一起生活，我大学之后就离家，然后这件事情发生之后，我可以把它从我生活中摘除出去。但是我妈妈她没有摘除。其实我妈确实是一个受害者。但也因为她是一个受害者，她变得很痛苦，然后她也很自觉的运用这种痛苦来压制我。比如说当我说我希望你离开这个婚姻，她会说我都是为了你们不离婚的。你们是你和你弟弟是完整家庭的小孩，我希望你们是完整家庭的小孩。当我要离开家的时候，她觉得那你怎么能离开家呢？你爸这么对我，你就这样走了。我说可我要上大学，我考到了北京的大学，然后她觉得你可以不去啊。她甚至会说一些很可怕的话，比如说就觉得她最恨的人是我，因为我这个所谓出轨的证据是我发现的。",
  },
  {
    time: "06:20",
    speaker: "SPEAKER_01",
    text: "所以我把这件事情带到了她面前。但是我能够理解她的痛苦，那种痛苦又太强烈了。而我在当时一个18岁的人，不应该由我去处理它。我很早就要把自己变成一个成年人，把我妈妈看成一个需要照顾的人。然后也包括我的弟弟，就是我也觉得我在母亲的这种眼泪和痛苦里，我和我弟弟都被早早的放在一个成年人的位置上。像我弟弟当时小学四年级，她有时会跟我妈说，如果我爸妈离婚的话，他就跟我妈走，那我就会很心疼。就是一个才小学四年级的人为什么要去安慰他的母亲这些事情，包括我在高三的时候，我妈妈也会给我打电话说他俩又吵架了，怎么办？",
  },
  {
    time: "07:13",
    speaker: "SPEAKER_01",
    text: "然后我就不得不在那个时候去觉得我要考到哪里，我又可以离家。那我要考到上海吗？上海还不够远，我就要考到北京去。总之是这样的一个情感，我觉得是非常复杂的，那就是一个真的非常复杂的家庭和成长的关系。然后我觉得我妈妈在这里面其实也是承担了那种代际女性承担了太多痛苦。其实生养一个女儿对她来说不是一个解脱，因为她的女儿也没有办法帮她解决这些结构性的问题。",
  },
  {
    time: "07:52",
    speaker: "SPEAKER_03",
    text: "对，我觉得就是传统里女儿是在某种程度上是有解救母亲的责任的。因为可能她当年在生她的女儿的时候，固然可能一方面是想要生一个能帮助她干家务、帮她带后面的更小的孩子的女人，但与此同时她也会抱有一种希望，她会希望这个孩子，你作为一个女性，你会理解我所有的东西。可是我觉得对女儿来说，很艰难的是，她就算理解她也不能改变这些，她不能够真的逆时间回去，帮她的母亲去选择别的路，帮她在自己的人生里做出别的决定。妈妈吃过的苦，女儿其实会经由她的诉说再吃一遍。",
  },
  {
    time: "08:41",
    speaker: "SPEAKER_02",
    text: "我觉得刚才大家的讲述里有一个让我很在意的事情，虽然有不同的面向，好像都在那个瞬间，生活里那种本来已经很熟悉的经验和情感关系发生了断裂。可能是一个可能无法回去的一个瞬间。",
  },
  {
    time: "09:01",
    speaker: "SPEAKER_03",
    text: "对，我其实特别有感触的就是梦到母亲去世的那一点。因为我其实无数次无数次的经历那个阶段，尤其是在我妈妈她当时可能就是不能照顾我的那几年。然后再到后来等我说我要出国，然后她又会把自己的病放在一个非常前面的位置，但其实到头来它很有可能不是一个特别严重的或者真正造成威胁的疾病的时候，我无数次在想她死了就好了，我的人生是不是就解脱了？",
  },
];

const quotes = [
  {
    time: "03:34",
    quote: "标记不是打断收听，而是让值得记住的内容有地方停留。",
  },
  {
    time: "04:21",
    quote: "真正属于我们的，是我们如何判断，以及我们愿意把注意力交给什么。",
  },
  {
    time: "07:52",
    quote: "AI 可以整理结构，但意义仍然来自人的选择。",
  },
];

export default function PodcastReaderPage() {
  const params = useParams<{ id: string }>();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [learningOpen, setLearningOpen] = useState(false);
  const [learningFullOpen, setLearningFullOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [showSpeakers, setShowSpeakers] = useState(false);
  const [selectionTools, setSelectionTools] = useState({ visible: false, x: 0, y: 0, text: "", time: "", itemId: "" });
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [editingTagId, setEditingTagId] = useState("");
  const [learningItems, setLearningItems] = useState<LearningItem[]>([]);
  const [learningNotes, setLearningNotes] = useState<LearningNote[]>([]);
  const [learningLoaded, setLearningLoaded] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [aiGuide, setAiGuide] = useState<AIGuide | null>(null);
  const [aiGuideStatus, setAiGuideStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [aiGuideError, setAiGuideError] = useState("");
  const [generatedTranscript, setGeneratedTranscript] = useState<TranscriptSection[] | null>(null);
  const [storedEpisode, setStoredEpisode] = useState<ParsedEpisode | null>(null);
  const [parsedEpisode] = useState<ParsedEpisode | null>(() => {
    if (typeof window === "undefined") return null;

    const storedEpisode = window.sessionStorage.getItem(LAST_PARSED_EPISODE_KEY);
    if (!storedEpisode) return null;

    try {
      return JSON.parse(storedEpisode) as ParsedEpisode;
    } catch {
      window.sessionStorage.removeItem(LAST_PARSED_EPISODE_KEY);
      return null;
    }
  });

  const routeEpisodeId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const isShowcaseEpisode = routeEpisodeId === showcaseEpisodeId;
  const parsedEpisodeForRoute = !routeEpisodeId || parsedEpisode?.episodeId === routeEpisodeId ? parsedEpisode : null;
  const effectiveEpisode = isShowcaseEpisode ? showcaseEpisode : parsedEpisodeForRoute ?? storedEpisode;
  const episodeTitle = effectiveEpisode?.title ?? "沉思录：在数字化荒野中寻找宁静";
  const podcastName = effectiveEpisode?.podcastName ?? "哲学与人生";
  const coverUrl =
    effectiveEpisode?.coverUrl ??
    "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=500&q=85";
  const duration = effectiveEpisode?.duration ?? "56:12";
  const episodeCode = effectiveEpisode?.episodeId ? "已解析" : "EP.42";
  const audioUrl = effectiveEpisode?.audioUrl ?? null;
  const isParsedEpisode = Boolean(effectiveEpisode?.episodeId) && !isShowcaseEpisode;
  const episodeStorageId = effectiveEpisode?.episodeId ?? routeEpisodeId ?? "demo-product-thinking";
  const visibleTranscriptSections: TranscriptSection[] =
    generatedTranscript ??
    (isShowcaseEpisode
      ? showcaseTranscriptSections.map((section) => ({ ...section }))
      : isParsedEpisode
      ? []
      : randomWaveTranscriptSections);
  const activeSummary =
    aiGuide?.summary ??
    (aiGuideStatus === "loading"
      ? visibleTranscriptSections.length
        ? "逐字稿已生成，正在整理摘要、大纲与金句，请稍等……"
        : "音频信息已获取。PodMark 正在生成逐字稿，请稍等……"
      : isShowcaseEpisode
      ? showcaseGuide.summary
      : isParsedEpisode
      ? "音频信息已获取"
      : "这一期讨论了在信息过载和算法推荐中，如何通过主动整理、标注和复看，重新建立自己的注意力秩序。播客不只是被听完的内容，也可以成为长期沉淀的学习材料。");
  const activeOutline = (
    aiGuide?.outline ??
    (isShowcaseEpisode
      ? showcaseGuide.outline
      : isParsedEpisode
      ? []
      : outlineItems.map((item) => ({ ...item, startTime: item.time.split("-")[0].trim(), endTime: item.time.split("-")[1]?.trim() || item.time })))
  ).filter((item) => item.title?.trim() && item.summary?.trim());
  const activeQuotes =
    (aiGuide?.quotes ?? (isShowcaseEpisode ? showcaseGuide.quotes : isParsedEpisode ? [] : quotes.map((quote) => ({ ...quote, startTime: quote.time, endTime: quote.time })))).slice(0, 3);
  const sortedHighlights = sortLearningItemsByTime(learningItems.filter((item) => item.type === "highlight"));
  const sortedTags = sortLearningItemsByTime(learningItems.filter((item) => item.type === "tag"));
  const sortedNotes = sortLearningNotesByTime(learningNotes);
  const progress = audioDuration > 0 ? Math.min((currentTime / audioDuration) * 100, 100) : audioUrl ? 0 : 32;
  const thumbProgress = Math.min(Math.max(progress, 2), 98);
  const protectedNavProps = aiGuideStatus === "loading" ? { target: "_blank", rel: "noopener noreferrer" } : {};

  useEffect(() => {
    if (typeof window === "undefined") return;
    setLearningLoaded(false);

    const shouldAutoGenerate = window.sessionStorage.getItem(AUTO_GENERATE_ARTICLE_KEY) === "1";
    if (shouldAutoGenerate) {
      window.localStorage.removeItem(`${ARTICLE_STORAGE_PREFIX}${episodeStorageId}`);
      setStoredEpisode(null);
      setGeneratedTranscript(null);
      setAiGuide(null);
      setAiGuideStatus("idle");
    } else {
    const articleJson = window.localStorage.getItem(`${ARTICLE_STORAGE_PREFIX}${episodeStorageId}`);
    if (articleJson) {
      try {
        const stored = JSON.parse(articleJson) as StoredArticle;
        setStoredEpisode(stored.episode);
        setGeneratedTranscript(stored.transcript);
        setAiGuide(stored.guide ?? null);
        setAiGuideStatus(stored.guide ? "ready" : "idle");
      } catch {
        window.localStorage.removeItem(`${ARTICLE_STORAGE_PREFIX}${episodeStorageId}`);
      }
    }
    }

    const learningJson = window.localStorage.getItem(`${LEARNING_STORAGE_PREFIX}${episodeStorageId}`);
    setLearningItems([]);
    setLearningNotes([]);
    if (learningJson) {
      try {
        const stored = JSON.parse(learningJson) as StoredLearning;
        setLearningItems(stored.items ?? []);
        const migratedNote = stored.note?.trim()
          ? [{ id: "legacy-note", time: "00:00", text: stored.note.trim(), createdAt: stored.updatedAt }]
          : [];
        setLearningNotes(stored.notes?.length ? stored.notes : migratedNote);
      } catch {
        window.localStorage.removeItem(`${LEARNING_STORAGE_PREFIX}${episodeStorageId}`);
      }
    }
    setLearningLoaded(true);
  }, [episodeStorageId]);

  useEffect(() => {
    if (typeof window === "undefined" || !learningLoaded) return;
    saveLearningState();
  }, [learningItems, learningNotes, learningLoaded]);

  useEffect(() => {
    if (typeof window === "undefined" || !isParsedEpisode || !audioUrl || aiGuideStatus !== "idle") return;

    const shouldAutoGenerate = window.sessionStorage.getItem(AUTO_GENERATE_ARTICLE_KEY) === "1";
    if (!shouldAutoGenerate) return;

    window.sessionStorage.removeItem(AUTO_GENERATE_ARTICLE_KEY);
    void generateAIGuide();
  }, [audioUrl, aiGuideStatus, isParsedEpisode]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = playbackRate;

    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }

  function seekBy(seconds: number) {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.min(Math.max(audio.currentTime + seconds, 0), audio.duration || Number.MAX_SAFE_INTEGER);
  }

  function jumpToTime(timeLabel: string) {
    const seconds = parseTimestamp(timeLabel);
    const targetTime = findNearestSectionTime(seconds, visibleTranscriptSections);
    const target = document.querySelector<HTMLElement>(`[data-start-time="${targetTime}"]`);

    target?.scrollIntoView({ behavior: "smooth", block: "center" });

    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = Math.min(Math.max(seconds, 0), audio.duration || Number.MAX_SAFE_INTEGER);
    setCurrentTime(audio.currentTime);
  }

  function selectPlaybackRate(nextRate: number) {
    setPlaybackRate(nextRate);
    setSpeedMenuOpen(false);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  }

  function seekFromProgress(event: React.PointerEvent<HTMLButtonElement>) {
    const audio = audioRef.current;
    if (!audio || !audioDuration) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    audio.currentTime = Math.min(Math.max(ratio, 0), 1) * audioDuration;
    setCurrentTime(audio.currentTime);
  }

  function updateSelectionTools() {
    const selection = window.getSelection();
    const text = selection?.toString().trim() || "";

    if (!selection || selection.rangeCount === 0 || !text) {
      setSelectionTools((current) => ({ ...current, visible: false, text: "", time: "", itemId: "" }));
      setTagMenuOpen(false);
      return;
    }

    const container = document.querySelector(".transcript-flow");
    const anchor = selection.anchorNode;
    const anchorElement = anchor?.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor;

    if (!container || !(anchorElement instanceof Element) || !container.contains(anchorElement)) {
      setSelectionTools((current) => ({ ...current, visible: false, text: "", time: "", itemId: "" }));
      setTagMenuOpen(false);
      return;
    }

    const rect = selection.getRangeAt(0).getBoundingClientRect();
    const section = anchorElement.closest<HTMLElement>("[data-start-time]");
    setSelectionTools({
      visible: true,
      x: rect.left + rect.width / 2,
      y: Math.max(rect.top - 12, 12),
      text,
      time: section?.dataset.startTime || "",
      itemId: "",
    });
    setTagMenuOpen(false);
  }

  async function copySelection() {
    if (!selectionTools.text) return;
    await navigator.clipboard?.writeText(selectionTools.text);
  }

  function closeTagDialog() {
    setSelectionTools((current) => ({ ...current, visible: false, text: "", time: "", itemId: "" }));
    setTagMenuOpen(false);
    setTagDraft("");
    setEditingTagId("");
  }

  function addLearningItem(type: LearningItem["type"], tag?: string) {
    if (!selectionTools.text || !selectionTools.time) return;

    if (selectionTools.itemId) {
      setLearningItems((items) =>
        items.map((item) => (item.id === selectionTools.itemId ? { ...item, type: tag ? "tag" : item.type, tag } : item)),
      );
      setSelectionTools((current) => ({ ...current, visible: false, text: "", time: "", itemId: "" }));
      setTagMenuOpen(false);
      setTagDraft("");
      setEditingTagId("");
      return;
    }

    setLearningItems((items) => [
      {
        id: `${Date.now()}-${items.length}`,
        type,
        time: selectionTools.time,
        text: selectionTools.text,
        tag,
      },
      ...items,
    ]);
    setSelectionTools((current) => ({ ...current, visible: false, text: "", time: "", itemId: "" }));
    setTagMenuOpen(false);
    setTagDraft("");
    setEditingTagId("");
    window.getSelection()?.removeAllRanges();
  }

  function saveTagFromDialog() {
    const tag = tagDraft.trim() || "标签";
    if (editingTagId) {
      setLearningItems((items) => items.map((item) => (item.id === editingTagId ? { ...item, tag } : item)));
      closeTagDialog();
      return;
    }

    addLearningItem("tag", tag);
  }

  function addEpisodeNote() {
    const text = noteDraft.trim();
    if (!text) return;

    setLearningNotes((notes) => [
      {
        id: `note-${Date.now()}`,
        time: formatPlayerTime(currentTime),
        text,
        createdAt: new Date().toISOString(),
      },
      ...notes,
    ]);
    setNoteDraft("");
  }

  function removeEpisodeNote(id: string) {
    setLearningNotes((notes) => notes.filter((note) => note.id !== id));
  }

  function openLearningItemTools(item: LearningItem, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    setSelectionTools({
      visible: true,
      x: rect.left + rect.width / 2,
      y: Math.max(rect.top - 12, 12),
      text: item.text,
      time: item.time,
      itemId: item.id,
    });
    setTagMenuOpen(false);
    setEditingTagId("");
    window.getSelection()?.removeAllRanges();
  }

  function openTagDialog(item: LearningItem) {
    setSelectionTools({
      visible: false,
      x: 0,
      y: 0,
      text: item.text,
      time: item.time,
      itemId: item.id,
    });
    setTagDraft(item.tag || "");
    setEditingTagId(item.id);
    setTagMenuOpen(true);
    window.getSelection()?.removeAllRanges();
  }

  function removeLearningItem() {
    if (!selectionTools.itemId) return;
    setLearningItems((items) => items.filter((item) => item.id !== selectionTools.itemId));
    setSelectionTools((current) => ({ ...current, visible: false, text: "", time: "", itemId: "" }));
    setTagMenuOpen(false);
    setTagDraft("");
    setEditingTagId("");
  }

  function deleteTagFromDialog() {
    if (!editingTagId) return;
    setLearningItems((items) => items.filter((item) => item.id !== editingTagId));
    closeTagDialog();
  }

  async function generateAIGuide() {
    setAiGuideStatus("loading");
    setAiGuideError("");

    const episodeMeta = {
      podcastTitle: podcastName,
      episodeTitle,
      description: effectiveEpisode?.description,
      duration,
    };

    let transcriptSections = visibleTranscriptSections;

    if (isParsedEpisode && audioUrl) {
      if (!transcriptSections.length) {
        try {
          const response = await fetch("/api/generate-article", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              episodeMeta,
              audioUrl,
              model: "qwen3.7-max",
              asrProvider: "aliyun",
              asrModel: "fun-asr",
              skipGuide: true,
            }),
          });
          const data = (await response.json()) as GeneratedArticle | { error?: string };
          if (!response.ok || "error" in data) throw new Error("error" in data ? data.error : "Transcript generation failed");
          const article = data as GeneratedArticle;
          transcriptSections = article.transcript.map((section) => ({
            time: section.startTime,
            speaker: section.speaker,
            text: section.text,
          }));
          setGeneratedTranscript(transcriptSections);
          saveArticleState(transcriptSections, null);
        } catch (error) {
          setAiGuideError(formatGenerationError(error));
          setAiGuideStatus("error");
          return;
        }
      }
    }

    const transcript = transcriptSections.map((section, index) => ({
      startTime: section.time,
      endTime: transcriptSections[index + 1]?.time || normalizeDurationAsTimestamp(duration) || duration,
      speaker: formatSpeakerLabel(section.speaker),
      text: section.text,
    }));

    try {
      const response = await fetch("/api/ai-study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeMeta, transcript, model: "qwen3.7-max" }),
      });
      const data = (await response.json()) as AIGuide | { error?: string };
      if (!response.ok || "error" in data) throw new Error("AI guide generation failed");
      const guide = data as AIGuide;
      setAiGuide(guide);
      setAiGuideStatus("ready");
      saveArticleState(transcriptSections, guide);
    } catch (error) {
      setAiGuideError(formatGenerationError(error));
      setAiGuideStatus("error");
    }
  }

  function saveArticleState(transcript: TranscriptSection[], guide: AIGuide | null) {
    if (typeof window === "undefined") return;

    const episode: ParsedEpisode = effectiveEpisode ?? {
      episodeId: episodeStorageId,
      title: episodeTitle,
      podcastName,
      coverUrl,
      duration,
      audioUrl,
    };
    const stored: StoredArticle = {
      episode,
      transcript: transcript.map(({ time, speaker, text }) => ({ time, speaker, text })),
      guide,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(`${ARTICLE_STORAGE_PREFIX}${episodeStorageId}`, JSON.stringify(stored));
    if (guide) saveToLibrary(guide.summary);
  }

  function saveLearningState() {
    if (typeof window === "undefined") return;

    const stored: StoredLearning = {
      episodeId: episodeStorageId,
      items: learningItems,
      notes: learningNotes,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(`${LEARNING_STORAGE_PREFIX}${episodeStorageId}`, JSON.stringify(stored));
    if (aiGuide && visibleTranscriptSections.length && audioUrl) {
      saveToLibrary(aiGuide?.summary);
    }
  }

  function saveToLibrary(summary = aiGuide?.summary) {
    if (typeof window === "undefined") return;

    const currentJson = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
    let current: LibraryEntry[] = [];
    try {
      current = currentJson ? (JSON.parse(currentJson) as LibraryEntry[]) : [];
    } catch {
      current = [];
    }

    const nextEntry: LibraryEntry = {
      episodeId: episodeStorageId,
      title: episodeTitle,
      podcastName,
      coverUrl,
      duration,
      sourceUrl: effectiveEpisode?.sourceUrl,
      summary,
      highlightCount: learningItems.filter((item) => item.type === "highlight").length,
      tagCount: learningItems.filter((item) => item.type === "tag").length,
      hasNote: learningNotes.length > 0,
      updatedAt: new Date().toISOString(),
    };
    const next = [nextEntry, ...current.filter((entry) => entry.episodeId !== episodeStorageId)];
    window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <main className="sanctuary-page reader-v3">
      <header className="reader-v3-nav">
        <Link className="reader-logo" href="/">
          PodMark
        </Link>
        <nav>
          <Link href="/" {...protectedNavProps}>首页</Link>
          <Link className="active" href={`/podcasts/${showcaseEpisodeId}`}>
            正在阅读
          </Link>
          <Link href="/library" {...protectedNavProps}>学习库</Link>
        </nav>
      </header>

      <div className="reader-learning-layout">
        <section className="episode-info-strip" aria-label="播客信息">
          <img alt="播客封面" src={coverUrl} />
          <div>
            <p>{podcastName}</p>
            <h1>{episodeTitle}</h1>
          </div>
          <span>{episodeCode}</span>
          <span>{duration}</span>
        </section>

        <article className="reading-document primary-reading">
        <section className="ai-learning-nav inline-guide" aria-labelledby="ai-learning-title">
          <div className="ai-nav-heading">
            <span>
              <Sparkles size={17} />
              AI 学习导航
            </span>
            {aiGuideStatus === "loading" ? <i className="generation-spinner" aria-label="正在生成中" /> : null}
          </div>

          <div className="ai-summary-block">
            <strong>本期摘要</strong>
            <p>{aiGuideStatus === "error" ? aiGuideError || "AI 生成失败，请稍后重试。" : activeSummary}</p>
            {aiGuideStatus === "error" ? (
              <button className="retry-guide-button" type="button" onClick={() => void generateAIGuide()}>
                重试生成
              </button>
            ) : null}
          </div>

          {activeOutline.length ? <div className="outline-panel">
            <div className="outline-title">
              <ListTree size={18} />
              <strong>重点大纲</strong>
            </div>
            <div className="outline-list">
              {activeOutline.map((item) => (
                <button key={`${item.startTime}-${item.title}`} type="button" onClick={() => jumpToTime(item.startTime)}>
                  <span>{formatOutlineTimeRange(item.startTime, item.endTime)}</span>
                  <strong>{item.title}</strong>
                  <p>{item.summary}</p>
                </button>
              ))}
            </div>
          </div> : null}

          {activeQuotes.length ? <div className="quote-strip" aria-label="金句">
            {activeQuotes.map((quote) => (
              <button className="quote-jump-card" key={`${quote.startTime}-${quote.quote}`} type="button" onClick={() => jumpToTime(quote.startTime)}>
                <span className="quote-card-meta">
                  <BookMarked size={16} />
                  {quote.startTime}
                </span>
                <p>“{quote.quote}”</p>
              </button>
            ))}
          </div> : null}
        </section>

        <div className="transcript-flow" onMouseUp={updateSelectionTools} onKeyUp={updateSelectionTools}>
          {visibleTranscriptSections.length ? visibleTranscriptSections.map((section) => (
            <section
              className={section.active ? "transcript-chapter active" : "transcript-chapter"}
              data-start-time={section.time}
              key={`${section.time}-${section.title}`}
            >
              {section.title ? <h3>{section.title}</h3> : null}
              {showTimestamps ? (
                <button className="chapter-time-jump" type="button" onClick={() => jumpToTime(section.time)}>
                  {section.time}
                </button>
              ) : null}
              <p>
                {showSpeakers ? <span className="speaker-inline">{displaySpeakerName(section.speaker, aiGuide?.speakerNames)}</span> : null}
                {renderAnnotatedText(
                  section.text,
                  section.time,
                  learningItems,
                  openLearningItemTools,
                  openTagDialog,
                )}
              </p>
            </section>
          )) : (
            <section className="transcript-empty-state">
              <strong>音频信息已获取</strong>
              <p>
                {aiGuideStatus === "loading"
                  ? "PodMark 会先生成逐字稿，再整理摘要、大纲与金句，请稍等……"
                  : "正在等待生成博客文章。"}
              </p>
              {aiGuideStatus === "loading" ? <i className="generation-spinner" aria-label="正在生成中" /> : null}
            </section>
          )}
        </div>
        </article>
      </div>

      {selectionTools.visible ? (
        <div
          className="selection-toolbar"
          style={{ left: selectionTools.x, top: selectionTools.y }}
          aria-label="文字选区工具栏"
        >
          <button type="button" onClick={() => void copySelection()}>
            <Copy size={15} />
            复制
          </button>
          <button type="button" onClick={() => (selectionTools.itemId ? removeLearningItem() : addLearningItem("highlight"))}>
            <Highlighter size={15} />
            {selectionTools.itemId ? "取消划线" : "划线"}
          </button>
          <button type="button" onClick={() => setTagMenuOpen(true)}>
            <Tags size={15} />
            标签
          </button>
        </div>
      ) : null}

      {tagMenuOpen ? (
        <div className="tag-dialog-backdrop" role="presentation" onMouseDown={closeTagDialog}>
          <div className="tag-dialog" role="dialog" aria-modal="true" aria-label="添加标签" onMouseDown={(event) => event.stopPropagation()}>
            <div className="tag-dialog-head">
              <span>{editingTagId ? "编辑标签" : "添加标签"}</span>
            </div>
            <p>{selectionTools.text}</p>
            <input
              autoFocus
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveTagFromDialog();
                if (event.key === "Escape") closeTagDialog();
              }}
              placeholder="输入标签"
            />
            <div className="tag-dialog-actions">
              {editingTagId ? (
                <button type="button" className="danger" onClick={deleteTagFromDialog}>
                  删除标签
                </button>
              ) : null}
              <button type="button" onClick={closeTagDialog}>
                取消
              </button>
              <button type="button" onClick={saveTagFromDialog}>
                保存标签
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="reading-settings">
        <button type="button" aria-expanded={settingsOpen} onClick={() => setSettingsOpen((open) => !open)}>
          阅读设置
        </button>
        {settingsOpen ? (
          <div className="reading-settings-panel">
            <label>
              <input type="checkbox" checked={showSpeakers} onChange={() => setShowSpeakers((visible) => !visible)} />
              显示对话人（仅两人时推荐）
            </label>
            <label>
              <input type="checkbox" checked={showTimestamps} onChange={() => setShowTimestamps((visible) => !visible)} />
              显示段落时间戳
            </label>
          </div>
        ) : null}
      </div>

      <button
        className="learning-drawer-trigger"
        type="button"
        aria-expanded={learningOpen}
        onClick={() => setLearningOpen((open) => !open)}
      >
        <BookOpen size={18} />
        我的学习
      </button>

      <aside className={learningOpen ? "learning-drawer open" : "learning-drawer"} aria-hidden={!learningOpen}>
        <div className="learning-drawer-head">
          <div>
            <span>我的学习</span>
            <h2>本期学习痕迹</h2>
          </div>
          <div className="learning-drawer-actions">
            <button type="button" onClick={() => setLearningFullOpen(true)}>
              完整查看
            </button>
            <button type="button" onClick={() => setLearningOpen(false)}>
              收起
            </button>
          </div>
        </div>
        <details className="learning-section" open>
          <summary>划线收藏</summary>
          <div className="learning-record-list">
            {sortedHighlights.length ? (
              sortedHighlights.map((item) => (
                <button key={item.id} type="button" onClick={() => jumpToTime(item.time)}>
                  <span>{item.time}</span>
                  {item.text}
                </button>
              ))
            ) : (
              <p>选中文字后点“划线”，这里会保存你的重点。</p>
            )}
          </div>
        </details>
        <details className="learning-section" open>
          <summary>灵感标签</summary>
          <div className="learning-record-list">
            {sortedTags.length ? (
              sortedTags.map((item) => (
                <button key={item.id} type="button" onClick={() => jumpToTime(item.time)}>
                  <span>{item.tag}</span>
                  {item.text}
                </button>
              ))
            ) : (
              <p>给片段加标签后，会出现在这里。</p>
            )}
          </div>
        </details>
        <details className="learning-section" open>
          <summary>播客笔记</summary>
          <div className="note-composer">
            <textarea
              className="episode-note-input"
              onChange={(event) => setNoteDraft(event.target.value)}
              placeholder="写一条新的笔记..."
              value={noteDraft}
            />
            <button type="button" onClick={addEpisodeNote}>
              保存笔记
            </button>
          </div>
          <div className="learning-record-list note-record-list">
            {sortedNotes.length ? (
              sortedNotes.map((note) => (
                <button key={note.id} type="button" onClick={() => jumpToTime(note.time)}>
                  <span>{note.time}</span>
                  {note.text}
                </button>
              ))
            ) : null}
          </div>
        </details>
      </aside>

      {learningFullOpen ? (
        <div className="learning-full-backdrop" role="presentation" onMouseDown={() => setLearningFullOpen(false)}>
          <div className="learning-full-panel" role="dialog" aria-modal="true" aria-label="完整学习痕迹" onMouseDown={(event) => event.stopPropagation()}>
            <div className="learning-full-head">
              <div>
                <span>我的学习</span>
                <h2>完整学习痕迹</h2>
              </div>
              <button type="button" onClick={() => setLearningFullOpen(false)}>
                关闭
              </button>
            </div>
            <section>
              <h3>划线收藏</h3>
              <div className="learning-full-list">
                {sortedHighlights.length ? (
                  sortedHighlights.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setLearningFullOpen(false);
                        jumpToTime(item.time);
                      }}
                    >
                      <span>{item.time}</span>
                      {item.text}
                    </button>
                  ))
                ) : (
                  <p>选中文字后点“划线”，这里会保存你的重点。</p>
                )}
              </div>
            </section>
            <section>
              <h3>灵感标签</h3>
              <div className="learning-full-list">
                {sortedTags.length ? (
                  sortedTags.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setLearningFullOpen(false);
                        jumpToTime(item.time);
                      }}
                    >
                      <span>{item.tag}</span>
                      {item.text}
                    </button>
                  ))
                ) : (
                  <p>给片段加标签后，会出现在这里。</p>
                )}
              </div>
            </section>
            <section>
              <h3>播客笔记</h3>
              <div className="note-composer full">
                <textarea
                  className="episode-note-input"
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="写一条新的笔记..."
                  value={noteDraft}
                />
                <button type="button" onClick={addEpisodeNote}>
                  保存笔记
                </button>
              </div>
              <div className="learning-full-list note-full-list">
                {sortedNotes.length ? (
                  sortedNotes.map((note) => (
                    <article key={note.id}>
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setLearningFullOpen(false);
                            jumpToTime(note.time);
                          }}
                        >
                          {note.time}
                        </button>
                        <button type="button" onClick={() => removeEpisodeNote(note.id)}>
                          删除
                        </button>
                      </div>
                      <p>{note.text}</p>
                    </article>
                  ))
                ) : null}
              </div>
            </section>
          </div>
        </div>
      ) : null}

      <footer className="floating-player">
        {audioUrl ? (
          <audio
            ref={audioRef}
            preload="metadata"
            src={audioUrl}
            onDurationChange={(event) => setAudioDuration(event.currentTarget.duration || 0)}
            onEnded={() => setIsPlaying(false)}
            onPause={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          />
        ) : null}
        <div className="player-now">
          <span>{audioUrl ? "真实音频已就绪" : "正在研读"}</span>
          <strong>{episodeTitle}</strong>
        </div>
        <div className="player-controls">
          <button className="skip-control backward" aria-label="后退 30 秒" disabled={!audioUrl} onClick={() => seekBy(-30)}>
            <span>30</span>
          </button>
          <button className="play-main" aria-label={isPlaying ? "暂停" : "播放"} disabled={!audioUrl} onClick={() => void togglePlayback()}>
            {isPlaying ? <Pause size={23} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
          </button>
          <button className="skip-control forward" aria-label="前进 30 秒" disabled={!audioUrl} onClick={() => seekBy(30)}>
            <span>30</span>
          </button>
        </div>
        <div className="player-progress">
          <span>{formatPlayerTime(audioUrl ? currentTime : 765)}</span>
          <button
            aria-label="拖动播放进度"
            className={isScrubbing ? "scrubbing" : undefined}
            disabled={!audioUrl || !audioDuration}
            onPointerDown={(event) => {
              setIsScrubbing(true);
              event.currentTarget.setPointerCapture(event.pointerId);
              seekFromProgress(event);
            }}
            onPointerMove={(event) => {
              if (isScrubbing) seekFromProgress(event);
            }}
            onPointerUp={(event) => {
              setIsScrubbing(false);
              event.currentTarget.releasePointerCapture(event.pointerId);
              seekFromProgress(event);
            }}
            onPointerCancel={() => setIsScrubbing(false)}
          >
            <i style={{ width: `${progress}%` }} />
            <b style={{ left: `${thumbProgress}%` }} />
          </button>
          <span>{audioDuration ? formatPlayerTime(audioDuration) : duration}</span>
        </div>
        <div className="player-extra">
          <div className="speed-control">
            <button
              aria-expanded={speedMenuOpen}
              aria-haspopup="menu"
              disabled={!audioUrl}
              onClick={() => setSpeedMenuOpen((open) => !open)}
            >
            {formatPlaybackRate(playbackRate)}
            </button>
            {speedMenuOpen ? (
              <div className="speed-menu" role="menu">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <button key={rate} role="menuitemradio" aria-checked={playbackRate === rate} onClick={() => selectPlaybackRate(rate)}>
                    <span>{formatPlaybackRate(rate)}</span>
                    <strong>{playbackRate === rate ? "✓" : ""}</strong>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <Volume2 size={21} />
        </div>
      </footer>
    </main>
  );
}

function parseTimestamp(timeLabel: string) {
  const start = timeLabel.split("-")[0]?.trim() || "00:00";
  const parts = start.split(":").map((part) => Number(part));

  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function findNearestSectionTime(seconds: number, sections: TranscriptSection[]) {
  let nearest = sections[0]?.time || "00:00";
  let nearestSeconds = parseTimestamp(nearest);

  for (const section of sections) {
    const sectionSeconds = parseTimestamp(section.time);
    if (sectionSeconds <= seconds && sectionSeconds >= nearestSeconds) {
      nearest = section.time;
      nearestSeconds = sectionSeconds;
    }
  }

  return nearest;
}

function formatSpeakerLabel(speaker: string) {
  const match = speaker.match(/speaker[_\s-]?(\d+)/i);
  if (!match) return speaker;

  const index = Number(match[1]);
  if (!Number.isFinite(index) || index <= 0) return speaker;

  return `Speaker ${String.fromCharCode(64 + index)}`;
}

function displaySpeakerName(speaker: string, speakerNames?: Record<string, string>) {
  const normalized = formatSpeakerLabel(speaker);
  return speakerNames?.[normalized] || speakerNames?.[speaker] || normalized;
}

function renderAnnotatedText(
  text: string,
  time: string,
  items: LearningItem[],
  onOpenItem: (item: LearningItem, element: HTMLElement) => void,
  onOpenTag: (item: LearningItem) => void,
) {
  const sectionItems = items.filter((item) => item.time === time && text.includes(item.text));
  if (!sectionItems.length) return text;

  const groupedItems = new Map<string, LearningItem[]>();
  for (const item of sectionItems) {
    const key = item.text;
    groupedItems.set(key, [...(groupedItems.get(key) ?? []), item]);
  }
  const sortedItems = [...groupedItems.entries()]
    .map(([itemText, group]) => ({ itemText, group, start: text.indexOf(itemText) }))
    .filter((item) => item.start !== -1)
    .sort((a, b) => a.start - b.start);
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const itemGroup of sortedItems) {
    const start = text.indexOf(itemGroup.itemText, cursor);
    if (start < cursor || start === -1) continue;
    if (start > cursor) nodes.push(text.slice(cursor, start));

    const highlight = itemGroup.group.find((item) => item.type === "highlight");
    const tags = itemGroup.group.filter((item) => item.type === "tag");
    const primaryItem = highlight ?? tags[0];
    const hasTags = tags.length > 0;
    const content = highlight ? (
      <mark
        className="learning-highlight"
        role="button"
        tabIndex={0}
        onClick={(event) => onOpenItem(highlight, event.currentTarget)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onOpenItem(highlight, event.currentTarget);
        }}
      >
        {itemGroup.itemText}
      </mark>
    ) : hasTags ? (
      <span
        className="learning-tag-text"
        role="button"
        tabIndex={0}
        onClick={() => onOpenTag(tags[0])}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onOpenTag(tags[0]);
        }}
      >
        {itemGroup.itemText}
      </span>
    ) : (
      itemGroup.itemText
    );

    nodes.push(
      <span className={tags.length ? "learning-tag-anchor" : undefined} key={primaryItem.id}>
        {content}
        {tags.map((tagItem) => (
          <button
            className="learning-tag-symbol"
            key={tagItem.id}
            type="button"
            title={tagItem.tag}
            onClick={() => onOpenTag(tagItem)}
          >
            🏷️
          </button>
        ))}
      </span>,
    );
    cursor = start + itemGroup.itemText.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function formatGenerationError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.toLowerCase().includes("timeout") || message.toLowerCase().includes("aborted")) {
    return "AI 导读生成超时，请点击重试生成。";
  }
  return message || "AI 生成失败，请稍后重试。";
}

function formatOutlineTimeRange(startTime: string, endTime?: string) {
  if (!isTimestamp(startTime)) return "";
  const normalizedEndTime = endTime ? normalizeDurationAsTimestamp(endTime) ?? endTime : "";
  if (!normalizedEndTime || !isTimestamp(normalizedEndTime) || normalizedEndTime === startTime) return startTime;
  return `${startTime} - ${normalizedEndTime}`;
}

function isTimestamp(value: string) {
  return /^\d{1,2}:\d{2}(?::\d{2})?$/.test(value.trim());
}

function sortLearningItemsByTime(items: LearningItem[]) {
  return [...items].sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time));
}

function sortLearningNotesByTime(notes: LearningNote[]) {
  return [...notes].sort((a, b) => timeToSeconds(a.time) - timeToSeconds(b.time));
}

function timeToSeconds(value: string) {
  const parts = value
    .trim()
    .split(":")
    .map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return Number.MAX_SAFE_INTEGER;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number.MAX_SAFE_INTEGER;
}

function normalizeDurationAsTimestamp(value: string) {
  const text = value.trim();
  if (isTimestamp(text)) return text;

  const minuteOnly = text.match(/^(\d+)\s*分钟$/);
  if (minuteOnly) return formatDurationMinutes(Number(minuteOnly[1]));

  const hourMinute = text.match(/^(\d+)\s*小时\s*(\d+)\s*分钟?$/);
  if (hourMinute) return formatDurationMinutes(Number(hourMinute[1]) * 60 + Number(hourMinute[2]));

  return null;
}

function formatDurationMinutes(minutes: number) {
  if (!Number.isFinite(minutes) || minutes < 0) return "00:00";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.floor(minutes % 60);
  if (hours > 0) return `${hours}:${remainingMinutes.toString().padStart(2, "0")}:00`;
  return `${remainingMinutes}:00`;
}

function formatPlayerTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function formatPlaybackRate(rate: number) {
  return `${rate.toFixed(rate % 1 === 0 ? 1 : rate === 0.75 || rate === 1.25 ? 2 : 1)}x`;
}
