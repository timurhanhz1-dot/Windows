import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function isFileSizeValid(sizeBytes: number): boolean {
  return sizeBytes <= MAX_FILE_SIZE;
}

const sanitizeText = (t: string): string =>
  t.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c] || c));

// ── Property 9: File size rejection ──────────────────────────────────────────

describe('Property 9: File size rejection (5 MB limit)', () => {
  it('accepts files exactly at 5 MB', () => {
    expect(isFileSizeValid(MAX_FILE_SIZE)).toBe(true);
  });

  it('rejects files above 5 MB', () => {
    expect(isFileSizeValid(MAX_FILE_SIZE + 1)).toBe(false);
    expect(isFileSizeValid(MAX_FILE_SIZE * 2)).toBe(false);
  });

  it('accepts files below 5 MB', () => {
    expect(isFileSizeValid(0)).toBe(true);
    expect(isFileSizeValid(1024)).toBe(true);
    expect(isFileSizeValid(MAX_FILE_SIZE - 1)).toBe(true);
  });

  it('Property 9: any file > 5MB is rejected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_FILE_SIZE + 1, max: MAX_FILE_SIZE * 10 }),
        (size) => {
          expect(isFileSizeValid(size)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('Property 9: any file <= 5MB is accepted', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_FILE_SIZE }),
        (size) => {
          expect(isFileSizeValid(size)).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ── XSS Sanitization Tests ────────────────────────────────────────────────────

describe('Banner text XSS sanitization', () => {
  it('escapes < and > characters', () => {
    expect(sanitizeText('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes & character', () => {
    expect(sanitizeText('a & b')).toBe('a &amp; b');
  });

  it('escapes double quotes', () => {
    expect(sanitizeText('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(sanitizeText("it's")).toBe('it&#39;s');
  });

  it('leaves safe text unchanged', () => {
    expect(sanitizeText('Hello World 123')).toBe('Hello World 123');
  });

  it('sanitized text never contains raw < > & " \' characters (unescaped)', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (text) => {
          const sanitized = sanitizeText(text);
          // After sanitization, no raw dangerous chars should remain
          // We check by verifying the sanitized string doesn't contain
          // the original dangerous chars in unescaped form
          // i.e., < > must not appear, & only as part of &...; sequences
          expect(sanitized).not.toMatch(/<|>/);
          // & should only appear as start of HTML entity
          const ampMatches = sanitized.match(/&/g) || [];
          const entityMatches = sanitized.match(/&(?:lt|gt|amp|quot|#39);/g) || [];
          expect(ampMatches.length).toBe(entityMatches.length);
        }
      ),
      { numRuns: 200 }
    );
  });
});
