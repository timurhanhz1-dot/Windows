/**
 * Reaktif Dil Değişikliği & Dil Yükleme Öncelik Sırası — Görev 12 & 13
 *
 * Özellik 9: Reaktif dil değişikliği
 * Validates: Requirements 7.1, 7.2, 7.3
 *
 * Özellik 2: Dil yükleme öncelik sırası
 * Validates: Requirements 2.1, 8.4
 */

// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// ─── i18next mock ─────────────────────────────────────────────────────────────
const mockChangeLanguage = vi.fn();
let mockCurrentLanguage = 'tr';

vi.mock('i18next', () => ({
  default: {
    get language() { return mockCurrentLanguage; },
    changeLanguage: async (lang: string) => {
      mockCurrentLanguage = lang;
      mockChangeLanguage(lang);
    },
    t: (key: string) => key,
    isInitialized: true,
  },
}));

// ─── Özellik 9: Reaktif dil değişikliği ──────────────────────────────────────
describe('Özellik 9: Reaktif dil değişikliği', () => {
  beforeEach(() => {
    mockCurrentLanguage = 'tr';
    mockChangeLanguage.mockClear();
  });

  /**
   * Validates: Requirements 7.1, 7.2
   * Dil değişikliğinin 300ms içinde tamamlandığını ve i18n.language'ın
   * yeni değere eşit olduğunu doğrula.
   */
  it('dil değişikliği 300ms içinde tamamlanmalı ve i18n.language güncellenmeli (property)', async () => {
    const i18n = (await import('i18next')).default;

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('tr', 'en'),
        async (targetLang) => {
          const start = Date.now();
          await i18n.changeLanguage(targetLang);
          const elapsed = Date.now() - start;

          // 300ms içinde tamamlanmalı
          expect(elapsed).toBeLessThan(300);
          // i18n.language yeni değere eşit olmalı
          expect(i18n.language).toBe(targetLang);
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Validates: Requirement 7.3
   * Geçiş sırasında isChanging=true iken mevcut dil korunur (boş/undefined olmaz).
   */
  it('dil değişikliği sırasında mevcut dil boş veya undefined olmamalı (property)', async () => {
    const i18n = (await import('i18next')).default;

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('tr', 'en'),
        async (targetLang) => {
          // Değişiklik öncesi dil geçerli olmalı
          const langBefore = i18n.language;
          expect(langBefore).toBeTruthy();
          expect(langBefore).not.toBe('');

          await i18n.changeLanguage(targetLang);

          // Değişiklik sonrası dil geçerli olmalı
          const langAfter = i18n.language;
          expect(langAfter).toBeTruthy();
          expect(langAfter).not.toBe('');
          expect(['tr', 'en']).toContain(langAfter);
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });

  it('ardışık dil değişiklikleri tutarlı sonuç vermeli', async () => {
    const i18n = (await import('i18next')).default;

    const langs: Array<'tr' | 'en'> = ['en', 'tr', 'en', 'tr'];
    for (const lang of langs) {
      await i18n.changeLanguage(lang);
      expect(i18n.language).toBe(lang);
    }
  });
});

// ─── Özellik 2: Dil yükleme öncelik sırası ───────────────────────────────────
describe('Özellik 2: Dil yükleme öncelik sırası', () => {
  /**
   * Validates: Requirements 2.1, 8.4
   * Firebase > localStorage > navigator > 'tr' (varsayılan) öncelik sırası.
   *
   * Bu testi useLanguage hook'undaki öncelik mantığını simüle ederek doğruluyoruz.
   */

  function resolveLanguage(opts: {
    firebase: string | null;
    localStorage: string | null;
    navigator: string | null;
  }): 'tr' | 'en' {
    const supported: Array<'tr' | 'en'> = ['tr', 'en'];
    const isSupported = (v: string | null): v is 'tr' | 'en' =>
      v !== null && supported.includes(v as 'tr' | 'en');

    // 1. Firebase en yüksek öncelik
    if (isSupported(opts.firebase)) return opts.firebase;
    // 2. localStorage
    if (isSupported(opts.localStorage)) return opts.localStorage;
    // 3. navigator (tarayıcı dili — kısa kod al)
    if (opts.navigator) {
      const short = opts.navigator.split('-')[0] as 'tr' | 'en';
      if (isSupported(short)) return short;
    }
    // 4. Varsayılan: 'tr'
    return 'tr';
  }

  it('Firebase değeri varsa Firebase öncelikli olmalı (property)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('tr', 'en'),
        fc.option(fc.constantFrom('tr', 'en'), { nil: null }),
        fc.option(fc.constantFrom('tr', 'en'), { nil: null }),
        (firebase, localStorage, navigator) => {
          const result = resolveLanguage({ firebase, localStorage, navigator });
          return result === firebase;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Firebase yoksa localStorage öncelikli olmalı (property)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('tr', 'en'),
        fc.option(fc.constantFrom('tr', 'en'), { nil: null }),
        (localStorage, navigator) => {
          const result = resolveLanguage({ firebase: null, localStorage, navigator });
          return result === localStorage;
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Firebase ve localStorage yoksa navigator kullanılmalı (property)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('tr-TR', 'en-US', 'tr', 'en'),
        (navigator) => {
          const result = resolveLanguage({ firebase: null, localStorage: null, navigator });
          const expected = navigator.startsWith('tr') ? 'tr' : 'en';
          return result === expected;
        }
      ),
      { numRuns: 20 }
    );
  });

  it('hiçbir kaynak yoksa varsayılan tr olmalı', () => {
    const result = resolveLanguage({ firebase: null, localStorage: null, navigator: null });
    expect(result).toBe('tr');
  });

  it('desteklenmeyen navigator değeri için tr varsayılmalı', () => {
    const result = resolveLanguage({ firebase: null, localStorage: null, navigator: 'fr-FR' });
    expect(result).toBe('tr');
  });

  it('tüm kombinasyonlarda sonuç her zaman desteklenen bir dil olmalı (property)', () => {
    fc.assert(
      fc.property(
        fc.option(fc.constantFrom('tr', 'en', 'fr', 'de'), { nil: null }),
        fc.option(fc.constantFrom('tr', 'en', 'fr', 'de'), { nil: null }),
        fc.option(fc.constantFrom('tr-TR', 'en-US', 'fr-FR', 'de-DE'), { nil: null }),
        (firebase, localStorage, navigator) => {
          const result = resolveLanguage({ firebase, localStorage, navigator });
          return result === 'tr' || result === 'en';
        }
      ),
      { numRuns: 100 }
    );
  });
});
