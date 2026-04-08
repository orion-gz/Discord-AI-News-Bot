import { EmbedBuilder } from 'discord.js';
import { NewsItem, SOURCE_EMOJI, CATEGORY_LABEL } from '../types';

const CATEGORY_COLOR: Record<string, number> = {
  news: 0x5865f2,       // Discord blurple
  paper: 0x57f287,      // Green
  discussion: 0xfee75c, // Yellow
};

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.substring(0, max - 1) + '…';
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}분 전`;
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours}시간 전`;
}

function buildCategoryEmbed(category: string, items: NewsItem[]): EmbedBuilder {
  const label = CATEGORY_LABEL[category] || category;
  const color = CATEGORY_COLOR[category] || 0x5865f2;

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(label);

  const topItems = items.slice(0, 5);
  const fields = topItems.map((item) => {
    const emoji = SOURCE_EMOJI[item.source] || '📎';
    const name = `${emoji} [${truncate(item.title, 100)}](${item.url})`;
    const summaryLine = item.summary ? `> ${truncate(item.summary, 200)}\n` : '';
    const meta = `${item.source} • ${relativeTime(item.publishedAt)}${item.score ? ` • ⬆️ ${item.score}` : ''}`;
    return { name, value: summaryLine + meta, inline: false };
  });

  embed.addFields(fields);
  return embed;
}

export function formatNewsEmbeds(items: NewsItem[]): EmbedBuilder[] {
  const now = new Date().toLocaleString('ko-KR', { timeZone: process.env.TZ || 'Asia/Seoul' });

  // Header embed
  const header = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🤖 AI 뉴스 업데이트')
    .setDescription(`**${now}** 기준 최신 AI 뉴스 **${items.length}건**을 가져왔습니다.`)
    .setFooter({ text: '다음 업데이트: 1시간 후 | /ainews로 수동 확인 가능' })
    .setTimestamp();

  const embeds: EmbedBuilder[] = [header];

  // Group by category
  const grouped: Partial<Record<string, NewsItem[]>> = {};
  for (const item of items) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category]!.push(item);
  }

  // Order: news, paper, discussion
  for (const category of ['news', 'paper', 'discussion'] as const) {
    const categoryItems = grouped[category];
    if (categoryItems && categoryItems.length > 0) {
      embeds.push(buildCategoryEmbed(category, categoryItems));
    }
  }

  return embeds;
}
