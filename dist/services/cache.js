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
exports.filterPosted = filterPosted;
exports.markPosted = markPosted;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const CACHE_FILE = path.resolve(__dirname, '../../data/posted-cache.json');
const TTL_MS = 24 * 60 * 60 * 1000; // 24시간
function load() {
    try {
        if (!fs.existsSync(CACHE_FILE))
            return {};
        const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
function save(store) {
    try {
        fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
        fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2), 'utf-8');
    }
    catch (err) {
        console.error('⚠️  캐시 저장 실패:', err);
    }
}
function evictExpired(store) {
    const cutoff = Date.now() - TTL_MS;
    const result = {};
    for (const [url, ts] of Object.entries(store)) {
        if (ts > cutoff)
            result[url] = ts;
    }
    return result;
}
/** 이미 전송된 항목을 제거하고 새 항목만 반환 */
function filterPosted(items) {
    const store = evictExpired(load());
    return items.filter((item) => !store[item.url]);
}
/** 전송 완료된 항목들을 캐시에 기록 */
function markPosted(items) {
    const store = evictExpired(load());
    const now = Date.now();
    for (const item of items) {
        store[item.url] = now;
    }
    save(store);
    console.log(`📦 캐시 업데이트: ${items.length}건 추가 (총 ${Object.keys(store).length}건 보관)`);
}
