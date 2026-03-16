import { db } from '../firebase';
import { ref, set, remove, get, onValue, off } from 'firebase/database';

export async function blockUser(myUid: string, targetUid: string): Promise<void> {
  await set(ref(db, `blocked_users/${myUid}/${targetUid}`), true);
}

export async function unblockUser(myUid: string, targetUid: string): Promise<void> {
  await remove(ref(db, `blocked_users/${myUid}/${targetUid}`));
}

export async function isBlocked(myUid: string, targetUid: string): Promise<boolean> {
  const snap = await get(ref(db, `blocked_users/${myUid}/${targetUid}`));
  return snap.exists();
}

export async function isBlockedBy(myUid: string, targetUid: string): Promise<boolean> {
  const snap = await get(ref(db, `blocked_users/${targetUid}/${myUid}`));
  return snap.exists();
}

export function listenBlockedUsers(myUid: string, cb: (ids: string[]) => void): () => void {
  const r = ref(db, `blocked_users/${myUid}`);
  onValue(r, snap => {
    const d = snap.val() || {};
    cb(Object.keys(d).filter(k => d[k] === true));
  });
  return () => off(r);
}
