import React, { useEffect, useState } from 'react';
import { ref, onValue, off, push, get } from 'firebase/database';
import { db } from '../../../firebase';
import { writeAuditLog } from '../services/auditLogService';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { Card, PageTitle, useToast, Toast, Btn, Input } from './shared';

export default function AnnouncementsModule() {
  const { uid, role } = useBackofficeAuth();
  const { toast, show } = useToast();
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedCh, setSelectedCh] = useState('');
  const [sysMsg, setSysMsg] = useState('');
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');

  useEffect(() => {
    const r = ref(db, 'channels');
    onValue(r, snap => {
      if (!snap.exists()) return;
      setChannels(Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })));
    });
    return () => off(r);
  }, []);

  const sendSystemMessage = async () => {
    if (!selectedCh || !sysMsg.trim()) return;
    try {
      await push(ref(db, `messages/${selectedCh}`), {
        content: sysMsg, sender_id: uid, sender_name: 'Sistem',
        type: 'system', timestamp: new Date().toISOString(),
      });
      await writeAuditLog({ action: 'SYSTEM_MESSAGE', detail: `Sistem mesajı gönderildi: ${selectedCh}`, admin_uid: uid!, admin_role: role! });
      show('Sistem mesajı gönderildi'); setSysMsg('');
    } catch (e: any) { show(e.message, 'error'); }
  };

  const sendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) return;
    try {
      const usersSnap = await get(ref(db, 'users'));
      if (!usersSnap.exists()) return;
      const uids = Object.keys(usersSnap.val());
      const notif = { title: notifTitle, body: notifBody, type: 'announcement', read: false, created_at: Date.now() };
      await Promise.all(uids.map(u => push(ref(db, `notifications/${u}`), notif)));
      await writeAuditLog({ action: 'SEND_NOTIFICATION', detail: `Bildirim gönderildi: ${notifTitle}`, admin_uid: uid!, admin_role: role! });
      show(`${uids.length} kullanıcıya bildirim gönderildi`); setNotifTitle(''); setNotifBody('');
    } catch (e: any) { show(e.message, 'error'); }
  };

  return (
    <div>
      <PageTitle>Duyurular</PageTitle>
      <Toast toast={toast} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 10, fontWeight: 600 }}>📢 Kanal Sistem Mesajı</p>
          <select value={selectedCh} onChange={e => setSelectedCh(e.target.value)}
            style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 13, width: '100%', marginBottom: 8 }}>
            <option value="">— Kanal seç —</option>
            {channels.map(ch => <option key={ch.id} value={ch.id}>{ch.emoji} {ch.name || ch.id}</option>)}
          </select>
          <Input value={sysMsg} onChange={setSysMsg} placeholder="Sistem mesajı..." />
          <div style={{ marginTop: 8 }}><Btn onClick={sendSystemMessage}>Gönder</Btn></div>
        </Card>
        <Card>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 10, fontWeight: 600 }}>🔔 Tüm Kullanıcılara Bildirim</p>
          <div style={{ marginBottom: 8 }}><Input value={notifTitle} onChange={setNotifTitle} placeholder="Başlık" /></div>
          <Input value={notifBody} onChange={setNotifBody} placeholder="Mesaj içeriği..." />
          <div style={{ marginTop: 8 }}><Btn onClick={sendNotification}>Gönder</Btn></div>
        </Card>
      </div>
    </div>
  );
}
