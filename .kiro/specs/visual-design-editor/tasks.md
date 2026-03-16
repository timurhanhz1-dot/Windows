# Tasks

## Task 1: Proje Altyapısı ve Bağımlılıklar

- [x] 1.1 `@dnd-kit/core` ve `@dnd-kit/sortable` paketlerini `package.json`'a ekle
- [x] 1.2 `fabric` veya `konva` + `react-konva` paketini `package.json`'a ekle
- [x] 1.3 `fast-check` paketini devDependencies'e ekle (property-based testing)
- [x] 1.4 `.kiro/specs/visual-design-editor/.config.kiro` config dosyasının varlığını doğrula

## Task 2: DesignStateManager Servisi

- [x] 2.1 `src/components/backoffice/services/designStateManager.ts` dosyasını oluştur
  - Firebase `settings/design` path'inden okuma/yazma fonksiyonları
  - `onValue` listener ile CSS variable güncelleme mekanizması
  - Partial write için `update()` kullanımı
- [x] 2.2 Validasyon fonksiyonlarını implement et
  - `isValidHexColor(value: string): boolean` — `#[0-9A-Fa-f]{6}` pattern
  - `clampNumeric(value: number, min: number, max: number): number`
  - `isValidUrl(value: string): boolean` — boş veya `https://` ile başlayan
- [x] 2.3 Undo/redo stack'i implement et (en az 10 state)
- [x] 2.4 Validasyon fonksiyonları için birim testleri yaz (`src/services/__tests__/designStateManager.test.ts`)
- [x] 2.5 Property-based testleri yaz
  - Property 6: Renk validasyonu tutarlılığı
  - Property 7: Sayısal aralık validasyonu
  - Property 8: URL validasyonu

## Task 3: VisualDesignEditor Ana Konteyneri

- [x] 3.1 `src/components/backoffice/modules/VisualDesignEditor.tsx` dosyasını oluştur
  - Dört sekme: "Tema", "Layout", "Banner", "Assets"
  - `RoleGuard` ile `super_admin` koruması
  - DesignStateManager entegrasyonu (mount'ta yükleme)
  - Toast hata gösterimi
- [x] 3.2 `DesignSettingsModule.tsx`'i `VisualDesignEditor`'ı export edecek şekilde güncelle (geriye dönük uyumluluk)
- [x] 3.3 Sekme navigasyonu için birim testi yaz
- [x] 3.4 Property-based test yaz
  - Property 4: Rol koruması (super_admin dışı roller için render edilmemeli)

## Task 4: ThemeEditor Bileşeni

- [x] 4.1 `src/components/backoffice/modules/ThemeEditor.tsx` dosyasını oluştur
  - `primary_color`, `bg_color`, `accent_color`, `sidebar_color`, `text_color` için renk inputları
  - `font_size` (10–32 px) ve `border_radius` (0–24 px) için sayısal inputlar
  - `logo_url` ve `favicon_url` için URL inputları
  - Geçersiz değerler için hata göstergesi ve kaydet butonu devre dışı bırakma
- [x] 4.2 `src/constants/themes.tsx`'ten preset tema listesini entegre et
- [x] 4.3 CSS variable anlık güncelleme mekanizmasını implement et (`document.documentElement.style.setProperty`)
- [x] 4.4 Firebase yazma için 500ms debounce implement et
- [x] 4.5 Property-based testleri yaz
  - Property 2: CSS variable anlık güncelleme
  - Property 3: Partial write atomikliği (tema kaydı diğer alanları etkilememeli)

## Task 5: LayoutEditor Bileşeni

- [x] 5.1 `src/components/backoffice/modules/LayoutEditor.tsx` dosyasını oluştur
  - `@dnd-kit/core` + `@dnd-kit/sortable` ile drag & drop
  - 5 slot: `sidebar`, `channel-sidebar`, `chat-area`, `header`, `footer`
  - `sidebarWidth` (48–320 px) input
  - Mobil/masaüstü önizleme toggle'ı
- [x] 5.2 `onDragEnd` handler'ını implement et (slot `order` güncelleme)
- [x] 5.3 Property-based testleri yaz
  - Property 5: Layout slot bütünlüğü (drag sonrası her slot tam olarak bir kez bulunmalı)
  - Property 3: Partial write atomikliği (layout kaydı diğer alanları etkilememeli)

## Task 6: BannerEditor Bileşeni

- [x] 6.1 `src/components/backoffice/modules/BannerEditor.tsx` dosyasını oluştur (`React.lazy` ile yüklenecek)
  - `profile_banner` ve `server_cover` sekmeleri
  - Fabric.js veya Konva.js canvas (maks. 1920×600 px)
  - Element ekleme: `image`, `text`, `shape`, `gradient`
  - Seçili element için properties panel
- [x] 6.2 Export mekanizmasını implement et
  - `canvas.toDataURL()` ile PNG üretimi
  - Firebase Storage'a blob yükleme
  - Başarılı upload sonrası `settings/design/...url` güncelleme
- [x] 6.3 5 MB dosya boyutu kontrolünü implement et (upload öncesi client-side)
- [x] 6.4 Banner metin elementi için XSS sanitizasyonunu implement et
- [x] 6.5 Hata durumunda önceki banner URL'yi koruma mekanizmasını implement et
- [x] 6.6 Property-based testleri yaz
  - Property 9: Dosya boyutu reddi (5 MB üzeri dosyalar reddedilmeli)

## Task 7: AssetsEditor Bileşeni

- [x] 7.1 `src/components/backoffice/modules/AssetsEditor.tsx` dosyasını oluştur
  - `logo_url` ve `favicon_url` URL inputları + inline `<img>` önizleme
  - Özel emoji ekleme/silme (mevcut `addCustomEmoji` / `removeCustomEmoji` servisleri kullanılır)
  - Her emoji işlemi için `writeAuditLog` çağrısı
- [x] 7.2 Property-based test yaz
  - Property 10: Audit log yazma (her emoji mutasyonunda audit log kaydı oluşmalı)

## Task 8: Firebase Güvenlik Kuralları Güncellemesi

- [x] 8.1 `database.rules.json`'ı güncelle: `settings/design` path'ine sadece `backoffice_role === 'super_admin'` olan kullanıcıların yazabilmesini sağla

## Task 9: Entegrasyon Testleri

- [x] 9.1 Firebase emülatörü ile `settings/design` okuma/yazma round-trip testi yaz
  - Property 1: Geriye dönük uyumluluk (legacy alanlar korunmalı)
- [x] 9.2 Ana uygulamanın `onValue` listener'ının CSS variable'ları doğru güncellediğini doğrulayan test yaz
  - Property 2: CSS variable güncelleme (Firebase değişikliği → CSS variable)
- [x] 9.3 `RoleGuard` ile super_admin dışındaki rollerin editöre erişemediğini doğrulayan test yaz
  - Property 4: Rol koruması
