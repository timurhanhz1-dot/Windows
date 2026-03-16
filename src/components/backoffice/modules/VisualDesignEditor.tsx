import React, { useState, useEffect } from 'react';
import { Palette, Layout, Image, Package, RotateCcw, RotateCw } from 'lucide-react';
import {
  DesignState, ThemeConfig, LayoutConfig, AssetConfig,
  subscribeDesignState, pushUndo, undo, redo
} from '../services/designStateManager';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { PageTitle, useToast, Toast } from './shared';
import ThemeEditor from './ThemeEditor';
import LayoutEditor from './LayoutEditor';
import AssetsEditor from './AssetsEditor';
import BannerEditor from './BannerEditor';

type Tab = 'theme' | 'layout' | 'banner' | 'assets';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'theme', label: 'Tema', icon: <Palette size={15} /> },
  { id: 'layout', label: 'Layout', icon: <Layout size={15} /> },
  { id: 'banner', label: 'Banner', icon: <Image size={15} /> },
  { id: 'assets', label: 'Varlıklar', icon: <Package size={15} /> },
];

const DEFAULT_THEME: ThemeConfig = {
  primary_color: '#6366f1', bg_color: '#0d0d1a', bg_style: 'dark',
  font_size: 14, font_family: 'Inter, sans-serif', border_radius: 8,
  sidebar_color: '#111827', accent_color: '#10b981', text_color: '#ffffff',
};

const DEFAULT_LAYOUT: LayoutConfig = {
  slots: [], sidebarWidth: 72, channelSidebarWidth: 240, headerHeight: 48,
};

export default function VisualDesignEditor() {
  const { role } = useBackofficeAuth();
  const { toast, show } = useToast();
  const [tab, setTab] = useState<Tab>('theme');
  const [state, setState] = useState<DesignState>({});
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const unsub = subscribeDesignState(loaded => setState(loaded));
    return unsub;
  }, []);

  if (role !== 'super_admin') {
    return <div style={{ color: 'rgba(255,255,255,0.4)', padding: 40, textAlign: 'center' }}>Bu sayfaya erişim yetkiniz yok.</div>;
  }

  const handleChange = (patch: Partial<DesignState>) => {
    pushUndo(state);
    setState(prev => ({ ...prev, ...patch }));
    setCanUndo(true);
    setCanRedo(false);
  };

  const handleUndo = () => {
    const prev = undo();
    if (prev) { setState(prev); setCanRedo(true); }
    setCanUndo(false);
  };

  const handleRedo = () => {
    const next = redo();
    if (next) { setState(next); setCanUndo(true); }
    setCanRedo(false);
  };

  const theme: ThemeConfig = { ...DEFAULT_THEME, ...(state.theme || {}) };
  const layout: LayoutConfig = { ...DEFAULT_LAYOUT, ...(state.layout || {}) };
  const assets: Partial<AssetConfig> = state.assets || { logo_url: state.logo_url || '', favicon_url: state.favicon_url || '' };

  return (
    <div>
      <Toast toast={toast} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <PageTitle>Görsel Editör</PageTitle>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={handleUndo} disabled={!canUndo} title="Geri Al"
            style={{ background: canUndo ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: canUndo ? 'pointer' : 'not-allowed', color: canUndo ? '#fff' : 'rgba(255,255,255,0.2)' }}>
            <RotateCcw size={14} />
          </button>
          <button onClick={handleRedo} disabled={!canRedo} title="İleri Al"
            style={{ background: canRedo ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: canRedo ? 'pointer' : 'not-allowed', color: canRedo ? '#fff' : 'rgba(255,255,255,0.2)' }}>
            <RotateCw size={14} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: tab === t.id ? 'rgba(99,102,241,0.3)' : 'transparent',
              border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
              color: tab === t.id ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
              fontSize: 13, fontWeight: tab === t.id ? 600 : 400, transition: 'all 0.15s'
            }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'theme' && (
        <ThemeEditor theme={theme} onChange={t => handleChange({ theme: t })} />
      )}
      {tab === 'layout' && (
        <LayoutEditor layout={layout} onChange={l => handleChange({ layout: l })} />
      )}
      {tab === 'banner' && <BannerEditor />}
      {tab === 'assets' && (
        <AssetsEditor assets={assets} onChange={a => handleChange({ assets: a as AssetConfig })} />
      )}
    </div>
  );
}
