import React, { useEffect, useState, useRef } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../../../firebase';
import { writeAuditLog } from '../services/auditLogService';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { banUser, muteUser, unmuteUser, assignBackofficeRole } from '../services/backofficeService';
import { Card, PageTitle, useToast, Toast, Btn, Input } from './shared';
import { BackofficeRole } from '../types/backoffice.types';

export default function UserManagementModule() {
  const { uid, role } = useBackofficeAuth();
  const perms = useRoleAccess();
  const { toast, show } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState<any[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const r = ref(db, 'users');
    onValue(r, snap => {
      if (!snap.exists()) return setUsers([]);
      const list = Object.entries(snap.val()).map(([id, v]: any) => ({ uid: id, ...v }));
      setUsers(list);
    });
    return () => off(r);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = search.toLowerCase();
      setFiltered(q ? users.filter(u => u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) : users);
    }, 300);
  }, [search, users]);

  const act = async (fn: () => Promise<void>, action: string, detail: string, targetUid: string) => {
    try {
      await fn();
      await writeAuditLog({ action, detail, admin_uid: uid!, admin_role: role!, target_uid: targetUid });
      show(detail);
    } catch (e: any) { show(e.message, 'error'); }
  };

  const handleRole = async (targetUid: string, newRole: BackofficeRole | 'remove') => {
    const r2 = newRole === 'remove' ? null : newRole;
    await act(() => assignBackofficeRole(targetUid, r2, role!), 'ASSIGN_ROLE', `Rol: ${newRole}`, targetUid);
  };

  if (!perms.canManageUsers) return <p style={{ color: '#ef4444' }}>Erişim reddedildi.</p>;

  return (
    <div>
      <PageTitle>Kullanıcı Yönetimi</PageTitle>
      <Toast toast={toast} />
      <div style={{ marginBottom: 12 }}>
        <Input value={search} onChange={setSearch} placeholder="Kullanıcı adı veya e-posta ara..." />
      </div>
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#ccc' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Kullanıcı', 'E-posta', 'Durum', 'Rol', 'İşlemler'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.uid} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 10px' }}>{u.username || u.uid}</td>
                  <td style={{ padding: '8px 10px' }}>{u.email}</td>
                  <td style={{ padding: '8px 10px' }}>
                    {u.is_banned ? <span style={{ color: '#ef4444' }}>Banlı</span> : u.is_muted ? <span style={{ color: '#f59e0b' }}>Susturulmuş</span> : <span style={{ color: '#10b981' }}>Aktif</span>}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <select
                      value={u.backoffice_role || 'remove'}
                      onChange={e => handleRole(u.uid, e.target.value as any)}
                      style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 6, padding: '3px 6px', fontSize: 12 }}
                    >
                      <option value="remove">— Yok —</option>
                      <option value="moderator">Moderatör</option>
                      <option value="admin">Admin</option>
                      {role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                    </select>
                  </td>
                  <td style={{ padding: '8px 10px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Btn small color={u.is_banned ? '#10b981' : '#ef4444'} onClick={() => act(() => banUser(u.uid, !u.is_banned), u.is_banned ? 'UNBAN' : 'BAN', `${u.is_banned ? 'Ban kaldırıldı' : 'Banlı'}: ${u.username}`, u.uid)}>
                      {u.is_banned ? 'Banı Kaldır' : 'Banla'}
                    </Btn>
                    {u.is_muted
                      ? <Btn small color="#10b981" onClick={() => act(() => unmuteUser(u.uid), 'UNMUTE', `Susturma kaldırıldı: ${u.username}`, u.uid)}>Susturmayı Kaldır</Btn>
                      : <Btn small color="#f59e0b" onClick={() => act(() => muteUser(u.uid, 10), 'MUTE', `Susturuldu (10dk): ${u.username}`, u.uid)}>Sustur</Btn>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
