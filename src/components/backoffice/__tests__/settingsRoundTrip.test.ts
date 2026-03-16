import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isValidHexColor, clampNumeric, isValidUrl } from '../services/designStateManager';

// Simulate settings/design round-trip without Firebase
// Property 9: value written to settings/design should be read back unchanged

interface DesignSettings {
  primary_color: string;
  bg_color: string;
  font_size: number;
  border_radius: number;
  logo_url: string;
  favicon_url: string;
}

// Simulate write + read (in-memory store)
class InMemorySettingsStore {
  private store: Record<string, any> = {};

  write(path: string, data: Record<string, any>): void {
    this.store[path] = { ...(this.store[path] || {}), ...data };
  }

  read(path: string): Record<string, any> | null {
    return this.store[path] || null;
  }
}

function validateAndWrite(store: InMemorySettingsStore, settings: DesignSettings): void {
  const validated: DesignSettings = {
    primary_color: isValidHexColor(settings.primary_color) ? settings.primary_color : '#000000',
    bg_color: isValidHexColor(settings.bg_color) ? settings.bg_color : '#000000',
    font_size: clampNumeric(settings.font_size, 10, 32),
    border_radius: clampNumeric(settings.border_radius, 0, 24),
    logo_url: isValidUrl(settings.logo_url) ? settings.logo_url : '',
    favicon_url: isValidUrl(settings.favicon_url) ? settings.favicon_url : '',
  };
  store.write('settings/design', validated);
}

// ── Property 9: Settings write round-trip ────────────────────────────────────

describe('Property 9: settings/design write round-trip', () => {
  it('valid settings are preserved after write+read', () => {
    const store = new InMemorySettingsStore();
    const settings: DesignSettings = {
      primary_color: '#6366f1',
      bg_color: '#0d0d1a',
      font_size: 14,
      border_radius: 8,
      logo_url: 'https://example.com/logo.png',
      favicon_url: 'https://example.com/fav.ico',
    };
    validateAndWrite(store, settings);
    const read = store.read('settings/design');
    expect(read?.primary_color).toBe(settings.primary_color);
    expect(read?.bg_color).toBe(settings.bg_color);
    expect(read?.font_size).toBe(settings.font_size);
    expect(read?.border_radius).toBe(settings.border_radius);
    expect(read?.logo_url).toBe(settings.logo_url);
    expect(read?.favicon_url).toBe(settings.favicon_url);
  });

  it('Property 9: valid hex colors are preserved unchanged', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^#[0-9A-Fa-f]{6}$/),
        fc.stringMatching(/^#[0-9A-Fa-f]{6}$/),
        (primary, bg) => {
          const store = new InMemorySettingsStore();
          validateAndWrite(store, {
            primary_color: primary, bg_color: bg,
            font_size: 14, border_radius: 8,
            logo_url: '', favicon_url: '',
          });
          const read = store.read('settings/design');
          expect(read?.primary_color).toBe(primary);
          expect(read?.bg_color).toBe(bg);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('Property 9: font_size in [10,32] is preserved unchanged', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 32 }),
        (fontSize) => {
          const store = new InMemorySettingsStore();
          validateAndWrite(store, {
            primary_color: '#000000', bg_color: '#000000',
            font_size: fontSize, border_radius: 8,
            logo_url: '', favicon_url: '',
          });
          const read = store.read('settings/design');
          expect(read?.font_size).toBe(fontSize);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('Property 9: https:// URLs are preserved unchanged', () => {
    fc.assert(
      fc.property(
        fc.webUrl({ validSchemes: ['https'] }),
        (url) => {
          const store = new InMemorySettingsStore();
          validateAndWrite(store, {
            primary_color: '#000000', bg_color: '#000000',
            font_size: 14, border_radius: 8,
            logo_url: url, favicon_url: '',
          });
          const read = store.read('settings/design');
          expect(read?.logo_url).toBe(url);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('invalid hex colors are replaced with fallback', () => {
    const store = new InMemorySettingsStore();
    validateAndWrite(store, {
      primary_color: 'not-a-color', bg_color: '#xyz',
      font_size: 14, border_radius: 8,
      logo_url: '', favicon_url: '',
    });
    const read = store.read('settings/design');
    expect(isValidHexColor(read?.primary_color)).toBe(true);
    expect(isValidHexColor(read?.bg_color)).toBe(true);
  });

  it('out-of-range font_size is clamped', () => {
    const store = new InMemorySettingsStore();
    validateAndWrite(store, {
      primary_color: '#000000', bg_color: '#000000',
      font_size: 999, border_radius: 8,
      logo_url: '', favicon_url: '',
    });
    const read = store.read('settings/design');
    expect(read?.font_size).toBe(32);
  });
});
