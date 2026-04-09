import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { crawlAllSources } from '../services/crawlers';
import { summarizeItems } from '../services/summarizer';
import { formatNewsEmbeds } from '../services/formatter';

export const data = new SlashCommandBuilder()
  .setName('ainews')
  .setDescription('최신 AI 뉴스, 논문, 커뮤니티 소식을 즉시 가져옵니다');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  try {
    const items = await crawlAllSources();

    if (items.length === 0) {
      await interaction.editReply('현재 새로운 AI 뉴스가 없습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const summarized = await summarizeItems(items);
    const embeds = formatNewsEmbeds(summarized);

    // Dump embed JSON for debugging, then send
    const embedJsons = embeds.map((e, i) => {
      const j = e.toJSON();
      const titleLen = (j.title ?? '').length;
      const descLen  = (j.description ?? '').length;
      console.log(`[embed #${i}] title(${titleLen}) desc(${descLen}): ${j.title?.substring(0, 60)}`);
      return j;
    });

    // Discord allows max 10 embeds per message
    await interaction.editReply({ embeds: embedJsons.slice(0, 10) });

    // Send remaining embeds as follow-ups if any
    for (let i = 10; i < embedJsons.length; i += 10) {
      await interaction.followUp({ embeds: embedJsons.slice(i, i + 10) });
    }
  } catch (error: unknown) {
    const raw = (error as any)?.rawError;
    console.error('ainews 오류 full:', JSON.stringify(raw ?? error, null, 2));
    try {
      await interaction.editReply('뉴스를 가져오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } catch { /* deferred reply already timed out */ }
  }
}
