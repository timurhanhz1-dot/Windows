import React, { useEffect, useState } from 'react';
import { ref, onValue, off, update } from 'firebase/database';
import { db } from '../../../firebase';
import { writeAuditLog } from '../services/auditLogService';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { Card, PageTitle, useToast, Toast, Btn, Input } from './shared';

export default function VerificationModule() {
  const { uid, role } = useBackofficeAuth();
  const { toast, show } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    const r = ref(db, 'verification_requests');
    onValue(r, snap => {
      if (!snap.exists()) return setRequests([]);
      setRequests(Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })).sort((a: any, b: any) => b.created_at - a.created_at));
    });
    return () => off(r);
  }, []);

  const approve = async (req: any) => {
    try {
      await update(ref(db, `verification_requests/${req.id}`), { status: 'approved', reviewed_at: new Date().toISOString() });
      await update(ref(db, `users/${req.user_uid}`), { is_verified: true });
      await writeAuditLog({ action: 'VERIFY_APPROVE', detail: `Doğrulama onaylandı: ${req.user_uid}`, admin_uid: uid!, admin_role: role!, target_uid: req.user_uid });
      show('Onaylandı');
    } catch (e: any) { show(e.message, 'error'); }
  };

  const reject = async (req: any) => {
    const note = notes[req.id] || '';
    try {
      await update(ref(db, `verification_requests/${req.id}`), { status: 'rejected', adminNote: note, reviewed_at: new Date().toISOString() });
      await writeAuditLog({ action: 'VERIFY_REJECT', detail: `Doğrulama reddedildi: ${req.user_uid} — ${note}`, admin_uid: uid!, admin_role: role!, target_uid: req.user_uid });
      show('Reddedildi');
    } catch (e: any) { show(e.message, 'error'); }
  };

  return (
    <div>
      <PageTitle>Doğrulama Talepleri</PageTitle>
      <Toast toast={toast} />
      <Card>
        {requests.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Bekleyen talep yok.</p>}
        {requests.map(req => (
          <div key={req.id} style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{req.username || req.user_uid}</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: '2px 0 0' }}>{req.created_at ? new Date(req.created_at).toLocaleDateString('tr') : ''}</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: req.status === 'approved' ? '#10b981' : req.status === 'rejected' ? '#ef4444' : '#f59e0b' }}>
                {req.status || 'bekliyor'}
              </span>
            </div>
            {req.status === 'pending' || !req.status ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <Input value={notes[req.id] || ''} onChange={v => setNotes(n => ({ ...n, [req.id]: v }))} placeholder="Red notu (opsiyonel)" />
                </div>
                <Btn small color="#10b981" onClick={() => approve(req)}>Onayla</Btn>
                <Btn small color="#ef4444" onClick={() => reject(req)}>Reddet</Btn>
              </div>
            ) : null}
          </div>
        ))}
      </Card>
    </div>
  );
}
