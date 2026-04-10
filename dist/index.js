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
const ainewsCommand = __importStar(require("./commands/ainews"));
const scheduler_1 = require("./services/scheduler");
dotenv.config();
const client = new discord_js_1.Client({
    intents: [discord_js_1.GatewayIntentBits.Guilds],
});
const commands = new discord_js_1.Collection();
commands.set(ainewsCommand.data.name, ainewsCommand);
client.once('clientReady', (readyClient) => {
    console.log(`✅ AI 뉴스 봇이 ${readyClient.user.tag}으로 로그인되었습니다!`);
    (0, scheduler_1.startNewsScheduler)(readyClient);
});
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand())
        return;
    const command = commands.get(interaction.commandName);
    if (!command)
        return;
    try {
        await command.execute(interaction);
    }
    catch (error) {
        // 10062 = Unknown Interaction (이미 만료되었거나 다른 인스턴스가 처리한 경우)
        if (error?.code === 10062)
            return;
        console.error('커맨드 실행 오류:', error);
        const errorMessage = '명령어 실행 중 오류가 발생했습니다.';
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: errorMessage, flags: discord_js_1.MessageFlags.Ephemeral });
            }
            else {
                await interaction.reply({ content: errorMessage, flags: discord_js_1.MessageFlags.Ephemeral });
            }
        }
        catch { /* interaction already expired */ }
    }
});
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ DISCORD_TOKEN 환경변수가 설정되지 않았습니다.');
    process.exit(1);
}
client.login(token);
