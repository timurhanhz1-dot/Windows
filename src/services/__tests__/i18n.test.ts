/**
 * i18n Konfigürasyon Birim Testleri — Görev 1.1
 * Validates: Requirements 1.3, 1.4, 6.5
 */

// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// i18next modülünü mock'la — HTTP backend gerektirmeden konfigürasyonu test et
vi.mock('i18next-http-backend', () => ({ default: {} }));
vi.mock('i18next-browser-languagedetector', () => ({ default: {} }));

describe('i18n konfigürasyonu', () => {
  it('fallbackLng değeri tr olmalı', async () => {
    // i18n.ts dosyasını doğrudan okuyarak konfigürasyonu doğrula
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'src/i18n.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain("fallbackLng: 'tr'");
  });

  it("supportedLngs ['tr', 'en'] içermeli", async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'src/i18n.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain("supportedLngs: ['tr', 'en']");
  });

  it("detection.order ['localStorage', 'navigator'] olmalı", async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'src/i18n.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain("order: ['localStorage', 'navigator']");
  });

  it("detection.lookupLocalStorage 'i18nextLng' olmalı", async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'src/i18n.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain("lookupLocalStorage: 'i18nextLng'");
  });

  it('DEV ortamında saveMissing aktif olmalı', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'src/i18n.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('saveMissing: import.meta.env.DEV');
  });

  it('DEV ortamında missingKeyHandler tanımlı olmalı', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'src/i18n.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain('missingKeyHandler');
    expect(content).toContain('console.warn');
  });

  it("backend.loadPath '/locales/{{lng}}/translation.json' olmalı", async () => {
    const fs = await import('fs');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'src/i18n.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toContain("loadPath: '/locales/{{lng}}/translation.json'");
  });
});
