import React, { useEffect, useState } from 'react';
import { ref, onValue, off, push } from 'firebase/database';
import { db } from '../../../firebase';
import { writeAuditLog } from '../services/auditLogService';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { lockChannel, hideChannel, deleteChannel, createChannel } from '../services/backofficeService';
import { Card, PageTitle, useToast, Toast, Btn, Input } from './shared';

export default function ChannelManagementModule() {
  const { uid, role } = useBackofficeAuth();
  const { toast, show } = useToast();
  const [channels, setChannels] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💬');

  useEffect(() => {
    const r = ref(db, 'channels');
    onValue(r, snap => {
      if (!snap.exists()) return setChannels([]);
      setChannels(Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })));
    });
    return () => off(r);
  }, []);

  const act = async (fn: () => Promise<void>, action: string, detail: string) => {
    try { await fn(); await writeAuditLog({ action, detail, admin_uid: uid!, admin_role: role! }); show(detail); }
    catch (e: any) { show(e.message, 'error'); }
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    const id = name.toLowerCase().replace(/\s+/g, '-');
    act(() => createChannel(id, { name, emoji, is_locked: false, is_hidden: false, created_at: Date.now() }),
      'CREATE_CHANNEL', `Kanal oluşturuldu: ${name}`);
    setName(''); setEmoji('💬');
  };

  return (
    <div>
      <PageTitle>Kanal Yönetimi</PageTitle>
      <Toast toast={toast} />
      <Card className="mb-4" style={{ marginBottom: 16 }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8 }}>Yeni Kanal</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 60 }}><Input value={emoji} onChange={setEmoji} placeholder="💬" /></div>
          <div style={{ flex: 1 }}><Input value={name} onChange={setName} placeholder="Kanal adı" /></div>
          <Btn onClick={handleCreate}>Oluştur</Btn>
        </div>
      </Card>
      <Card>
        {channels.map(ch => (
          <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 18 }}>{ch.emoji || '💬'}</span>
            <span style={{ flex: 1, color: '#fff', fontSize: 13 }}>{ch.name || ch.id}</span>
            <Btn small color={ch.is_locked ? '#10b981' : '#f59e0b'} onClick={() => act(() => lockChannel(ch.id, !ch.is_locked), 'LOCK_CHANNEL', `${ch.is_locked ? 'Kilit açıldı' : 'Kilitlendi'}: ${ch.name}`)}>
              {ch.is_locked ? '🔓 Aç' : '🔒 Kilitle'}
            </Btn>
            <Btn small color={ch.is_hidden ? '#10b981' : '#8b5cf6'} onClick={() => act(() => hideChannel(ch.id, !ch.is_hidden), 'HIDE_CHANNEL', `${ch.is_hidden ? 'Gösterildi' : 'Gizlendi'}: ${ch.name}`)}>
              {ch.is_hidden ? '👁 Göster' : '🙈 Gizle'}
            </Btn>
            <Btn small color="#ef4444" onClick={() => act(() => deleteChannel(ch.id), 'DELETE_CHANNEL', `Silindi: ${ch.name}`)}>Sil</Btn>
          </div>
        ))}
      </Card>
    </div>
  );
}
