import { ref, update, get, onValue, off } from 'firebase/database';
import { db } from '../../../firebase';

// ── Types ────────────────────────────────────────────────────────────────────

export interface ThemeConfig {
  primary_color: string;
  bg_color: string;
  bg_style: 'dark' | 'gradient' | 'deep' | 'custom';
  font_size: number;
  font_family: string;
  border_radius: number;
  sidebar_color: string;
  accent_color: string;
  text_color: string;
}

export interface LayoutSlot {
  id: 'sidebar' | 'channel-sidebar' | 'chat-area' | 'header' | 'footer';
  label: string;
  position: 'left' | 'right' | 'top' | 'bottom' | 'hidden';
  width?: number;
  order: number;
}

export interface LayoutConfig {
  slots: LayoutSlot[];
  sidebarWidth: number;
  channelSidebarWidth: number;
  headerHeight: number;
}

export interface BannerElement {
  id: string;
  type: 'image' | 'text' | 'shape' | 'gradient';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  props: Record<string, any>;
}

export interface BannerConfig {
  type: 'profile_banner' | 'server_cover';
  width: number;
  height: number;
  elements: BannerElement[];
  background: string;
  exportUrl?: string;
}

export interface AssetConfig {
  logo_url: string;
  favicon_url: string;
  custom_emojis: Record<string, { name: string; value: string; addedBy: string }>;
}

export interface DesignState {
  // Legacy fields (backward compat)
  primary_color?: string;
  bg_color?: string;
  font_size?: number;
  border_radius?: number;
  bg_style?: string;
  logo_url?: string;
  favicon_url?: string;
  // New fields
  theme?: ThemeConfig;
  layout?: LayoutConfig;
  banners?: { profile_banner?: BannerConfig; server_cover?: BannerConfig };
  assets?: AssetConfig;
  last_updated?: number;
  updated_by?: string;
}

// ── Validation ───────────────────────────────────────────────────────────────

export const isValidHexColor = (value: string): boolean =>
  /^#[0-9A-Fa-f]{6}$/.test(value);

export const clampNumeric = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const isValidUrl = (value: string): boolean =>
  value === '' || value.startsWith('https://');

// ── CSS Variable Map ─────────────────────────────────────────────────────────

const CSS_VAR_MAP: Record<string, string> = {
  primary_color: '--color-primary',
  bg_color: '--color-bg',
  accent_color: '--color-accent',
  sidebar_color: '--color-sidebar',
  text_color: '--color-text',
  font_size: '--font-size-base',
  border_radius: '--border-radius',
};

export const applyCssVariables = (state: Partial<DesignState & ThemeConfig>) => {
  const root = document.documentElement;
  Object.entries(CSS_VAR_MAP).forEach(([key, cssVar]) => {
    const val = (state as any)[key];
    if (val !== undefined && val !== null) {
      const strVal = typeof val === 'number' ? `${val}px` : val;
      root.style.setProperty(cssVar, strVal);
    }
  });
  // Also apply theme sub-object
  if ((state as DesignState).theme) {
    applyCssVariables((state as DesignState).theme as any);
  }
};

// ── Undo/Redo Stack ──────────────────────────────────────────────────────────

const MAX_HISTORY = 10;
let undoStack: DesignState[] = [];
let redoStack: DesignState[] = [];

export const pushUndo = (state: DesignState) => {
  undoStack = [state, ...undoStack].slice(0, MAX_HISTORY);
  redoStack = [];
};

export const undo = (): DesignState | null => {
  if (undoStack.length === 0) return null;
  const [prev, ...rest] = undoStack;
  undoStack = rest;
  return prev;
};

export const redo = (): DesignState | null => {
  if (redoStack.length === 0) return null;
  const [next, ...rest] = redoStack;
  redoStack = rest;
  return next;
};

// ── Firebase Operations ──────────────────────────────────────────────────────

export const loadDesignState = async (): Promise<DesignState> => {
  const snap = await get(ref(db, 'settings/design'));
  return snap.val() || {};
};

export const saveTheme = async (theme: ThemeConfig, uid: string): Promise<void> => {
  const validated: ThemeConfig = {
    ...theme,
    primary_color: isValidHexColor(theme.primary_color) ? theme.primary_color : '#6366f1',
    bg_color: isValidHexColor(theme.bg_color) ? theme.bg_color : '#0d0d1a',
    accent_color: isValidHexColor(theme.accent_color) ? theme.accent_color : '#10b981',
    sidebar_color: isValidHexColor(theme.sidebar_color) ? theme.sidebar_color : '#111827',
    text_color: isValidHexColor(theme.text_color) ? theme.text_color : '#ffffff',
    font_size: clampNumeric(theme.font_size, 10, 32),
    border_radius: clampNumeric(theme.border_radius, 0, 24),
  };
  await update(ref(db, 'settings/design'), {
    theme: validated,
    // Legacy fields for backward compat
    primary_color: validated.primary_color,
    bg_color: validated.bg_color,
    font_size: validated.font_size,
    border_radius: validated.border_radius,
    bg_style: validated.bg_style,
    last_updated: Date.now(),
    updated_by: uid,
  });
};

export const saveLayout = async (layout: LayoutConfig, uid: string): Promise<void> => {
  const validated: LayoutConfig = {
    ...layout,
    sidebarWidth: clampNumeric(layout.sidebarWidth, 48, 320),
    channelSidebarWidth: clampNumeric(layout.channelSidebarWidth, 48, 320),
  };
  await update(ref(db, 'settings/design'), {
    layout: validated,
    last_updated: Date.now(),
    updated_by: uid,
  });
};

export const saveAssets = async (assets: Partial<AssetConfig>, uid: string): Promise<void> => {
  const validated = {
    logo_url: isValidUrl(assets.logo_url || '') ? (assets.logo_url || '') : '',
    favicon_url: isValidUrl(assets.favicon_url || '') ? (assets.favicon_url || '') : '',
  };
  await update(ref(db, 'settings/design'), {
    assets: { ...assets, ...validated },
    logo_url: validated.logo_url,
    favicon_url: validated.favicon_url,
    last_updated: Date.now(),
    updated_by: uid,
  });
};

export const subscribeDesignState = (
  callback: (state: DesignState) => void
): (() => void) => {
  const r = ref(db, 'settings/design');
  onValue(r, snap => {
    const state: DesignState = snap.val() || {};
    applyCssVariables(state);
    callback(state);
  });
  return () => off(r);
};
