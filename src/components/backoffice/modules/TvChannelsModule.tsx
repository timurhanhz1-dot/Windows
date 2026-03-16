import React, { useEffect, useState } from 'react';
import { ref, onValue, off, update, remove, push } from 'firebase/database';
import { db } from '../../../firebase';
import { writeAuditLog } from '../services/auditLogService';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { Card, PageTitle, useToast, Toast, Btn, Input } from './shared';

const empty = { name: '', emoji: '📺', youtubeChannelId: '', color: '#6366f1', order: 0 };

export default function TvChannelsModule() {
  const { uid, role } = useBackofficeAuth();
  const { toast, show } = useToast();
  const [channels, setChannels] = useState<any[]>([]);
  const [form, setForm] = useState({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    const r = ref(db, 'tv_channels');
    onValue(r, snap => {
      setChannels(snap.exists() ? Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)) : []);
    });
    return () => off(r);
  }, []);

  const act = async (fn: () => Promise<void>, action: string, detail: string) => {
    try { await fn(); await writeAuditLog({ action, detail, admin_uid: uid!, admin_role: role! }); show(detail); }
    catch (e: any) { show(e.message, 'error'); }
  };

  const save = () => {
    if (!form.name.trim()) return;
    if (editId) {
      act(() => update(ref(db, `tv_channels/${editId}`), form), 'UPDATE_TV_CHANNEL', `TV kanalı güncellendi: ${form.name}`);
      setEditId(null);
    } else {
      act(() => push(ref(db, 'tv_channels'), { ...form, created_at: Date.now() }), 'CREATE_TV_CHANNEL', `TV kanalı eklendi: ${form.name}`);
    }
    setForm({ ...empty });
  };

  const startEdit = (ch: any) => { setEditId(ch.id); setForm({ name: ch.name, emoji: ch.emoji, youtubeChannelId: ch.youtubeChannelId, color: ch.color, order: ch.order || 0 }); };

  return (
    <div>
      <PageTitle>TV Kanalları</PageTitle>
      <Toast toast={toast} />
      <Card style={{ marginBottom: 16 }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{editId ? 'Düzenle' : 'Yeni Kanal'}</p>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr', gap: 8, marginBottom: 8 }}>
          <Input value={form.emoji} onChange={v => setForm(f => ({ ...f, emoji: v }))} placeholder="📺" />
          <Input value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} placeholder="Kanal adı" />
          <Input value={form.youtubeChannelId} onChange={v => setForm(f => ({ ...f, youtubeChannelId: v }))} placeholder="YouTube Channel ID" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 8, marginBottom: 8 }}>
          <Input value={form.color} onChange={v => setForm(f => ({ ...f, color: v }))} placeholder="#6366f1" />
          <Input value={String(form.order)} onChange={v => setForm(f => ({ ...f, order: parseInt(v) || 0 }))} placeholder="Sıra" />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={save}>{editId ? 'Güncelle' : 'Ekle'}</Btn>
          {editId && <Btn color="#888" onClick={() => { setEditId(null); setForm({ ...empty }); }}>İptal</Btn>}
        </div>
      </Card>
      <Card>
        {channels.map(ch => (
          <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 20 }}>{ch.emoji}</span>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{ch.name}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>{ch.youtubeChannelId}</p>
            </div>
            <Btn small color="#6366f1" onClick={() => startEdit(ch)}>Düzenle</Btn>
            <Btn small color="#ef4444" onClick={() => act(() => remove(ref(db, `tv_channels/${ch.id}`)), 'DELETE_TV_CHANNEL', `TV kanalı silindi: ${ch.name}`)}>Sil</Btn>
          </div>
        ))}
      </Card>
    </div>
  );
}
