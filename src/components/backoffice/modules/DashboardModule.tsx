import React, { useEffect, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../../../firebase';
import { Card, PageTitle } from './shared';
import { Users, MessageSquare, Ban, Activity } from 'lucide-react';

export default function DashboardModule() {
  const [stats, setStats] = useState({ users: 0, online: 0, banned: 0, messages: 0 });

  useEffect(() => {
    const uRef = ref(db, 'users');
    const oRef = ref(db, 'online');
    const mRef = ref(db, 'messages');

    onValue(uRef, snap => {
      const d = snap.val() || {};
      const arr = Object.values(d) as any[];
      setStats(s => ({ ...s, users: arr.length, banned: arr.filter(u => u.is_banned).length }));
    });
    onValue(oRef, snap => {
      const d = snap.val() || {};
      setStats(s => ({ ...s, online: Object.keys(d).filter(k => d[k] === true).length }));
    });
    onValue(mRef, snap => {
      const d = snap.val() || {};
      let total = 0;
      Object.values(d).forEach((ch: any) => { total += Object.keys(ch || {}).length; });
      setStats(s => ({ ...s, messages: total }));
    });

    return () => { off(uRef); off(oRef); off(mRef); };
  }, []);

  const cards = [
    { icon: Users, label: 'Toplam Üye', value: stats.users, color: '#6366f1' },
    { icon: Activity, label: 'Çevrimiçi', value: stats.online, color: '#10b981' },
    { icon: Ban, label: 'Banlı', value: stats.banned, color: '#ef4444' },
    { icon: MessageSquare, label: 'Toplam Mesaj', value: stats.messages, color: '#f59e0b' },
  ];

  return (
    <div>
      <PageTitle>Dashboard</PageTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {cards.map(c => (
          <Card key={c.label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: c.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <c.icon size={20} color={c.color} />
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 2 }}>{c.label}</p>
                <p style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>{c.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
