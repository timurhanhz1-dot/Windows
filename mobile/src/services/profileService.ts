import { db, storage } from '../firebase/index';
import { ref, get, update, set, remove, query, orderByChild, equalTo, push } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { UserProfile, ProfileStats, ProfileError, ProfileErrorCode } from '../types/profile';

// ─── PROFILE MANAGEMENT ───────────────────────────────────────────────────────

/**
 * Profil bilgilerini getir
 * Requirements: 1.1, 2.1
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  try {
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.val();
    return {
      id: userId,
      username: data.username || 'Kullanıcı',
      displayName: data.displayName || data.username || 'Kullanıcı',
      email: data.email,
      avatar: data.avatar || data.photoURL || '',
      cover_photo: data.cover_photo || '',
      bio: data.bio || '',
      location: data.location || '',
      status_message: data.status_message || '',
      social_links: data.social_links || {},
      xp: data.xp || 0,
      eco_points: data.eco_points || 0,
      message_count: data.message_count || 0,
      is_admin: data.is_admin || data.isAdmin || false,
      is_verified: data.is_verified === true,
      is_banned: data.is_banned || data.banned || false,
      badges: data.badges || [],
      createdAt: data.createdAt || new Date().toISOString(),
      last_seen: data.last_seen || new Date().toISOString(),
      status: data.status || 'offline',
    };
  } catch (err) {
    throw new ProfileError(
      'Profil bilgileri alınamadı',
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}

/**
 * Kullanıcı adını değiştir (benzersizlik kontrolü ile)
 */
export async function updateUsername(userId: string, newUsername: string, oldUsername: string): Promise<void> {
  const trimmed = newUsername.trim().toLowerCase();

  if (trimmed.length < 3 || trimmed.length > 20) {
    throw new ProfileError('Kullanıcı adı 3-20 karakter arasında olmalı', ProfileErrorCode.CONTENT_TOO_LONG, {});
  }
  if (!/^[a-z0-9_]+$/.test(trimmed)) {
    throw new ProfileError('Sadece harf, rakam ve alt çizgi kullanılabilir', ProfileErrorCode.CONTENT_TOO_LONG, {});
  }

  // 6 aylık değişim kilidi kontrolü
  const userSnap = await get(ref(db, `users/${userId}/username_changed_at`));
  if (userSnap.exists()) {
    const lastChanged = userSnap.val();
    const sixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000;
    const diff = Date.now() - lastChanged;
    if (diff < sixMonthsMs) {
      const remaining = Math.ceil((sixMonthsMs - diff) / (30 * 24 * 60 * 60 * 1000));
      throw new ProfileError(
        `Kullanıcı adını değiştirmek için ${remaining} ay daha beklemelisin`,
        ProfileErrorCode.CONTENT_TOO_LONG, {}
      );
    }
  }

  // Benzersizlik kontrolü
  const snap = await get(ref(db, `usernames/${trimmed}`));
  if (snap.exists() && snap.val() !== userId) {
    throw new ProfileError('Bu kullanıcı adı zaten alınmış', ProfileErrorCode.CONTENT_TOO_LONG, {});
  }

  // Eski username'i sil, yenisini yaz
  await remove(ref(db, `usernames/${oldUsername.toLowerCase()}`));
  await set(ref(db, `usernames/${trimmed}`), userId);
  await update(ref(db, `users/${userId}`), {
    username: trimmed,
    username_changed_at: Date.now(),
  });
  await update(ref(db, `user_index/${userId}`), { username: trimmed });
}

/**
 * Profil bilgilerini güncelle
 * Requirements: 2.2, 2.8
 */
export async function updateProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<void> {
  try {
    // Validation
    if (updates.bio && updates.bio.length > 300) {
      throw new ProfileError(
        'Bio maksimum 300 karakter olabilir',
        ProfileErrorCode.CONTENT_TOO_LONG,
        { maxLength: 300, actualLength: updates.bio.length }
      );
    }

    if (updates.status_message && updates.status_message.length > 100) {
      throw new ProfileError(
        'Durum mesajı maksimum 100 karakter olabilir',
        ProfileErrorCode.CONTENT_TOO_LONG,
        { maxLength: 100, actualLength: updates.status_message.length }
      );
    }

    // Prepare update data
    const updateData: any = {};
    
    if (updates.bio !== undefined) updateData.bio = updates.bio;
    if (updates.location !== undefined) updateData.location = updates.location;
    if (updates.status_message !== undefined) updateData.status_message = updates.status_message;
    if (updates.social_links !== undefined) updateData.social_links = updates.social_links;
    if (updates.displayName !== undefined) updateData.displayName = updates.displayName;
    if (updates.avatar !== undefined) updateData.avatar = updates.avatar;
    if (updates.cover_photo !== undefined) updateData.cover_photo = updates.cover_photo;

    // Update in database
    const userRef = ref(db, `users/${userId}`);
    await update(userRef, updateData);
  } catch (err) {
    if (err instanceof ProfileError) {
      throw err;
    }
    throw new ProfileError(
      'Profil güncellenemedi',
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}

/**
 * Profil fotoğrafı yükle
 * Requirements: 2.4, 2.6, 2.7
 */
export async function uploadProfilePhoto(
  userId: string,
  file: File
): Promise<string> {
  try {
    // Validation
    if (file.size > 5 * 1024 * 1024) {
      throw new ProfileError(
        'Dosya boyutu 5MB\'dan büyük olamaz',
        ProfileErrorCode.FILE_TOO_LARGE,
        { maxSize: 5 * 1024 * 1024, actualSize: file.size }
      );
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      throw new ProfileError(
        'Sadece JPG, PNG, WebP ve GIF formatları desteklenir',
        ProfileErrorCode.INVALID_FILE_TYPE,
        { allowedTypes: validTypes, actualType: file.type }
      );
    }

    // Upload to Firebase Storage
    const path = `avatars/${userId}/profile.jpg`;
    const sRef = storageRef(storage, path);
    await uploadBytes(sRef, file);
    const url = await getDownloadURL(sRef);

    // Update user profile
    await updateProfile(userId, { avatar: url });

    return url;
  } catch (err) {
    if (err instanceof ProfileError) {
      throw err;
    }
    throw new ProfileError(
      'Profil fotoğrafı yüklenemedi',
      ProfileErrorCode.UPLOAD_FAILED,
      { originalError: err }
    );
  }
}

/**
 * Kapak fotoğrafı yükle
 * Requirements: 2.5, 2.6, 2.7
 */
export async function uploadCoverPhoto(
  userId: string,
  file: File
): Promise<string> {
  try {
    // Validation
    if (file.size > 5 * 1024 * 1024) {
      throw new ProfileError(
        'Dosya boyutu 5MB\'dan büyük olamaz',
        ProfileErrorCode.FILE_TOO_LARGE,
        { maxSize: 5 * 1024 * 1024, actualSize: file.size }
      );
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      throw new ProfileError(
        'Sadece JPG, PNG, WebP ve GIF formatları desteklenir',
        ProfileErrorCode.INVALID_FILE_TYPE,
        { allowedTypes: validTypes, actualType: file.type }
      );
    }

    // Upload to Firebase Storage
    const path = `covers/${userId}/cover.jpg`;
    const sRef = storageRef(storage, path);
    await uploadBytes(sRef, file);
    const url = await getDownloadURL(sRef);

    // Update user profile
    await updateProfile(userId, { cover_photo: url });

    return url;
  } catch (err) {
    if (err instanceof ProfileError) {
      throw err;
    }
    throw new ProfileError(
      'Kapak fotoğrafı yüklenemedi',
      ProfileErrorCode.UPLOAD_FAILED,
      { originalError: err }
    );
  }
}

/**
 * Profil istatistiklerini hesapla
 * Requirements: 10.1, 10.2, 10.3, 10.4
 */
export async function calculateProfileStats(userId: string): Promise<ProfileStats> {
  try {
    // Get user data
    const userRef = ref(db, `users/${userId}`);
    const userSnap = await get(userRef);
    const userData = userSnap.val() || {};

    // Get post count
    const postsRef = ref(db, 'nature_posts');
    const postsQuery = query(postsRef, orderByChild('userId'), equalTo(userId));
    const postsSnap = await get(postsQuery);
    const posts = postsSnap.val() || {};
    const postCount = Object.keys(posts).length;

    // Calculate total likes
    let totalLikes = 0;
    Object.values(posts).forEach((post: any) => {
      if (post.likes) {
        totalLikes += Object.keys(post.likes).length;
      }
    });

    // Get follower count
    const followersRef = ref(db, `followers/${userId}`);
    const followersSnap = await get(followersRef);
    const followers = followersSnap.val() || {};
    const followerCount = Object.keys(followers).length;

    // Get following count
    const followingRef = ref(db, `following/${userId}`);
    const followingSnap = await get(followingRef);
    const following = followingSnap.val() || {};
    const followingCount = Object.keys(following).length;

    // Calculate level
    const ecoPoints = userData.eco_points || 0;
    const level = Math.floor(ecoPoints / 100) + 1;

    return {
      postCount,
      followerCount,
      followingCount,
      totalLikes,
      level,
      xp: userData.xp || 0,
    };
  } catch (err) {
    throw new ProfileError(
      'İstatistikler hesaplanamadı',
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}

/**
 * Kullanıcı arama
 * Requirements: 15.1, 15.2
 */
export async function searchUsers(
  query: string,
  limit: number = 20
): Promise<UserProfile[]> {
  try {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const users: UserProfile[] = [];
    const lowerQuery = query.toLowerCase();

    snapshot.forEach((child) => {
      const data = child.val();
      const username = (data.username || '').toLowerCase();
      const displayName = (data.displayName || '').toLowerCase();

      if (username.includes(lowerQuery) || displayName.includes(lowerQuery)) {
        users.push({
          id: child.key!,
          username: data.username || 'Kullanıcı',
          displayName: data.displayName || data.username || 'Kullanıcı',
          email: data.email,
          avatar: data.avatar || data.photoURL || '',
          cover_photo: data.cover_photo || '',
          bio: data.bio || '',
          location: data.location || '',
          status_message: data.status_message || '',
          social_links: data.social_links || {},
          xp: data.xp || 0,
          eco_points: data.eco_points || 0,
          message_count: data.message_count || 0,
          is_admin: data.is_admin || data.isAdmin || false,
          is_verified: data.is_verified === true,
          is_banned: data.is_banned || data.banned || false,
          badges: data.badges || [],
          createdAt: data.createdAt || new Date().toISOString(),
          last_seen: data.last_seen || new Date().toISOString(),
          status: data.status || 'offline',
        });
      }
    });

    return users.slice(0, limit);
  } catch (err) {
    throw new ProfileError(
      'Kullanıcı araması yapılamadı',
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}

/**
 * Popüler kullanıcıları getir
 * Requirements: 15.4, 15.5
 */
export async function getPopularUsers(limit: number = 10): Promise<UserProfile[]> {
  try {
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      return [];
    }

    const users: UserProfile[] = Object.entries(snapshot.val()).map(([userId, data]: [string, any]) => ({
      id: userId,
      username: data.username || 'Kullanıcı',
      displayName: data.displayName || data.username || 'Kullanıcı',
      email: data.email,
      avatar: data.avatar || data.photoURL || '',
      cover_photo: data.cover_photo || '',
      bio: data.bio || '',
      location: data.location || '',
      status_message: data.status_message || '',
      social_links: data.social_links || {},
      xp: data.xp || 0,
      eco_points: data.eco_points || 0,
      message_count: data.message_count || 0,
      is_admin: data.is_admin || data.isAdmin || false,
      is_verified: data.is_verified === true,
      is_banned: data.is_banned || data.banned || false,
      badges: data.badges || [],
      createdAt: data.createdAt || new Date().toISOString(),
      last_seen: data.last_seen || new Date().toISOString(),
      status: data.status || 'offline',
    }));

    // Sort by eco_points descending — tek istekle, N+1 yok
    users.sort((a, b) => (b.eco_points || 0) - (a.eco_points || 0));

    return users.slice(0, limit);
  } catch (err) {
    throw new ProfileError(
      'Popüler kullanıcılar getirilemedi',
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}

/**
 * Profil ziyaretini kaydet ve bildirim gönder
 * Günde bir kez aynı ziyaretçiden bildirim gönderilir
 */
export async function recordProfileVisit(visitorId: string, profileOwnerId: string): Promise<void> {
  if (visitorId === profileOwnerId) return;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const visitKey = `profile_visits/${profileOwnerId}/${today}/${visitorId}`;
    const visitRef = ref(db, visitKey);
    const snap = await get(visitRef);
    if (snap.exists()) return; // bugün zaten ziyaret edildi

    await set(visitRef, Date.now());

    // Bildirim ekle
    const notifRef = push(ref(db, `notifications/${profileOwnerId}`));
    await set(notifRef, {
      type: 'profile_visit',
      fromUserId: visitorId,
      timestamp: Date.now(),
      read: false,
    });
  } catch (err) {
    console.error('recordProfileVisit error:', err);
  }
}
