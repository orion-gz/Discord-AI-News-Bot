import cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import { crawlAllSources } from './crawlers';
import { summarizeItems } from './summarizer';
import { formatNewsEmbeds } from './formatter';

export function startNewsScheduler(client: Client): void {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const schedule = process.env.NEWS_SCHEDULE || '0 * * * *';
  const timezone = process.env.TZ || 'Asia/Seoul';

  if (!channelId) {
    console.warn('⚠️  DISCORD_CHANNEL_ID가 설정되지 않아 자동 뉴스 알림이 비활성화됩니다.');
    return;
  }

  cron.schedule(schedule, async () => {
    try {
      const items = await crawlAllSources();
      if (items.length === 0) {
        console.log('ℹ️  새로운 AI 뉴스가 없습니다. 스킵합니다.');
        return;
      }

      const summarized = await summarizeItems(items);
      const embeds = formatNewsEmbeds(summarized);

      const channel = await client.channels.fetch(channelId);
      if (!channel || !(channel instanceof TextChannel)) {
        console.error('❌ 채널을 찾을 수 없거나 텍스트 채널이 아닙니다.');
        return;
      }

      // Send embeds in batches of 10 (Discord limit)
      for (let i = 0; i < embeds.length; i += 10) {
        await channel.send({ embeds: embeds.slice(i, i + 10) });
      }

      const now = new Date().toLocaleString('ko-KR', { timeZone: timezone });
      console.log(`✅ [${now}] AI 뉴스 ${items.length}건 전송 완료`);
    } catch (error) {
      console.error('❌ 뉴스 알림 전송 오류:', error);
    }
  }, { timezone });

  console.log(`⏰ AI 뉴스 스케줄러 시작: "${schedule}" (시간대: ${timezone})`);
}
