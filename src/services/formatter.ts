import { EmbedBuilder } from 'discord.js';
import { NewsItem, SOURCE_EMOJI, CATEGORY_LABEL } from '../types';

const CATEGORY_COLOR: Record<string, number> = {
  news:       0x5865f2, // Discord blurple
  paper:      0x57f287, // Green
  discussion: 0xfee75c, // Yellow
};

const CATEGORY_ICON: Record<string, string> = {
  news:       '📰',
  paper:      '📄',
  discussion: '💬',
};

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.substring(0, max - 1) + '…';
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1)  return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  const diffHours = Math.floor(diffMins / 60);
  return `${diffHours}시간 전`;
}

function buildCategoryEmbed(category: string, items: NewsItem[]): EmbedBuilder[] {
  const label    = CATEGORY_LABEL[category] || category;
  const color    = CATEGORY_COLOR[category] || 0x5865f2;
  const icon     = CATEGORY_ICON[category]  || '📌';
  const MAX_ITEMS_PER_EMBED = 6;
  const embeds: EmbedBuilder[] = [];

  // Split into pages of MAX_ITEMS_PER_EMBED
  for (let page = 0; page < Math.ceil(items.length / MAX_ITEMS_PER_EMBED); page++) {
    const pageItems = items.slice(page * MAX_ITEMS_PER_EMBED, (page + 1) * MAX_ITEMS_PER_EMBED);
    const lines: string[] = [];

    pageItems.forEach((item, i) => {
      const globalIdx = page * MAX_ITEMS_PER_EMBED + i + 1;
      const emoji     = SOURCE_EMOJI[item.source] || '📎';
      const title     = truncate(item.title, 85);
      const score     = item.score ? ` · ⬆️ ${item.score}` : '';
      const meta      = `${emoji} **${item.source}** · ${relativeTime(item.publishedAt)}${score}`;

      lines.push(`**${globalIdx}.** [${title}](${item.url})`);
      if (item.summary) {
        lines.push(`> ${truncate(item.summary, 200)}`);
      }
      lines.push(meta);
      if (i < pageItems.length - 1) lines.push('');
    });

    const pageLabel = Math.ceil(items.length / MAX_ITEMS_PER_EMBED) > 1
      ? `${icon} ${label} — ${items.length}건 (${page + 1}/${Math.ceil(items.length / MAX_ITEMS_PER_EMBED)})`
      : `${icon} ${label} — ${items.length}건`;

    embeds.push(
      new EmbedBuilder()
        .setColor(color)
        .setTitle(pageLabel)
        .setDescription(lines.join('\n')),
    );
  }

  return embeds;
}

export function formatNewsEmbeds(items: NewsItem[]): EmbedBuilder[] {
  const tz  = process.env.TZ || 'Asia/Seoul';
  const now = new Date().toLocaleString('ko-KR', { timeZone: tz });

  // Group by category
  const grouped: Partial<Record<string, NewsItem[]>> = {};
  for (const item of items) {
    (grouped[item.category] ??= []).push(item);
  }

  const categoryOrder = ['news', 'paper', 'discussion'] as const;
  const counts = categoryOrder.map((c) => `${CATEGORY_ICON[c]} ${grouped[c]?.length ?? 0}건`).join('  ');

  const header = new EmbedBuilder()
    .setColor(0x23272a)
    .setTitle('🤖 AI 뉴스 브리핑')
    .setDescription(
      `**${now}** 기준 새 소식 **${items.length}건** 수집\n` +
      `\`${counts}\``,
    )
    .setFooter({ text: '매 정시 자동 업데이트 · /ainews 로 즉시 조회' })
    .setTimestamp();

  const embeds: EmbedBuilder[] = [header];

  for (const category of categoryOrder) {
    const categoryItems = grouped[category];
    if (categoryItems && categoryItems.length > 0) {
      embeds.push(...buildCategoryEmbed(category, categoryItems));
    }
  }

  return embeds;
}
