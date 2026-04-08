import Anthropic from '@anthropic-ai/sdk';
import { NewsItem } from '../types';

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

async function summarizeItem(item: NewsItem, client: Anthropic): Promise<string> {
  const content = item.content || item.title;
  const prompt = `다음 AI 뉴스/논문을 한국어로 2-3문장으로 요약해줘. 핵심 기술이나 발견을 중심으로 간결하게.\n\n제목: ${item.title}\n내용: ${content}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    return textBlock ? textBlock.text.trim() : '';
  } catch {
    return item.content?.substring(0, 200) || '';
  }
}

export async function summarizeItems(items: NewsItem[]): Promise<NewsItem[]> {
  const client = getClient();

  if (!client) {
    console.log('ℹ️  ANTHROPIC_API_KEY 미설정 — 원문 발췌 사용');
    return items.map((item) => ({
      ...item,
      summary: item.content?.substring(0, 200) || undefined,
    }));
  }

  console.log(`🤖 Claude로 ${items.length}개 항목 요약 중...`);

  // Process in batches of 5
  const results: NewsItem[] = [];
  for (let i = 0; i < items.length; i += 5) {
    const batch = items.slice(i, i + 5);
    const summaries = await Promise.allSettled(batch.map((item) => summarizeItem(item, client)));
    for (let j = 0; j < batch.length; j++) {
      const result = summaries[j];
      const summary = result.status === 'fulfilled' ? result.value : batch[j].content?.substring(0, 200) || '';
      results.push({ ...batch[j], summary });
    }
  }

  return results;
}
