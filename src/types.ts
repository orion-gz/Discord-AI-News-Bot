export interface NewsItem {
  title: string;
  url: string;
  source: string;
  summary?: string;
  content?: string;
  publishedAt: Date;
  category: 'news' | 'paper' | 'discussion';
  score?: number;
}

export interface CrawlerResult {
  source: string;
  items: NewsItem[];
  error?: string;
}

export const SOURCE_EMOJI: Record<string, string> = {
  'Hacker News': '🟠',
  'ArXiv': '📚',
  'Reddit r/MachineLearning': '🔴',
  'MIT Technology Review': '🔵',
  'VentureBeat AI': '🟣',
  'The Verge AI': '⚫',
  'GeekNews': '🟢',
  'Lobste.rs': '🦞',
  'Dev.to': '🖥️',
};

export const CATEGORY_LABEL: Record<string, string> = {
  news: '📰 AI 뉴스',
  paper: '📄 논문',
  discussion: '💬 커뮤니티',
};
