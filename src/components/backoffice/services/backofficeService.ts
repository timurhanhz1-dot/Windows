import { ref, update, remove, get } from 'firebase/database';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../../../firebase';
import { BackofficeRole, BackofficeError } from '../types/backoffice.types';

// ── Kullanıcı İşlemleri ──────────────────────────────────────────────────────

export const banUser = (uid: string, banned: boolean) =>
  update(ref(db, `users/${uid}`), { is_banned: banned });

export const muteUser = (uid: string, minutes: number) =>
  update(ref(db, `users/${uid}`), {
    is_muted: true,
    mute_until: new Date(Date.now() + minutes * 60000).toISOString(),
  });

export const unmuteUser = (uid: string) =>
  update(ref(db, `users/${uid}`), { is_muted: false, mute_until: null });

export const updateUserProfile = (uid: string, data: { username?: string; bio?: string; avatar?: string }) =>
  update(ref(db, `users/${uid}`), data);

export const deleteUserFromDB = (uid: string) =>
  remove(ref(db, `users/${uid}`));

export const sendPasswordReset = (email: string) =>
  sendPasswordResetEmail(auth, email);

export const assignBackofficeRole = async (
  targetUid: string,
  role: BackofficeRole | null,
  callerRole: BackofficeRole
): Promise<void> => {
  if (role === 'super_admin' && callerRole !== 'super_admin') {
    throw new BackofficeError(
      'Yalnızca super_admin, super_admin rolü atayabilir.',
      'PERMISSION_DENIED'
    );
  }
  if (role === null) {
    await update(ref(db, `users/${targetUid}`), { backoffice_role: null });
  } else {
    await update(ref(db, `users/${targetUid}`), { backoffice_role: role });
  }
};

// ── Kanal İşlemleri ──────────────────────────────────────────────────────────

export const lockChannel = (channelId: string, locked: boolean) =>
  update(ref(db, `channels/${channelId}`), { is_locked: locked });

export const hideChannel = (channelId: string, hidden: boolean) =>
  update(ref(db, `channels/${channelId}`), { is_hidden: hidden });

export const updateChannel = (channelId: string, data: Record<string, any>) =>
  update(ref(db, `channels/${channelId}`), data);

export const deleteChannel = async (channelId: string) => {
  await remove(ref(db, `channels/${channelId}`));
  await remove(ref(db, `messages/${channelId}`));
};

export const createChannel = (channelId: string, data: Record<string, any>) =>
  update(ref(db, `channels/${channelId}`), data);

// ── Mesaj İşlemleri ──────────────────────────────────────────────────────────

export const deleteMessage = (channelId: string, messageId: string) =>
  remove(ref(db, `messages/${channelId}/${messageId}`));

export const pinMessage = (channelId: string, messageId: string, pinned: boolean) =>
  update(ref(db, `messages/${channelId}/${messageId}`), { is_pinned: pinned });

export const editMessage = (channelId: string, messageId: string, content: string) =>
  update(ref(db, `messages/${channelId}/${messageId}`), {
    content,
    is_edited: true,
    edited_at: new Date().toISOString(),
  });

export const clearChannelMessages = (channelId: string) =>
  remove(ref(db, `messages/${channelId}`));

// ── Ayar İşlemleri ───────────────────────────────────────────────────────────

export const updateFeatureFlag = (flagName: string, value: boolean) =>
  update(ref(db, 'settings/feature_flags'), { [flagName]: value });

export const updateDesignSettings = (data: Record<string, any>) =>
  update(ref(db, 'settings/design'), data);

export const updateSiteSettings = (data: Record<string, any>) =>
  update(ref(db, 'settings'), data);

export const getSettings = async () => {
  const snap = await get(ref(db, 'settings'));
  return snap.val() || {};
};

// ── Güvenlik İşlemleri ───────────────────────────────────────────────────────

export const addIpBan = (ip: string) =>
  update(ref(db, `ip_bans/${ip.replace(/\./g, '_')}`), { ip, bannedAt: new Date().toISOString() });

export const removeIpBan = (ip: string) =>
  remove(ref(db, `ip_bans/${ip.replace(/\./g, '_')}`));

export const forceLogoutAll = () =>
  update(ref(db, 'settings'), { force_logout: new Date().toISOString() });

// ── Guild İşlemleri ──────────────────────────────────────────────────────────

export const deleteGuild = async (guildId: string, memberUids: string[]) => {
  await remove(ref(db, `guilds/${guildId}`));
  for (const uid of memberUids) {
    await remove(ref(db, `userGuilds/${uid}/${guildId}`));
  }
};

// ── Emoji İşlemleri ──────────────────────────────────────────────────────────

export const addCustomEmoji = (emojiId: string, data: { name: string; value: string; addedBy: string }) =>
  update(ref(db, `settings/custom_emojis/${emojiId}`), { ...data, addedAt: Date.now() });

export const removeCustomEmoji = (emojiId: string) =>
  remove(ref(db, `settings/custom_emojis/${emojiId}`));
