import React, { useEffect, useState } from 'react';
import { ref, onValue, off, update, remove } from 'firebase/database';
import { db } from '../../../firebase';
import { writeAuditLog } from '../services/auditLogService';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { Card, PageTitle, useToast, Toast, Btn } from './shared';

export default function GamesModule() {
  const { uid, role } = useBackofficeAuth();
  const { toast, show } = useToast();
  const [servers, setServers] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);

  useEffect(() => {
    const r1 = ref(db, 'game_servers');
    onValue(r1, snap => {
      setServers(snap.exists() ? Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })) : []);
    });
    const r2 = ref(db, 'tournaments');
    onValue(r2, snap => {
      setTournaments(snap.exists() ? Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })) : []);
    });
    return () => { off(r1); off(r2); };
  }, []);

  const act = async (fn: () => Promise<void>, action: string, detail: string) => {
    try { await fn(); await writeAuditLog({ action, detail, admin_uid: uid!, admin_role: role! }); show(detail); }
    catch (e: any) { show(e.message, 'error'); }
  };

  return (
    <div>
      <PageTitle>Oyunlar</PageTitle>
      <Toast toast={toast} />
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>🎮 Oyun Sunucuları</p>
      <Card style={{ marginBottom: 16 }}>
        {servers.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Sunucu yok.</p>}
        {servers.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{s.name || s.id}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>{s.game} · {s.status}</p>
            </div>
            <Btn small color="#10b981" onClick={() => act(() => update(ref(db, `game_servers/${s.id}`), { status: 'approved' }), 'APPROVE_SERVER', `Sunucu onaylandı: ${s.name}`)}>Onayla</Btn>
            <Btn small color="#ef4444" onClick={() => act(() => update(ref(db, `game_servers/${s.id}`), { status: 'rejected' }), 'REJECT_SERVER', `Sunucu reddedildi: ${s.name}`)}>Reddet</Btn>
          </div>
        ))}
      </Card>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>🏆 Turnuvalar</p>
      <Card>
        {tournaments.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Turnuva yok.</p>}
        {tournaments.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{t.name || t.id}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>{t.game} · {t.status}</p>
            </div>
            <Btn small color="#ef4444" onClick={() => act(() => remove(ref(db, `tournaments/${t.id}`)), 'DELETE_TOURNAMENT', `Turnuva silindi: ${t.name}`)}>Sil</Btn>
          </div>
        ))}
      </Card>
    </div>
  );
}
