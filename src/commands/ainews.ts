import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { crawlAllSources } from '../services/crawlers';
import { summarizeItems } from '../services/summarizer';
import { formatNewsEmbeds, batchEmbeds } from '../services/formatter';
import { filterPosted, markPosted } from '../services/cache';

export const data = new SlashCommandBuilder()
  .setName('ainews')
  .setDescription('최신 AI 뉴스, 논문, 커뮤니티 소식을 즉시 가져옵니다');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const crawled = await crawlAllSources();
    const items = filterPosted(crawled);
    console.log(`📊 수집 ${crawled.length}개 → 캐시 제외 ${crawled.length - items.length}개 → 신규 ${items.length}개`);

    if (items.length === 0) {
      await interaction.editReply(`현재 새로운 AI 뉴스가 없습니다. (수집 ${crawled.length}개 중 전부 이미 전송됨)`);
      return;
    }

    const summarized = await summarizeItems(items);
    const embeds = formatNewsEmbeds(summarized);

    // 합산 6000자 + 10개 제한을 지키며 배치 전송
    const batches = batchEmbeds(embeds);
    await interaction.editReply({ embeds: batches[0] });
    for (let i = 1; i < batches.length; i++) {
      await interaction.followUp({ embeds: batches[i] });
    }

    markPosted(items);
  } catch (error: unknown) {
    const raw = (error as any)?.rawError;
    console.error('ainews 오류 full:', JSON.stringify(raw ?? error, null, 2));
    try {
      await interaction.editReply('뉴스를 가져오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } catch { /* deferred reply already timed out */ }
  }
}
