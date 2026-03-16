import React, { useEffect, useState } from 'react';
import { ref, onValue, off, remove } from 'firebase/database';
import { db } from '../../../firebase';
import { writeAuditLog } from '../services/auditLogService';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { Card, PageTitle, useToast, Toast, Btn } from './shared';

export default function ForumManagementModule() {
  const { uid, role } = useBackofficeAuth();
  const { toast, show } = useToast();
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    const r = ref(db, 'forum');
    onValue(r, snap => {
      if (!snap.exists()) return setPosts([]);
      setPosts(Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })).sort((a: any, b: any) => b.created_at - a.created_at));
    });
    return () => off(r);
  }, []);

  const deletePost = async (postId: string, title: string) => {
    try {
      await remove(ref(db, `forum/${postId}`));
      await writeAuditLog({ action: 'DELETE_FORUM_POST', detail: `Forum gönderisi silindi: ${title}`, admin_uid: uid!, admin_role: role! });
      show('Gönderi silindi');
    } catch (e: any) { show(e.message, 'error'); }
  };

  return (
    <div>
      <PageTitle>Forum Yönetimi</PageTitle>
      <Toast toast={toast} />
      <Card>
        {posts.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Forum gönderisi yok.</p>}
        {posts.map(post => (
          <div key={post.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{post.title || '(Başlıksız)'}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '2px 0 0' }}>
                {post.author_name || post.author_uid} · {post.created_at ? new Date(post.created_at).toLocaleDateString('tr') : ''}
              </p>
            </div>
            <Btn small color="#ef4444" onClick={() => deletePost(post.id, post.title)}>Sil</Btn>
          </div>
        ))}
      </Card>
    </div>
  );
}
