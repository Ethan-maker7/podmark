"use client";

import Link from "next/link";
import { BookOpen, Clock3, Edit3, StickyNote, Tag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import {
  ARTICLE_STORAGE_PREFIX,
  LEARNING_STORAGE_PREFIX,
  LIBRARY_STORAGE_KEY,
  RECENT_READING_EPISODE_KEY,
  type LibraryEntry,
} from "@/lib/parsed-episode";

export default function LibraryPage() {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [pendingDelete, setPendingDelete] = useState<LibraryEntry | null>(null);

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
    window.localStorage.removeItem(`${ARTICLE_STORAGE_PREFIX}${episodeId}`);
    window.localStorage.removeItem(`${LEARNING_STORAGE_PREFIX}${episodeId}`);
    if (window.localStorage.getItem(RECENT_READING_EPISODE_KEY) === episodeId) {
      window.localStorage.removeItem(RECENT_READING_EPISODE_KEY);
    }
    setPendingDelete(null);
  }

  return (
    <main className="sanctuary-page library-v3">
      <header className="library-v3-nav">
        <Link className="reader-logo" href="/">
          PodMark
        </Link>
        <nav>
          <Link href="/">首页</Link>
          <Link href="/reading">正在阅读</Link>
          <Link className="active" href="/library">
            学习库
          </Link>
        </nav>
      </header>

      <section className="library-hero-v3">
        <h1>学习库</h1>
        <p>自动保存已经生成逐字稿和 AI 导读的文章。</p>
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
                      {entry.summary || "这篇文章还没有生成摘要。"}
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
                  onClick={() => setPendingDelete(entry)}
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
            <h3>还没有保存的文章</h3>
            <p>生成完成逐字稿和 AI 导读后，文章会自动出现在这里。</p>
          </div>
        )}
      </section>

      {pendingDelete ? (
        <div className="library-delete-backdrop" role="presentation" onMouseDown={() => setPendingDelete(null)}>
          <div
            className="library-delete-dialog glass-card-v3"
            role="dialog"
            aria-modal="true"
            aria-label="确认删除文章"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2>删除这篇文章？</h2>
            <p>删除后会同时移除逐字稿、划线、标签和笔记。这个操作不能撤销。</p>
            <strong>{pendingDelete.title}</strong>
            <div>
              <button type="button" onClick={() => setPendingDelete(null)}>
                取消
              </button>
              <button type="button" onClick={() => deleteEntry(pendingDelete.episodeId)}>
                删除
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
