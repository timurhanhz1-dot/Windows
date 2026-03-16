import { db } from '../firebase';
import { ref, set, get, remove, onValue, off, update } from 'firebase/database';
import { UserProfile, FollowRelation, ProfileError, ProfileErrorCode } from '../types/profile';
import { getProfile } from './profileService';
import { awardEcoPoints } from './postService';

async function checkAndGrantVerifiedBadge(userId: string): Promise<void> {
  try {
    const userRef = ref(db, `users/${userId}`);
    const snap = await get(userRef);
    const data = snap.val();
    if (!data) return;
    const points = data.eco_points || 0;
    if (points >= 10000 && !data.is_verified) {
      await update(userRef, { is_verified: true });
    }
  } catch {}
}

// ─── FOLLOW SYSTEM ────────────────────────────────────────────────────────────

/**
 * Takip et
 * Requirements: 7.1
 */
export async function followUser(
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  try {
    if (currentUserId === targetUserId) {
      throw new ProfileError(
        'Kendinizi takip edemezsiniz',
        ProfileErrorCode.INVALID_INPUT
      );
    }

    const timestamp = Date.now();
    const followData: FollowRelation = { at: timestamp };

    // Add to followers/{targetUserId}/{currentUserId}
    const followerRef = ref(db, `followers/${targetUserId}/${currentUserId}`);
    await set(followerRef, followData);

    // Add to following/{currentUserId}/{targetUserId}
    const followingRef = ref(db, `following/${currentUserId}/${targetUserId}`);
    await set(followingRef, followData);

    // Takip eden kullanıcıya +5 Eco Points
    await awardEcoPoints(currentUserId, 5, 'follow_user');
    await checkAndGrantVerifiedBadge(currentUserId);
  } catch (err) {
    if (err instanceof ProfileError) {
      throw err;
    }
    throw new ProfileError(
      'Takip işlemi yapılamadı',
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}

/**
 * Takipten çık
 * Requirements: 7.2
 */
export async function unfollowUser(
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  try {
    // Remove from followers/{targetUserId}/{currentUserId}
    const followerRef = ref(db, `followers/${targetUserId}/${currentUserId}`);
    await remove(followerRef);

    // Remove from following/{currentUserId}/{targetUserId}
    const followingRef = ref(db, `following/${currentUserId}/${targetUserId}`);
    await remove(followingRef);
  } catch (err) {
    throw new ProfileError(
      'Takipten çıkma işlemi yapılamadı',
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}

/**
 * Takip durumunu kontrol et
 */
export async function isFollowing(
  currentUserId: string,
  targetUserId: string
): Promise<boolean> {
  try {
    const followingRef = ref(db, `following/${currentUserId}/${targetUserId}`);
    const snapshot = await get(followingRef);
    return snapshot.exists();
  } catch (err) {
    throw new ProfileError(
      'Takip durumu kontrol edilemedi',
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}

/**
 * Takipçi sayısını getir
 * Requirements: 7.3
 */
export async function getFollowerCount(userId: string): Promise<number> {
  try {
    const followersRef = ref(db, `followers/${userId}`);
    const snapshot = await get(followersRef);
    
    if (!snapshot.exists()) {
      return 0;
    }

    return Object.keys(snapshot.val()).length;
  } catch (err) {
    throw new ProfileError(
      'Takipçi sayısı alınamadı',
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}

/**
 * Takip edilen sayısını getir
 * Requirements: 7.4
 */
export async function getFollowingCount(userId: string): Promise<number> {
  try {
    const followingRef = ref(db, `following/${userId}`);
    const snapshot = await get(followingRef);
    
    if (!snapshot.exists()) {
      return 0;
    }

    return Object.keys(snapshot.val()).length;
  } catch (err) {
    throw new ProfileError(
      'Takip edilen sayısı alınamadı',
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}

/**
 * Takipçi listesini dinle
 * Requirements: 7.6
 */
export function listenFollowers(
  userId: string,
  callback: (followers: UserProfile[]) => void
): () => void {
  const followersRef = ref(db, `followers/${userId}`);

  const unsubscribe = onValue(followersRef, async (snapshot) => {
    const data = snapshot.val() || {};
    const followerIds = Object.keys(data);

    // Fetch user profiles for all followers
    const followers: UserProfile[] = [];
    for (const followerId of followerIds) {
      const profile = await getProfile(followerId);
      if (profile) {
        followers.push(profile);
      }
    }

    callback(followers);
  });

  return () => off(followersRef);
}

/**
 * Takip edilen listesini dinle
 * Requirements: 7.7
 */
export function listenFollowing(
  userId: string,
  callback: (following: UserProfile[]) => void
): () => void {
  const followingRef = ref(db, `following/${userId}`);

  const unsubscribe = onValue(followingRef, async (snapshot) => {
    const data = snapshot.val() || {};
    const followingIds = Object.keys(data);

    // Fetch user profiles for all following
    const following: UserProfile[] = [];
    for (const followingId of followingIds) {
      const profile = await getProfile(followingId);
      if (profile) {
        following.push(profile);
      }
    }

    callback(following);
  });

  return () => off(followingRef);
}

/**
 * Takipçi sayısını real-time dinle
 * Requirements: 7.3
 */
export function listenFollowerCount(
  userId: string,
  callback: (count: number) => void
): () => void {
  const followersRef = ref(db, `followers/${userId}`);

  const unsubscribe = onValue(followersRef, (snapshot) => {
    const data = snapshot.val() || {};
    const count = Object.keys(data).length;
    callback(count);
  });

  return () => off(followersRef);
}

/**
 * Takip edilen sayısını real-time dinle
 * Requirements: 7.4
 */
export function listenFollowingCount(
  userId: string,
  callback: (count: number) => void
): () => void {
  const followingRef = ref(db, `following/${userId}`);

  const unsubscribe = onValue(followingRef, (snapshot) => {
    const data = snapshot.val() || {};
    const count = Object.keys(data).length;
    callback(count);
  });

  return () => off(followingRef);
}
