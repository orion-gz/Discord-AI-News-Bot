import axios from 'axios';
import RSSParser from 'rss-parser';
import { NewsItem, CrawlerResult } from '../types';

const rssParser = new RSSParser();
const ONE_HOUR_MS = 60 * 60 * 1000;

function isWithinLastHour(date: Date): boolean {
  return Date.now() - date.getTime() < ONE_HOUR_MS * 2; // 2h window for sparse sources
}

async function crawlHackerNews(): Promise<CrawlerResult> {
  const source = 'Hacker News';
  try {
    const oneHourAgo = Math.floor((Date.now() - ONE_HOUR_MS) / 1000);
    const response = await axios.get('https://hn.algolia.com/api/v1/search', {
      params: {
        query: 'AI LLM machine learning GPT neural',
        tags: 'story',
        hitsPerPage: 10,
        numericFilters: `created_at_i>${oneHourAgo}`,
      },
      timeout: 10000,
    });

    const items: NewsItem[] = response.data.hits
      .filter((hit: any) => hit.title && (hit.url || hit.objectID))
      .map((hit: any) => ({
        title: hit.title,
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        source,
        content: hit.story_text?.substring(0, 300) || '',
        publishedAt: new Date(hit.created_at),
        category: 'news' as const,
        score: hit.points || 0,
      }));

    return { source, items };
  } catch (error) {
    return { source, items: [], error: String(error) };
  }
}

async function crawlArXiv(): Promise<CrawlerResult> {
  const source = 'ArXiv';
  try {
    const response = await axios.get('http://export.arxiv.org/api/query', {
      params: {
        search_query: 'cat:cs.AI OR cat:cs.LG OR cat:cs.CL',
        sortBy: 'submittedDate',
        sortOrder: 'descending',
        max_results: 10,
      },
      timeout: 15000,
    });

    const xml: string = response.data;
    const entries = xml.split('<entry>').slice(1);
    const items: NewsItem[] = [];

    for (const entry of entries) {
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
      const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);

      if (!titleMatch || !idMatch) continue;

      const title = titleMatch[1].trim().replace(/\n/g, ' ');
      const arxivId = idMatch[1].trim().split('/').pop() || '';
      const url = `https://arxiv.org/abs/${arxivId}`;
      const publishedAt = publishedMatch ? new Date(publishedMatch[1].trim()) : new Date();
      const summary = summaryMatch ? summaryMatch[1].trim().replace(/\n/g, ' ').substring(0, 300) : '';

      if (!isWithinLastHour(publishedAt)) continue;

      items.push({
        title,
        url,
        source,
        content: summary,
        publishedAt,
        category: 'paper' as const,
        score: 0,
      });
    }

    return { source, items };
  } catch (error) {
    return { source, items: [], error: String(error) };
  }
}

async function crawlReddit(): Promise<CrawlerResult> {
  const source = 'Reddit r/MachineLearning';
  try {
    const response = await axios.get('https://www.reddit.com/r/MachineLearning/new.json', {
      params: { limit: 15 },
      headers: { 'User-Agent': 'AINewsBot/1.0 (Discord Bot)' },
      timeout: 10000,
    });

    const posts = response.data?.data?.children || [];
    const items: NewsItem[] = posts
      .map((post: any) => {
        const d = post.data;
        return {
          title: d.title,
          url: `https://reddit.com${d.permalink}`,
          source,
          content: d.selftext?.substring(0, 300) || '',
          publishedAt: new Date(d.created_utc * 1000),
          category: 'discussion' as const,
          score: d.score || 0,
        };
      })
      .filter((item: NewsItem) => isWithinLastHour(item.publishedAt));

    return { source, items };
  } catch (error) {
    return { source, items: [], error: String(error) };
  }
}

async function crawlDevTo(): Promise<CrawlerResult> {
  const source = 'Dev.to';
  try {
    const response = await axios.get('https://dev.to/api/articles', {
      params: { tag: 'ai', per_page: 10, top: 1 },
      headers: { 'User-Agent': 'AINewsBot/1.0 (Discord Bot)' },
      timeout: 10000,
    });

    const items: NewsItem[] = (response.data as any[])
      .map((article) => ({
        title: article.title,
        url: article.url,
        source,
        content: article.description?.substring(0, 300) || '',
        publishedAt: new Date(article.published_at),
        category: 'news' as const,
        score: article.positive_reactions_count || 0,
      }))
      .filter((item) => isWithinLastHour(item.publishedAt));

    return { source, items };
  } catch (error) {
    return { source, items: [], error: String(error) };
  }
}

async function crawlRSS(url: string, sourceName: string, category: NewsItem['category']): Promise<CrawlerResult> {
  try {
    const feed = await rssParser.parseURL(url);
    const items: NewsItem[] = (feed.items || [])
      .filter((item) => {
        const pubDate = item.pubDate ? new Date(item.pubDate) : item.isoDate ? new Date(item.isoDate) : null;
        return pubDate && isWithinLastHour(pubDate);
      })
      .map((item) => ({
        title: item.title || 'No title',
        url: item.link || url,
        source: sourceName,
        content: (item.contentSnippet || item.content || '').substring(0, 300),
        publishedAt: item.pubDate ? new Date(item.pubDate) : item.isoDate ? new Date(item.isoDate) : new Date(),
        category,
        score: 0,
      }));

    return { source: sourceName, items };
  } catch (error) {
    return { source: sourceName, items: [], error: String(error) };
  }
}

export async function crawlAllSources(): Promise<NewsItem[]> {
  console.log('🔍 뉴스 크롤링 시작...');

  const results = await Promise.allSettled([
    crawlHackerNews(),
    crawlArXiv(),
    crawlReddit(),
    crawlRSS('https://www.technologyreview.com/feed/', 'MIT Technology Review', 'news'),
    crawlRSS('https://venturebeat.com/category/ai/feed/', 'VentureBeat AI', 'news'),
    crawlRSS('https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', 'The Verge AI', 'news'),
    crawlRSS('https://news.hada.io/rss', 'GeekNews', 'discussion'),
    crawlRSS('https://lobste.rs/t/ai.rss', 'Lobste.rs', 'discussion'),
    crawlDevTo(),
  ]);

  const allItems: NewsItem[] = [];
  const seen = new Set<string>();

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { source, items, error } = result.value;
      if (error) console.warn(`⚠️  ${source} 크롤링 오류: ${error}`);
      for (const item of items) {
        if (!seen.has(item.url)) {
          seen.add(item.url);
          allItems.push(item);
        }
      }
    }
  }

  // Sort by score descending, then by date descending
  allItems.sort((a, b) => {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    return b.publishedAt.getTime() - a.publishedAt.getTime();
  });

  console.log(`✅ 총 ${allItems.length}개 뉴스 항목 수집`);
  return allItems;
}
