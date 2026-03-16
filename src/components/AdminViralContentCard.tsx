import React, { useEffect, useState } from "react";
import { detectViralPosts } from "../services/aiViralContentService";

export default function AdminViralContentCard() {
  const [posts, setPosts] = useState<any[]>([]);
  useEffect(() => { detectViralPosts().then(setPosts).catch(() => setPosts([])); }, []);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-white font-bold mb-3">Viral Content</div>
      <div className="space-y-2">
        {posts.length === 0 ? <div className="text-sm text-white/50">Henüz viral içerik görünmüyor.</div> : posts.map((p) => (
          <div key={p.id} className="rounded-xl border border-white/10 p-3">
            <div className="text-white text-sm font-semibold">{p.title}</div>
            <div className="text-xs text-white/45 mt-1">{p.category} • skor {p.viralScore} • {p.replies} yanıt</div>
          </div>
        ))}
      </div>
    </div>
  );
}
