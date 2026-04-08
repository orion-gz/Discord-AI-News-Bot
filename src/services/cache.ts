import * as fs from 'fs';
import * as path from 'path';
import { NewsItem } from '../types';

const CACHE_FILE = path.resolve(__dirname, '../../data/posted-cache.json');
const TTL_MS = 24 * 60 * 60 * 1000; // 24시간

type CacheStore = Record<string, number>; // url → postedAt timestamp

function load(): CacheStore {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {};
    const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
    return JSON.parse(raw) as CacheStore;
  } catch {
    return {};
  }
}

function save(store: CacheStore): void {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('⚠️  캐시 저장 실패:', err);
  }
}

function evictExpired(store: CacheStore): CacheStore {
  const cutoff = Date.now() - TTL_MS;
  const result: CacheStore = {};
  for (const [url, ts] of Object.entries(store)) {
    if (ts > cutoff) result[url] = ts;
  }
  return result;
}

/** 이미 전송된 항목을 제거하고 새 항목만 반환 */
export function filterPosted(items: NewsItem[]): NewsItem[] {
  const store = evictExpired(load());
  return items.filter((item) => !store[item.url]);
}

/** 전송 완료된 항목들을 캐시에 기록 */
export function markPosted(items: NewsItem[]): void {
  const store = evictExpired(load());
  const now = Date.now();
  for (const item of items) {
    store[item.url] = now;
  }
  save(store);
  console.log(`📦 캐시 업데이트: ${items.length}건 추가 (총 ${Object.keys(store).length}건 보관)`);
}
