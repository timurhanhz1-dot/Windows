// ─── RATE LIMITING ────────────────────────────────────────────────────────────
const rateLimits = new Map<string, number[]>();

export function checkRateLimit(action: string, maxPerMinute = 20): boolean {
  const key = action;
  const now = Date.now();
  const window = 60_000;
  const times = (rateLimits.get(key) || []).filter(t => now - t < window);
  if (times.length >= maxPerMinute) return false;
  times.push(now);
  rateLimits.set(key, times);
  return true;
}

// ─── XSS SANITIZER ────────────────────────────────────────────────────────────
export function sanitizeText(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// URL güvenlik doğrulaması
export function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

// ─── XP & ROZET SİSTEMİ ──────────────────────────────────────────────────────
export const BADGES = [
  { id: 'newcomer',   label: 'Yeni Üye',     icon: '🌱', minMessages: 0   },
  { id: 'active',     label: 'Aktif',         icon: '🌿', minMessages: 10  },
  { id: 'regular',    label: 'Düzenli',       icon: '🍃', minMessages: 50  },
  { id: 'veteran',    label: 'Deneyimli',     icon: '🌳', minMessages: 200 },
  { id: 'legend',     label: 'Efsane',        icon: '🌲', minMessages: 500 },
];

export function getLevel(xp: number) {
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export function getXpForNextLevel(xp: number) {
  const level = getLevel(xp);
  return level * level * 100;
}

export function getEarnedBadges(messageCount: number) {
  return BADGES.filter(b => messageCount >= b.minMessages);
}

// ─── KARBON TAKİBİ ────────────────────────────────────────────────────────────
// Ortalama bir mesaj ~0.3g CO₂, sayfa yüklemesi ~1.76g CO₂
export function estimateCO2(messageCount: number, sessionMinutes: number): number {
  const messageCO2 = messageCount * 0.0003; // kg
  const sessionCO2 = (sessionMinutes / 60) * 0.036; // kg/saat ortalama web kullanımı
  return Math.round((messageCO2 + sessionCO2) * 1000) / 1000; // gram
}

// ─── DAILY REWARD ─────────────────────────────────────────────────────────────
export function checkDailyReward(lastReward: string | null): { earned: boolean; xp: number } {
  if (!lastReward) return { earned: true, xp: 50 };
  const last = new Date(lastReward);
  const now = new Date();
  const diffHours = (now.getTime() - last.getTime()) / 3_600_000;
  if (diffHours >= 24) return { earned: true, xp: 50 };
  return { earned: false, xp: 0 };
}
