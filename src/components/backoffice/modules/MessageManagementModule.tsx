import React, { useEffect, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../../../firebase';
import { writeAuditLog } from '../services/auditLogService';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { deleteMessage, pinMessage, clearChannelMessages } from '../services/backofficeService';
import { Card, PageTitle, useToast, Toast, Btn } from './shared';

export default function MessageManagementModule() {
  const { uid, role } = useBackofficeAuth();
  const perms = useRoleAccess();
  const { toast, show } = useToast();
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedCh, setSelectedCh] = useState('');
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const r = ref(db, 'channels');
    onValue(r, snap => {
      if (!snap.exists()) return;
      setChannels(Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })));
    });
    return () => off(r);
  }, []);

  useEffect(() => {
    if (!selectedCh) return setMessages([]);
    const r = ref(db, `messages/${selectedCh}`);
    onValue(r, snap => {
      if (!snap.exists()) return setMessages([]);
      const list = Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v }));
      setMessages(list.sort((a: any, b: any) => b.timestamp - a.timestamp).slice(0, 100));
    });
    return () => off(r);
  }, [selectedCh]);

  const act = async (fn: () => Promise<void>, action: string, detail: string) => {
    try { await fn(); await writeAuditLog({ action, detail, admin_uid: uid!, admin_role: role! }); show(detail); }
    catch (e: any) { show(e.message, 'error'); }
  };

  return (
    <div>
      <PageTitle>Mesaj Yönetimi</PageTitle>
      <Toast toast={toast} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
        <select value={selectedCh} onChange={e => setSelectedCh(e.target.value)}
          style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 13 }}>
          <option value="">— Kanal seç —</option>
          {channels.map(ch => <option key={ch.id} value={ch.id}>{ch.emoji} {ch.name || ch.id}</option>)}
        </select>
        {perms.canPinMessages && selectedCh && (
          <Btn small color="#ef4444" onClick={() => act(() => clearChannelMessages(selectedCh), 'CLEAR_MESSAGES', `Tüm mesajlar silindi: ${selectedCh}`)}>
            Tümünü Sil
          </Btn>
        )}
      </div>
      <Card>
        {messages.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Mesaj yok.</p>}
        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ flex: 1 }}>
              <span style={{ color: '#6366f1', fontSize: 12, fontWeight: 700 }}>{msg.sender_name || msg.sender_id}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginLeft: 8 }}>{msg.timestamp ? new Date(msg.timestamp).toLocaleString('tr') : ''}</span>
              <p style={{ color: '#ccc', fontSize: 13, margin: '2px 0 0' }}>{msg.content}</p>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {perms.canPinMessages && (
                <Btn small color={msg.is_pinned ? '#10b981' : '#8b5cf6'} onClick={() => act(() => pinMessage(selectedCh, msg.id, !msg.is_pinned), 'PIN_MESSAGE', `${msg.is_pinned ? 'Sabitleme kaldırıldı' : 'Sabitlendi'}: ${msg.id}`)}>
                  {msg.is_pinned ? '📌 Kaldır' : '📌 Sabitle'}
                </Btn>
              )}
              <Btn small color="#ef4444" onClick={() => act(() => deleteMessage(selectedCh, msg.id), 'DELETE_MESSAGE', `Mesaj silindi: ${msg.id}`)}>Sil</Btn>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
