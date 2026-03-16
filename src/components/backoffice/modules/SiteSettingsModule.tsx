import React, { useEffect, useState } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../../../firebase';
import { writeAuditLog } from '../services/auditLogService';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { updateSiteSettings } from '../services/backofficeService';
import { RoleGuard } from '../RoleGuard';
import { Card, PageTitle, useToast, Toast, Btn, Input } from './shared';

function SiteSettingsContent() {
  const { uid, role } = useBackofficeAuth();
  const { toast, show } = useToast();
  const [s, setS] = useState<any>({});

  useEffect(() => {
    const r = ref(db, 'settings');
    onValue(r, snap => { if (snap.exists()) setS(snap.val()); });
    return () => off(r);
  }, []);

  const save = async () => {
    try {
      const payload: any = {
        site_name: s.site_name, welcome_message: s.welcome_message,
        allow_registration: s.allow_registration, maintenance_mode: s.maintenance_mode,
        invite_code: s.invite_code, banned_words: s.banned_words,
        message_history_limit: parseInt(s.message_history_limit) || 100,
      };
      await updateSiteSettings(payload);
      await writeAuditLog({ action: 'UPDATE_SITE_SETTINGS', detail: 'Site ayarları güncellendi', admin_uid: uid!, admin_role: role! });
      show('Kaydedildi');
    } catch (e: any) { show(e.message, 'error'); }
  };

  const tf = (label: string, key: string) => (
    <div style={{ marginBottom: 10 }}>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginBottom: 4 }}>{label}</p>
      <Input value={s[key] || ''} onChange={v => setS((p: any) => ({ ...p, [key]: v }))} placeholder={label} />
    </div>
  );

  const toggle = (label: string, key: string) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ color: '#ccc', fontSize: 13 }}>{label}</span>
      <button onClick={() => setS((p: any) => ({ ...p, [key]: !p[key] }))}
        style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: s[key] ? '#6366f1' : '#333', transition: 'background 0.2s', position: 'relative' }}>
        <span style={{ position: 'absolute', top: 3, left: s[key] ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </button>
    </div>
  );

  return (
    <div>
      <PageTitle>Site Ayarları</PageTitle>
      <Toast toast={toast} />
      <Card>
        {tf('Site Adı', 'site_name')}
        {tf('Karşılama Mesajı', 'welcome_message')}
        {tf('Davet Kodu', 'invite_code')}
        {tf('Yasaklı Kelimeler (virgülle)', 'banned_words')}
        {tf('Mesaj Geçmişi Limiti', 'message_history_limit')}
        {toggle('Kayıt İzni', 'allow_registration')}
        {toggle('Bakım Modu', 'maintenance_mode')}
        <div style={{ marginTop: 12 }}><Btn onClick={save}>Kaydet</Btn></div>
      </Card>
    </div>
  );
}

export default function SiteSettingsModule() {
  return <RoleGuard allowedRoles={['super_admin']}><SiteSettingsContent /></RoleGuard>;
}
