import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import * as dotenv from 'dotenv';

dotenv.config();

const commands: ReturnType<SlashCommandBuilder['toJSON']>[] = [
  {
    name: 'ainews',
    description: '최신 AI 뉴스, 논문, 커뮤니티 소식을 즉시 가져옵니다',
  },
];

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('❌ DISCORD_TOKEN과 DISCORD_CLIENT_ID 환경변수가 필요합니다.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('🔄 슬래시 커맨드 등록 중...');

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      console.log(`✅ 길드(${guildId}) 슬래시 커맨드 등록 완료`);
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      console.log('✅ 글로벌 슬래시 커맨드 등록 완료 (반영까지 최대 1시간 소요)');
    }
  } catch (error) {
    console.error('❌ 커맨드 등록 오류:', error);
  }
})();
