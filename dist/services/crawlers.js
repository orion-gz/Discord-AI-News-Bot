"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlAllSources = crawlAllSources;
const axios_1 = __importDefault(require("axios"));
const rss_parser_1 = __importDefault(require("rss-parser"));
const rssParser = new rss_parser_1.default();
const ONE_HOUR_MS = 60 * 60 * 1000;
function isWithinLastHour(date) {
    return Date.now() - date.getTime() < ONE_HOUR_MS * 2; // 2h window for sparse sources
}
async function crawlHackerNews() {
    const source = 'Hacker News';
    try {
        const oneHourAgo = Math.floor((Date.now() - ONE_HOUR_MS) / 1000);
        const response = await axios_1.default.get('https://hn.algolia.com/api/v1/search', {
            params: {
                query: 'AI LLM machine learning GPT neural',
                tags: 'story',
                hitsPerPage: 10,
                numericFilters: `created_at_i>${oneHourAgo}`,
            },
            timeout: 10000,
        });
        const items = response.data.hits
            .filter((hit) => hit.title && (hit.url || hit.objectID))
            .map((hit) => ({
            title: hit.title,
            url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
            source,
            content: hit.story_text?.substring(0, 300) || '',
            publishedAt: new Date(hit.created_at),
            category: 'news',
            score: hit.points || 0,
        }));
        return { source, items };
    }
    catch (error) {
        return { source, items: [], error: String(error) };
    }
}
async function crawlArXiv() {
    const source = 'ArXiv';
    try {
        const response = await axios_1.default.get('http://export.arxiv.org/api/query', {
            params: {
                search_query: 'cat:cs.AI OR cat:cs.LG OR cat:cs.CL',
                sortBy: 'submittedDate',
                sortOrder: 'descending',
                max_results: 10,
            },
            timeout: 15000,
        });
        const xml = response.data;
        const entries = xml.split('<entry>').slice(1);
        const items = [];
        for (const entry of entries) {
            const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
            const idMatch = entry.match(/<id>([\s\S]*?)<\/id>/);
            const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
            const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
            if (!titleMatch || !idMatch)
                continue;
            const title = titleMatch[1].trim().replace(/\n/g, ' ');
            const arxivId = idMatch[1].trim().split('/').pop() || '';
            const url = `https://arxiv.org/abs/${arxivId}`;
            const publishedAt = publishedMatch ? new Date(publishedMatch[1].trim()) : new Date();
            const summary = summaryMatch ? summaryMatch[1].trim().replace(/\n/g, ' ').substring(0, 300) : '';
            if (!isWithinLastHour(publishedAt))
                continue;
            items.push({
                title,
                url,
                source,
                content: summary,
                publishedAt,
                category: 'paper',
                score: 0,
            });
        }
        return { source, items };
    }
    catch (error) {
        return { source, items: [], error: String(error) };
    }
}
const REDDIT_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Accept': 'application/rss+xml, application/xml, text/xml',
};
// Hot 기반 크롤링 — 시간 필터 없이 인기 게시물 상위 N개
async function crawlRedditHot(subreddit, limit = 5) {
    const source = `Reddit r/${subreddit}`;
    try {
        const response = await axios_1.default.get(`https://www.reddit.com/r/${subreddit}/hot/.rss`, { headers: REDDIT_HEADERS, timeout: 10000 });
        const feed = await rssParser.parseString(response.data);
        const items = (feed.items || [])
            .slice(0, limit)
            .map((item, i) => ({
            title: item.title || 'No title',
            url: item.link || `https://www.reddit.com/r/${subreddit}/`,
            source,
            content: (item.contentSnippet || '').substring(0, 300),
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            category: 'discussion',
            score: limit - i, // 순위 기반 가중치 (1위가 가장 높음)
        }));
        return { source, items };
    }
    catch (error) {
        return { source, items: [], error: String(error) };
    }
}
async function crawlDevTo() {
    const source = 'Dev.to';
    try {
        const response = await axios_1.default.get('https://dev.to/api/articles', {
            params: { tag: 'ai', per_page: 10, top: 1 },
            headers: { 'User-Agent': 'AINewsBot/1.0 (Discord Bot)' },
            timeout: 10000,
        });
        const items = response.data
            .map((article) => ({
            title: article.title,
            url: article.url,
            source,
            content: article.description?.substring(0, 300) || '',
            publishedAt: new Date(article.published_at),
            category: 'news',
            score: article.positive_reactions_count || 0,
        }))
            .filter((item) => isWithinLastHour(item.publishedAt));
        return { source, items };
    }
    catch (error) {
        return { source, items: [], error: String(error) };
    }
}
async function crawlGitHubTrending() {
    const source = 'GitHub Trending';
    try {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const response = await axios_1.default.get('https://api.github.com/search/repositories', {
            params: {
                q: `topic:machine-learning topic:artificial-intelligence created:>${since}`,
                sort: 'stars',
                order: 'desc',
                per_page: 5,
            },
            headers: {
                'User-Agent': 'AINewsBot/1.0',
                'Accept': 'application/vnd.github+json',
            },
            timeout: 10000,
        });
        const items = response.data.items.map((repo) => ({
            title: `${repo.full_name} — ⭐ ${repo.stargazers_count}`,
            url: repo.html_url,
            source,
            content: repo.description?.substring(0, 300) || '',
            publishedAt: new Date(repo.created_at),
            category: 'news',
            score: repo.stargazers_count || 0,
        }));
        return { source, items };
    }
    catch (error) {
        return { source, items: [], error: String(error) };
    }
}
/** XML에 이스케이프 안 된 & 가 있는 피드 전용 파서 */
async function crawlRSSWithXmlFix(url, sourceName, category) {
    try {
        const response = await axios_1.default.get(url, { timeout: 10000 });
        // 엔티티 참조가 아닌 & 를 &amp; 로 치환
        const sanitized = response.data.replace(/&(?![a-zA-Z#][a-zA-Z0-9]*;)/g, '&amp;');
        const feed = await rssParser.parseString(sanitized);
        const items = (feed.items || [])
            .filter((item) => {
            const pubDate = item.pubDate ? new Date(item.pubDate) : item.isoDate ? new Date(item.isoDate) : null;
            return pubDate && isWithinLastHour(pubDate);
        })
            .map((item) => ({
            title: item.title || 'No title',
            url: item.link || url,
            source: sourceName,
            content: (item.contentSnippet || item.content || '').substring(0, 300),
            publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
            category,
            score: 0,
        }));
        return { source: sourceName, items };
    }
    catch (error) {
        return { source: sourceName, items: [], error: String(error) };
    }
}
async function crawlRSS(url, sourceName, category, options = {}) {
    const { headers, noTimeFilter = false, limit } = options;
    try {
        let feed;
        if (headers) {
            const response = await axios_1.default.get(url, { headers, timeout: 10000 });
            feed = await rssParser.parseString(response.data);
        }
        else {
            feed = await rssParser.parseURL(url);
        }
        let feedItems = feed.items || [];
        if (!noTimeFilter) {
            feedItems = feedItems.filter((item) => {
                const pubDate = item.pubDate ? new Date(item.pubDate) : item.isoDate ? new Date(item.isoDate) : null;
                return pubDate && isWithinLastHour(pubDate);
            });
        }
        if (limit)
            feedItems = feedItems.slice(0, limit);
        const items = feedItems.map((item) => ({
            title: item.title || 'No title',
            url: item.link || url,
            source: sourceName,
            content: (item.contentSnippet || item.content || '').substring(0, 300),
            publishedAt: item.pubDate ? new Date(item.pubDate) : item.isoDate ? new Date(item.isoDate) : new Date(),
            category,
            score: 0,
        }));
        return { source: sourceName, items };
    }
    catch (error) {
        return { source: sourceName, items: [], error: String(error) };
    }
}
async function crawlAllSources() {
    console.log('🔍 뉴스 크롤링 시작...');
    const results = await Promise.allSettled([
        // ── 뉴스 ──────────────────────────────────────────────
        crawlHackerNews(),
        crawlRSS('https://www.technologyreview.com/feed/', 'MIT Technology Review', 'news'),
        crawlRSS('https://venturebeat.com/category/ai/feed/', 'VentureBeat AI', 'news'),
        crawlRSS('https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', 'The Verge AI', 'news'),
        crawlRSS('https://huggingface.co/blog/feed.xml', 'Hugging Face Blog', 'news'),
        crawlRSS('https://openai.com/blog/rss.xml', 'OpenAI Blog', 'news'),
        crawlRSS('https://deepmind.google/blog/rss.xml', 'Google DeepMind', 'news'),
        crawlRSS('https://thegradient.pub/rss/', 'The Gradient', 'news'),
        crawlRSS('https://magazine.sebastianraschka.com/feed', 'Ahead of AI', 'news'),
        crawlRSS('https://www.fast.ai/index.xml', 'fast.ai', 'news'),
        crawlDevTo(),
        crawlGitHubTrending(),
        // ── 논문 ──────────────────────────────────────────────
        crawlArXiv(),
        crawlRSSWithXmlFix('https://paperswithcode.com/rss.xml', 'Papers with Code', 'paper'),
        crawlRSS('https://www.alignmentforum.org/feed.xml', 'AI Alignment Forum', 'paper'),
        crawlRSS('https://www.lesswrong.com/feed.xml', 'LessWrong', 'discussion'),
        // ── 커뮤니티 (Reddit hot) ─────────────────────────────
        crawlRedditHot('MachineLearning', 5),
        crawlRedditHot('LocalLLaMA', 5), // LLM 로컬 실행, 매우 활발
        crawlRedditHot('singularity', 5), // AI 뉴스 인기 허브
        crawlRedditHot('artificial', 4),
        crawlRedditHot('ChatGPT', 3),
        // ── 커뮤니티 (기타) ───────────────────────────────────
        crawlRSS('https://lobste.rs/t/ai.rss', 'Lobste.rs', 'discussion'),
    ]);
    const allItems = [];
    const seenUrls = new Set();
    for (const result of results) {
        if (result.status === 'fulfilled') {
            const { source, items, error } = result.value;
            if (error)
                console.warn(`⚠️  ${source} 크롤링 오류: ${error}`);
            for (const item of items) {
                if (seenUrls.has(item.url))
                    continue;
                seenUrls.add(item.url);
                allItems.push(item);
            }
        }
    }
    // Sort by score descending, then by date descending
    allItems.sort((a, b) => {
        if ((b.score || 0) !== (a.score || 0))
            return (b.score || 0) - (a.score || 0);
        return b.publishedAt.getTime() - a.publishedAt.getTime();
    });
    console.log(`✅ 총 ${allItems.length}개 뉴스 항목 수집 (중복 제거 후)`);
    return allItems;
}
