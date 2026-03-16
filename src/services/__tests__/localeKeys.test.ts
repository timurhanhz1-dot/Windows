/**
 * Locale Dosyaları Anahtar Eşitliği — Görev 1.2 & 1.3
 *
 * Özellik 8: Locale dosyaları anahtar eşitliği
 * Validates: Requirement 6.3
 *
 * Özellik 1: Eksik anahtar fallback zinciri
 * Validates: Requirements 1.6, 1.7
 */

// @ts-nocheck
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

// ─── Yardımcı: iç içe nesneyi düz anahtar listesine çevir ───────────────────
function flatKeys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return flatKeys(value as object, fullKey);
    }
    return [fullKey];
  });
}

// ─── Locale dosyalarını yükle ────────────────────────────────────────────────
const trPath = path.resolve(process.cwd(), 'public/locales/tr/translation.json');
const enPath = path.resolve(process.cwd(), 'public/locales/en/translation.json');

const trTranslation = JSON.parse(fs.readFileSync(trPath, 'utf-8'));
const enTranslation = JSON.parse(fs.readFileSync(enPath, 'utf-8'));

const trKeys = new Set(flatKeys(trTranslation));
const enKeys = new Set(flatKeys(enTranslation));

// ─── Özellik 8: Locale dosyaları anahtar eşitliği ───────────────────────────
describe('Özellik 8: Locale dosyaları anahtar eşitliği', () => {
  /**
   * Validates: Requirement 6.3
   * tr ve en dosyalarının aynı anahtar kümesini içerdiğini doğrula
   */
  it('tr ve en locale dosyaları aynı anahtar kümesine sahip olmalı (property)', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const trArr = [...trKeys].sort();
        const enArr = [...enKeys].sort();
        return JSON.stringify(trArr) === JSON.stringify(enArr);
      }),
      { numRuns: 1 } // deterministik — 1 yeterli
    );
  });

  it("tr'de olan her anahtar en'de de bulunmalı", () => {
    const missingInEn = [...trKeys].filter(k => !enKeys.has(k));
    expect(missingInEn).toEqual([]);
  });

  it("en'de olan her anahtar tr'de de bulunmalı", () => {
    const missingInTr = [...enKeys].filter(k => !trKeys.has(k));
    expect(missingInTr).toEqual([]);
  });

  it('her iki dosya da tüm namespace\'leri içermeli', () => {
    const requiredNamespaces = ['common', 'auth', 'chat', 'forum', 'dm', 'friends', 'admin', 'settings', 'live', 'profile'];
    for (const ns of requiredNamespaces) {
      expect(trTranslation).toHaveProperty(ns);
      expect(enTranslation).toHaveProperty(ns);
    }
  });
});

// ─── Özellik 1: Eksik anahtar fallback zinciri ──────────────────────────────
describe('Özellik 1: Eksik anahtar fallback zinciri', () => {
  /**
   * Validates: Requirements 1.6, 1.7
   * Rastgele string anahtarlar için i18n.t() sonucunun hiçbir zaman
   * undefined veya boş string dönmediğini doğrula.
   *
   * i18next, bilinmeyen anahtar için anahtarın kendisini döndürür (fallback davranışı).
   * Bu testi locale verisi üzerinde simüle ediyoruz.
   */
  function simulateT(key: string, translations: Record<string, unknown>, fallback: Record<string, unknown>): string {
    // Noktalı anahtar yolunu takip et
    const parts = key.split('.');
    let current: unknown = translations;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in (current as object)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        current = undefined;
        break;
      }
    }
    if (typeof current === 'string' && current !== '') return current;

    // fallbackLng (tr) dene
    let fallbackCurrent: unknown = fallback;
    for (const part of parts) {
      if (fallbackCurrent && typeof fallbackCurrent === 'object' && part in (fallbackCurrent as object)) {
        fallbackCurrent = (fallbackCurrent as Record<string, unknown>)[part];
      } else {
        fallbackCurrent = undefined;
        break;
      }
    }
    if (typeof fallbackCurrent === 'string' && fallbackCurrent !== '') return fallbackCurrent;

    // Son çare: anahtarın kendisi
    return key;
  }

  it('bilinen tr anahtarları için sonuç undefined veya boş olmamalı (property)', () => {
    const knownKeys = [...trKeys];
    fc.assert(
      fc.property(
        fc.constantFrom(...knownKeys),
        (key) => {
          const result = simulateT(key, trTranslation, trTranslation);
          return result !== undefined && result !== '';
        }
      ),
      { numRuns: 100 }
    );
  });

  it('bilinmeyen rastgele anahtarlar için sonuç undefined veya boş olmamalı (property)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => !s.includes('\0')),
        (randomKey) => {
          const result = simulateT(randomKey, enTranslation, trTranslation);
          // Bilinmeyen anahtar için anahtarın kendisi döner — undefined veya '' olmaz
          return result !== undefined && result !== '';
        }
      ),
      { numRuns: 100 }
    );
  });

  it('en locale\'de olmayan anahtar için tr fallback çalışmalı', () => {
    // tr'de var, en'de yok senaryosu simülasyonu
    const fakeEn = { common: { save: 'Save' } };
    const result = simulateT('common.cancel', fakeEn as Record<string, unknown>, trTranslation);
    expect(result).toBe('İptal'); // tr fallback
  });

  it('hiçbir locale\'de olmayan anahtar için anahtar kendisi dönmeli', () => {
    const result = simulateT('nonexistent.key.deep', enTranslation, trTranslation);
    expect(result).toBe('nonexistent.key.deep');
  });
});
