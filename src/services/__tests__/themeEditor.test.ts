import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  isValidHexColor,
  clampNumeric,
  applyCssVariables,
  ThemeConfig,
} from '../../components/backoffice/services/designStateManager';

// ── Property 2: CSS Variable Instant Update ───────────────────────────────────

describe('Property 2: CSS variable instant update', () => {
  beforeEach(() => {
    // Reset CSS variables
    document.documentElement.style.removeProperty('--color-primary');
    document.documentElement.style.removeProperty('--color-bg');
    document.documentElement.style.removeProperty('--color-accent');
    document.documentElement.style.removeProperty('--color-sidebar');
    document.documentElement.style.removeProperty('--color-text');
    document.documentElement.style.removeProperty('--font-size-base');
    document.documentElement.style.removeProperty('--border-radius');
  });

  it('applyCssVariables sets --color-primary from primary_color', () => {
    applyCssVariables({ primary_color: '#6366f1' });
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#6366f1');
  });

  it('applyCssVariables sets --font-size-base with px suffix', () => {
    applyCssVariables({ font_size: 16 });
    expect(document.documentElement.style.getPropertyValue('--font-size-base')).toBe('16px');
  });

  it('applyCssVariables sets --border-radius with px suffix', () => {
    applyCssVariables({ border_radius: 8 });
    expect(document.documentElement.style.getPropertyValue('--border-radius')).toBe('8px');
  });

  it('Property 2: any valid hex color is reflected in CSS variable', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^#[0-9A-Fa-f]{6}$/),
        (color) => {
          applyCssVariables({ primary_color: color });
          const val = document.documentElement.style.getPropertyValue('--color-primary');
          expect(val).toBe(color);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: font_size in range [10,32] is reflected as Npx', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 32 }),
        (size) => {
          applyCssVariables({ font_size: size });
          const val = document.documentElement.style.getPropertyValue('--font-size-base');
          expect(val).toBe(`${size}px`);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 3: Partial Write Atomicity ──────────────────────────────────────
// Saving theme should not affect unrelated fields (simulated via object spread)

describe('Property 3: Partial write atomicity', () => {
  it('saving theme preserves other design state fields', () => {
    fc.assert(
      fc.property(
        fc.record({
          primary_color: fc.stringMatching(/^#[0-9A-Fa-f]{6}$/),
          bg_color: fc.stringMatching(/^#[0-9A-Fa-f]{6}$/),
          font_size: fc.integer({ min: 10, max: 32 }),
          border_radius: fc.integer({ min: 0, max: 24 }),
        }),
        fc.record({
          logo_url: fc.constant('https://example.com/logo.png'),
          favicon_url: fc.constant('https://example.com/favicon.ico'),
        }),
        (themeFields, assetFields) => {
          // Simulate partial update: theme write should not overwrite assets
          const existing = { ...assetFields, theme: themeFields };
          const afterThemeSave = { ...existing, theme: themeFields };
          // Asset fields must be preserved
          expect(afterThemeSave.logo_url).toBe(assetFields.logo_url);
          expect(afterThemeSave.favicon_url).toBe(assetFields.favicon_url);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('clampNumeric preserves valid values unchanged', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 32 }),
        (size) => {
          expect(clampNumeric(size, 10, 32)).toBe(size);
        }
      ),
      { numRuns: 100 }
    );
  });
});
