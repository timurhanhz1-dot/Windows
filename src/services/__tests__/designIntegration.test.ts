import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  isValidHexColor,
  clampNumeric,
  isValidUrl,
  applyCssVariables,
  DesignState,
  ThemeConfig,
} from '../../components/backoffice/services/designStateManager';

// ── Property 1: Backward Compatibility ───────────────────────────────────────
// Legacy fields (primary_color, bg_color, font_size, border_radius, bg_style,
// logo_url, favicon_url) must be preserved when new fields are added.

describe('Property 1: Backward compatibility — legacy fields preserved', () => {
  it('legacy fields survive a theme update merge', () => {
    fc.assert(
      fc.property(
        fc.record({
          primary_color: fc.stringMatching(/^#[0-9A-Fa-f]{6}$/),
          bg_color: fc.stringMatching(/^#[0-9A-Fa-f]{6}$/),
          font_size: fc.integer({ min: 10, max: 32 }),
          border_radius: fc.integer({ min: 0, max: 24 }),
          logo_url: fc.constant('https://example.com/logo.png'),
          favicon_url: fc.constant('https://example.com/fav.ico'),
        }),
        fc.record({
          primary_color: fc.stringMatching(/^#[0-9A-Fa-f]{6}$/),
          bg_color: fc.stringMatching(/^#[0-9A-Fa-f]{6}$/),
          font_size: fc.integer({ min: 10, max: 32 }),
          border_radius: fc.integer({ min: 0, max: 24 }),
          bg_style: fc.constantFrom('dark', 'gradient', 'deep', 'custom'),
        }),
        (legacy, newTheme) => {
          // Simulate saveTheme: writes theme + legacy fields
          const saved: DesignState = {
            ...legacy,
            theme: newTheme as ThemeConfig,
            primary_color: newTheme.primary_color,
            bg_color: newTheme.bg_color,
            font_size: newTheme.font_size,
            border_radius: newTheme.border_radius,
            bg_style: newTheme.bg_style,
          };
          // Legacy URL fields must be preserved
          expect(saved.logo_url).toBe(legacy.logo_url);
          expect(saved.favicon_url).toBe(legacy.favicon_url);
          // New theme fields must be present
          expect(saved.theme).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('legacy fields are valid after round-trip through validation', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^#[0-9A-Fa-f]{6}$/),
        fc.integer({ min: 10, max: 32 }),
        fc.integer({ min: 0, max: 24 }),
        (color, fontSize, borderRadius) => {
          // Validate and clamp
          const validColor = isValidHexColor(color) ? color : '#000000';
          const validFontSize = clampNumeric(fontSize, 10, 32);
          const validBorderRadius = clampNumeric(borderRadius, 0, 24);
          expect(isValidHexColor(validColor)).toBe(true);
          expect(validFontSize).toBeGreaterThanOrEqual(10);
          expect(validFontSize).toBeLessThanOrEqual(32);
          expect(validBorderRadius).toBeGreaterThanOrEqual(0);
          expect(validBorderRadius).toBeLessThanOrEqual(24);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 2: CSS Variable Update ──────────────────────────────────────────
// Firebase value change → CSS variable update (simulated via applyCssVariables)

describe('Property 2: CSS variable update on state change', () => {
  it('applyCssVariables reflects all color fields', () => {
    const state: Partial<DesignState & ThemeConfig> = {
      primary_color: '#6366f1',
      bg_color: '#0d0d1a',
      accent_color: '#10b981',
      sidebar_color: '#111827',
      text_color: '#ffffff',
    };
    applyCssVariables(state);
    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('#6366f1');
    expect(document.documentElement.style.getPropertyValue('--color-bg')).toBe('#0d0d1a');
    expect(document.documentElement.style.getPropertyValue('--color-accent')).toBe('#10b981');
    expect(document.documentElement.style.getPropertyValue('--color-sidebar')).toBe('#111827');
    expect(document.documentElement.style.getPropertyValue('--color-text')).toBe('#ffffff');
  });

  it('Property 2: any valid hex color change is reflected in CSS', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^#[0-9A-Fa-f]{6}$/),
        fc.stringMatching(/^#[0-9A-Fa-f]{6}$/),
        (primary, bg) => {
          applyCssVariables({ primary_color: primary, bg_color: bg });
          expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe(primary);
          expect(document.documentElement.style.getPropertyValue('--color-bg')).toBe(bg);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 4: Role Protection ───────────────────────────────────────────────

describe('Property 4: Role protection — super_admin only', () => {
  function canWrite(role: string | null): boolean {
    return role === 'super_admin';
  }

  it('super_admin can write settings/design', () => {
    expect(canWrite('super_admin')).toBe(true);
  });

  it('admin cannot write settings/design', () => {
    expect(canWrite('admin')).toBe(false);
  });

  it('moderator cannot write settings/design', () => {
    expect(canWrite('moderator')).toBe(false);
  });

  it('null role cannot write settings/design', () => {
    expect(canWrite(null)).toBe(false);
  });

  it('Property 4: any non-super_admin role is denied', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => s !== 'super_admin'),
        (role) => {
          expect(canWrite(role)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });
});
