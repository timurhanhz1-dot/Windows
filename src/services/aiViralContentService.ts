import { get, ref } from "firebase/database";
import { db } from "../firebase";

export async function detectViralPosts(limit = 5) {
  try {
    const snap = await get(ref(db, "forum"));
  const data = snap.exists() ? snap.val() : {};
  const rows = Object.entries(data || {}).map(([id, post]: any) => {
    const likes = Object.keys(post?.likes || {}).length;
    const replies = Number(post?.reply_count || 0);
    const views = Number(post?.views || 0);
    const viralScore = likes * 3 + replies * 4 + views * 0.08;
    return {
      id,
      title: post?.title || "Başlıksız gönderi",
      category: post?.category || "Genel",
      likes,
      replies,
      views,
      viralScore: Math.round(viralScore),
    };
  });

  return rows.sort((a, b) => b.viralScore - a.viralScore).slice(0, limit);
  } catch {
    return [];
  }
}
