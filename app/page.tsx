"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Link2, Mic, PencilLine, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mockPodcast } from "@/lib/mock-data";
import { AUTO_GENERATE_ARTICLE_KEY, LAST_PARSED_EPISODE_KEY, type ParsedEpisode } from "@/lib/parsed-episode";
import { SHOWCASE_EPISODE_ID } from "@/lib/showcase";

const showcaseEpisodeId = SHOWCASE_EPISODE_ID;

type ParseState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; episode: ParsedEpisode }
  | { status: "error"; message: string };

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [parseState, setParseState] = useState<ParseState>({ status: "idle" });

  async function handleParse() {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setParseState({ status: "error", message: "先粘贴一条小宇宙单集链接，我们会帮你读取标题、封面和音频。" });
      return;
    }

    setParseState({ status: "loading" });

    try {
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = (await response.json()) as { episode?: ParsedEpisode; error?: string };

      if (!response.ok || !data.episode) {
        throw new Error(data.error ?? "暂时无法识别这个链接。");
      }

      if (!data.episode.title || !data.episode.audioUrl) {
        throw new Error(
          data.episode.title
            ? "我们找到了这期播客，但没有在页面里找到可读取的音频地址。"
            : "我们打开了这个链接，但没有读到清晰的播客标题和音频信息。",
        );
      }

      setParseState({ status: "success", episode: data.episode });
    } catch (error) {
      setParseState({
        status: "error",
        message:
          error instanceof Error
            ? humanizeParseError(error.message)
            : "这次没有读取成功。可以换一条小宇宙单集链接再试一次。",
      });
    }
  }

  function enterLearningPage(episode: ParsedEpisode, autoGenerate = false) {
    window.sessionStorage.setItem(LAST_PARSED_EPISODE_KEY, JSON.stringify(episode));
    if (autoGenerate) {
      window.sessionStorage.setItem(AUTO_GENERATE_ARTICLE_KEY, "1");
    }
    router.push(`/podcasts/${episode.episodeId ?? mockPodcast.id}`);
  }

  function enterShowcaseEpisode() {
    window.sessionStorage.removeItem(LAST_PARSED_EPISODE_KEY);
    window.sessionStorage.removeItem(AUTO_GENERATE_ARTICLE_KEY);
    router.push(`/podcasts/${showcaseEpisodeId}`);
  }

  return (
    <main className="sanctuary-page home-v3">
      <header className="sanctuary-nav home-nav">
        <Link className="brand-lockup" href="/">
          <span className="brand-icon">
            <BookOpen size={19} />
          </span>
          <span>PodMark</span>
        </Link>
        <nav className="main-nav-links">
          <Link className="active" href="/">
            首页
          </Link>
          <button className="nav-link-button" type="button" onClick={enterShowcaseEpisode}>
            正在阅读
          </button>
          <Link href="/library">学习库</Link>
        </nav>
        <span className="nav-spacer" />
      </header>

      <section className="home-v3-hero">
        <div className="home-v3-kicker">
          <Sparkles size={14} />
          小宇宙 播客阅读器
        </div>
        <h1>
          <em>Mark</em> the podcasts
          <br />
          <span>worth remembering.</span>
        </h1>
        <p>把一集播客整理成可以阅读、标注和收藏的播客文章。</p>

        <div className="url-composer-v3">
          <div className="composer-v3-label">
            <span>
              <Link2 size={15} />
              粘贴播客链接
            </span>
            <button onClick={enterShowcaseEpisode}>示例演示</button>
          </div>
          <div className="composer-v3-row">
            <input
              aria-label="小宇宙播客链接"
              onChange={(event) => {
                setUrl(event.target.value);
                if (parseState.status !== "idle") {
                  setParseState({ status: "idle" });
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleParse();
                }
              }}
              placeholder="https://www.xiaoyuzhoufm.com/episode/..."
              value={url}
            />
            <button disabled={parseState.status === "loading"} onClick={() => void handleParse()}>
              {parseState.status === "loading" ? "正在识别" : "一键查找博客"}
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="composer-v3-footnote">无需登录 · 隐私安全 · 即刻转换</div>
        </div>

        {parseState.status === "loading" ? (
          <div className="parse-result-card loading" role="status">
            <div className="parse-orb">
              <Sparkles size={20} />
            </div>
            <div>
              <span>正在识别链接</span>
              <h2>正在提取播客信息和音频地址</h2>
              <p>系统会先读取小宇宙页面源码，再从中提取标题、封面、时长和真实音频链接。</p>
            </div>
          </div>
        ) : null}

        {parseState.status === "success" ? (
          <div className="parse-result-card success">
            {parseState.episode.coverUrl ? (
              <img alt="播客封面" src={parseState.episode.coverUrl} />
            ) : (
              <div className="parse-cover-fallback">
                <BookOpen size={24} />
              </div>
            )}
            <div>
              <span>解析成功 · 音频地址已获取</span>
              <h2>{parseState.episode.title ?? "未命名单集"}</h2>
              <p>
                {parseState.episode.podcastName ?? "未知播客"}
                {parseState.episode.duration ? ` · ${parseState.episode.duration}` : ""}
              </p>
              {parseState.episode.audioUrl ? <small>{parseState.episode.audioUrl}</small> : null}
            </div>
            <button onClick={() => enterLearningPage(parseState.episode, true)}>
              进入学习页
              <ArrowRight size={15} />
            </button>
          </div>
        ) : null}

        {parseState.status === "error" ? (
          <div className="parse-result-card error" role="alert">
            <div className="parse-orb">
              <Link2 size={20} />
            </div>
            <div>
              <span>解析失败 · 信息未获取</span>
              <h2>未找到可用的播客内容</h2>
              <p>{parseState.message}</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="home-feature-grid">
        <article>
          <span className="feature-icon lavender">
            <Mic size={24} />
          </span>
          <h2>转录</h2>
          <p>AI 捕捉对话中的每一处细节，将音频转化为永久且清晰的文字记录。</p>
        </article>
        <article>
          <span className="feature-icon peach">
            <PencilLine size={24} />
          </span>
          <h2>标注</h2>
          <p>在 AI 帮助下写出你的想法，让转瞬即逝的灵感从文字里浮现出来。</p>
        </article>
        <article>
          <span className="feature-icon mint">
            <BookOpen size={24} />
          </span>
          <h2>收藏</h2>
          <p>把笔记沉淀成你的专属知识库，让你喜爱的播客内容长期可回忆。</p>
        </article>
      </section>
    </main>
  );
}

function humanizeParseError(message: string) {
  if (message.includes("Only xiaoyuzhoufm.com episode links")) {
    return "目前仅支持小宇宙单集页链接。";
  }

  if (message.includes("Failed to fetch episode page")) {
    return "这个页面暂时没有打开成功，可能是网络波动，也可能是链接已经失效。";
  }

  if (message.includes("Missing url")) {
    return "先粘贴一条小宇宙单集链接，我们会帮你读取标题、封面和音频。";
  }

  return message;
}
