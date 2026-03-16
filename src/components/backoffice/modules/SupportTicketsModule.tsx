import React, { useEffect, useState } from 'react';
import { ref, onValue, off, update } from 'firebase/database';
import { db } from '../../../firebase';
import { writeAuditLog } from '../services/auditLogService';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { Card, PageTitle, useToast, Toast, Btn, Input } from './shared';

export default function SupportTicketsModule() {
  const { uid, role } = useBackofficeAuth();
  const { toast, show } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [selected, setSelected] = useState<any | null>(null);
  const [reply, setReply] = useState('');

  useEffect(() => {
    const r = ref(db, 'support_tickets');
    onValue(r, snap => {
      if (!snap.exists()) return setTickets([]);
      setTickets(Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })).sort((a: any, b: any) => b.created_at - a.created_at));
    });
    return () => off(r);
  }, []);

  const filtered = filter === 'all' ? tickets : tickets.filter(t => t.status === filter);

  const sendReply = async () => {
    if (!selected || !reply.trim()) return;
    try {
      await update(ref(db, `support_tickets/${selected.id}`), { admin_reply: reply, replied_at: new Date().toISOString() });
      await writeAuditLog({ action: 'SUPPORT_REPLY', detail: `Yanıt gönderildi: ${selected.id}`, admin_uid: uid!, admin_role: role! });
      show('Yanıt gönderildi'); setReply('');
    } catch (e: any) { show(e.message, 'error'); }
  };

  const closeTicket = async (ticketId: string) => {
    try {
      await update(ref(db, `support_tickets/${ticketId}`), { status: 'closed', closed_at: new Date().toISOString() });
      await writeAuditLog({ action: 'CLOSE_TICKET', detail: `Talep kapatıldı: ${ticketId}`, admin_uid: uid!, admin_role: role! });
      show('Talep kapatıldı');
    } catch (e: any) { show(e.message, 'error'); }
  };

  return (
    <div>
      <PageTitle>Destek Talepleri</PageTitle>
      <Toast toast={toast} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['all', 'open', 'closed'] as const).map(f => (
          <Btn key={f} small color={filter === f ? '#6366f1' : '#555'} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Tümü' : f === 'open' ? 'Açık' : 'Kapalı'}
          </Btn>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 12 }}>
        <Card>
          {filtered.map(t => (
            <div key={t.id} onClick={() => setSelected(t)} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', background: selected?.id === t.id ? 'rgba(99,102,241,0.1)' : 'transparent', borderRadius: 6, paddingLeft: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{t.subject || t.id}</p>
                <span style={{ fontSize: 11, color: t.status === 'open' ? '#10b981' : '#888', fontWeight: 600 }}>{t.status}</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '2px 0 0' }}>{t.user_email || t.user_uid}</p>
            </div>
          ))}
        </Card>
        {selected && (
          <Card>
            <p style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>{selected.subject}</p>
            <p style={{ color: '#ccc', fontSize: 13, marginBottom: 12 }}>{selected.message}</p>
            {selected.admin_reply && <p style={{ color: '#6366f1', fontSize: 12, marginBottom: 12 }}>Yanıt: {selected.admin_reply}</p>}
            <Input value={reply} onChange={setReply} placeholder="Yanıt yaz..." />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Btn onClick={sendReply}>Yanıtla</Btn>
              {selected.status !== 'closed' && <Btn color="#ef4444" onClick={() => closeTicket(selected.id)}>Kapat</Btn>}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
