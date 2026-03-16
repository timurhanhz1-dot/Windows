import React, { useEffect, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../../../firebase';
import { writeAuditLog } from '../services/auditLogService';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { addIpBan, removeIpBan, forceLogoutAll } from '../services/backofficeService';
import { RoleGuard } from '../RoleGuard';
import { Card, PageTitle, useToast, Toast, Btn, Input } from './shared';

function SecurityContent() {
  const { uid, role } = useBackofficeAuth();
  const { toast, show } = useToast();
  const [ipBans, setIpBans] = useState<any[]>([]);
  const [newIp, setNewIp] = useState('');

  useEffect(() => {
    const r = ref(db, 'ip_bans');
    onValue(r, snap => {
      setIpBans(snap.exists() ? Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })) : []);
    });
    return () => off(r);
  }, []);

  const act = async (fn: () => Promise<void>, action: string, detail: string) => {
    try { await fn(); await writeAuditLog({ action, detail, admin_uid: uid!, admin_role: role! }); show(detail); }
    catch (e: any) { show(e.message, 'error'); }
  };

  const banIp = () => {
    if (!newIp.trim()) return;
    act(() => addIpBan(newIp.trim()), 'BAN_IP', `IP banlı: ${newIp}`);
    setNewIp('');
  };

  const handleForceLogout = () => {
    if (!confirm('Tüm kullanıcıları çıkış yapmaya zorla?')) return;
    act(forceLogoutAll, 'FORCE_LOGOUT', 'Tüm kullanıcılar çıkış yapması zorlandı');
  };

  return (
    <div>
      <PageTitle>Güvenlik</PageTitle>
      <Toast toast={toast} />
      <div style={{ marginBottom: 16 }}><Card>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>🚫 IP Yasakları</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <Input value={newIp} onChange={setNewIp} placeholder="IP adresi (örn: 192.168.1.1)" />
          <Btn color="#ef4444" onClick={banIp}>Banla</Btn>
        </div>
        {ipBans.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Banlı IP yok.</p>}
        {ipBans.map(ban => (
          <div key={ban.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ flex: 1, color: '#ccc', fontSize: 13, fontFamily: 'monospace' }}>{ban.ip}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{ban.bannedAt ? new Date(ban.bannedAt).toLocaleDateString('tr') : ''}</span>
            <Btn small color="#10b981" onClick={() => act(() => removeIpBan(ban.ip), 'UNBAN_IP', `IP ban kaldırıldı: ${ban.ip}`)}>Kaldır</Btn>
          </div>
        ))}
      </Card></div>
      <Card>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>⚡ Acil İşlemler</p>
        <Btn color="#ef4444" onClick={handleForceLogout}>Tüm Kullanıcıları Çıkış Yaptır</Btn>
      </Card>
    </div>
  );
}

export default function SecurityModule() {
  return <RoleGuard allowedRoles={['super_admin']}><SecurityContent /></RoleGuard>;
}
