"use client";

import Link from "next/link";
import { BookOpen, Clock3, Edit3, StickyNote, Tag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { LIBRARY_STORAGE_KEY, type LibraryEntry } from "@/lib/parsed-episode";

const showcaseEpisodeId = "67da42804e49c8b550d41545";

export default function LibraryPage() {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) return;

    try {
      const stored = JSON.parse(raw) as LibraryEntry[];
      setEntries(stored);
    } catch {
      window.localStorage.removeItem(LIBRARY_STORAGE_KEY);
    }
  }, []);

  function deleteEntry(episodeId: string) {
    const next = entries.filter((entry) => entry.episodeId !== episodeId);
    setEntries(next);
    window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(next));
  }

  return (
    <main className="sanctuary-page library-v3">
      <header className="library-v3-nav">
        <Link className="reader-logo" href="/">
          PodMark
        </Link>
        <nav>
          <Link href="/">首页</Link>
          <Link href={`/podcasts/${showcaseEpisodeId}`}>正在阅读</Link>
          <Link className="active" href="/library">
            学习库
          </Link>
        </nav>
      </header>

      <section className="library-hero-v3">
        <h1>学习库</h1>
        <p>自动保存已经生成逐字稿和 AI 导读的播客文章。</p>
      </section>

      <section className="library-section-v3 collection-area">
        <div className="library-section-title split">
          <h2>全部文章</h2>
          <span className="library-count-pill">{entries.length} 篇</span>
        </div>

        {entries.length ? (
          <div className="library-card-grid">
            {entries.map((entry) => (
              <article className="library-article-card glass-card-v3" key={entry.episodeId}>
                <Link className="library-article-link" href={`/podcasts/${entry.episodeId}`}>
                  {entry.coverUrl ? (
                    <img alt="" src={entry.coverUrl} />
                  ) : (
                    <div className="parse-cover-fallback">
                      <BookOpen size={24} />
                    </div>
                  )}
                  <div className="library-article-copy">
                    <span>{entry.podcastName ?? "播客"}</span>
                    <h3>{entry.title ?? "未命名单集"}</h3>
                    <p className="library-article-summary">
                      {entry.summary || "这篇播客文章还没有生成摘要。"}
                    </p>
                    <p className="library-article-duration">
                      <Clock3 size={14} />
                      {entry.duration ?? "时长未知"}
                    </p>
                  </div>
                </Link>
                <div className="library-article-stats">
                  <span>
                    <Edit3 size={14} />
                    {entry.highlightCount} 划线
                  </span>
                  <span>
                    <Tag size={14} />
                    {entry.tagCount} 标签
                  </span>
                  <span>
                    <StickyNote size={14} />
                    {entry.hasNote ? 1 : 0} 笔记
                  </span>
                </div>
                <button
                  aria-label="删除文章"
                  className="library-delete-button"
                  onClick={() => deleteEntry(entry.episodeId)}
                  type="button"
                >
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="library-empty glass-card-v3">
            <BookOpen size={24} />
            <h3>还没有保存的播客文章</h3>
            <p>生成完成逐字稿和 AI 导读后，文章会自动出现在这里。</p>
          </div>
        )}
      </section>
    </main>
  );
}
