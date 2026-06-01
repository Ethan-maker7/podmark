export type XiaoyuzhouEpisodeParseResult = {
  sourceUrl: string;
  episodeId: string | null;
  title: string | null;
  podcastName: string | null;
  coverUrl: string | null;
  description: string | null;
  duration: string | null;
  audioUrl: string | null;
  candidates: {
    audioUrls: string[];
  };
};

const XIAOYUZHOU_EPISODE_RE = /^https?:\/\/(?:www\.)?xiaoyuzhoufm\.com\/episode\/([^/?#]+)/i;
const AUDIO_URL_RE = /https?:\\?\/\\?\/[^"'<>\s\\]+?\.(?:m4a|mp3|wav|aac)(?:\?[^"'<>\s\\]*)?/gi;

export function getXiaoyuzhouEpisodeId(url: string) {
  return url.match(XIAOYUZHOU_EPISODE_RE)?.[1] ?? null;
}

export async function parseXiaoyuzhouEpisode(url: string): Promise<XiaoyuzhouEpisodeParseResult> {
  const normalizedUrl = normalizeUrl(url);
  const episodeId = getXiaoyuzhouEpisodeId(normalizedUrl);

  if (!episodeId) {
    throw new Error("Only xiaoyuzhoufm.com episode links are supported.");
  }

  const html = await fetchEpisodeHtml(normalizedUrl);
  const description = pickMeta(html, ["og:description", "description"]);
  const title = pickTitle(html, description);
  const coverUrl = pickMeta(html, ["og:image", "twitter:image"]);
  const audioUrls = unique(
    [...html.matchAll(AUDIO_URL_RE)]
      .map((match) => cleanUrl(match[0]))
      .filter(Boolean),
  );

  return {
    sourceUrl: normalizedUrl,
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

async function fetchEpisodeHtml(url: string) {
  const response = await fetch(url, {
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

  return response.text();
}

function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("URL is required.");
  }

  return trimmed;
}

function pickTitle(html: string, description: string | null) {
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

function pickMeta(html: string, names: string[]) {
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

function pickHtmlTitle(html: string) {
  const value = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1];
  return value ? decodeHtml(stripTags(value).trim()) : null;
}

function pickDuration(html: string, description: string | null) {
  const source = `${description ?? ""}\n${html}`;
  const duration =
    source.match(/(?:时长|duration|Duration)["':：\s]+([0-9]{1,3}\s*(?:分钟|min|m)|[0-9]{1,2}:[0-9]{2}(?::[0-9]{2})?)/i)?.[1] ??
    source.match(/([0-9]{1,3})\s*分钟/)?.[0] ??
    null;

  return duration ? decodeHtml(stripTags(duration)).trim() : null;
}

function cleanUrl(url: string) {
  return decodeHtml(url)
    .replaceAll("\\/", "/")
    .replace(/[),.;]+$/, "")
    .trim();
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, "");
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
