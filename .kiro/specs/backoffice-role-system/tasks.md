# Uygulama Planı: Backoffice Rol Sistemi

## Genel Bakış

Bu plan, `/backoffice` rotasını sıfırdan inşa eder. Mevcut `AdminPanel.tsx` ve `/admin` rotasına hiçbir değişiklik yapılmaz. Tüm bileşenler `src/components/backoffice/` dizininde oluşturulur. Uygulama TypeScript + React + Tailwind CSS + Framer Motion yığınını kullanır.

## Görevler

- [x] 1. Temel Altyapı: Tipler, Servisler ve Firebase Kuralları
  - [x] 1.1 TypeScript tip tanımlarını oluştur
    - `src/components/backoffice/types/backoffice.types.ts` dosyasını oluştur
    - `BackofficeRole`, `AuditLogEntry`, `BackofficeUser`, `FeatureFlags`, `RolePermissions` tiplerini tanımla
    - `getRolePermissions(role)` fonksiyonunu implement et; super_admin tüm izinlere sahip, moderator yalnızca `canDeleteMessages` ve `canViewSupport` true olmalı
    - _Gereksinimler: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 1.2 Property testi: Rol izin matrisi doğruluğu
    - **Property 2: Rol izin matrisi doğruluğu**
    - **Validates: Requirements 2.2, 2.3, 2.4**

  - [x] 1.3 `backofficeService.ts` servisini oluştur
    - `src/components/backoffice/services/backofficeService.ts` dosyasını oluştur
    - `banUser`, `muteUser`, `unmuteUser`, `assignBackofficeRole`, `lockChannel`, `hideChannel`, `deleteMessage`, `updateFeatureFlag` fonksiyonlarını implement et
    - `assignBackofficeRole` içinde `admin`'in `super_admin` atayamaması için `PERMISSION_DENIED` hatası fırlat
    - `BackofficeError` sınıfını tanımla
    - _Gereksinimler: 2.5, 2.6, 3.1, 4.3, 4.4, 4.6, 5.4, 5.5, 6.2, 18.1_

  - [ ]* 1.4 Property testi: Admin super_admin atayamaz
    - **Property 3: Admin super_admin atayamaz**
    - **Validates: Requirements 2.3, 2.6, 4.7**

  - [ ]* 1.5 Property testi: Kullanıcı durum güncelleme round-trip
    - **Property 7: banUser/muteUser round-trip doğruluğu**
    - **Validates: Requirements 4.3, 4.4**

  - [x] 1.6 `auditLogService.ts` servisini oluştur
    - `src/components/backoffice/services/auditLogService.ts` dosyasını oluştur
    - `writeAuditLog(entry)` fonksiyonunu implement et; `logs/` koleksiyonuna `action`, `detail`, `timestamp`, `admin_uid`, `admin_role`, `target_uid?` alanlarıyla yazar
    - _Gereksinimler: 16.5, 19.1, 19.3_

  - [ ]* 1.7 Property testi: AuditLog alan bütünlüğü
    - **Property 5: writeAuditLog çağrısı tüm zorunlu alanları içermeli**
    - **Validates: Requirements 16.5, 19.3**

  - [x] 1.8 Firebase güvenlik kurallarını güncelle
    - `database.rules.json` dosyasına `users/$uid/backoffice_role` için yazma kuralı ekle: yalnızca `backoffice_role === 'super_admin'` olan kullanıcılar yazabilmeli
    - `settings/`, `tv_channels/`, `ip_bans/`, `logs/` koleksiyonlarına `backoffice_role` kontrolü ekle
    - _Gereksinimler: 3.1, 3.2, 3.3, 3.4_

- [x] 2. Checkpoint — Temel altyapı tamamlandı
  - Tüm testlerin geçtiğini doğrula, soru varsa kullanıcıya sor.

- [x] 3. Hook'lar: useBackofficeAuth ve useRoleAccess
  - [x] 3.1 `useBackofficeAuth` hook'unu oluştur
    - `src/components/backoffice/hooks/useBackofficeAuth.ts` dosyasını oluştur
    - `onAuthStateChanged` ile Firebase Auth dinle; her oturum değişikliğinde `users/{uid}/backoffice_role` alanını Firebase'den oku (önbelleğe güvenme)
    - `{ uid, role, isLoading, isAuthorized }` döndür; geçerli roller: `super_admin`, `admin`, `moderator`
    - _Gereksinimler: 1.2, 1.4, 1.5, 2.7_

  - [ ]* 3.2 Property testi: Geçersiz rol → erişim engeli
    - **Property 1: Geçersiz/eksik rol değerleri isAuthorized: false döndürmeli**
    - **Validates: Requirements 1.2, 1.3, 1.4**

  - [x] 3.3 `useRoleAccess` hook'unu oluştur
    - `src/components/backoffice/hooks/useRoleAccess.ts` dosyasını oluştur
    - `useBackofficeAuth`'tan gelen rolü alarak `getRolePermissions` ile izin nesnesini döndür
    - `hasPermission(permKey)` yardımcı fonksiyonunu export et
    - _Gereksinimler: 2.2, 2.3, 2.4_

- [x] 4. Layout ve Navigasyon Bileşenleri
  - [x] 4.1 `RoleGuard.tsx` bileşenini oluştur
    - `src/components/backoffice/RoleGuard.tsx` dosyasını oluştur
    - `useBackofficeAuth` kullanarak yükleme ekranı, yetkisiz yönlendirme (`/`) ve 403 ekranı göster
    - `allowedRoles` prop'u boşsa tüm yetkili rollere izin ver
    - _Gereksinimler: 1.2, 1.3, 1.4, 1.6_

  - [x] 4.2 `BackofficeTopBar.tsx` bileşenini oluştur
    - `src/components/backoffice/BackofficeTopBar.tsx` dosyasını oluştur
    - Kullanıcı adını ve rol badge'ini göster (super_admin: altın, admin: mavi, moderator: gri)
    - Çıkış butonu ekle
    - _Gereksinimler: 20.3_

  - [x] 4.3 `BackofficeSidebar.tsx` bileşenini oluştur
    - `src/components/backoffice/BackofficeSidebar.tsx` dosyasını oluştur
    - `SIDEBAR_ITEMS` dizisini tanımla; her öğe `allowedRoles` içersin
    - Kullanıcının rolüne göre menü öğelerini filtrele
    - Aktif rotayı vurgula; `react-router-dom` `NavLink` kullan
    - _Gereksinimler: 20.1, 20.2_

  - [x] 4.4 `BackofficeLayout.tsx` bileşenini oluştur
    - `src/components/backoffice/BackofficeLayout.tsx` dosyasını oluştur
    - `BackofficeTopBar` + `BackofficeSidebar` + `<Outlet>` düzenini kur
    - Mevcut `/admin` panelinden görsel olarak ayrışan renk şeması kullan (örn. koyu mor/lacivert)
    - _Gereksinimler: 20.2, 20.6_

  - [x] 4.5 `BackofficeApp.tsx` ana giriş noktasını oluştur
    - `src/components/backoffice/BackofficeApp.tsx` dosyasını oluştur
    - `RoleGuard` ile sarılmış `BackofficeLayout` + iç rotaları tanımla
    - Tüm modül rotalarını `React.lazy` ile lazy-load et
    - _Gereksinimler: 1.1, 20.7_

- [x] 5. App.tsx'e Backoffice Rotasını Ekle
  - [x] 5.1 `src/App.tsx`'e `/backoffice/*` rotasını ekle
    - `BackofficeApp`'i import et
    - Mevcut route listesine `<Route path="/backoffice/*" element={<BackofficeApp />} />` ekle
    - `AdminPanel.tsx`'e ve mevcut `/admin` rotasına dokunma
    - _Gereksinimler: 1.1, 20.7_

- [x] 6. Checkpoint — Layout ve navigasyon çalışıyor
  - Tüm testlerin geçtiğini doğrula, soru varsa kullanıcıya sor.

- [x] 7. Dashboard Modülü
  - [x] 7.1 `DashboardModule.tsx` bileşenini oluştur
    - `src/components/backoffice/modules/DashboardModule.tsx` dosyasını oluştur
    - Toplam kullanıcı, çevrimiçi kullanıcı, banlı kullanıcı, toplam mesaj istatistiklerini göster
    - `users/`, `online/`, `messages/` koleksiyonlarından veri oku
    - Yalnızca `super_admin` ve `admin` erişebilmeli
    - _Gereksinimler: 15.1_

- [x] 8. Kullanıcı Yönetimi Modülü
  - [x] 8.1 `UserManagementModule.tsx` bileşenini oluştur
    - `src/components/backoffice/modules/UserManagementModule.tsx` dosyasını oluştur
    - `users/` koleksiyonunu listele; kullanıcı adı, e-posta, kayıt tarihi, mesaj sayısı, backoffice rolü göster
    - Kullanıcı adı/e-posta ile arama filtresi ekle (debounce ile 300ms)
    - _Gereksinimler: 4.1, 4.2_

  - [ ]* 8.2 Property testi: Kullanıcı arama filtreleme doğruluğu
    - **Property 6: Arama sonuçları her zaman sorguyu içermeli**
    - **Validates: Requirements 4.2**

  - [x] 8.3 Ban/mute/rol atama aksiyonlarını ekle
    - Ban/unban, mute/unmute, backoffice_role atama butonlarını ekle
    - Her aksiyon sonrası `writeAuditLog` çağır
    - Rol atama için `assignBackofficeRole` kullan; izin hatalarını toast ile göster
    - `super_admin`'e özel: profil düzenleme, kullanıcı silme, şifre sıfırlama, force logout
    - _Gereksinimler: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

- [x] 9. Kanal Yönetimi Modülü
  - [x] 9.1 `ChannelManagementModule.tsx` bileşenini oluştur
    - `src/components/backoffice/modules/ChannelManagementModule.tsx` dosyasını oluştur
    - `channels/` koleksiyonunu listele; ad, emoji, kilit/gizlilik durumunu göster
    - Kanal oluşturma formu ekle (ad, emoji, açıklama)
    - Kilit, gizle, sil aksiyonlarını ekle; her aksiyon sonrası `writeAuditLog` çağır
    - _Gereksinimler: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 9.2 Property testi: Kanal durum güncelleme round-trip
    - **Property 8: lockChannel/hideChannel round-trip doğruluğu**
    - **Validates: Requirements 5.4, 5.5**

- [x] 10. Mesaj Yönetimi Modülü
  - [x] 10.1 `MessageManagementModule.tsx` bileşenini oluştur
    - `src/components/backoffice/modules/MessageManagementModule.tsx` dosyasını oluştur
    - Kanal seçici ile seçili kanalın mesajlarını listele; gönderen, içerik, zaman damgası göster
    - Mesaj silme, sabitleme, düzenleme aksiyonlarını ekle (rol bazlı)
    - Toplu mesaj silme butonu ekle (`super_admin` ve `admin`)
    - Her aksiyon sonrası `writeAuditLog` çağır
    - _Gereksinimler: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 11. Forum Yönetimi Modülü
  - [x] 11.1 `ForumManagementModule.tsx` bileşenini oluştur
    - `src/components/backoffice/modules/ForumManagementModule.tsx` dosyasını oluştur
    - `forum/` koleksiyonunu listele; başlık, yazar, tarih, yorum sayısı göster
    - Gönderi silme aksiyonu ekle; `super_admin` için kategori yönetimi formu ekle
    - Her aksiyon sonrası `writeAuditLog` çağır
    - _Gereksinimler: 9.1, 9.2, 9.3, 9.4_

- [x] 12. Destek Talepleri Modülü
  - [x] 12.1 `SupportTicketsModule.tsx` bileşenini oluştur
    - `src/components/backoffice/modules/SupportTicketsModule.tsx` dosyasını oluştur
    - `support_tickets/` koleksiyonunu listele; durum, kategori, tarih filtresi ekle
    - Talep detay görünümü, yanıt formu (`admin_reply` alanına yaz) ve kapatma butonu ekle
    - Her aksiyon sonrası `writeAuditLog` çağır
    - _Gereksinimler: 12.1, 12.2, 12.3, 12.4_

- [x] 13. Rozet ve Doğrulama Modülü
  - [x] 13.1 `VerificationModule.tsx` bileşenini oluştur
    - `src/components/backoffice/modules/VerificationModule.tsx` dosyasını oluştur
    - `verification_requests/` koleksiyonunu listele; kullanıcı adı, e-posta, not, durum göster
    - Onay (is_verified: true) ve red (adminNote ile) aksiyonlarını ekle
    - Her aksiyon sonrası `writeAuditLog` çağır
    - _Gereksinimler: 13.1, 13.2, 13.3, 13.4_

- [x] 14. Duyurular Modülü
  - [x] 14.1 `AnnouncementsModule.tsx` bileşenini oluştur
    - `src/components/backoffice/modules/AnnouncementsModule.tsx` dosyasını oluştur
    - Kanal seçici ile sistem mesajı gönderme formu ekle (`sender_id: 'system'`, `type: 'system'`)
    - Tüm kullanıcılara in-app bildirim gönderme formu ekle (`notifications/{uid}/`)
    - FCM toplu push bildirimi desteği ekle (Cloud Function varsa)
    - Her aksiyon sonrası `writeAuditLog` çağır
    - _Gereksinimler: 8.1, 8.2, 8.3, 8.4, 8.5, 22.1, 22.2, 22.3, 22.4_

- [x] 15. Oyunlar Modülü
  - [x] 15.1 `GamesModule.tsx` bileşenini oluştur
    - `src/components/backoffice/modules/GamesModule.tsx` dosyasını oluştur
    - `game_servers/` koleksiyonunu listele; onay durumunu göster; onay/red aksiyonları ekle
    - `tournaments/` koleksiyonunu listele; düzenleme ve silme aksiyonları ekle
    - Her aksiyon sonrası `writeAuditLog` çağır
    - _Gereksinimler: 10.1, 10.2, 10.3, 10.4_

- [x] 16. TV Kanalları Modülü
  - [x] 16.1 `TvChannelsModule.tsx` bileşenini oluştur
    - `src/components/backoffice/modules/TvChannelsModule.tsx` dosyasını oluştur
    - `tv_channels/` koleksiyonunu listele; ad, emoji, YouTube ID, sıra göster
    - Ekleme/düzenleme formu (ad, emoji, açıklama, youtubeChannelId, renk, order) ve silme aksiyonu ekle
    - Her aksiyon sonrası `writeAuditLog` çağır
    - _Gereksinimler: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 17. Guild Yönetimi Modülü
  - [x] 17.1 `GuildsModule.tsx` bileşenini oluştur
    - `src/components/backoffice/modules/GuildsModule.tsx` dosyasını oluştur
    - `guilds/` koleksiyonunu listele; ad, sahip, üye sayısı, oluşturma tarihi göster
    - `super_admin` için guild silme aksiyonu ekle (`guilds/{id}` ve `userGuilds/` kayıtlarını kaldır)
    - Üye listesi ve üye rolü güncelleme görünümü ekle
    - Her aksiyon sonrası `writeAuditLog` çağır
    - _Gereksinimler: 17.1, 17.2, 17.3, 17.4_

- [x] 18. Tasarım Ayarları Modülü
  - [x] 18.1 `DesignSettingsModule.tsx` bileşenini oluştur
    - `src/components/backoffice/modules/DesignSettingsModule.tsx` dosyasını oluştur
    - `settings/design/` yolundan mevcut değerleri oku; `primary_color`, `bg_color`, `font_size`, `border_radius`, `bg_style` alanlarını düzenlenebilir form ile göster
    - Logo URL ve favicon URL alanlarını ekle
    - Özel emoji yönetimi: `settings/custom_emojis/` listele, ekle, sil
    - Kaydet butonuna basıldığında `settings/design/` yoluna yaz; `writeAuditLog` çağır
    - Yalnızca `super_admin` erişebilmeli
    - _Gereksinimler: 7.1, 7.2, 7.3, 7.4, 7.5, 21.1, 21.2, 21.3_

  - [ ]* 18.2 Property testi: Ayar yazma round-trip
    - **Property 9: settings/design/ yoluna yazılan değer okunduğunda aynı değeri döndürmeli**
    - **Validates: Requirements 7.2, 14.1, 18.1**

- [x] 19. Site Ayarları Modülü
  - [x] 19.1 `SiteSettingsModule.tsx` bileşenini oluştur
    - `src/components/backoffice/modules/SiteSettingsModule.tsx` dosyasını oluştur
    - `settings/` koleksiyonundan `site_name`, `welcome_message`, `allow_registration`, `maintenance_mode`, `invite_code`, `banned_words`, `message_history_limit` alanlarını form ile göster
    - Kaydet butonuna basıldığında `settings/` yoluna yaz; `writeAuditLog` çağır
    - Yalnızca `super_admin` erişebilmeli
    - _Gereksinimler: 14.1, 14.2, 14.3, 14.4_

- [x] 20. Feature Flags Modülü
  - [x] 20.1 `FeatureFlagsModule.tsx` bileşenini oluştur
    - `src/components/backoffice/modules/FeatureFlagsModule.tsx` dosyasını oluştur
    - `settings/feature_flags/` koleksiyonunu listele; her flag için toggle switch göster
    - Varsayılan flag'leri göster: `forum_enabled`, `games_enabled`, `live_tv_enabled`, `guild_enabled`, `registration_enabled`
    - Yeni flag ekleme formu ekle; her değişiklik sonrası `writeAuditLog` çağır
    - Yalnızca `super_admin` erişebilmeli
    - _Gereksinimler: 18.1, 18.2, 18.3, 18.4_

- [x] 21. Analytics Modülü
  - [x] 21.1 `AnalyticsModule.tsx` bileşenini oluştur
    - `src/components/backoffice/modules/AnalyticsModule.tsx` dosyasını oluştur
    - Toplam kullanıcı, çevrimiçi, banlı, toplam mesaj istatistiklerini göster
    - Son 7 günlük yeni kayıt ve mesaj sayısını `users/` ve `messages/` koleksiyonlarından hesapla
    - En aktif kanalları ve kullanıcıları mesaj sayısına göre sıralı listele
    - _Gereksinimler: 15.1, 15.2, 15.3, 15.4_

- [x] 22. Güvenlik Modülü
  - [x] 22.1 `SecurityModule.tsx` bileşenini oluştur
    - `src/components/backoffice/modules/SecurityModule.tsx` dosyasını oluştur
    - `ip_bans/` koleksiyonunu listele; IP ekleme ve kaldırma formu ekle
    - Force logout butonu ekle (`settings/force_logout` değerini günceller)
    - Her aksiyon sonrası `writeAuditLog` çağır
    - Yalnızca `super_admin` erişebilmeli
    - _Gereksinimler: 16.1, 16.2, 16.4_

- [x] 23. Denetim Logu Modülü
  - [x] 23.1 `AuditLogModule.tsx` bileşenini oluştur
    - `src/components/backoffice/modules/AuditLogModule.tsx` dosyasını oluştur
    - `logs/` koleksiyonunu listele; işlem türü, yönetici adı, hedef, zaman damgası göster
    - İşlem türü, yönetici adı ve tarih aralığı filtresi ekle
    - 1000'den fazla kayıt varsa en son 500 kaydı göster ve sayfalama ekle
    - `super_admin` için JSON dışa aktarma butonu ekle
    - _Gereksinimler: 16.3, 16.5, 19.1, 19.2, 19.3, 19.4, 19.5_

  - [ ]* 23.2 Property testi: Log listesi boyut sınırı
    - **Property 10: getAuditLogs(limit) 1000+ kayıtta en fazla 500 döndürmeli**
    - **Validates: Requirements 19.5**

- [x] 24. Checkpoint — Tüm modüller tamamlandı
  - Tüm testlerin geçtiğini doğrula, soru varsa kullanıcıya sor.

- [x] 25. Property-Based Test Dosyaları
  - [x]* 25.1 `rolePermissions.test.ts` dosyasını oluştur
    - `src/components/backoffice/__tests__/rolePermissions.test.ts` dosyasını oluştur
    - fast-check ile Property 1 (geçersiz rol → erişim engeli), Property 2 (rol izin matrisi), Property 3 (admin super_admin atayamaz) testlerini yaz
    - Her test minimum 100 iterasyon çalıştırmalı
    - _Gereksinimler: 1.2, 1.3, 1.4, 2.2, 2.3, 2.4, 2.6_

  - [x]* 25.2 `auditLog.test.ts` dosyasını oluştur
    - `src/components/backoffice/__tests__/auditLog.test.ts` dosyasını oluştur
    - fast-check ile Property 4 (her işlem sonrası log sayısı bir artar) ve Property 5 (alan bütünlüğü) testlerini yaz
    - _Gereksinimler: 16.5, 19.1, 19.3_

  - [x]* 25.3 `userSearch.test.ts` dosyasını oluştur
    - `src/components/backoffice/__tests__/userSearch.test.ts` dosyasını oluştur
    - fast-check ile Property 6 (arama filtreleme doğruluğu) testini yaz
    - _Gereksinimler: 4.2_

  - [x]* 25.4 `statusUpdates.test.ts` dosyasını oluştur
    - `src/components/backoffice/__tests__/statusUpdates.test.ts` dosyasını oluştur
    - fast-check ile Property 7 (banUser/muteUser round-trip) ve Property 8 (lockChannel/hideChannel round-trip) testlerini yaz
    - _Gereksinimler: 4.3, 4.4, 5.4, 5.5_

  - [x]* 25.5 `settingsRoundTrip.test.ts` dosyasını oluştur
    - `src/components/backoffice/__tests__/settingsRoundTrip.test.ts` dosyasını oluştur
    - fast-check ile Property 9 (ayar yazma round-trip) testini yaz
    - _Gereksinimler: 7.2, 14.1, 18.1_

  - [x]* 25.6 `logPagination.test.ts` dosyasını oluştur
    - `src/components/backoffice/__tests__/logPagination.test.ts` dosyasını oluştur
    - fast-check ile Property 10 (log listesi boyut sınırı) testini yaz
    - _Gereksinimler: 19.5_

- [x] 26. Son Kontroller ve Entegrasyon
  - [x] 26.1 Başarı/hata toast bildirim sistemini entegre et
    - Tüm modüllerde başarılı işlemler için yeşil, başarısız işlemler için kırmızı toast göster
    - `BackofficeLayout` içine global toast container ekle
    - _Gereksinimler: 20.4, 20.5_

  - [x] 26.2 Erişim kontrolü son doğrulaması
    - Her modülün `RoleGuard` veya `useRoleAccess` ile korunduğunu doğrula
    - `moderator`'ın yalnızca mesaj silme, ban/mute ve destek talebi görüntüleme/yanıtlama işlemlerine erişebildiğini doğrula
    - `AdminPanel.tsx` dosyasının değiştirilmediğini doğrula
    - _Gereksinimler: 1.6, 2.3, 2.4, 20.7_

- [x] 27. Final Checkpoint — Tüm testler geçiyor
  - Tüm testlerin geçtiğini doğrula, soru varsa kullanıcıya sor.

## Notlar

- `*` ile işaretli alt görevler isteğe bağlıdır; MVP için atlanabilir
- Her görev önceki görevlerin üzerine inşa edilir; sırayı koruyun
- `AdminPanel.tsx` ve `/admin` rotasına hiçbir değişiklik yapılmamalıdır
- Property testleri için `fast-check` kütüphanesi kullanılır
- Tüm Firebase işlemleri `backofficeService.ts` üzerinden geçmeli; modüller doğrudan `db` referansına erişmemeli
