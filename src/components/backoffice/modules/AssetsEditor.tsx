import React, { useState } from 'react';
import { addCustomEmoji, removeCustomEmoji } from '../services/backofficeService';
import { saveAssets } from '../services/designStateManager';
import { writeAuditLog } from '../services/auditLogService';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { AssetConfig } from '../services/designStateManager';
import { Btn, Input, useToast, Toast } from './shared';
import { Trash2 } from 'lucide-react';

interface Props {
  assets: Partial<AssetConfig>;
  onChange: (a: Partial<AssetConfig>) => void;
}

export default function AssetsEditor({ assets, onChange }: Props) {
  const { uid, role } = useBackofficeAuth();
  const { toast, show } = useToast();
  const [emojiName, setEmojiName] = useState('');
  const [emojiValue, setEmojiValue] = useState('');
  const [saving, setSaving] = useState(false);

  const emojis = assets.custom_emojis || {};

  const handleSaveUrls = async () => {
    setSaving(true);
    try {
      await saveAssets(assets, uid!);
      show('Varlıklar kaydedildi');
    } catch (e: any) {
      show(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddEmoji = async () => {
    if (!emojiName.trim() || !emojiValue.trim()) return;
    const id = crypto.randomUUID().slice(0, 8);
    try {
      await addCustomEmoji(id, { name: emojiName, value: emojiValue, addedBy: uid! });
      await writeAuditLog({ action: 'ADD_EMOJI', detail: `Emoji eklendi: ${emojiName}`, admin_uid: uid!, admin_role: role! });
      onChange({ ...assets, custom_emojis: { ...emojis, [id]: { name: emojiName, value: emojiValue, addedBy: uid! } } });
      show('Emoji eklendi');
      setEmojiName(''); setEmojiValue('');
    } catch (e: any) {
      show(e.message, 'error');
    }
  };

  const handleRemoveEmoji = async (emojiId: string) => {
    try {
      await removeCustomEmoji(emojiId);
      await writeAuditLog({ action: 'REMOVE_EMOJI', detail: `Emoji silindi: ${emojiId}`, admin_uid: uid!, admin_role: role! });
      const next = { ...emojis };
      delete next[emojiId];
      onChange({ ...assets, custom_emojis: next });
      show('Emoji silindi');
    } catch (e: any) {
      show(e.message, 'error');
    }
  };

  const logoValid = !assets.logo_url || assets.logo_url.startsWith('https://');
  const faviconValid = !assets.favicon_url || assets.favicon_url.startsWith('https://');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Toast toast={toast} />

      {/* Logo & Favicon */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>🖼 Logo & Favicon</p>

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, display: 'block', marginBottom: 6 }}>Logo URL</label>
          <Input value={assets.logo_url || ''} onChange={v => onChange({ ...assets, logo_url: v })} placeholder="https://..." />
          {!logoValid && <p style={{ color: '#ef4444', fontSize: 10, marginTop: 3 }}>https:// ile başlamalı</p>}
          {assets.logo_url && logoValid && (
            <img src={assets.logo_url} alt="logo" onError={e => (e.currentTarget.style.display = 'none')}
              style={{ marginTop: 8, maxHeight: 48, maxWidth: '100%', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)' }} />
          )}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, display: 'block', marginBottom: 6 }}>Favicon URL</label>
          <Input value={assets.favicon_url || ''} onChange={v => onChange({ ...assets, favicon_url: v })} placeholder="https://..." />
          {!faviconValid && <p style={{ color: '#ef4444', fontSize: 10, marginTop: 3 }}>https:// ile başlamalı</p>}
          {assets.favicon_url && faviconValid && (
            <img src={assets.favicon_url} alt="favicon" onError={e => (e.currentTarget.style.display = 'none')}
              style={{ marginTop: 8, width: 32, height: 32, borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }} />
          )}
        </div>

        <Btn onClick={handleSaveUrls} disabled={saving || !logoValid || !faviconValid}>Kaydet</Btn>
      </div>

      {/* Özel Emojiler */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>😀 Özel Emojiler</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input value={emojiName} onChange={e => setEmojiName(e.target.value)} placeholder="Ad"
            style={{ flex: 1, background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, padding: '7px 10px', fontSize: 12 }} />
          <input value={emojiValue} onChange={e => setEmojiValue(e.target.value)} placeholder="URL veya emoji"
            style={{ flex: 2, background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, padding: '7px 10px', fontSize: 12 }} />
          <Btn onClick={handleAddEmoji}>Ekle</Btn>
        </div>

        <div style={{ maxHeight: 280, overflowY: 'auto' }}>
          {Object.entries(emojis).length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>Henüz emoji yok</p>
          ) : (
            Object.entries(emojis).map(([id, emoji]) => (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: 20, minWidth: 28 }}>{emoji.value.startsWith('http') ? <img src={emoji.value} style={{ width: 24, height: 24, borderRadius: 4 }} alt="" /> : emoji.value}</span>
                <span style={{ color: '#fff', fontSize: 12, flex: 1 }}>{emoji.name}</span>
                <button onClick={() => handleRemoveEmoji(id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
