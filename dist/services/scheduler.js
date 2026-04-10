"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startNewsScheduler = startNewsScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const discord_js_1 = require("discord.js");
const crawlers_1 = require("./crawlers");
const summarizer_1 = require("./summarizer");
const formatter_1 = require("./formatter");
const cache_1 = require("./cache");
function startNewsScheduler(client) {
    const channelId = process.env.DISCORD_CHANNEL_ID;
    const schedule = process.env.NEWS_SCHEDULE || '0 * * * *';
    const timezone = process.env.TZ || 'Asia/Seoul';
    if (!channelId) {
        console.warn('⚠️  DISCORD_CHANNEL_ID가 설정되지 않아 자동 뉴스 알림이 비활성화됩니다.');
        return;
    }
    node_cron_1.default.schedule(schedule, async () => {
        try {
            const crawled = await (0, crawlers_1.crawlAllSources)();
            const items = (0, cache_1.filterPosted)(crawled);
            console.log(`📊 수집 ${crawled.length}개 → 캐시 제외 ${crawled.length - items.length}개 → 신규 ${items.length}개`);
            if (items.length === 0) {
                console.log('ℹ️  새로운 AI 뉴스가 없습니다. 스킵합니다.');
                return;
            }
            const summarized = await (0, summarizer_1.summarizeItems)(items);
            const embeds = (0, formatter_1.formatNewsEmbeds)(summarized);
            const channel = await client.channels.fetch(channelId);
            if (!channel || !(channel instanceof discord_js_1.TextChannel)) {
                console.error('❌ 채널을 찾을 수 없거나 텍스트 채널이 아닙니다.');
                return;
            }
            // 합산 6000자 + 10개 제한을 지키며 배치 전송
            for (const batch of (0, formatter_1.batchEmbeds)(embeds)) {
                await channel.send({ embeds: batch });
            }
            (0, cache_1.markPosted)(items);
            const now = new Date().toLocaleString('ko-KR', { timeZone: timezone });
            console.log(`✅ [${now}] AI 뉴스 ${items.length}건 전송 완료`);
        }
        catch (error) {
            console.error('❌ 뉴스 알림 전송 오류:', error);
        }
    }, { timezone });
    console.log(`⏰ AI 뉴스 스케줄러 시작: "${schedule}" (시간대: ${timezone})`);
}
