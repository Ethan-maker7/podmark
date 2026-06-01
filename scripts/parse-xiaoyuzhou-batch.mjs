const XIAOYUZHOU_EPISODE_RE = /^https?:\/\/(?:www\.)?xiaoyuzhoufm\.com\/episode\/([^/?#]+)/i;
const AUDIO_URL_RE = /https?:\\?\/\\?\/[^"'<>\s\\]+?\.(?:m4a|mp3|wav|aac)(?:\?[^"'<>\s\\]*)?/gi;

const urls = process.argv.slice(2).filter(Boolean);

if (urls.length === 0) {
  console.error("Usage: node scripts/parse-xiaoyuzhou-batch.mjs <url> [url...]");
  process.exit(1);
}

const rows = [];

for (const url of urls) {
  try {
    const episode = await parseXiaoyuzhouEpisode(url);
    rows.push({
      url,
      ok: Boolean(episode.title && episode.audioUrl),
      title: episode.title,
      podcastName: episode.podcastName,
      duration: episode.duration,
      hasCover: Boolean(episode.coverUrl),
      audioUrl: episode.audioUrl,
    });
  } catch (error) {
    rows.push({
      url,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

console.table(
  rows.map((row) => ({
    ok: row.ok,
    title: row.title ?? "",
    podcastName: row.podcastName ?? "",
    duration: row.duration ?? "",
    hasCover: row.hasCover ?? false,
    hasAudio: Boolean(row.audioUrl),
    error: row.error ?? "",
  })),
);

console.log(JSON.stringify(rows, null, 2));

async function parseXiaoyuzhouEpisode(rawUrl) {
  const sourceUrl = rawUrl.trim();
  const episodeId = sourceUrl.match(XIAOYUZHOU_EPISODE_RE)?.[1] ?? null;

  if (!episodeId) {
    throw new Error("Only xiaoyuzhoufm.com episode links are supported.");
  }

  const response = await fetch(sourceUrl, {
    headers: {
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch episode page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const description = pickMeta(html, ["og:description", "description"]);
  const title = pickTitle(html, description);
  const coverUrl = pickMeta(html, ["og:image", "twitter:image"]);
  const audioUrls = unique(
    [...html.matchAll(AUDIO_URL_RE)]
      .map((match) => cleanUrl(match[0]))
      .filter(Boolean),
  );

  return {
    sourceUrl,
    episodeId,
    title: title?.episodeTitle ?? null,
    podcastName: title?.podcastName ?? null,
    coverUrl,
    description,
    duration: pickDuration(html, description),
    audioUrl: audioUrls[0] ?? null,
    candidates: {
      audioUrls,
    },
  };
}

function pickTitle(html, description) {
  const ogTitle = pickMeta(html, ["og:title", "twitter:title"]) ?? pickHtmlTitle(html);
  if (!ogTitle) return null;

  const title = ogTitle.replace(/\s*\|\s*小宇宙\s*$/i, "").trim();
  const podcastNameFromDescription = description?.match(/听《([^》]+)》上小宇宙/)?.[1]?.trim() ?? null;

  if (title.includes(" - ")) {
    const parts = title
      .split(" - ")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      return {
        episodeTitle: parts.slice(0, -1).join(" - "),
        podcastName: podcastNameFromDescription ?? parts.at(-1) ?? null,
      };
    }
  }

  return {
    episodeTitle: title,
    podcastName: podcastNameFromDescription,
  };
}

function pickMeta(html, names) {
  for (const name of names) {
    const escapedName = escapeRegExp(name);
    const patterns = [
      new RegExp(`<meta[^>]+property=["']${escapedName}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+name=["']${escapedName}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escapedName}["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escapedName}["'][^>]*>`, "i"),
    ];

    for (const pattern of patterns) {
      const value = html.match(pattern)?.[1];
      if (value) return decodeHtml(value.trim());
    }
  }

  return null;
}

function pickHtmlTitle(html) {
  const value = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1];
  return value ? decodeHtml(stripTags(value).trim()) : null;
}

function pickDuration(html, description) {
  const source = `${description ?? ""}\n${html}`;
  const duration =
    source.match(/(?:时长|duration|Duration)["':：\s]+([0-9]{1,3}\s*(?:分钟|min|m)|[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)/i)?.[1] ??
    source.match(/([0-9]{1,3})\s*分钟/)?.[0] ??
    null;

  return duration ? decodeHtml(stripTags(duration)).trim() : null;
}

function cleanUrl(value) {
  return decodeHtml(value)
    .replaceAll("\\/", "/")
    .replace(/[),.;]+$/, "")
    .trim();
}

function unique(values) {
  return Array.from(new Set(values));
}

function stripTags(value) {
  return value.replace(/<[^>]+>/g, "");
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
