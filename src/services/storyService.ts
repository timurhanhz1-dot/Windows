import { db } from '../firebase';
import { ref, push, set, get, remove, onValue, off, update } from 'firebase/database';
import { Story, ProfileError, ProfileErrorCode } from '../types/profile';
import { uploadMedia, awardEcoPoints } from './postService';

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

// ─── STORY SYSTEM ─────────────────────────────────────────────────────────────

/**
 * Story oluştur
 * Requirements: 8.1, 8.3, 8.4
 */
export async function createStory(
  userId: string,
  username: string,
  mediaFile: File,
  duration: number = 5
): Promise<string> {
  try {
    // Ownership check: only the authenticated user can create stories for themselves
    const { auth } = await import('../firebase');
    if (!auth.currentUser || auth.currentUser.uid !== userId) {
      throw new ProfileError(
        'Sadece kendi profilinize hikaye ekleyebilirsiniz',
        ProfileErrorCode.UNAUTHORIZED
      );
    }

    // Check user status
    const userRef = ref(db, `users/${userId}`);
    const userSnap = await get(userRef);
    const user = userSnap.val();

    if (!user) {
      throw new ProfileError(
        'Kullanıcı bulunamadı',
        ProfileErrorCode.USER_NOT_FOUND
      );
    }

    if (user.is_banned || user.banned) {
      throw new ProfileError(
        'Yasaklı kullanıcılar story paylaşamaz',
        ProfileErrorCode.USER_BANNED
      );
    }

    // Upload media
    const { url, thumbnail } = await uploadMedia(mediaFile, userId, 'story');

    // Determine media type
    const mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'photo';

    // Create story
    const storiesRef = ref(db, `stories/${userId}`);
    const storyRef = push(storiesRef);
    const storyId = storyRef.key!;

    const createdAt = Date.now();
    const expiresAt = createdAt + (24 * 60 * 60 * 1000); // 24 hours

    const storyData: any = {
      userId,
      username,
      avatar: user.avatar || user.photoURL || '',
      media: {
        url,
        type: mediaType,
        ...(thumbnail ? { thumbnail } : {}),
      },
      duration,
      createdAt,
      expiresAt,
    };

    await set(storyRef, storyData);

    // Story paylaşımı için +5 Eco Points
    await awardEcoPoints(userId, 5, 'story_created');
    await checkAndGrantVerifiedBadge(userId);

    return storyId;
  } catch (err: any) {
    if (err instanceof ProfileError) {
      throw err;
    }
    const msg = err?.message || err?.code || String(err);
    console.error('createStory raw error:', msg, err);
    throw new ProfileError(
      'Story oluşturulurken bir hata oluştu: ' + msg,
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}

/**
 * Kullanıcının story'lerini dinle
 * Requirements: 8.6
 */
export function listenUserStories(
  userId: string,
  callback: (stories: Story[]) => void
): () => void {
  const storiesRef = ref(db, `stories/${userId}`);

  const unsubscribe = onValue(storiesRef, (snapshot) => {
    const data = snapshot.val() || {};
    const stories: Story[] = [];
    const now = Date.now();

    Object.entries(data).forEach(([id, val]: [string, any]) => {
      // Only include non-expired stories
      if (val.expiresAt > now) {
        stories.push({
          id,
          userId: val.userId,
          username: val.username,
          avatar: val.avatar || '',
          media: val.media,
          duration: val.duration || 5,
          createdAt: val.createdAt,
          expiresAt: val.expiresAt,
          views: val.views || {},
          reactions: val.reactions || {},
        });
      }
    });

    // Sort by createdAt descending (newest first)
    stories.sort((a, b) => b.createdAt - a.createdAt);

    callback(stories);
  });

  return () => off(storiesRef);
}

/**
 * Takip edilen kullanıcıların story'lerini dinle
 */
export function listenFollowingStories(
  userId: string,
  callback: (stories: Story[]) => void
): () => void {
  // First, get the list of users being followed
  const followingRef = ref(db, `following/${userId}`);

  const unsubscribe = onValue(followingRef, async (snapshot) => {
    const followingData = snapshot.val() || {};
    const followingIds = Object.keys(followingData);

    // Include current user's own stories too
    const allUserIds = [userId, ...followingIds];

    const allStories: Story[] = [];
    const now = Date.now();

    // Fetch stories for current user + each followed user
    for (const followedUserId of allUserIds) {
      const storiesRef = ref(db, `stories/${followedUserId}`);
      const storiesSnap = await get(storiesRef);
      const storiesData = storiesSnap.val() || {};

      Object.entries(storiesData).forEach(([id, val]: [string, any]) => {
        // Only include non-expired stories
        if (val.expiresAt > now) {
          allStories.push({
            id,
            userId: val.userId,
            username: val.username,
            avatar: val.avatar || '',
            media: val.media,
            duration: val.duration || 5,
            createdAt: val.createdAt,
            expiresAt: val.expiresAt,
            views: val.views || {},
            reactions: val.reactions || {},
          });
        }
      });
    }

    // Sort by createdAt descending (newest first)
    allStories.sort((a, b) => b.createdAt - a.createdAt);

    callback(allStories);
  });

  return () => off(followingRef);
}

/**
 * Story görüntüle (view count artır)
 * Requirements: 8.6
 */
export async function viewStory(
  storyId: string,
  userId: string,
  ownerId: string
): Promise<void> {
  try {
    const viewRef = ref(db, `stories/${ownerId}/${storyId}/views/${userId}`);
    await set(viewRef, Date.now());
  } catch (err) {
    // Silent fail - view count is not critical
    console.error('Story view tracking failed:', err);
  }
}

/**
 * Story'ye reaction ekle
 * Requirements: 8.8
 */
export async function addStoryReaction(
  storyId: string,
  userId: string,
  ownerId: string,
  emoji: string
): Promise<void> {
  try {
    const reactionRef = ref(db, `stories/${ownerId}/${storyId}/reactions/${userId}`);
    await set(reactionRef, emoji);
  } catch (err) {
    throw new ProfileError(
      'Reaction eklenemedi',
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}

/**
 * Süresi dolan story'leri temizle (sadece giriş yapmış kullanıcının kendi hikayeleri)
 * Requirements: 8.5
 */
export async function cleanupExpiredStories(currentUserId?: string): Promise<void> {
  try {
    const now = Date.now();

    // Sadece mevcut kullanıcının hikayelerini temizle (permission kısıtlaması nedeniyle)
    const userIds = currentUserId ? [currentUserId] : [];
    if (userIds.length === 0) return;

    for (const userId of userIds) {
      const storiesRef = ref(db, `stories/${userId}`);
      const storiesSnap = await get(storiesRef);

      if (!storiesSnap.exists()) continue;

      const stories = storiesSnap.val();

      for (const [storyId, storyData] of Object.entries(stories) as [string, any][]) {
        if (storyData.expiresAt <= now) {
          // Storage'dan medyayı sil
          if (storyData.media?.url) {
            try {
              const { storage } = await import('../firebase');
              const { ref: storageRef, deleteObject } = await import('firebase/storage');
              const mediaUrl = storyData.media.url;
              const urlParts = mediaUrl.split('/o/');
              if (urlParts.length > 1) {
                const storagePath = decodeURIComponent(urlParts[1].split('?')[0]);
                await deleteObject(storageRef(storage, storagePath)).catch(() => {});
                if (storyData.media.thumbnail) {
                  const thumbParts = storyData.media.thumbnail.split('/o/');
                  if (thumbParts.length > 1) {
                    const thumbPath = decodeURIComponent(thumbParts[1].split('?')[0]);
                    await deleteObject(storageRef(storage, thumbPath)).catch(() => {});
                  }
                }
              }
            } catch {}
          }
          await remove(ref(db, `stories/${userId}/${storyId}`));
        }
      }
    }
  } catch (err) {
    console.error('Story cleanup failed:', err);
  }
}

/**
 * Aktif story'si olan kullanıcıları getir
 * Requirements: 8.9
 */
export async function getUsersWithActiveStories(
  userIds: string[]
): Promise<string[]> {
  try {
    const now = Date.now();
    const usersWithStories: string[] = [];

    for (const userId of userIds) {
      const storiesRef = ref(db, `stories/${userId}`);
      const snapshot = await get(storiesRef);

      if (!snapshot.exists()) {
        continue;
      }

      const stories = snapshot.val();
      
      // Check if user has any non-expired stories
      const hasActiveStory = Object.values(stories).some(
        (story: any) => story.expiresAt > now
      );

      if (hasActiveStory) {
        usersWithStories.push(userId);
      }
    }

    return usersWithStories;
  } catch (err) {
    throw new ProfileError(
      'Aktif story\'ler alınamadı',
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}
