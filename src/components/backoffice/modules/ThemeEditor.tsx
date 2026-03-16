import React, { useCallback, useRef } from 'react';
import { themes } from '../../../constants/themes';
import {
  ThemeConfig, isValidHexColor, clampNumeric, isValidUrl,
  applyCssVariables, saveTheme
} from '../services/designStateManager';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { Btn, Input, useToast, Toast } from './shared';

interface Props {
  theme: ThemeConfig;
  onChange: (t: ThemeConfig) => void;
}

const COLOR_FIELDS: { key: keyof ThemeConfig; label: string }[] = [
  { key: 'primary_color', label: 'Ana Renk' },
  { key: 'bg_color', label: 'Arka Plan' },
  { key: 'accent_color', label: 'Vurgu Rengi' },
  { key: 'sidebar_color', label: 'Sidebar Rengi' },
  { key: 'text_color', label: 'Yazı Rengi' },
];

const FONT_FAMILIES = [
  'Inter, sans-serif', 'Roboto, sans-serif', 'Poppins, sans-serif',
  'Montserrat, sans-serif', 'Space Grotesk, sans-serif',
];

export default function ThemeEditor({ theme, onChange }: Props) {
  const { uid } = useBackofficeAuth();
  const { toast, show } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = useCallback((patch: Partial<ThemeConfig>) => {
    const next = { ...theme, ...patch };
    onChange(next);
    applyCssVariables(next);
    // Debounce Firebase write by 500ms
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (uid) saveTheme(next, uid).catch(() => {});
    }, 500);
  }, [theme, onChange, uid]);

  const handleColorChange = (key: keyof ThemeConfig, value: string) => {
    update({ [key]: value } as any);
  };

  const handleSave = async () => {
    try {
      await saveTheme(theme, uid!);
      show('Tema kaydedildi');
    } catch (e: any) {
      show(e.message, 'error');
    }
  };

  const applyPreset = (presetKey: string) => {
    const p = (themes as any)[presetKey];
    if (!p) return;
    const bg = typeof p.bg === 'string' && p.bg.startsWith('#') ? p.bg : '#0d0d1a';
    update({
      primary_color: p.accent || '#6366f1',
      bg_color: bg,
      accent_color: p.accent || '#10b981',
      sidebar_color: p.sidebar || '#111827',
      text_color: p.text || '#ffffff',
    });
  };

  const hasErrors = COLOR_FIELDS.some(f => {
    const v = theme[f.key] as string;
    return v && !isValidHexColor(v);
  }) || !isValidUrl(theme.font_family || '');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Toast toast={toast} />
      {/* Sol panel — renkler */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>🎨 Renkler</p>
        {COLOR_FIELDS.map(({ key, label }) => {
          const val = theme[key] as string || '#000000';
          const invalid = val && !isValidHexColor(val);
          return (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, display: 'block', marginBottom: 6 }}>{label}</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={isValidHexColor(val) ? val : '#000000'}
                  onChange={e => handleColorChange(key, e.target.value)}
                  style={{ width: 40, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', background: 'none', padding: 2 }}
                />
                <input
                  type="text"
                  value={val}
                  onChange={e => handleColorChange(key, e.target.value)}
                  placeholder="#000000"
                  style={{
                    flex: 1, background: '#1a1a2e', border: `1px solid ${invalid ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                    color: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 13, fontFamily: 'monospace'
                  }}
                />
              </div>
              {invalid && <p style={{ color: '#ef4444', fontSize: 10, marginTop: 3 }}>Geçersiz hex renk (#RRGGBB)</p>}
            </div>
          );
        })}

        <div style={{ marginBottom: 14 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, display: 'block', marginBottom: 6 }}>Yazı Boyutu ({theme.font_size || 14}px)</label>
          <input type="range" min={10} max={32} value={theme.font_size || 14}
            onChange={e => update({ font_size: clampNumeric(Number(e.target.value), 10, 32) })}
            style={{ width: '100%', accentColor: '#6366f1' }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, display: 'block', marginBottom: 6 }}>Kenar Yarıçapı ({theme.border_radius || 8}px)</label>
          <input type="range" min={0} max={24} value={theme.border_radius || 8}
            onChange={e => update({ border_radius: clampNumeric(Number(e.target.value), 0, 24) })}
            style={{ width: '100%', accentColor: '#6366f1' }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, display: 'block', marginBottom: 6 }}>Font Ailesi</label>
          <select value={theme.font_family || FONT_FAMILIES[0]}
            onChange={e => update({ font_family: e.target.value })}
            style={{ width: '100%', background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 13 }}>
            {FONT_FAMILIES.map(f => <option key={f} value={f}>{f.split(',')[0]}</option>)}
          </select>
        </div>

        <Btn onClick={handleSave} disabled={hasErrors}>Kaydet</Btn>
      </div>

      {/* Sağ panel — presetler + önizleme */}
      <div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 16 }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>⚡ Hazır Temalar</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {Object.values(themes).map(preset => (
              <button key={preset.id} onClick={() => applyPreset(preset.id)}
                style={{
                  background: typeof preset.bg === 'string' && preset.bg.startsWith('#') ? preset.bg : '#0d0d1a',
                  border: `2px solid ${preset.accent}40`, borderRadius: 10, padding: '10px 12px',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: preset.accent }} />
                  <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>{preset.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Canlı önizleme */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>👁 Canlı Önizleme</p>
          <div style={{ borderRadius: theme.border_radius || 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ background: theme.sidebar_color || '#111827', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: theme.primary_color || '#6366f1' }} />
              <span style={{ color: theme.text_color || '#fff', fontSize: 12, fontFamily: theme.font_family }}>Sidebar</span>
            </div>
            <div style={{ background: theme.bg_color || '#0d0d1a', padding: 14 }}>
              <div style={{ background: theme.accent_color || '#10b981', borderRadius: theme.border_radius || 8, padding: '6px 12px', display: 'inline-block' }}>
                <span style={{ color: '#fff', fontSize: theme.font_size || 14, fontFamily: theme.font_family }}>Buton</span>
              </div>
              <p style={{ color: theme.text_color || '#fff', fontSize: theme.font_size || 14, marginTop: 8, fontFamily: theme.font_family }}>Örnek metin içeriği</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
