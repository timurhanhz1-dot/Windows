import React, { useEffect, useState } from 'react';
import { ref, onValue, off, remove, get } from 'firebase/database';
import { db } from '../../../firebase';
import { writeAuditLog } from '../services/auditLogService';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { useRoleAccess } from '../hooks/useRoleAccess';
import { Card, PageTitle, useToast, Toast, Btn } from './shared';

export default function GuildsModule() {
  const { uid, role } = useBackofficeAuth();
  const perms = useRoleAccess();
  const { toast, show } = useToast();
  const [guilds, setGuilds] = useState<any[]>([]);

  useEffect(() => {
    const r = ref(db, 'guilds');
    onValue(r, snap => {
      setGuilds(snap.exists() ? Object.entries(snap.val()).map(([id, v]: any) => ({ id, ...v })) : []);
    });
    return () => off(r);
  }, []);

  const deleteGuild = async (guild: any) => {
    try {
      const membersSnap = await get(ref(db, `guilds/${guild.id}/members`));
      const memberUids = membersSnap.exists() ? Object.keys(membersSnap.val()) : [];
      await remove(ref(db, `guilds/${guild.id}`));
      for (const muid of memberUids) {
        await remove(ref(db, `userGuilds/${muid}/${guild.id}`));
      }
      await writeAuditLog({ action: 'DELETE_GUILD', detail: `Guild silindi: ${guild.name}`, admin_uid: uid!, admin_role: role! });
      show('Guild silindi');
    } catch (e: any) { show(e.message, 'error'); }
  };

  return (
    <div>
      <PageTitle>Guild Yönetimi</PageTitle>
      <Toast toast={toast} />
      <Card>
        {guilds.length === 0 && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Guild yok.</p>}
        {guilds.map(g => (
          <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 24 }}>{g.emoji || '🛡️'}</span>
            <div style={{ flex: 1 }}>
              <p style={{ color: '#fff', fontSize: 13, fontWeight: 600, margin: 0 }}>{g.name || g.id}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, margin: 0 }}>
                Sahip: {g.owner_uid} · Üye: {g.member_count || Object.keys(g.members || {}).length}
              </p>
            </div>
            {perms.canDeleteGuilds && (
              <Btn small color="#ef4444" onClick={() => deleteGuild(g)}>Sil</Btn>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
