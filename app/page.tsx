"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Link2, Mic, PencilLine, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { mockPodcast } from "@/lib/mock-data";
import { AUTO_GENERATE_ARTICLE_KEY, LAST_PARSED_EPISODE_KEY, RECENT_READING_EPISODE_KEY, type ParsedEpisode } from "@/lib/parsed-episode";
import { SHOWCASE_EPISODE_ID } from "@/lib/showcase";

const showcaseEpisodeId = SHOWCASE_EPISODE_ID;

const sampleEpisodeLinks = [
  {
    label: "随机波动 · 长播客 Demo",
    url: "https://www.xiaoyuzhoufm.com/episode/698bff878e1bab2654eeb1f7",
  },
  {
    label: "凹凸电波 · 对谈样本",
    url: "https://www.xiaoyuzhoufm.com/episode/69ae5d305b2d0ed06915ab0e",
  },
  {
    label: "商业访谈录 · 长播客样本",
    url: "https://www.xiaoyuzhoufm.com/episode/69f3857a5c60a99573fea0c2",
  },
  {
    label: "硅谷101 · 中英混杂样本",
    url: "https://www.xiaoyuzhoufm.com/episode/6a13923cfe904f3873c51d2b",
  },
];

type ParseState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; episode: ParsedEpisode }
  | { status: "error"; message: string };

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [parseState, setParseState] = useState<ParseState>({ status: "idle" });
  const [showPortfolioNotice, setShowPortfolioNotice] = useState(false);
  const [showSampleLinks, setShowSampleLinks] = useState(false);

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

      const parsedEpisode = data.episode as ParsedEpisode;

      if (!parsedEpisode.title || !parsedEpisode.audioUrl) {
        throw new Error(
          parsedEpisode.title
            ? "我们找到了这期播客，但没有在页面里找到可读取的音频地址。"
            : "我们打开了这个链接，但没有读到清晰的播客标题和音频信息。",
        );
      }

      setParseState({ status: "success", episode: parsedEpisode });
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
    if (autoGenerate) {
      setShowPortfolioNotice(true);
      return;
    }

    window.sessionStorage.setItem(LAST_PARSED_EPISODE_KEY, JSON.stringify(episode));
    if (episode.episodeId) {
      window.localStorage.setItem(RECENT_READING_EPISODE_KEY, episode.episodeId);
    }
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
          <Link href="/reading">
            正在阅读
          </Link>
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
        <p>把一集播客整理成可以阅读、标注和收藏的文章。</p>

        <div className="url-composer-v3">
          <div className="composer-v3-label">
            <span>
              <Link2 size={15} />
              粘贴播客链接
            </span>
            <div className="composer-v3-actions">
              <button onClick={() => setShowSampleLinks(true)}>播客链接示例</button>
              <button onClick={enterShowcaseEpisode}>查看示例文章</button>
            </div>
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
              {parseState.status === "loading" ? "正在识别" : "一键查找播客"}
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="composer-v3-footnote">无需登录 · 本地存储 · 可先查看示例文章</div>
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

        {showPortfolioNotice ? (
          <div className="portfolio-modal-backdrop" role="presentation" onClick={() => setShowPortfolioNotice(false)}>
            <div className="portfolio-modal" role="dialog" aria-modal="true" aria-label="作品演示说明" onClick={(event) => event.stopPropagation()}>
              <button className="portfolio-modal-close" aria-label="关闭" onClick={() => setShowPortfolioNotice(false)}>
                ×
              </button>
              <span>作品演示说明</span>
              <h2>当前作品仅提供示例体验</h2>
              <p>真实产品链路已跑通。示例文章已内置；产品需用户自行配置 API Key 后再进行真实解析。</p>
              <div className="portfolio-modal-actions">
                <button onClick={enterShowcaseEpisode}>查看示例文章</button>
                <button onClick={() => setShowPortfolioNotice(false)}>我知道了</button>
              </div>
            </div>
          </div>
        ) : null}

        {showSampleLinks ? (
          <div className="portfolio-modal-backdrop" role="presentation" onClick={() => setShowSampleLinks(false)}>
            <div className="portfolio-modal sample-links-modal" role="dialog" aria-modal="true" aria-label="播客链接示例" onClick={(event) => event.stopPropagation()}>
              <button className="portfolio-modal-close" aria-label="关闭" onClick={() => setShowSampleLinks(false)}>
                ×
              </button>
              <span>播客链接示例</span>
              <h2>可用于真实解析测试的播客链接</h2>
              <p>作品集版本暂时关闭真实调用。点击任意样例可填入输入框，后续配置 API Key 后即可恢复解析能力。</p>
              <div className="sample-link-list">
                {sampleEpisodeLinks.map((item) => (
                  <button
                    key={item.url}
                    onClick={() => {
                      setUrl(item.url);
                      setParseState({ status: "idle" });
                      setShowSampleLinks(false);
                    }}
                  >
                    <strong>{item.label}</strong>
                    <small>{item.url}</small>
                    <em>填入输入框</em>
                  </button>
                ))}
              </div>
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
