import { db, storage } from '../firebase';
import { ref, push, set, get, update, remove, onValue, off, query, orderByChild, equalTo } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Post, PostType, Comment, ProfileError, ProfileErrorCode } from '../types/profile';

// ─── POST MANAGEMENT ──────────────────────────────────────────────────────────

/**
 * Post oluştur
 * Requirements: 3.1, 3.5, 3.6, 3.7, 3.8
 */
export async function createPost(
  userId: string,
  username: string,
  content: string,
  type: PostType,
  options?: {
    mediaFile?: File;
    mood?: string;
    tags?: string[];
    location?: string;
    avatar?: string;
  }
): Promise<string> {
  try {
    // Validation
    if (!content || content.trim().length === 0) {
      throw new ProfileError(
        'İçerik boş olamaz',
        ProfileErrorCode.INVALID_INPUT
      );
    }

    if (content.length > 500) {
      throw new ProfileError(
        'İçerik maksimum 500 karakter olabilir',
        ProfileErrorCode.CONTENT_TOO_LONG,
        { maxLength: 500, actualLength: content.length }
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
        'Yasaklı kullanıcılar içerik paylaşamaz',
        ProfileErrorCode.USER_BANNED
      );
    }

    // Upload media if exists
    let mediaData = null;
    if (options?.mediaFile) {
      const { url, thumbnail } = await uploadMedia(options.mediaFile, userId, 'post');
      mediaData = {
        url,
        type: options.mediaFile.type,
        ...(thumbnail && { thumbnail }) // Only add thumbnail if it exists
      };
    }

    // Create post
    const postsRef = ref(db, 'nature_posts');
    const postRef = push(postsRef);
    const postId = postRef.key!;

    const postData: any = {
      userId,
      username,
      avatar: options?.avatar || user.avatar || user.photoURL || '',
      content: content.trim(),
      type,
      media: mediaData,
      likes: {},
      comments: {},
      shares: 0,
      views: 0,
      timestamp: Date.now(),
      mood: options?.mood || '🌿',
      tags: options?.tags || [],
      location: options?.location || '',
    };

    await set(postRef, postData);

    // Add to user_posts_index
    const indexRef = ref(db, `user_posts_index/${userId}/${postId}`);
    await set(indexRef, true);

    // Award eco points
    await awardEcoPoints(userId, 10, 'post_created');

    return postId;
  } catch (err: any) {
    console.error('createPost error details:', {
      error: err,
      message: err?.message,
      code: err?.code,
      stack: err?.stack
    });
    
    if (err instanceof ProfileError) {
      throw err;
    }
    
    // Provide more specific error message
    const errorMessage = err?.message || err?.code || 'Bilinmeyen hata';
    throw new ProfileError(
      `Post oluşturulurken bir hata oluştu: ${errorMessage}`,
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}

/**
 * Kullanıcının post'larını dinle
 * Requirements: 4.1, 4.2
 */
export function listenUserPosts(
  userId: string,
  callback: (posts: Post[]) => void,
  limit?: number
): () => void {
  const postsRef = ref(db, 'nature_posts');
  const postsQuery = query(postsRef, orderByChild('userId'), equalTo(userId));

  const unsubscribe = onValue(postsQuery, (snapshot) => {
    const data = snapshot.val() || {};
    const posts: Post[] = [];

    Object.entries(data).forEach(([id, val]: [string, any]) => {
      posts.push({
        id,
        userId: val.userId,
        username: val.username,
        avatar: val.avatar || '',
        content: val.content,
        type: val.type,
        media: val.media,
        likes: val.likes || {},
        comments: val.comments || {},
        shares: val.shares || 0,
        views: val.views || 0,
        timestamp: val.timestamp,
        tags: val.tags || [],
        mood: val.mood || '🌿',
        location: val.location || '',
      });
    });

    // Sort by timestamp descending (newest first)
    posts.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit if specified
    const limitedPosts = limit ? posts.slice(0, limit) : posts;
    callback(limitedPosts);
  });

  return () => off(postsQuery);
}

/**
 * Post detayını getir
 * Requirements: 4.3
 */
export async function getPost(postId: string): Promise<Post | null> {
  try {
    const postRef = ref(db, `nature_posts/${postId}`);
    const snapshot = await get(postRef);

    if (!snapshot.exists()) {
      return null;
    }

    const val = snapshot.val();
    return {
      id: postId,
      userId: val.userId,
      username: val.username,
      avatar: val.avatar || '',
      content: val.content,
      type: val.type,
      media: val.media,
      likes: val.likes || {},
      comments: val.comments || {},
      shares: val.shares || 0,
      views: val.views || 0,
      timestamp: val.timestamp,
      tags: val.tags || [],
      mood: val.mood || '🌿',
      location: val.location || '',
    };
  } catch (err) {
    throw new ProfileError(
      'Post getirilemedi',
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}

/**
 * Post sil
 * Requirements: 13.2, 13.3
 */
export async function deletePost(postId: string, userId: string): Promise<void> {
  try {
    // Get post to check ownership
    const post = await getPost(postId);
    
    if (!post) {
      throw new ProfileError(
        'Post bulunamadı',
        ProfileErrorCode.POST_NOT_FOUND
      );
    }

    // Check authorization
    const userRef = ref(db, `users/${userId}`);
    const userSnap = await get(userRef);
    const user = userSnap.val();
    const isAdmin = user?.is_admin || user?.isAdmin || false;

    if (post.userId !== userId && !isAdmin) {
      throw new ProfileError(
        'Bu post\'u silme yetkiniz yok',
        ProfileErrorCode.FORBIDDEN
      );
    }

    // Delete post
    const postRef = ref(db, `nature_posts/${postId}`);
    await remove(postRef);

    // Remove from user_posts_index
    const indexRef = ref(db, `user_posts_index/${post.userId}/${postId}`);
    await remove(indexRef);
  } catch (err) {
    if (err instanceof ProfileError) {
      throw err;
    }
    throw new ProfileError(
      'Post silinemedi',
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}

/**
 * Post beğen/beğeniyi kaldır
 * Requirements: 5.1, 5.2, 5.4
 */
export async function toggleLike(
  postId: string,
  userId: string
): Promise<boolean> {
  try {
    const likeRef = ref(db, `nature_posts/${postId}/likes/${userId}`);
    const snapshot = await get(likeRef);

    const isLiked = snapshot.exists();

    if (isLiked) {
      // Remove like
      await remove(likeRef);
      return false;
    } else {
      // Add like
      await set(likeRef, true);
      
      // Award eco points
      await awardEcoPoints(userId, 1, 'post_liked');
      
      return true;
    }
  } catch (err) {
    throw new ProfileError(
      'Beğeni işlemi yapılamadı',
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}

/**
 * Yorum ekle
 * Requirements: 6.3, 6.5, 6.7
 */
export async function addComment(
  postId: string,
  userId: string,
  username: string,
  content: string
): Promise<string> {
  try {
    // Validation
    if (!content || content.trim().length === 0) {
      throw new ProfileError(
        'Yorum boş olamaz',
        ProfileErrorCode.INVALID_INPUT
      );
    }

    if (content.length > 500) {
      throw new ProfileError(
        'Yorum maksimum 500 karakter olabilir',
        ProfileErrorCode.CONTENT_TOO_LONG,
        { maxLength: 500, actualLength: content.length }
      );
    }

    // Check user status
    const userRef = ref(db, `users/${userId}`);
    const userSnap = await get(userRef);
    const user = userSnap.val();

    if (user?.is_banned || user?.banned) {
      throw new ProfileError(
        'Yasaklı kullanıcılar yorum yapamaz',
        ProfileErrorCode.USER_BANNED
      );
    }

    // Add comment
    const commentsRef = ref(db, `nature_posts/${postId}/comments`);
    const commentRef = push(commentsRef);
    const commentId = commentRef.key!;

    await set(commentRef, {
      userId,
      username,
      avatar: user?.avatar || user?.photoURL || '',
      content: content.trim(),
      timestamp: Date.now(),
      likes: {},
    });

    // Award eco points
    await awardEcoPoints(userId, 2, 'comment_added');

    return commentId;
  } catch (err) {
    if (err instanceof ProfileError) {
      throw err;
    }
    throw new ProfileError(
      'Yorum eklenemedi',
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}

/**
 * Beğenileri real-time dinle
 * Requirements: 5.3, 5.6
 */
export function listenLikes(
  postId: string,
  callback: (likes: { [userId: string]: boolean }) => void
): () => void {
  const likesRef = ref(db, `nature_posts/${postId}/likes`);

  const unsubscribe = onValue(likesRef, (snapshot) => {
    callback(snapshot.val() || {});
  });

  return () => off(likesRef);
}

/**
 * Yorumları dinle
 * Requirements: 6.2, 6.4
 */
export function listenComments(
  postId: string,
  callback: (comments: Comment[]) => void
): () => void {
  const commentsRef = ref(db, `nature_posts/${postId}/comments`);

  const unsubscribe = onValue(commentsRef, (snapshot) => {
    const data = snapshot.val() || {};
    const comments: Comment[] = [];

    Object.entries(data).forEach(([id, val]: [string, any]) => {
      comments.push({
        id,
        userId: val.userId,
        username: val.username,
        avatar: val.avatar || '',
        content: val.content,
        timestamp: val.timestamp,
        likes: val.likes || {},
      });
    });

    // Sort by timestamp ascending (oldest first)
    comments.sort((a, b) => a.timestamp - b.timestamp);

    callback(comments);
  });

  return () => off(commentsRef);
}

/**
 * Medya dosyası yükle
 * Requirements: 3.4
 */
export async function uploadMedia(
  file: File,
  userId: string,
  type: 'post' | 'story'
): Promise<{ url: string; thumbnail?: string }> {
  try {
    // Validation
    if (file.size > 10 * 1024 * 1024) {
      throw new ProfileError(
        'Dosya boyutu 10MB\'dan büyük olamaz',
        ProfileErrorCode.FILE_TOO_LARGE,
        { maxSize: 10 * 1024 * 1024, actualSize: file.size }
      );
    }

    const validTypes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm'
    ];
    if (!validTypes.includes(file.type)) {
      throw new ProfileError(
        'Geçersiz dosya formatı',
        ProfileErrorCode.INVALID_FILE_TYPE,
        { allowedTypes: validTypes, actualType: file.type }
      );
    }

    // Upload original file
    const timestamp = Date.now();
    const path = `${type}s/${userId}/${timestamp}_${file.name}`;
    const sRef = storageRef(storage, path);
    await uploadBytes(sRef, file);
    const url = await getDownloadURL(sRef);

    // For now, return without thumbnail (can be added later with image processing)
    return { url };
  } catch (err: any) {
    console.error('uploadMedia error details:', {
      error: err,
      message: err?.message,
      code: err?.code,
      stack: err?.stack,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    
    if (err instanceof ProfileError) {
      throw err;
    }
    
    // Provide more specific error message
    const errorMessage = err?.message || err?.code || 'Bilinmeyen hata';
    throw new ProfileError(
      `Medya yüklenemedi: ${errorMessage}`,
      ProfileErrorCode.UPLOAD_FAILED,
      { originalError: err }
    );
  }
}

/**
 * Post görüntüleme sayısını artır
 */
export async function incrementViews(postId: string): Promise<void> {
  try {
    const viewsRef = ref(db, `nature_posts/${postId}/views`);
    const snapshot = await get(viewsRef);
    const currentViews = snapshot.val() || 0;
    await set(viewsRef, currentViews + 1);
  } catch (err) {
    // Silent fail - view count is not critical
    console.error('View count increment failed:', err);
  }
}

/**
 * Eco points kazandır — günlük limit korumalı
 * Requirements: 3.7, 5.4, 6.7
 */

const ECO_DAILY_LIMITS: Record<string, number> = {
  follow_user:     20,
  story_created:    5,
  watch_stream:    10,
  join_voice_room: 10,
  post_created:    10,
  post_liked:      50,
  comment_added:   20,
};

export async function awardEcoPoints(
  userId: string,
  points: number,
  reason: string
): Promise<void> {
  try {
    const today = new Date().toISOString().slice(0, 10); // "2026-03-14"
    const limitKey = `eco_limits/${userId}/${today}/${reason}`;
    const limitRef = ref(db, limitKey);

    // Günlük limit kontrolü
    const dailyLimit = ECO_DAILY_LIMITS[reason];
    if (dailyLimit !== undefined) {
      const limitSnap = await get(limitRef);
      const count = limitSnap.val() || 0;
      if (count >= dailyLimit) return; // limit doldu, puan verme
      await update(ref(db, `eco_limits/${userId}/${today}`), { [reason]: count + 1 });
    }

    const userRef = ref(db, `users/${userId}`);
    const snapshot = await get(userRef);
    const user = snapshot.val() || {};
    const currentPoints = user.eco_points || 0;

    await update(userRef, { eco_points: currentPoints + points });

    // 10.000 puan kontrolü — otomatik doğrulanmış rozet
    if (currentPoints < 10000 && currentPoints + points >= 10000) {
      await update(userRef, { is_verified: true });
    }
  } catch (err) {
    // Silent fail - eco points are not critical
    console.error('Eco points award failed:', err);
  }
}

/**
 * Yorum sil (sadece yorum sahibi veya admin)
 */
export async function deleteComment(
  postId: string,
  commentId: string,
  userId: string
): Promise<void> {
  const commentRef = ref(db, `nature_posts/${postId}/comments/${commentId}`);
  const snap = await get(commentRef);
  if (!snap.exists()) throw new ProfileError('Yorum bulunamadı', ProfileErrorCode.POST_NOT_FOUND);
  const comment = snap.val();

  const userSnap = await get(ref(db, `users/${userId}`));
  const isAdmin = userSnap.val()?.is_admin || userSnap.val()?.isAdmin || false;

  if (comment.userId !== userId && !isAdmin) {
    throw new ProfileError('Bu yorumu silme yetkiniz yok', ProfileErrorCode.FORBIDDEN);
  }
  await remove(commentRef);
}

/**
 * Yorum düzenle (sadece yorum sahibi)
 */
export async function editComment(
  postId: string,
  commentId: string,
  userId: string,
  newContent: string
): Promise<void> {
  if (!newContent.trim()) throw new ProfileError('Yorum boş olamaz', ProfileErrorCode.INVALID_INPUT);
  if (newContent.length > 500) throw new ProfileError('Maksimum 500 karakter', ProfileErrorCode.CONTENT_TOO_LONG);

  const commentRef = ref(db, `nature_posts/${postId}/comments/${commentId}`);
  const snap = await get(commentRef);
  if (!snap.exists()) throw new ProfileError('Yorum bulunamadı', ProfileErrorCode.POST_NOT_FOUND);
  if (snap.val().userId !== userId) throw new ProfileError('Bu yorumu düzenleme yetkiniz yok', ProfileErrorCode.FORBIDDEN);

  await update(commentRef, {
    content: newContent.trim(),
    edited: true,
    editedAt: Date.now(),
  });
}

/**
 * Yorum beğen / beğeniyi kaldır
 */
export async function toggleCommentLike(
  postId: string,
  commentId: string,
  userId: string
): Promise<boolean> {
  const likeRef = ref(db, `nature_posts/${postId}/comments/${commentId}/likes/${userId}`);
  const snap = await get(likeRef);
  if (snap.exists()) {
    await remove(likeRef);
    return false;
  } else {
    await set(likeRef, true);
    return true;
  }
}

/**
 * Post raporla
 */
export async function reportPost(
  postId: string,
  reporterId: string,
  reason: string
): Promise<void> {
  const reportRef = ref(db, `post_reports/${postId}/${reporterId}`);
  await set(reportRef, { reason, timestamp: Date.now(), reporterId });
}

/**
 * Post paylaş (shares sayacını artır + kullanıcı paylaşım kaydı)
 */
export async function sharePost(postId: string, userId: string): Promise<void> {
  const sharesRef = ref(db, `nature_posts/${postId}/shares`);
  const snap = await get(sharesRef);
  const current = snap.val() || 0;
  await set(sharesRef, current + 1);
  await set(ref(db, `post_shares/${userId}/${postId}`), Date.now());
}

/**
 * Post düzenle (sadece sahip)
 */
export async function editPost(
  postId: string,
  userId: string,
  newContent: string
): Promise<void> {
  const post = await getPost(postId);
  if (!post) throw new ProfileError('Post bulunamadı', ProfileErrorCode.POST_NOT_FOUND);
  if (post.userId !== userId) throw new ProfileError('Yetkiniz yok', ProfileErrorCode.FORBIDDEN);
  if (!newContent.trim()) throw new ProfileError('İçerik boş olamaz', ProfileErrorCode.INVALID_INPUT);
  if (newContent.length > 500) throw new ProfileError('Maksimum 500 karakter', ProfileErrorCode.CONTENT_TOO_LONG);

  await update(ref(db, `nature_posts/${postId}`), {
    content: newContent.trim(),
    edited: true,
    editedAt: Date.now(),
  });
}

/**
 * Post'u kaydet / kayıttan çıkar (toggle)
 */
export async function toggleBookmark(postId: string, userId: string): Promise<boolean> {
  const bookmarkRef = ref(db, `bookmarks/${userId}/${postId}`);
  const snap = await get(bookmarkRef);
  if (snap.exists()) {
    await remove(bookmarkRef);
    return false; // kaldırıldı
  } else {
    await set(bookmarkRef, Date.now());
    return true; // eklendi
  }
}

/**
 * Kullanıcının kaydedilen postlarını dinle
 */
export function listenBookmarks(
  userId: string,
  callback: (postIds: string[]) => void
): () => void {
  const bookmarksRef = ref(db, `bookmarks/${userId}`);
  const unsub = onValue(bookmarksRef, (snap) => {
    callback(Object.keys(snap.val() || {}));
  });
  return () => off(bookmarksRef);
}

/**
 * Kaydedilen postların detaylarını getir
 */
export async function getBookmarkedPosts(userId: string): Promise<Post[]> {
  const snap = await get(ref(db, `bookmarks/${userId}`));
  const postIds = Object.keys(snap.val() || {});
  const posts: Post[] = [];
  for (const postId of postIds) {
    const postSnap = await get(ref(db, `nature_posts/${postId}`));
    if (postSnap.exists()) {
      posts.push({ id: postId, ...postSnap.val() } as Post);
    }
  }
  return posts.sort((a, b) => b.timestamp - a.timestamp);
}
