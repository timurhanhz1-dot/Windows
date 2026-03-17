import { db } from '../firebase/index';
import { ref, push, set, get, onValue, off, update, serverTimestamp } from 'firebase/database';

export interface GroupDM {
  id: string;
  name: string;
  members: string[]; // uid listesi
  createdBy: string;
  createdAt: number;
  lastMessage?: string;
  lastMessageAt?: number;
}

export interface GroupDMMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  timestamp: string;
  type: 'text' | 'file' | 'sticker';
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  reactions?: Record<string, string>;
}

/** Grup DM oluştur */
export async function createGroupDM(
  name: string,
  memberIds: string[],
  createdBy: string
): Promise<string> {
  const groupRef = push(ref(db, 'group_dm_meta'));
  const groupId = groupRef.key!;
  const membersMap: Record<string, boolean> = {};
  memberIds.forEach(id => { membersMap[id] = true; });

  await set(groupRef, {
    name,
    members: membersMap,
    createdBy,
    createdAt: Date.now(),
  });

  // Her üyenin grup listesine ekle
  const updates: Record<string, any> = {};
  memberIds.forEach(id => {
    updates[`user_group_dms/${id}/${groupId}`] = true;
  });
  await update(ref(db, '/'), updates);

  return groupId;
}

/** Kullanıcının grup DM'lerini dinle */
export function listenUserGroupDMs(
  userId: string,
  callback: (groups: GroupDM[]) => void
): () => void {
  const userGroupsRef = ref(db, `user_group_dms/${userId}`);

  const unsub = onValue(userGroupsRef, async (snap) => {
    const groupIds = Object.keys(snap.val() || {});
    const groups: GroupDM[] = [];

    for (const groupId of groupIds) {
      const metaSnap = await get(ref(db, `group_dm_meta/${groupId}`));
      if (metaSnap.exists()) {
        const data = metaSnap.val();
        groups.push({
          id: groupId,
          name: data.name,
          members: Object.keys(data.members || {}),
          createdBy: data.createdBy,
          createdAt: data.createdAt,
          lastMessage: data.lastMessage,
          lastMessageAt: data.lastMessageAt,
        });
      }
    }

    groups.sort((a, b) => (b.lastMessageAt || b.createdAt) - (a.lastMessageAt || a.createdAt));
    callback(groups);
  });

  return () => off(userGroupsRef);
}

/** Grup mesajlarını dinle */
export function listenGroupMessages(
  groupId: string,
  callback: (messages: GroupDMMessage[]) => void
): () => void {
  const msgsRef = ref(db, `group_dm/${groupId}`);

  const unsub = onValue(msgsRef, (snap) => {
    const data = snap.val() || {};
    const msgs: GroupDMMessage[] = Object.entries(data)
      .map(([id, val]: [string, any]) => ({ id, ...val }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    callback(msgs);
  });

  return () => off(msgsRef);
}

/** Grup mesajı gönder */
export async function sendGroupMessage(
  groupId: string,
  senderId: string,
  senderName: string,
  content: string,
  type: 'text' | 'sticker' = 'text'
): Promise<void> {
  const msgRef = push(ref(db, `group_dm/${groupId}`));
  await set(msgRef, {
    sender_id: senderId,
    sender_name: senderName,
    content,
    timestamp: new Date().toISOString(),
    type,
    reactions: {},
  });

  // Son mesajı güncelle
  await update(ref(db, `group_dm_meta/${groupId}`), {
    lastMessage: type === 'sticker' ? '🎭 Sticker' : (content.length > 50 ? content.slice(0, 50) + '...' : content),
    lastMessageAt: Date.now(),
  });
}

/** Gruba üye ekle */
export async function addMemberToGroup(groupId: string, userId: string): Promise<void> {
  await update(ref(db, `group_dm_meta/${groupId}/members`), { [userId]: true });
  await update(ref(db, `user_group_dms/${userId}`), { [groupId]: true });
}

/** Gruptan ayrıl */
export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  await update(ref(db, `group_dm_meta/${groupId}/members`), { [userId]: null });
  await update(ref(db, `user_group_dms/${userId}`), { [groupId]: null });
}
