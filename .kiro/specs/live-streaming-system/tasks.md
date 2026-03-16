# Uygulama Planı: Canlı Yayın Sistemi (live-streaming-system)

## Genel Bakış

Bu plan, Nature.co platformu için tam kapsamlı canlı yayın sistemini adım adım hayata geçirir. Tarayıcıdan WebRTC → WHIP → SRS → HLS akışı, OBS ile RTMP yayını, gerçek zamanlı sohbet ve izleyici takibi TypeScript/React ile uygulanacaktır.

## Görevler

- [x] 1. Temel servis arayüzleri ve tip tanımlarını oluştur
  - `src/services/liveStreamingService.ts` dosyasını oluştur; `StreamMetadata`, `LiveStreamRecord`, `ChatMessage` arayüzlerini ve `LiveStreamingService` sınıfının iskeletini tanımla
  - `src/services/whipClient.ts` dosyasını oluştur; `WHIPClient` arayüzünü ve sınıf iskeletini tanımla
  - SRS Media Server sabitlerini (`WHIP_ENDPOINT`, `SRS_HLS_BASE`, `SRS_RTMP_URL`) tanımla
  - _Gereksinimler: 1.6, 1.9, 2.1, 3.1, 5.1, 12.1_

- [x] 2. WHIPClient servisini uygula
  - [x] 2.1 WHIPClient.connect() metodunu uygula
    - `RTCPeerConnection` oluştur, MediaStream track'lerini ekle
    - WHIP endpoint'ine HTTP POST ile SDP offer gönder, SDP answer al, ICE negotiation tamamla
    - `onConnectionStateChange` geri çağırımını tetikle
    - _Gereksinimler: 3.1, 3.2, 3.3, 3.6_

  - [x]* 2.2 WHIPClient.connect() için özellik testi yaz
    - **Özellik 6: WHIPClient Yeniden Deneme Sınırı**
    - **Doğrular: Gereksinim 3.4**

  - [x] 2.3 WHIPClient yeniden bağlanma mantığını uygula
    - Bağlantı başarısız olduğunda 3 saniye bekleyerek en fazla 3 kez yeniden dene
    - 3 denemeden sonra hata fırlat
    - _Gereksinimler: 3.4, 3.5_

  - [x] 2.4 WHIPClient.disconnect() metodunu uygula
    - RTCPeerConnection'ı kapat, tüm track'leri durdur
    - _Gereksinim: 11.3_

- [x] 3. LiveStreamingService — Yayın başlatma ve sonlandırma
  - [x] 3.1 startBrowserStream() metodunu uygula
    - HTTPS kontrolü yap; HTTP'de hata fırlat
    - `buildMediaConstraints()` ile kaliteye göre video kısıtlamalarını oluştur (360p/720p/1080p)
    - `getUserMedia` / `getDisplayMedia` ile MediaStream al
    - WHIPClient ile SRS'e bağlan
    - Firebase `live_streams/{userId}` düğümüne StreamMetadata yaz, `onDisconnect` ayarla
    - _Gereksinimler: 1.6, 1.7, 1.8, 1.9, 1.10, 9.2, 9.3, 9.4, 10.3_

  - [x]* 3.2 startBrowserStream() için özellik testleri yaz
    - **Özellik 1: HLS URL Formatı** — Doğrular: Gereksinim 1.9
    - **Özellik 2: StreamKey ve userId Özdeşliği** — Doğrular: Gereksinimler 2.4, 10.1
    - **Özellik 3: Yayın Başlatıldığında Firebase Kaydı** — Doğrular: Gereksinimler 1.7, 2.3, 5.1, 5.2
    - **Özellik 5: onDisconnect Mekanizması** — Doğrular: Gereksinimler 1.8, 5.4
    - **Özellik 10: Kalite Seçimine Göre Video Kısıtlamaları** — Doğrular: Gereksinimler 9.2, 9.3, 9.4
    - **Özellik 18: HTTPS Zorunluluğu** — Doğrular: Gereksinim 10.3

  - [x] 3.3 startOBSStream() metodunu uygula
    - `{ rtmpUrl, streamKey }` döndür; Firebase'e `mode: 'obs'` ile StreamMetadata yaz
    - _Gereksinimler: 2.3, 2.4, 2.5_

  - [x] 3.4 stopStream() metodunu uygula
    - Firebase `live_streams/{userId}` kaydını sil
    - Tüm MediaStream track'lerini durdur
    - WHIPClient bağlantısını kapat
    - _Gereksinimler: 11.1, 11.2, 11.3_

  - [x]* 3.5 stopStream() için özellik testi yaz
    - **Özellik 4: Yayın Sonlandırıldığında Firebase Kaydı Silinir** — Doğrular: Gereksinimler 5.3, 11.1, 11.2, 11.3

  - [x] 3.6 StreamMetadata serileştirme ve doğrulama fonksiyonlarını uygula
    - `serializeMetadata()` ve `parseMetadata()` fonksiyonlarını yaz
    - Eksik zorunlu alan içeren kayıtları filtrele
    - _Gereksinimler: 12.1, 12.2, 12.3, 12.4_

  - [x]* 3.7 StreamMetadata için özellik testleri yaz
    - **Özellik 7: StreamMetadata Zorunlu Alanlar** — Doğrular: Gereksinimler 5.1, 12.1
    - **Özellik 8: StreamMetadata Round-Trip** — Doğrular: Gereksinimler 12.2, 12.3
    - **Özellik 9: Geçersiz StreamMetadata Filtreleme** — Doğrular: Gereksinim 12.4

- [x] 4. Kontrol noktası — Tüm testlerin geçtiğinden emin ol
  - Tüm testlerin geçtiğini doğrula, sorular varsa kullanıcıya sor.

- [x] 5. Cihaz yönetimi ve hot-swap mantığını uygula
  - [x] 5.1 refreshDevices() ve devicechange dinleyicisini uygula
    - Kamera, mikrofon, hoparlör listelerini güncelle
    - Aktif cihaz koptuğunda uyarı göster
    - _Gereksinimler: 8.1, 8.2, 8.3, 8.6_

  - [x] 5.2 hotSwapDevice() metodunu uygula
    - Eski track'i durdur, yeni cihazdan track al, aktif akışa ekle
    - _Gereksinimler: 8.4, 8.5_

  - [x]* 5.3 hotSwapDevice() için özellik testi yaz
    - **Özellik 16: Hot-Swap Sonrası Eski Track Durur** — Doğrular: Gereksinimler 8.4, 8.5

- [x] 6. HLSPlayer bileşenini oluştur (`src/components/HLSPlayer.tsx`)
  - [x] 6.1 HLSPlayer bileşenini uygula
    - Safari'de native HLS, diğer tarayıcılarda HLS.js kullan
    - `lowLatencyMode: true`, `backBufferLength: 30`, `maxBufferLength: 20` ayarlarını uygula
    - Yükleniyor ve hata durumlarını görsel olarak göster
    - _Gereksinimler: 4.1, 4.2, 4.3, 4.6, 4.7, 9.5_

  - [x] 6.2 HLS hata kurtarma mantığını uygula
    - `NETWORK_ERROR` → `hls.startLoad()`, `MEDIA_ERROR` → `hls.recoverMediaError()`
    - Yayın sona erdiğinde "Yayın sona erdi" mesajı göster
    - _Gereksinimler: 4.4, 4.5, 11.5_

  - [ ]* 6.3 HLSPlayer için birim testleri yaz
    - HLS.js mock ile hata kurtarma senaryolarını test et
    - _Gereksinimler: 4.4, 4.5_

- [x] 7. StreamChat bileşenini oluştur (`src/components/StreamChat.tsx`)
  - [x] 7.1 StreamChat bileşenini uygula
    - Firebase `stream_chat/{streamId}` düğümünü gerçek zamanlı dinle
    - Mesaj gönderme: 500 karakter sınırı, yasaklı kullanıcı kontrolü
    - En son 200 mesajı göster, yeni mesajda otomatik kaydır
    - `dangerouslySetInnerHTML` kullanma
    - _Gereksinimler: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.4_

  - [x]* 7.2 StreamChat için özellik testleri yaz
    - **Özellik 11: Sohbet Mesajı Uzunluk Sınırı** — Doğrular: Gereksinim 6.2
    - **Özellik 12: Sohbet Mesajı Listesi Sınırı** — Doğrular: Gereksinimler 6.4, 9.6
    - **Özellik 13: Yasaklı Kullanıcı Mesaj Engeli** — Doğrular: Gereksinimler 6.5, 10.5

- [x] 8. StreamList bileşenini oluştur (`src/components/StreamList.tsx`)
  - [x] 8.1 StreamList bileşenini uygula
    - Firebase `live_streams` düğümünü gerçek zamanlı dinle, aktif yayınları listele
    - `stream_viewers/{streamId}` düğümündeki kayıt sayısını izleyici sayısı olarak göster
    - _Gereksinimler: 5.5, 7.3_

  - [x]* 8.2 İzleyici sayısı için özellik testleri yaz
    - **Özellik 14: İzleyici Sayısı Doğruluğu** — Doğrular: Gereksinim 7.3
    - **Özellik 15: Yayıncı İzleyici Listesinde Yer Almaz** — Doğrular: Gereksinim 7.4

- [x] 9. StreamSetupWizard bileşenini oluştur (`src/components/StreamSetupWizard.tsx`)
  - [x] 9.1 Wizard adım yönetimini ve method_select adımını uygula
    - `SetupStep` tipi: `method_select | permission | configure | obs_setup | preview`
    - Tarayıcı modu ve OBS modu seçim ekranını oluştur
    - _Gereksinimler: 1.1, 1.2_

  - [x] 9.2 permission ve configure adımlarını uygula
    - İzin talep ekranı ve "Tekrar Dene" butonu
    - Başlık (max 100 karakter), kategori, kalite, cihaz seçimi formu
    - _Gereksinimler: 1.2, 1.3, 1.4, 5.7, 8.1_

  - [x] 9.3 obs_setup adımını uygula
    - RTMP URL ve StreamKey gösterimi (kopyalama butonu ile)
    - OBS indirme bağlantısı
    - _Gereksinimler: 2.1, 2.2_

  - [x] 9.4 preview adımını uygula
    - Kamera önizlemesi (`<video>` elementi ile)
    - "Yayına Geç" butonu; tıklandığında `startBrowserStream()` çağır
    - _Gereksinimler: 1.5, 1.6_

  - [ ]* 9.5 StreamSetupWizard için birim testleri yaz
    - Her adım geçişini ve validasyon kurallarını test et
    - _Gereksinimler: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 10. Kontrol noktası — Tüm testlerin geçtiğinden emin ol
  - Tüm testlerin geçtiğini doğrula, sorular varsa kullanıcıya sor.

- [x] 11. LiveSection.tsx bileşenini yeniden yapılandır
  - [x] 11.1 Mevcut LiveChatPage bileşenini yeni servisler ile entegre et
    - `useMediaServer` toggle'ını kaldır (artık her zaman SRS kullanılır)
    - WebRTC P2P yayın modunu WHIPClient tabanlı SRS yayın modu ile değiştir
    - `StreamSetupWizard`, `StreamList`, `StreamChat`, `HLSPlayer` bileşenlerini bağla
    - _Gereksinimler: 1.6, 4.1, 5.5_

  - [x] 11.2 İzleyici presence tracking'i entegre et
    - Yayın seçildiğinde `stream_viewers/{streamId}/{viewerId}` yaz, `onDisconnect` ayarla
    - Yayıncının kendi kaydını `stream_viewers`'a yazma
    - _Gereksinimler: 7.1, 7.2, 7.4_

  - [x] 11.3 Yayın sona erme akışını entegre et
    - "Yayını Bitir" butonu → `stopStream()` çağır
    - İzlenen yayın silindiğinde "Yayın sona erdi" mesajı göster
    - _Gereksinimler: 11.1, 11.2, 11.3, 11.5_

- [x] 12. Son kontrol noktası — Tüm testlerin geçtiğinden emin ol
  - Tüm testlerin geçtiğini doğrula, sorular varsa kullanıcıya sor.

## Notlar

- `*` ile işaretli görevler isteğe bağlıdır; hızlı MVP için atlanabilir
- Her görev, izlenebilirlik için ilgili gereksinimlere referans verir
- Kontrol noktaları artımlı doğrulama sağlar
- Özellik testleri evrensel doğruluk özelliklerini, birim testleri ise belirli örnekleri ve sınır durumlarını doğrular
- `AudioMeter` ve `StreamTimer` bileşenleri mevcut `LiveSection.tsx`'ten korunur
