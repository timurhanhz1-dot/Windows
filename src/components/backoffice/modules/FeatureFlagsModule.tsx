import React, { useEffect, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../../../firebase';
import { writeAuditLog } from '../services/auditLogService';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { updateFeatureFlag } from '../services/backofficeService';
import { RoleGuard } from '../RoleGuard';
import { Card, PageTitle, useToast, Toast, Btn, Input } from './shared';

const DEFAULT_FLAGS = ['forum_enabled', 'games_enabled', 'live_tv_enabled', 'guild_enabled', 'registration_enabled'];

function FeatureFlagsContent() {
  const { uid, role } = useBackofficeAuth();
  const { toast, show } = useToast();
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [newFlag, setNewFlag] = useState('');

  useEffect(() => {
    const r = ref(db, 'settings/feature_flags');
    onValue(r, snap => { setFlags(snap.exists() ? snap.val() : {}); });
    return () => off(r);
  }, []);

  const toggle = async (key: string, val: boolean) => {
    try {
      await updateFeatureFlag(key, val);
      await writeAuditLog({ action: 'TOGGLE_FEATURE_FLAG', detail: `${key}: ${val}`, admin_uid: uid!, admin_role: role! });
      show(`${key} → ${val ? 'açık' : 'kapalı'}`);
    } catch (e: any) { show(e.message, 'error'); }
  };

  const addFlag = async () => {
    const key = newFlag.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key) return;
    await toggle(key, false);
    setNewFlag('');
  };

  const allKeys = Array.from(new Set([...DEFAULT_FLAGS, ...Object.keys(flags)]));

  return (
    <div>
      <PageTitle>Özellik Bayrakları</PageTitle>
      <Toast toast={toast} />
      <div style={{ marginBottom: 16 }}><Card>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input value={newFlag} onChange={setNewFlag} placeholder="Yeni flag adı (örn: dark_mode)" />
          <Btn onClick={addFlag}>Ekle</Btn>
        </div>
      </Card></div>
      <Card>
        {allKeys.map(key => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ color: '#ccc', fontSize: 13, fontFamily: 'monospace' }}>{key}</span>
            <button onClick={() => toggle(key, !flags[key])}
              style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: flags[key] ? '#6366f1' : '#333', transition: 'background 0.2s', position: 'relative' }}>
              <span style={{ position: 'absolute', top: 3, left: flags[key] ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}

export default function FeatureFlagsModule() {
  return <RoleGuard allowedRoles={['super_admin']}><FeatureFlagsContent /></RoleGuard>;
}
