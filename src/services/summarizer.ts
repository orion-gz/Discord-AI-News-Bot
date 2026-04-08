import { NewsItem } from '../types';

function stripHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractFirstSentence(raw: string, maxLen = 250): string {
  const text = stripHtml(raw);
  if (!text) return '';

  // Find first sentence of at least 30 chars ending with punctuation
  const match = text.match(/^.{30,}?[.!?](?:\s|$)/);
  if (match) return match[0].trim().substring(0, maxLen);

  // Fallback: first maxLen chars at word boundary
  if (text.length <= maxLen) return text;
  const cut = text.lastIndexOf(' ', maxLen);
  return text.substring(0, cut > 0 ? cut : maxLen) + '…';
}

export async function summarizeItems(items: NewsItem[]): Promise<NewsItem[]> {
  return items.map((item) => ({
    ...item,
    summary: item.content ? extractFirstSentence(item.content) : undefined,
  }));
}
