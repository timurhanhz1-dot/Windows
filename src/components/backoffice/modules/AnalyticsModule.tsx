import React, { useEffect, useState } from 'react';
import { ref, get } from 'firebase/database';
import { db } from '../../../firebase';
import { Card, PageTitle } from './shared';

interface Stats {
  totalUsers: number; onlineUsers: number; bannedUsers: number; totalMessages: number;
  newUsersLast7: number; topChannels: { name: string; count: number }[];
  topUsers: { name: string; count: number }[];
}

export default function AnalyticsModule() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [usersSnap, channelsSnap] = await Promise.all([
          get(ref(db, 'users')), get(ref(db, 'channels')),
        ]);
        const users = usersSnap.exists() ? Object.entries(usersSnap.val()) : [];
        const now = Date.now(); const week = 7 * 24 * 60 * 60 * 1000;
        const totalUsers = users.length;
        const onlineUsers = users.filter(([, v]: any) => v.is_online).length;
        const bannedUsers = users.filter(([, v]: any) => v.is_banned).length;
        const newUsersLast7 = users.filter(([, v]: any) => v.created_at && now - v.created_at < week).length;
        const topUsers = users
          .map(([, v]: any) => ({ name: v.username || v.uid, count: v.message_count || 0 }))
          .sort((a, b) => b.count - a.count).slice(0, 5);

        const channels = channelsSnap.exists() ? Object.entries(channelsSnap.val()) : [];
        const msgCounts = await Promise.all(channels.map(async ([id, v]: any) => {
          const snap = await get(ref(db, `messages/${id}`));
          return { name: `${v.emoji || ''} ${v.name || id}`, count: snap.exists() ? Object.keys(snap.val()).length : 0 };
        }));
        const topChannels = msgCounts.sort((a, b) => b.count - a.count).slice(0, 5);
        const totalMessages = msgCounts.reduce((s, c) => s + c.count, 0);
        setStats({ totalUsers, onlineUsers, bannedUsers, totalMessages, newUsersLast7, topChannels, topUsers });
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const StatCard = ({ label, value, color = '#6366f1' }: { label: string; value: number; color?: string }) => (
    <Card>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: '0 0 4px' }}>{label}</p>
      <p style={{ color, fontSize: 28, fontWeight: 800, margin: 0 }}>{value}</p>
    </Card>
  );

  if (loading) return <p style={{ color: '#ccc' }}>Yükleniyor...</p>;
  if (!stats) return null;

  return (
    <div>
      <PageTitle>Analitik</PageTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Toplam Kullanıcı" value={stats.totalUsers} />
        <StatCard label="Çevrimiçi" value={stats.onlineUsers} color="#10b981" />
        <StatCard label="Banlı" value={stats.bannedUsers} color="#ef4444" />
        <StatCard label="Toplam Mesaj" value={stats.totalMessages} color="#8b5cf6" />
        <StatCard label="Son 7 Gün Kayıt" value={stats.newUsersLast7} color="#f59e0b" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>En Aktif Kanallar</p>
          {stats.topChannels.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: '#ccc', fontSize: 13 }}>{c.name}</span>
              <span style={{ color: '#6366f1', fontWeight: 700, fontSize: 13 }}>{c.count}</span>
            </div>
          ))}
        </Card>
        <Card>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>En Aktif Kullanıcılar</p>
          {stats.topUsers.map((u, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ color: '#ccc', fontSize: 13 }}>{u.name}</span>
              <span style={{ color: '#8b5cf6', fontWeight: 700, fontSize: 13 }}>{u.count}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
