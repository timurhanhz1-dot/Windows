# Uygulama Planı: Çoklu Dil Desteği (Multi-Language Support)

## Genel Bakış

i18next + react-i18next altyapısı kurularak Nature.co uygulamasına Türkçe/İngilizce dil desteği eklenecektir. Locale dosyaları oluşturulacak, tüm bileşenlerdeki hardcoded stringler çeviri anahtarlarına dönüştürülecek ve kullanıcı dil tercihi Firebase + localStorage'da kalıcı olarak saklanacaktır.

## Görevler

- [x] 1. i18next altyapısını kur ve locale dosyalarını oluştur
  - `i18next`, `react-i18next`, `i18next-browser-languagedetector`, `i18next-http-backend` paketlerini `package.json`'a ekle
  - `src/i18n.ts` dosyasını oluştur: `fallbackLng: 'tr'`, `supportedLngs: ['tr', 'en']`, `backend.loadPath: '/locales/{{lng}}/translation.json'`, `detection.order: ['localStorage', 'navigator']`, `detection.lookupLocalStorage: 'i18nextLng'`, geliştirme ortamında `saveMissing` ve `missingKeyHandler` aktif
  - `main.tsx` içinde React render öncesinde `import './i18n'` ekle; `<Suspense>` ile i18n yüklenmesini beklet
  - `public/locales/tr/translation.json` dosyasını tüm namespace'lerle (`common`, `auth`, `chat`, `forum`, `dm`, `friends`, `admin`, `settings`, `live`, `profile`) oluştur
  - `public/locales/en/translation.json` dosyasını `tr` ile aynı anahtar yapısında İngilizce değerlerle oluştur
  - _Gereksinimler: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 1.1 i18n konfigürasyonu için birim testi yaz
    - `fallbackLng`, `supportedLngs`, `detection.order` değerlerini doğrula
    - `saveMissing` ve `missingKeyHandler`'ın DEV ortamında aktif olduğunu doğrula
    - _Gereksinimler: 1.3, 1.4, 6.5_

  - [ ]* 1.2 Özellik 8 için property testi yaz: Locale dosyaları anahtar eşitliği
    - **Özellik 8: Locale dosyaları anahtar eşitliği**
    - **Doğrular: Gereksinim 6.3**
    - `flatKeys()` yardımcı fonksiyonu ile `tr` ve `en` dosyalarının aynı anahtar kümesini içerdiğini doğrula

  - [ ]* 1.3 Özellik 1 için property testi yaz: Eksik anahtar fallback zinciri
    - **Özellik 1: Eksik anahtar fallback zinciri**
    - **Doğrular: Gereksinim 1.6, 1.7**
    - Rastgele string anahtarlar için `i18n.t()` sonucunun hiçbir zaman `undefined` veya boş string dönmediğini doğrula

- [x] 2. `useLanguage` custom hook'unu oluştur
  - `src/hooks/useLanguage.ts` dosyasını oluştur
  - `changeLanguage(lang: 'tr' | 'en')` fonksiyonu: geçersiz değer için `'tr'`'ye düşen `safeChange` kontrolü, `i18next.changeLanguage()` çağrısı, `localStorage.setItem('i18nextLng', lang)`, `document.documentElement.lang` güncelleme
  - Kullanıcı oturum açıksa `update(ref(db, 'users/{uid}/preferences'), { language: lang })` çağrısı; Firebase hatası sessizce yutulur (DEV'de `console.warn`)
  - `onAuthStateChanged` ile Firebase'den `users/{uid}/preferences/language` okunarak aktif dil güncellenir; alan yoksa `'tr'` varsayılır
  - `isChanging` state'i ile dil değişikliği sırasında mevcut metinler korunur
  - _Gereksinimler: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 7.1, 7.4, 8.1, 8.3_

  - [ ]* 2.1 `useLanguage` hook için birim testi yaz
    - Firebase başarısız olduğunda localStorage'ın güncellendiğini doğrula (mock Firebase)
    - Oturum açık değilken Firebase çağrısı yapılmadığını doğrula
    - _Gereksinimler: 2.5, 2.6_

  - [ ]* 2.2 Özellik 3 için property testi yaz: Dil değişikliği localStorage'a yansır
    - **Özellik 3: Dil değişikliği localStorage'a yansır**
    - **Doğrular: Gereksinim 2.3**
    - `fc.constantFrom('tr', 'en')` ile her dil değişikliği sonrası `localStorage.getItem('i18nextLng')` değerini doğrula

  - [ ]* 2.3 Özellik 4 için property testi yaz: Oturum durumuna göre saklama hedefi
    - **Özellik 4: Oturum durumuna göre saklama hedefi**
    - **Doğrular: Gereksinim 2.4, 2.6**
    - Oturum açıkken Firebase'e yazıldığını, açık değilken yazılmadığını doğrula

  - [ ]* 2.4 Özellik 11 için property testi yaz: Mevcut tercihler korunur
    - **Özellik 11: Mevcut tercihler korunur**
    - **Doğrular: Gereksinim 8.2, 8.3**
    - `fc.record({ theme, compact, fontSize })` ile mevcut prefs yazıldıktan sonra `changeLanguage()` çağrısının `theme`, `compact`, `fontSize` alanlarını değiştirmediğini doğrula

- [x] 3. Kontrol noktası — Tüm testlerin geçtiğinden emin ol
  - Tüm testlerin geçtiğinden emin ol, sorular varsa kullanıcıya sor.

- [x] 4. `UserSettings` bileşenine dil seçici ekle
  - `TABS` dizisine `{ id: 'language', label: t('settings.language.tab'), icon: Globe }` ekle
  - `tab` state tipine `'language'` ekle
  - Dil seçici bölümünü render et: 🇹🇷 Türkçe ve 🇬🇧 English seçenekleri, aktif dil `emerald-500` border + arka plan vurgusu
  - Tıklamada `useLanguage().changeLanguage()` çağrısı
  - Tüm etiket ve açıklamaları `t()` ile çevrilmiş olarak göster
  - `savePrefs()` içine `language` alanını ekleme (bu `useLanguage` hook'u tarafından yönetilir)
  - _Gereksinimler: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 4.1 `UserSettings` dil seçici için birim testi yaz
    - Dil tab'ının render edildiğini doğrula
    - Her iki seçeneğin gösterildiğini doğrula
    - _Gereksinimler: 3.1, 3.2_

  - [ ]* 4.2 Özellik 5 için property testi yaz: Dil seçici aktif dil vurgusu
    - **Özellik 5: Dil seçici aktif dil vurgusu**
    - **Doğrular: Gereksinim 3.2, 3.3**
    - Her iki dil değeri için yalnızca aktif seçeneğin vurgulandığını doğrula

- [x] 5. Öncelikli bileşenleri çevir: `AuthPage` ve `UserSettings`
  - `AuthPage.tsx`: tüm hardcoded Türkçe stringleri `t('auth.*')` anahtarlarıyla değiştir; `useTranslation()` hook'unu ekle
  - `UserSettings.tsx`: tüm hardcoded Türkçe stringleri `t('settings.*')` anahtarlarıyla değiştir; `useTranslation()` hook'unu ekle
  - Her iki locale dosyasına eksik anahtarları ekle
  - _Gereksinimler: 4.1, 4.2_

- [x] 6. Temel navigasyon bileşenlerini çevir: `Sidebar`, `ChannelSidebar`, `ChatArea`
  - `Sidebar.tsx`: `t('common.*')` anahtarlarını kullan
  - `ChannelSidebar.tsx`: `t('common.*')` ve `t('chat.*')` anahtarlarını kullan
  - `ChatArea.tsx`: `t('chat.*')` anahtarlarını kullan; tarih/saat formatlarını `Intl.DateTimeFormat` ile locale'e göre güncelle; çoğul ifadeler için `count` interpolasyonunu kullan
  - Her iki locale dosyasına eksik anahtarları ekle
  - _Gereksinimler: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 6.1 Özellik 6 için property testi yaz: Tarih/saat locale formatı
    - **Özellik 6: Tarih/saat locale formatı**
    - **Doğrular: Gereksinim 4.3**
    - Rastgele `Date` nesneleri için `tr` dilinde `tr-TR`, `en` dilinde `en-US` locale kullanıldığını doğrula

  - [ ]* 6.2 Özellik 7 için property testi yaz: Çoğul ifade doğruluğu
    - **Özellik 7: Çoğul ifade doğruluğu**
    - **Doğrular: Gereksinim 4.4**
    - Rastgele sayısal değerler için `tr` ve `en` dillerinde doğru çoğul formun üretildiğini doğrula

- [x] 7. İletişim bileşenlerini çevir: `DirectMessages`, `Forum`, `FriendSystem`
  - `DirectMessages.tsx`: `t('dm.*')` anahtarlarını kullan
  - `Forum.tsx`: `t('forum.*')` anahtarlarını kullan
  - `FriendSystem.tsx`: `t('friends.*')` anahtarlarını kullan
  - Her iki locale dosyasına eksik anahtarları ekle
  - _Gereksinimler: 4.1, 4.2_

- [x] 8. Profil ve bildirim bileşenlerini çevir: `NotificationCenter`, `ProfilePage`
  - `NotificationCenter.tsx`: `t('common.*')` anahtarlarını kullan
  - `ProfilePage.tsx`: `t('profile.*')` anahtarlarını kullan
  - Her iki locale dosyasına eksik anahtarları ekle
  - _Gereksinimler: 4.1, 4.2_

- [x] 9. Kontrol noktası — Tüm testlerin geçtiğinden emin ol
  - Tüm testlerin geçtiğinden emin ol, sorular varsa kullanıcıya sor.

- [x] 10. Admin Panel bileşenlerini çevir
  - `AdminPanel.tsx` ve tüm alt Admin bileşenlerini (`AdminAiAnalyticsCard`, `AdminAiIntelligencePanel`, `AdminCommunityBrainCard`, `AdminGrowthRadarCard`, `AdminModerationOverviewCard`, `AdminSecuritySignalsCard`, `AdminViralContentCard`) çevir
  - `admin` namespace'ini kullan: `t('admin.*')`
  - Her iki locale dosyasının `admin` bölümüne eksik anahtarları ekle
  - _Gereksinimler: 5.1, 5.2, 5.3_

- [x] 11. Kalan bileşenleri çevir (70+ bileşen)
  - `src/components/` altındaki tüm kalan bileşenleri tara; hardcoded Türkçe string içerenleri tespit et
  - Her bileşene `useTranslation()` ekle ve stringleri uygun namespace anahtarlarıyla değiştir
  - Her iki locale dosyasına eksik anahtarları ekle
  - _Gereksinimler: 4.1, 4.5_

- [x] 12. Özellik 9 için property testi yaz: Reaktif dil değişikliği
  - **Özellik 9: Reaktif dil değişikliği**
  - **Doğrular: Gereksinim 7.1, 7.2, 7.3**
  - `fc.constantFrom('tr', 'en')` ile dil değişikliğinin 300ms içinde tamamlandığını ve `i18n.language`'ın yeni değere eşit olduğunu doğrula
  - Geçiş sırasında boş/undefined metin gösterilmediğini doğrula
  - _Gereksinimler: 7.1, 7.2, 7.3_

- [x] 13. Özellik 2 için property testi yaz: Dil yükleme öncelik sırası
  - **Özellik 2: Dil yükleme öncelik sırası**
  - **Doğrular: Gereksinim 2.1**
  - Firebase değeri var/yok × localStorage değeri var/yok kombinasyonlarında doğru öncelik sırasının (Firebase > localStorage > tarayıcı > `tr`) uygulandığını doğrula
  - _Gereksinimler: 2.1, 8.4_

- [x] 14. Son kontrol noktası — Tüm testlerin geçtiğinden emin ol
  - Tüm testlerin geçtiğinden emin ol, sorular varsa kullanıcıya sor.

## Notlar

- `*` ile işaretli görevler isteğe bağlıdır; daha hızlı MVP için atlanabilir
- Her görev izlenebilirlik için ilgili gereksinimlere referans verir
- Property testleri evrensel doğruluk özelliklerini, birim testleri ise belirli örnekleri ve edge case'leri doğrular
- Kontrol noktaları artımlı doğrulama sağlar
- Locale dosyaları her görev sonrasında güncel tutulmalıdır; eksik anahtar bırakılmamalıdır
