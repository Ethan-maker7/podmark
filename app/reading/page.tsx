"use client";

import Link from "next/link";
import { BookOpen, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LIBRARY_STORAGE_KEY, RECENT_READING_EPISODE_KEY, type LibraryEntry } from "@/lib/parsed-episode";
import { SHOWCASE_EPISODE_ID } from "@/lib/showcase";

export default function ReadingRedirectPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const recentId = window.localStorage.getItem(RECENT_READING_EPISODE_KEY);
    if (recentId && recentId !== SHOWCASE_EPISODE_ID) {
      router.replace(`/podcasts/${recentId}`);
      return;
    }

    try {
      const raw = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
      const entries = raw ? (JSON.parse(raw) as LibraryEntry[]) : [];
      const latest = entries.find((entry) => entry.episodeId && entry.episodeId !== SHOWCASE_EPISODE_ID);
      if (latest?.episodeId) {
        window.localStorage.setItem(RECENT_READING_EPISODE_KEY, latest.episodeId);
        router.replace(`/podcasts/${latest.episodeId}`);
        return;
      }
    } catch {
      window.localStorage.removeItem(LIBRARY_STORAGE_KEY);
    }

    setChecked(true);
  }, [router]);

  return (
    <main className="sanctuary-page reader-v3">
      <header className="reader-v3-nav">
        <Link className="reader-logo" href="/">
          PodMark
        </Link>
        <nav>
          <Link href="/">首页</Link>
          <Link className="active" href="/reading">
            正在阅读
          </Link>
          <Link href="/library">学习库</Link>
        </nav>
      </header>

      <section className="reader-empty-shell glass-card-v3">
        <span className="reader-empty-icon">
          {checked ? <BookOpen size={24} /> : <Sparkles size={24} />}
        </span>
        <h1>{checked ? "还没有正在阅读的文章" : "正在查找最近阅读"}</h1>
        <p>
          {checked
            ? "请先回到首页粘贴小宇宙播客链接，生成文章后这里会自动回到你最近阅读的内容。"
            : "PodMark 正在检查你的本地阅读记录。"}
        </p>
        {checked ? (
          <div className="reader-empty-actions">
            <Link href="/">去首页解析</Link>
            <Link href={`/podcasts/${SHOWCASE_EPISODE_ID}`}>查看示例</Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}
