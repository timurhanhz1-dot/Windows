import { db } from '../firebase';
import { ref, onValue, push, set, get, update, remove, off, serverTimestamp } from 'firebase/database';

// ─── RATE LIMIT (client-side guard) ──────────────────────────────────────────
const msgTimestamps = new Map<string, number[]>(); // channelId → son mesaj zamanları
const RATE_LIMIT_COUNT = 5;   // 5 mesaj
const RATE_LIMIT_WINDOW = 5000; // 5 saniye içinde

export function checkGuildRateLimit(channelId: string): boolean {
  const now = Date.now();
  const times = (msgTimestamps.get(channelId) || []).filter(t => now - t < RATE_LIMIT_WINDOW);
  if (times.length >= RATE_LIMIT_COUNT) return false;
  times.push(now);
  msgTimestamps.set(channelId, times);
  return true;
}

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────
async function writeAuditLog(guildId: string, userId: string, action: string, target?: string) {
  const logRef = push(ref(db, `guilds/${guildId}/audit_log`));
  await set(logRef, {
    action,
    by: userId,
    target: target || null,
    timestamp: Date.now(),
  });
}

// ─── BAN KONTROLÜ ─────────────────────────────────────────────────────────────
export async function isGuildBanned(guildId: string, userId: string): Promise<boolean> {
  const snap = await get(ref(db, `guilds/${guildId}/banned_members/${userId}`));
  return snap.exists();
}

// ─── GUILD OLUŞTUR ────────────────────────────────────────────────────────────
export async function createGuild(name: string, emoji: string, color: string, userId: string, username: string) {
  // Kullanıcı başına max 10 guild limiti
  const userGuildsSnap = await get(ref(db, `userGuilds/${userId}`));
  const guildCount = Object.keys(userGuildsSnap.val() || {}).length;
  if (guildCount >= 10) throw new Error('En fazla 10 sunucu oluşturabilirsiniz');

  // İsim doğrulama
  const trimmedName = name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 100) throw new Error('Sunucu adı 2-100 karakter olmalıdır');

  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const guildRef = push(ref(db, 'guilds'));
  const guildId = guildRef.key!;
  await set(guildRef, {
    id: guildId,
    name,
    emoji,
    color,
    owner_id: userId,
    invite_code: inviteCode,
    created_at: new Date().toISOString(),
    member_count: 1,
  });
  // Owner'ı ekle
  await set(ref(db, `guilds/${guildId}/members/${userId}`), 'owner');
  await set(ref(db, `userGuilds/${userId}/${guildId}`), true);
  // Default kanallar oluştur
  await set(ref(db, `channels/guild_${guildId}_genel`), { name: 'genel', type: 'text', category: 'Metin Kanalları', server_id: guildId });
  await set(ref(db, `channels/guild_${guildId}_duyurular`), { name: 'duyurular', type: 'text', category: 'Bilgi', server_id: guildId });
  return { guildId, inviteCode };
}

// ─── GUILD'E KATIL (davet kodu ile) ──────────────────────────────────────────
export async function joinGuildByCode(inviteCode: string, userId: string) {
  const snap = await get(ref(db, 'guilds'));
  const guilds = snap.val() || {};
  const entry = Object.entries(guilds).find(([, g]: any) => g.invite_code === inviteCode.toUpperCase());
  if (!entry) throw new Error('Geçersiz davet kodu');
  const [guildId, guild]: any = entry;
  // Zaten üye mi?
  const memberSnap = await get(ref(db, `guilds/${guildId}/members/${userId}`));
  if (memberSnap.exists()) throw new Error('Zaten bu sunucudasın');
  // Banlı mı?
  const banned = await isGuildBanned(guildId, userId);
  if (banned) throw new Error('Bu sunucudan banlandınız');
  // Kullanıcı başına max 100 guild üyeliği
  const userGuildsSnap = await get(ref(db, `userGuilds/${userId}`));
  const memberCount = Object.keys(userGuildsSnap.val() || {}).length;
  if (memberCount >= 100) throw new Error('En fazla 100 sunucuya katılabilirsiniz');

  await set(ref(db, `guilds/${guildId}/members/${userId}`), 'member');
  await set(ref(db, `userGuilds/${userId}/${guildId}`), true);
  await update(ref(db, `guilds/${guildId}`), { member_count: (guild.member_count || 1) + 1 });
  await writeAuditLog(guildId, userId, 'member_join');
  return { guildId, name: guild.name };
}

// ─── GUILD'DEN AYRIL ─────────────────────────────────────────────────────────
export async function leaveGuild(guildId: string, userId: string) {
  await remove(ref(db, `guilds/${guildId}/members/${userId}`));
  await remove(ref(db, `userGuilds/${userId}/${guildId}`));
}

// ─── KULLANICINın GUILD'LERİNİ DİNLE ─────────────────────────────────────────
export function listenUserGuilds(userId: string, callback: (guilds: any[]) => void) {
  const r = ref(db, `userGuilds/${userId}`);
  onValue(r, async snap => {
    const data = snap.val() || {};
    const guildIds = Object.keys(data);
    if (guildIds.length === 0) { callback([]); return; }
    const guilds: any[] = [];
    for (const gid of guildIds) {
      const gs = await get(ref(db, `guilds/${gid}`));
      if (gs.exists()) guilds.push({ id: gid, ...gs.val() });
    }
    callback(guilds);
  });
  return () => off(r);
}

// ─── TÜM PUBLIC GUILD'LERİ DİNLE ─────────────────────────────────────────────
export function listenAllGuilds(callback: (guilds: any[]) => void) {
  const r = ref(db, 'guilds');
  onValue(r, snap => {
    const data = snap.val() || {};
    callback(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
  });
  return () => off(r);
}

// ─── GUILD ÜYELERİNİ DİNLE ───────────────────────────────────────────────────
export function listenGuildMembers(guildId: string, callback: (members: any[]) => void) {
  const r = ref(db, `guilds/${guildId}/members`);
  onValue(r, snap => {
    const data = snap.val() || {};
    callback(Object.entries(data).map(([uid, role]) => ({ uid, role })));
  });
  return () => off(r);
}

// ─── ROL DEĞİŞTİR ────────────────────────────────────────────────────────────
export async function setMemberRole(guildId: string, memberId: string, role: 'admin' | 'member', byUserId: string) {
  await set(ref(db, `guilds/${guildId}/members/${memberId}`), role);
  await writeAuditLog(guildId, byUserId, `role_change_${role}`, memberId);
}

// ─── ÜYEYİ AT ────────────────────────────────────────────────────────────────
export async function kickMember(guildId: string, memberId: string, byUserId: string) {
  await remove(ref(db, `guilds/${guildId}/members/${memberId}`));
  await remove(ref(db, `userGuilds/${memberId}/${guildId}`));
  await writeAuditLog(guildId, byUserId, 'member_kick', memberId);
}

// ─── ÜYEYİ BANLA ─────────────────────────────────────────────────────────────
export async function banMember(guildId: string, memberId: string, byUserId: string, reason?: string) {
  await remove(ref(db, `guilds/${guildId}/members/${memberId}`));
  await remove(ref(db, `userGuilds/${memberId}/${guildId}`));
  await set(ref(db, `guilds/${guildId}/banned_members/${memberId}`), {
    by: byUserId,
    reason: reason || '',
    timestamp: Date.now(),
  });
  await writeAuditLog(guildId, byUserId, 'member_ban', memberId);
}

// ─── BAN KALDIR ───────────────────────────────────────────────────────────────
export async function unbanMember(guildId: string, memberId: string, byUserId: string) {
  await remove(ref(db, `guilds/${guildId}/banned_members/${memberId}`));
  await writeAuditLog(guildId, byUserId, 'member_unban', memberId);
}

// ─── GUILD SİL ───────────────────────────────────────────────────────────────
export async function deleteGuild(guildId: string, byUserId: string) {
  await writeAuditLog(guildId, byUserId, 'guild_delete');
  await remove(ref(db, `guilds/${guildId}`));
}

// ─── SLOWMODE AYARLA ──────────────────────────────────────────────────────────
export async function setSlowmode(guildId: string, seconds: number, byUserId: string) {
  if (seconds < 0 || seconds > 21600) throw new Error('Slowmode 0-21600 saniye arasında olmalıdır');
  await update(ref(db, `guilds/${guildId}`), { slowmode_seconds: seconds });
  await writeAuditLog(guildId, byUserId, `slowmode_set_${seconds}s`);
}

// ─── AUDİT LOG DİNLE ──────────────────────────────────────────────────────────
export function listenAuditLog(guildId: string, callback: (logs: any[]) => void) {
  const r = ref(db, `guilds/${guildId}/audit_log`);
  onValue(r, snap => {
    const data = snap.val() || {};
    const logs = Object.entries(data)
      .map(([id, val]: any) => ({ id, ...val }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);
    callback(logs);
  });
  return () => off(r);
}

// ─── KANAL EKLE ───────────────────────────────────────────────────────────────
export async function addGuildChannel(guildId: string, channelName: string) {
  const channelId = `guild_${guildId}_${channelName.toLowerCase().replace(/\s+/g, '_')}`;
  await set(ref(db, `channels/${channelId}`), { name: channelName.toLowerCase(), type: 'text', category: 'Metin Kanalları', server_id: guildId });
  return channelId;
}

// ─── KANAL SİL ────────────────────────────────────────────────────────────────
export async function removeGuildChannel(channelId: string) {
  await remove(ref(db, `channels/${channelId}`));
}

// ─── GUILD KANALLARINI DİNLE ──────────────────────────────────────────────────
export function listenGuildChannels(guildId: string, callback: (channels: { id: string; name: string }[]) => void) {
  const r = ref(db, 'channels');
  onValue(r, snap => {
    const data = snap.val() || {};
    const guildChannels = Object.entries(data)
      .filter(([id, ch]: any) => ch.server_id === guildId || id.startsWith(`guild_${guildId}_`))
      .map(([id, ch]: any) => ({ id, name: ch.name || id }));
    callback(guildChannels);
  });
  return () => off(r);
}
