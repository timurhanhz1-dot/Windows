import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  isValidHexColor,
  clampNumeric,
  isValidUrl,
  pushUndo,
  undo,
  redo,
} from '../../components/backoffice/services/designStateManager';

// ── Unit Tests: isValidHexColor ───────────────────────────────────────────────

describe('isValidHexColor', () => {
  it('accepts valid 6-digit hex colors', () => {
    expect(isValidHexColor('#000000')).toBe(true);
    expect(isValidHexColor('#FFFFFF')).toBe(true);
    expect(isValidHexColor('#6366f1')).toBe(true);
    expect(isValidHexColor('#10B981')).toBe(true);
    expect(isValidHexColor('#aAbBcC')).toBe(true);
  });

  it('rejects invalid hex colors', () => {
    expect(isValidHexColor('')).toBe(false);
    expect(isValidHexColor('#fff')).toBe(false);       // 3-digit
    expect(isValidHexColor('#GGGGGG')).toBe(false);    // invalid chars
    expect(isValidHexColor('6366f1')).toBe(false);     // missing #
    expect(isValidHexColor('#6366f1f1')).toBe(false);  // 8-digit
    expect(isValidHexColor('#6366f')).toBe(false);     // 5-digit
  });
});

// ── Unit Tests: clampNumeric ──────────────────────────────────────────────────

describe('clampNumeric', () => {
  it('returns value when within range', () => {
    expect(clampNumeric(15, 10, 32)).toBe(15);
    expect(clampNumeric(10, 10, 32)).toBe(10);
    expect(clampNumeric(32, 10, 32)).toBe(32);
  });

  it('clamps to min when below range', () => {
    expect(clampNumeric(5, 10, 32)).toBe(10);
    expect(clampNumeric(-100, 0, 24)).toBe(0);
  });

  it('clamps to max when above range', () => {
    expect(clampNumeric(50, 10, 32)).toBe(32);
    expect(clampNumeric(999, 0, 24)).toBe(24);
  });
});

// ── Unit Tests: isValidUrl ────────────────────────────────────────────────────

describe('isValidUrl', () => {
  it('accepts empty string', () => {
    expect(isValidUrl('')).toBe(true);
  });

  it('accepts https:// URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('https://cdn.example.com/logo.png')).toBe(true);
  });

  it('rejects http:// URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(false);
  });

  it('rejects arbitrary strings', () => {
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('example.com')).toBe(false);
    expect(isValidUrl('//example.com')).toBe(false);
  });
});

// ── Unit Tests: Undo/Redo Stack ───────────────────────────────────────────────

describe('undo/redo stack', () => {
  const makeState = (n: number) => ({ primary_color: `#${String(n).padStart(6, '0')}` });

  it('undo returns null when stack is empty', () => {
    // Push and consume all
    for (let i = 0; i < 15; i++) pushUndo(makeState(i));
    for (let i = 0; i < 15; i++) undo();
    expect(undo()).toBeNull();
  });

  it('redo returns null when stack is empty', () => {
    expect(redo()).toBeNull();
  });

  it('pushUndo limits stack to 10 entries', () => {
    // Reset by consuming
    for (let i = 0; i < 20; i++) undo();
    for (let i = 0; i < 20; i++) pushUndo(makeState(i));
    let count = 0;
    while (undo() !== null) count++;
    expect(count).toBeLessThanOrEqual(10);
  });

  it('pushUndo clears redo stack', () => {
    pushUndo(makeState(1));
    undo();
    pushUndo(makeState(2)); // should clear redo
    expect(redo()).toBeNull();
  });
});

// ── Property-Based Tests ──────────────────────────────────────────────────────

describe('Property 6: Color validation consistency', () => {
  it('isValidHexColor is consistent: valid hex always matches #[0-9A-Fa-f]{6}', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^#[0-9A-Fa-f]{6}$/),
        (color) => {
          expect(isValidHexColor(color)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('isValidHexColor rejects strings not matching hex pattern', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }).filter(
          s => !/^#[0-9A-Fa-f]{6}$/.test(s)
        ),
        (color) => {
          expect(isValidHexColor(color)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe('Property 7: Numeric range validation', () => {
  it('clampNumeric always returns value within [min, max]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (value, a, b) => {
          const min = Math.min(a, b);
          const max = Math.max(a, b);
          const result = clampNumeric(value, min, max);
          expect(result).toBeGreaterThanOrEqual(min);
          expect(result).toBeLessThanOrEqual(max);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('clampNumeric is idempotent: clamping twice gives same result', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: 50, max: 100 }),
        (value, min, max) => {
          const once = clampNumeric(value, min, max);
          const twice = clampNumeric(once, min, max);
          expect(once).toBe(twice);
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe('Property 8: URL validation', () => {
  it('isValidUrl accepts all https:// URLs', () => {
    fc.assert(
      fc.property(
        fc.webUrl({ validSchemes: ['https'] }),
        (url) => {
          expect(isValidUrl(url)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('isValidUrl accepts empty string', () => {
    expect(isValidUrl('')).toBe(true);
  });

  it('isValidUrl rejects http:// URLs', () => {
    fc.assert(
      fc.property(
        fc.webUrl({ validSchemes: ['http'] }),
        (url) => {
          expect(isValidUrl(url)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
