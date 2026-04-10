"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const commands = [
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
const rest = new discord_js_1.REST({ version: '10' }).setToken(token);
(async () => {
    try {
        console.log('🔄 슬래시 커맨드 등록 중...');
        if (guildId) {
            await rest.put(discord_js_1.Routes.applicationGuildCommands(clientId, guildId), { body: commands });
            console.log(`✅ 길드(${guildId}) 슬래시 커맨드 등록 완료`);
        }
        else {
            await rest.put(discord_js_1.Routes.applicationCommands(clientId), { body: commands });
            console.log('✅ 글로벌 슬래시 커맨드 등록 완료 (반영까지 최대 1시간 소요)');
        }
    }
    catch (error) {
        console.error('❌ 커맨드 등록 오류:', error);
    }
})();
