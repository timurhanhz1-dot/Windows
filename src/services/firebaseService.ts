import { db, storage } from '../firebase';
import {
  ref, onValue, push, set, get, update, remove, off, query, orderByChild, limitToLast, increment
} from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// ─── CHANNELS ────────────────────────────────────────────────────────────────
export function listenChannels(callback: (channels: any[]) => void) {
  const r = ref(db, 'channels');
  onValue(r, snap => {
    const data = snap.val() || {};
    const channels = Object.entries(data).map(([id, val]: any) => ({
      id, name: val.name || id, server_id: val.server_id || 'main', type: val.type || 'text',
      category: val.category || 'Sohbet', is_locked: val.is_locked || false, slow_mode: val.slow_mode || 0,
      emoji: val.emoji || ''
    }));
    if (channels.length === 0) {
      callback([
        { id: 'genel', name: 'genel', server_id: 'main', type: 'text', category: 'Sohbet' },
        { id: 'duyurular', name: 'duyurular', server_id: 'main', type: 'text', category: 'Bilgi' },
        { id: 'yardim', name: 'yardim', server_id: 'main', type: 'text', category: 'Bilgi' },
      ]);
    } else {
      callback(channels);
    }
  });
  return () => off(r);
}

export async function createChannel(name: string, type = 'text', category = 'Sohbet', emoji = '') {
  const id = name.toLowerCase().replace(/\s+/g, '-');
  await set(ref(db, `channels/${id}`), { name, type, category, server_id: 'main', is_locked: false, slow_mode: 0, ...(emoji ? { emoji } : {}) });
  return { id, name, server_id: 'main', type, category, emoji };
}

export async function deleteChannel(channelId: string) {
  await remove(ref(db, `channels/${channelId}`));
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
export function listenMessages(channelId: string, callback: (messages: any[]) => void) {
  const r = query(ref(db, `messages/${channelId}`), orderByChild('timestamp'), limitToLast(100));
  onValue(r, snap => {
    const data = snap.val() || {};
    const messages = Object.entries(data).map(([id, val]: any) => ({
      id,
      sender_id: val.sender_id,
      sender_name: val.sender_name || val.sender_id,
      sender_avatar: val.sender_avatar || '',
      content: val.content,
      timestamp: val.timestamp || '',
      is_pinned: val.is_pinned || false,
      is_edited: val.is_edited || false,
      edit_history: val.edit_history || [],
      type: val.type || 'text',
      reactions: val.reactions || {},
      file_url: val.file_url || '',
      file_name: val.file_name || '',
      mentions: val.mentions || [],
      reply_to_id: val.reply_to_id || null,
    }));
    callback(messages);
  });
  return () => off(r);
}

import { trackHashtags } from './hashtagService';

export async function sendMessage(channelId: string, senderId: string, senderName: string, content: string, options?: {
  replyToId?: string, fileUrl?: string, fileName?: string, fileType?: string, mentions?: string[], senderAvatar?: string
}) {
  const r = ref(db, `messages/${channelId}`);
  const msgRef = await push(r, {
    sender_id: senderId,
    sender_name: senderName,
    sender_avatar: options?.senderAvatar || '',
    content,
    timestamp: new Date().toISOString(),
    type: options?.fileUrl ? (options.fileType?.startsWith('image') ? 'image' : 'file') : 'text',
    is_pinned: false,
    is_edited: false,
    reactions: {},
    file_url: options?.fileUrl || '',
    file_name: options?.fileName || '',
    mentions: options?.mentions || [],
    reply_to_id: options?.replyToId || null,
  });
  // Increment message count atomically
  await update(ref(db, `users/${senderId}`), { message_count: increment(1) });
  // Hashtag tracking
  if (content) trackHashtags(content).catch(() => {});
  return msgRef.key;
}

export async function editMessage(channelId: string, messageId: string, newContent: string) {
  const msgRef = ref(db, `messages/${channelId}/${messageId}`);
  const snap = await get(msgRef);
  const old = snap.val();
  const history = old.edit_history || [];
  history.push(old.content);
  await update(msgRef, { content: newContent, is_edited: true, edit_history: history });
}

export async function deleteMessage(channelId: string, messageId: string) {
  await remove(ref(db, `messages/${channelId}/${messageId}`));
}

export async function pinMessage(channelId: string, messageId: string, isPinned: boolean) {
  await update(ref(db, `messages/${channelId}/${messageId}`), { is_pinned: isPinned });
}

export async function addReaction(channelId: string, messageId: string, emoji: string, userId: string) {
  const r = ref(db, `messages/${channelId}/${messageId}/reactions/${emoji}`);
  const snap = await get(r);
  const users: string[] = snap.val() || [];
  const idx = users.indexOf(userId);
  if (idx === -1) users.push(userId);
  else users.splice(idx, 1);
  if (users.length === 0) await remove(r);
  else await set(r, users);
}

// ─── FILE UPLOAD ──────────────────────────────────────────────────────────────
export async function uploadFile(file: File, userId: string): Promise<{ url: string, name: string, type: string }> {
  const path = `uploads/${userId}/${Date.now()}_${file.name}`;
  const sRef = storageRef(storage, path);
  await uploadBytes(sRef, file);
  const url = await getDownloadURL(sRef);
  return { url, name: file.name, type: file.type };
}

// ─── USERS ────────────────────────────────────────────────────────────────────
export function listenUsers(callback: (users: any[]) => void) {
  const r = ref(db, 'users');
  onValue(r, snap => {
    const data = snap.val() || {};
    const byUsername = new Map<string, any>();
    const looksLikeUID = (key: string) => /^[A-Za-z0-9]{20,}$/.test(key);

    Object.entries(data).forEach(([id, val]: any) => {
      if (!val || typeof val !== 'object') return;
      const username = val.username || (looksLikeUID(id) ? null : id);
      if (!username) return;
      const lc = username.toLowerCase();
      const isNewRecord = !!val.id;
      if (!byUsername.has(lc)) {
        byUsername.set(lc, { id, username, val });
      } else {
        if (isNewRecord) byUsername.set(lc, { id, username, val });
      }
    });

    const users: any[] = [];
    byUsername.forEach(({ id, username, val }) => {
      // Sadece UI için gereken minimum alanlar — büyük veri setinde bant genişliği tasarrufu
      users.push({
        id,
        username,
        status: val.status || 'offline',
        avatar: val.avatar || val.photoURL || '',
        is_admin: val.is_admin || val.isAdmin || false,
        is_verified: val.is_verified === true,
        is_banned: val.is_banned || val.banned || false,
        eco_points: val.eco_points || 0,
      });
    });
    callback(users);
  });
  return () => off(r);
}


export async function getUser(userId: string) {
  const snap = await get(ref(db, `users/${userId}`));
  return snap.val();
}

export async function updateUser(userId: string, data: any) {
  await update(ref(db, `users/${userId}`), data);
}

// ─── ONLINE PRESENCE ──────────────────────────────────────────────────────────
export function listenOnlineUsers(callback: (userIds: string[]) => void) {
  const r = ref(db, 'online');
  onValue(r, snap => {
    const data = snap.val() || {};
    callback(Object.keys(data).filter(k => data[k] === true));
  });
  return () => off(r);
}

export async function setUserOnline(userId: string, username: string) {
  await update(ref(db, `online`), { [userId]: true });
  await update(ref(db, `users/${userId}`), { status: 'online', last_seen: new Date().toISOString() });
}

export async function setUserOffline(userId: string) {
  await update(ref(db, `online`), { [userId]: false });
  await update(ref(db, `users/${userId}`), { status: 'offline', last_seen: new Date().toISOString() });
}

// ─── FRIENDS ──────────────────────────────────────────────────────────────────
export async function sendFriendRequest(fromId: string, toId: string) {
  await push(ref(db, `friend_requests/${toId}`), { from: fromId, timestamp: new Date().toISOString() });
  await push(ref(db, `notifications/${toId}`), {
    type: 'friend_request', from_id: fromId, content: 'Arkadaşlık isteği gönderdi', read: false, timestamp: new Date().toISOString()
  });
}

export async function acceptFriendRequest(userId: string, fromId: string, notifId: string) {
  // friend_requests altında fromId'ye ait kaydı bul ve sil
  const { get: fbGet } = await import('firebase/database');
  const reqSnap = await fbGet(ref(db, `friend_requests/${userId}`)).catch(() => null);
  if (reqSnap) {
    const data = reqSnap.val() || {};
    for (const [key, val] of Object.entries(data) as any[]) {
      if (val.from === fromId) {
        await remove(ref(db, `friend_requests/${userId}/${key}`));
        break;
      }
    }
  }
  await update(ref(db, `users/${userId}/friends`), { [fromId]: true });
  await update(ref(db, `users/${fromId}/friends`), { [userId]: true });
  // bildirimi sil
  await remove(ref(db, `notifications/${userId}/${notifId}`)).catch(() => {});
  // karşı tarafa kabul bildirimi gönder
  await push(ref(db, `notifications/${fromId}`), {
    type: 'friend_accept', from_id: userId, content: 'Arkadaşlık isteğini kabul etti', read: false, timestamp: new Date().toISOString()
  });
}

export async function rejectFriendRequest(userId: string, fromId: string, notifId: string) {
  // friend_requests altında fromId'ye ait kaydı bul ve sil
  const { get: fbGet } = await import('firebase/database');
  const reqSnap = await fbGet(ref(db, `friend_requests/${userId}`)).catch(() => null);
  if (reqSnap) {
    const data = reqSnap.val() || {};
    for (const [key, val] of Object.entries(data) as any[]) {
      if (val.from === fromId) {
        await remove(ref(db, `friend_requests/${userId}/${key}`));
        break;
      }
    }
  }
  // bildirimi sil
  await remove(ref(db, `notifications/${userId}/${notifId}`)).catch(() => {});
}

export async function removeFriend(userId: string, friendId: string) {
  await remove(ref(db, `users/${userId}/friends/${friendId}`));
  await remove(ref(db, `users/${friendId}/friends/${userId}`));
}

export async function blockUser(userId: string, targetId: string) {
  await set(ref(db, `users/${userId}/blocked/${targetId}`), true);
  await removeFriend(userId, targetId);
}

export function listenFriendRequests(userId: string, callback: (requests: any[]) => void) {
  const r = ref(db, `friend_requests/${userId}`);
  onValue(r, snap => {
    const data = snap.val() || {};
    callback(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
  });
  return () => off(r);
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
export function listenNotifications(userId: string, callback: (notifs: any[]) => void) {
  const r = ref(db, `notifications/${userId}`);
  onValue(r, snap => {
    const data = snap.val() || {};
    const notifs = Object.entries(data).map(([id, val]: any) => ({ id, ...val })).sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));
    callback(notifs);
  });
  return () => off(r);
}

export async function markNotificationRead(userId: string, notifId: string) {
  await update(ref(db, `notifications/${userId}/${notifId}`), { read: true });
}

// ─── DM ───────────────────────────────────────────────────────────────────────
export function listenDMs(userId1: string, userId2: string, callback: (messages: any[]) => void) {
  const dmKey = [userId1, userId2].sort().join('_');
  const r = query(ref(db, `dm/${dmKey}`), orderByChild('timestamp'), limitToLast(50));
  onValue(r, snap => {
    const data = snap.val() || {};
    const msgs = Object.entries(data).map(([id, val]: any) => ({ id, ...val }))
      .sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));
    callback(msgs);
  });
  return () => off(ref(db, `dm/${dmKey}`));
}

export async function sendDM(fromId: string, toId: string, content: string, senderName: string) {
  const dmKey = [fromId, toId].sort().join('_');
  await push(ref(db, `dm/${dmKey}`), {
    sender_id: fromId, sender_name: senderName, receiver_id: toId,
    content, timestamp: new Date().toISOString(), read: false
  });
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────
export function listenSettings(callback: (settings: any) => void) {
  const r = ref(db, 'settings');
  onValue(r, snap => { callback(snap.val() || {}); });
  return () => off(r);
}

export async function updateSettings(settings: any) {
  await update(ref(db, 'settings'), settings);
}

// ─── POLLS ────────────────────────────────────────────────────────────────────
export async function createPoll(channelId: string, creatorId: string, question: string, options: string[]) {
  await push(ref(db, `polls/${channelId}`), {
    creator_id: creatorId, question, options, votes: {}, timestamp: new Date().toISOString()
  });
}

export async function votePoll(channelId: string, pollId: string, userId: string, optionIndex: number) {
  await set(ref(db, `polls/${channelId}/${pollId}/votes/${userId}`), optionIndex);
}

export async function closePoll(channelId: string, pollId: string) {
  await update(ref(db, `polls/${channelId}/${pollId}`), { closed: true });
}

export async function deletePoll(channelId: string, pollId: string) {
  await remove(ref(db, `polls/${channelId}/${pollId}`));
}

export function listenPolls(channelId: string, callback: (polls: any[]) => void) {
  const r = ref(db, `polls/${channelId}`);
  onValue(r, snap => {
    const data = snap.val() || {};
    callback(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
  });
  return () => off(r);
}

// ─── DAILY REWARD ─────────────────────────────────────────────────────────────
export async function checkDailyReward(userId: string): Promise<{ claimed: boolean, xp: number }> {
  const snap = await get(ref(db, `users/${userId}`));
  const user = snap.val();
  if (!user) return { claimed: false, xp: 0 };
  const last = user.daily_reward_last;
  const today = new Date().toDateString();
  if (last === today) return { claimed: true, xp: 0 };
  const xpReward = 50 + Math.floor(Math.random() * 50);
  await update(ref(db, `users/${userId}`), {
    daily_reward_last: today,
    xp: (user.xp || 0) + xpReward
  });
  return { claimed: false, xp: xpReward };
}
