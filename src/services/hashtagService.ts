import { db } from '../firebase';
import { ref, get, set, update } from 'firebase/database';

// Mesajdaki #etiketleri çıkar
export function extractHashtags(text: string): string[] {
  const matches = text.match(/#([a-zA-ZğüşıöçĞÜŞİÖÇ0-9_]{2,30})/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(1).toLowerCase()))];
}

// Hashtag kullanımını Firebase'e kaydet
export async function trackHashtags(text: string): Promise<void> {
  const tags = extractHashtags(text);
  if (tags.length === 0) return;
  const now = Date.now();
  const updates: Record<string, any> = {};
  for (const tag of tags) {
    const snap = await get(ref(db, `hashtags/${tag}`)).catch(() => null);
    const current = snap?.val() || { count: 0, lastUsed: 0 };
    updates[`hashtags/${tag}`] = {
      tag,
      count: (current.count || 0) + 1,
      lastUsed: now,
    };
  }
  await update(ref(db, '/'), updates).catch(() => {});
}

// Trending hashtag'leri getir (son 7 günde en çok kullanılan)
export async function getTrendingHashtags(limit = 15): Promise<{ tag: string; count: number; lastUsed: number }[]> {
  try {
    const snap = await get(ref(db, 'hashtags'));
    if (!snap.exists()) return [];
    const data = snap.val() as Record<string, { tag: string; count: number; lastUsed: number }>;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return Object.values(data)
      .filter(h => h.lastUsed > weekAgo)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch {
    return [];
  }
}
