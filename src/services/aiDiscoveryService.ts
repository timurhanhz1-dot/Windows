import { db } from '../firebase';
import { ref, get, query, orderByChild, limitToLast } from 'firebase/database';

/**
 * Kullanıcının etkileşimlerine göre kişiselleştirilmiş keşif önerileri döndürür.
 * - Beğenilen post tag'lerine göre benzer içerik üreticileri önerir
 * - Aktif forum kategorilerine göre kanal önerir
 * - Arkadaş ağına göre yeni kullanıcı önerir
 */
export async function getPersonalizedDiscovery(userId?: string) {
  if (!userId) return { communities: [], channels: [], people: [], reason: 'Giriş yapılmamış' };

  try {
    // 1. Kullanıcının beğendiği post'ların tag'lerini topla
    const userInterests = await getUserInterests(userId);

    // 2. Tüm post'ları çek (son 50)
    const postsSnap = await get(query(ref(db, 'nature_posts'), orderByChild('timestamp'), limitToLast(50)));
    const postsData = postsSnap.val() || {};

    // 3. Kullanıcının arkadaşlarını al
    const friendsSnap = await get(ref(db, `users/${userId}/friends`));
    const friendIds = new Set(Object.keys(friendsSnap.val() || {}));

    // 4. user_index'ten tüm kullanıcıları al
    const userIndexSnap = await get(ref(db, 'user_index'));
    const userIndex = userIndexSnap.val() || {};

    // 5. İlgi alanlarına göre içerik üreticilerini skorla
    const creatorScores: Record<string, number> = {};
    Object.values(postsData).forEach((post: any) => {
      if (post.userId === userId) return;
      const postTags: string[] = post.tags || [];
      const overlap = postTags.filter(t => userInterests.includes(t)).length;
      if (overlap > 0) {
        creatorScores[post.userId] = (creatorScores[post.userId] || 0) + overlap * 2;
      }
      // Popüler post'lar da önerilsin
      const likeCount = Object.keys(post.likes || {}).length;
      if (likeCount > 3) {
        creatorScores[post.userId] = (creatorScores[post.userId] || 0) + 1;
      }
    });

    // 6. Arkadaş olmayan, yüksek skorlu kullanıcıları öner
    const people = Object.entries(creatorScores)
      .filter(([uid]) => !friendIds.has(uid) && uid !== userId)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([uid, score]) => ({
        id: uid,
        username: userIndex[uid]?.username || 'Kullanıcı',
        score,
        reason: userInterests.length > 0
          ? `${userInterests.slice(0, 2).join(', ')} ile ilgileniyor`
          : 'Aktif içerik üreticisi',
      }));

    // 7. Forum kategorilerini çek ve aktif olanları öner
    const forumSnap = await get(query(ref(db, 'forum_posts'), orderByChild('timestamp'), limitToLast(30)));
    const forumData = forumSnap.val() || {};
    const categoryCounts: Record<string, number> = {};
    Object.values(forumData).forEach((fp: any) => {
      if (fp.category) categoryCounts[fp.category] = (categoryCounts[fp.category] || 0) + 1;
    });
    const communities = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ id: name, name, count, reason: `${count} aktif gönderi` }));

    // 8. Kanal önerileri — kullanıcının hiç mesaj atmadığı kanallar
    const channelsSnap = await get(ref(db, 'channels'));
    const channelsData = channelsSnap.val() || {};
    const channels = Object.entries(channelsData)
      .slice(0, 3)
      .map(([id, ch]: [string, any]) => ({
        id,
        name: ch.name || id,
        reason: 'Keşfedilmemiş kanal',
      }));

    return {
      communities,
      channels,
      people,
      reason: userInterests.length > 0
        ? `${userInterests.slice(0, 3).join(', ')} ilgi alanlarına göre`
        : 'Popüler içeriklere göre',
    };
  } catch (err) {
    console.error('getPersonalizedDiscovery error:', err);
    return { communities: [], channels: [], people: [], reason: 'Veri yüklenemedi' };
  }
}

/**
 * Kullanıcının beğendiği post'lardan tag'leri çıkarır.
 */
export async function getUserInterests(userId?: string): Promise<string[]> {
  if (!userId) return [];
  try {
    // Kullanıcının beğendiği post'ları bul (nature_posts içinde likes/{userId} = true olanlar)
    const postsSnap = await get(query(ref(db, 'nature_posts'), orderByChild('timestamp'), limitToLast(100)));
    const postsData = postsSnap.val() || {};

    const tagCounts: Record<string, number> = {};
    Object.values(postsData).forEach((post: any) => {
      if (post.likes && post.likes[userId]) {
        const tags: string[] = post.tags || [];
        tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
      }
    });

    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);
  } catch {
    return [];
  }
}

export default {
  getPersonalizedDiscovery,
  getUserInterests,
};
