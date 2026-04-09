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

// Discord embed limits
const LIMIT = {
  TITLE:       256,
  DESCRIPTION: 4096,
  FOOTER:      2048,
} as const;

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.substring(0, max - 1) + '…';
}

/** 마크다운 링크 안에 쓸 수 있도록 URL을 정규화 */
function safeUrl(url: string | undefined): string | null {
  if (!url) return null;
  // 줄바꿈·공백 제거
  const cleaned = url.replace(/[\r\n\s]/g, '');
  if (!/^https?:\/\/.+/.test(cleaned)) return null;
  try {
    const parsed = new URL(cleaned);
    // 괄호·공백은 마크다운 링크 파서를 망가뜨리므로 인코딩
    return parsed.href
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/ /g, '%20');
  } catch {
    return null;
  }
}

/** embed 하나의 총 글자수 합산 (Discord 상한: 6000) */
function embedCharCount(title: string, description: string): number {
  return title.length + description.length;
}

/** 아이템을 한 줄씩 추가하면서 description 한도(4096자)를 초과하면 중단 */
function buildDescription(lineGroups: string[][]): string {
  const result: string[] = [];
  let total = 0;
  for (const group of lineGroups) {
    const block = group.join('\n');
    if (total + block.length + 1 > LIMIT.DESCRIPTION) break;
    result.push(block);
    total += block.length + 1;
  }
  return result.join('\n') || '(표시할 항목이 없습니다)';
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
  const totalPages = Math.ceil(items.length / MAX_ITEMS_PER_EMBED);
  for (let page = 0; page < totalPages; page++) {
    const pageItems = items.slice(page * MAX_ITEMS_PER_EMBED, (page + 1) * MAX_ITEMS_PER_EMBED);

    const lineGroups: string[][] = pageItems.map((item, i) => {
      const globalIdx = page * MAX_ITEMS_PER_EMBED + i + 1;
      const emoji     = SOURCE_EMOJI[item.source] || '📎';
      const title     = truncate(item.title, 80);
      const score     = item.score ? ` · ⬆️ ${item.score}` : '';
      const meta      = `${emoji} **${item.source}** · ${relativeTime(item.publishedAt)}${score}`;

      const url   = safeUrl(item.url);
      const group = [url ? `**${globalIdx}.** [${title}](${url})` : `**${globalIdx}.** ${title}`];
      if (item.summary) group.push(`> ${truncate(item.summary, 150)}`);
      group.push(meta);
      if (i < pageItems.length - 1) group.push('');
      return group;
    });

    const pageLabel = truncate(
      totalPages > 1
        ? `${icon} ${label} — ${items.length}건 (${page + 1}/${totalPages})`
        : `${icon} ${label} — ${items.length}건`,
      LIMIT.TITLE,
    );

    const description = buildDescription(lineGroups);

    // 6000자 상한 초과 시 description을 추가로 자름
    const MAX_TOTAL = 6000;
    const safeDesc = embedCharCount(pageLabel, description) > MAX_TOTAL
      ? truncate(description, MAX_TOTAL - pageLabel.length - 1)
      : description;

    embeds.push(
      new EmbedBuilder()
        .setColor(color)
        .setTitle(pageLabel || '\u200b')        // 빈 문자열 방지
        .setDescription(safeDesc || '\u200b'),  // 빈 문자열 방지
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
