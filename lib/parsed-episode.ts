export const LAST_PARSED_EPISODE_KEY = "podmark:lastParsedEpisode";
export const AUTO_GENERATE_ARTICLE_KEY = "podmark:autoGenerateArticle";
export const ARTICLE_STORAGE_PREFIX = "podmark:article:";
export const LEARNING_STORAGE_PREFIX = "podmark:learning:";
export const LIBRARY_STORAGE_KEY = "podmark:library";

export type ParsedEpisode = {
  sourceUrl?: string;
  episodeId?: string | null;
  title: string | null;
  podcastName: string | null;
  coverUrl: string | null;
  description?: string | null;
  duration: string | null;
  audioUrl: string | null;
};

export type StoredTranscriptSection = {
  time: string;
  speaker: string;
  text: string;
};

export type StoredAIGuide = {
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

export type StoredArticle = {
  episode: ParsedEpisode;
  transcript: StoredTranscriptSection[];
  guide?: StoredAIGuide | null;
  updatedAt: string;
};

export type StoredLearningItem = {
  id: string;
  type: "highlight" | "tag";
  time: string;
  text: string;
  tag?: string;
};

export type StoredLearningNote = {
  id: string;
  time: string;
  text: string;
  createdAt: string;
};

export type StoredLearning = {
  episodeId: string;
  items: StoredLearningItem[];
  note?: string;
  notes?: StoredLearningNote[];
  updatedAt: string;
};

export type LibraryEntry = {
  episodeId: string;
  title: string | null;
  podcastName: string | null;
  coverUrl: string | null;
  duration: string | null;
  sourceUrl?: string;
  summary?: string;
  highlightCount: number;
  tagCount: number;
  hasNote: boolean;
  updatedAt: string;
};
