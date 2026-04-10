"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data = void 0;
exports.execute = execute;
const discord_js_1 = require("discord.js");
const crawlers_1 = require("../services/crawlers");
const summarizer_1 = require("../services/summarizer");
const formatter_1 = require("../services/formatter");
const cache_1 = require("../services/cache");
exports.data = new discord_js_1.SlashCommandBuilder()
    .setName('ainews')
    .setDescription('최신 AI 뉴스, 논문, 커뮤니티 소식을 즉시 가져옵니다');
async function execute(interaction) {
    await interaction.deferReply();
    try {
        const crawled = await (0, crawlers_1.crawlAllSources)();
        const items = (0, cache_1.filterPosted)(crawled);
        console.log(`📊 수집 ${crawled.length}개 → 캐시 제외 ${crawled.length - items.length}개 → 신규 ${items.length}개`);
        if (items.length === 0) {
            await interaction.editReply(`현재 새로운 AI 뉴스가 없습니다. (수집 ${crawled.length}개 중 전부 이미 전송됨)`);
            return;
        }
        const summarized = await (0, summarizer_1.summarizeItems)(items);
        const embeds = (0, formatter_1.formatNewsEmbeds)(summarized);
        // 합산 6000자 + 10개 제한을 지키며 배치 전송
        const batches = (0, formatter_1.batchEmbeds)(embeds);
        await interaction.editReply({ embeds: batches[0] });
        for (let i = 1; i < batches.length; i++) {
            await interaction.followUp({ embeds: batches[i] });
        }
        (0, cache_1.markPosted)(items);
    }
    catch (error) {
        const raw = error?.rawError;
        console.error('ainews 오류 full:', JSON.stringify(raw ?? error, null, 2));
        try {
            await interaction.editReply('뉴스를 가져오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
        }
        catch { /* deferred reply already timed out */ }
    }
}
