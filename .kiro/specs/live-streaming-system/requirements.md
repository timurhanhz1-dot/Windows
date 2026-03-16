# Gereksinimler Belgesi: Canlı Yayın Sistemi

## Giriş

Bu belge, Nature.co platformu için geliştirilecek tam kapsamlı canlı yayın sisteminin gereksinimlerini tanımlar. Sistem; tarayıcı tabanlı WebRTC yayını (WHIP protokolü üzerinden SRS Media Server'a), OBS tabanlı RTMP yayını ve HLS protokolü ile sınırsız eş zamanlı izleyici desteği sağlar. Firebase Realtime Database, yayın meta verisi, sohbet ve izleyici takibi için kullanılır.

---

## Sözlük

- **LiveStreamingService**: Yayın yaşam döngüsünü, Firebase yazma işlemlerini ve SRS iletişimini yöneten servis modülü.
- **WHIPClient**: Tarayıcıdan SRS Media Server'a WebRTC bağlantısı kuran istemci servisi (WHIP protokolü).
- **HLSPlayer**: HLS.js veya native HLS ile yayın oynatma bileşeni.
- **StreamSetupWizard**: Yayın başlatma akışını adım adım yöneten kurulum sihirbazı bileşeni.
- **StreamList**: Aktif yayınları listeleyen ve seçim yapılmasını sağlayan bileşen.
- **StreamChat**: Yayın sırasında gerçek zamanlı sohbet bileşeni.
- **SRS_Media_Server**: Google Cloud Frankfurt'ta çalışan SRS (Simple Realtime Server) medya sunucusu (34.107.65.231).
- **Firebase_RTDB**: Firebase Realtime Database; yayın meta verisi, sohbet ve izleyici takibi için kullanılır.
- **StreamMetadata**: Bir yayına ait tüm meta veriyi (başlık, kategori, mod, kalite, HLS URL vb.) içeren veri yapısı.
- **StreamKey**: Yayıncının Firebase UID'si ile özdeş olan, yayını benzersiz tanımlayan anahtar.
- **WHIP**: WebRTC-HTTP Ingestion Protocol; tarayıcıdan medya sunucusuna WebRTC akışı göndermek için kullanılan protokol.
- **HLS**: HTTP Live Streaming; izleyicilere video akışı sunmak için kullanılan protokol.
- **RTMP**: Real-Time Messaging Protocol; OBS gibi yazılımların medya sunucusuna bağlanmak için kullandığı protokol.
- **onDisconnect**: Firebase'in bağlantı koptuğunda otomatik veri silme mekanizması.

---

## Gereksinimler

### Gereksinim 1: Tarayıcıdan Yayın Başlatma (WebRTC → SRS → HLS)

**Kullanıcı Hikayesi:** Bir yayıncı olarak, tarayıcımdan kamera veya ekran paylaşımı ile yayın başlatmak istiyorum; böylece OBS gibi harici bir yazılım kurmadan canlı yayın yapabilirim.

#### Kabul Kriterleri

1. WHEN bir kullanıcı "Yayın Başlat" butonuna tıkladığında, THE StreamSetupWizard SHALL yayın modu seçim adımını (`method_select`) görüntüler.
2. WHEN tarayıcı modu seçildiğinde, THE StreamSetupWizard SHALL kamera ve mikrofon izni talep eder.
3. IF kamera veya mikrofon izni reddedilirse, THEN THE LiveStreamingService SHALL kullanıcıya tarayıcı ayarlarından izin vermesi için adım adım rehber gösterir ve "Tekrar Dene" butonu sunar.
4. WHEN izin verildiğinde, THE StreamSetupWizard SHALL yayın başlığı, kategori, kalite (360p/720p/1080p) ve cihaz seçimi yapılandırma adımını görüntüler.
5. WHEN yapılandırma tamamlandığında, THE StreamSetupWizard SHALL kamera önizlemesi ile "Yayına Geç" butonunu içeren önizleme adımını görüntüler.
6. WHEN "Yayına Geç" butonuna tıklandığında, THE WHIPClient SHALL `http://34.107.65.231:1985/rtc/v1/whip/?app=live&stream={userId}` endpoint'ine WebRTC bağlantısı kurar.
7. WHEN WHIPClient bağlantısı başarıyla kurulduğunda, THE LiveStreamingService SHALL Firebase `live_streams/{userId}` düğümüne `status: 'live'` içeren StreamMetadata kaydı yazar.
8. WHEN Firebase kaydı oluşturulduğunda, THE LiveStreamingService SHALL `onDisconnect` mekanizması ile `live_streams/{userId}` kaydının bağlantı koptuğunda otomatik silineceğini ayarlar.
9. THE LiveStreamingService SHALL HLS URL'ini `http://34.107.65.231:8080/live/{userId}.m3u8` formatında üretir.
10. WHEN yayın modu `browser_screen` veya `browser_screen_cam` seçildiğinde, THE LiveStreamingService SHALL `navigator.mediaDevices.getDisplayMedia()` ile ekran akışını alır.

---

### Gereksinim 2: OBS ile Yayın Başlatma (RTMP → SRS → HLS)

**Kullanıcı Hikayesi:** Bir yayıncı olarak, OBS yazılımı ile profesyonel kalitede yayın yapmak istiyorum; böylece gelişmiş yayın ayarlarını kullanabilirim.

#### Kabul Kriterleri

1. WHEN OBS modu seçildiğinde, THE StreamSetupWizard SHALL RTMP URL (`rtmp://34.107.65.231/live`) ve StreamKey (userId) bilgilerini görüntüler.
2. WHEN OBS kurulum adımı görüntülendiğinde, THE StreamSetupWizard SHALL OBS indirme bağlantısını içerir.
3. WHEN OBS modu için yayın başlatıldığında, THE LiveStreamingService SHALL Firebase `live_streams/{userId}` düğümüne `mode: 'obs'` ve `status: 'live'` içeren StreamMetadata kaydı yazar.
4. THE LiveStreamingService SHALL OBS modu için StreamKey değerini userId ile özdeş olarak üretir.
5. WHEN OBS modu için yayın başlatıldığında, THE LiveStreamingService SHALL `{ rtmpUrl, streamKey }` değerlerini döndürür.

---

### Gereksinim 3: WHIPClient WebRTC Bağlantı Yönetimi

**Kullanıcı Hikayesi:** Bir yayıncı olarak, tarayıcımdan SRS sunucusuna güvenilir bir WebRTC bağlantısı kurulmasını istiyorum; böylece yayın kesintisiz devam etsin.

#### Kabul Kriterleri

1. WHEN WHIPClient bağlantı kuruyorken, THE WHIPClient SHALL `RTCPeerConnection` oluşturur ve MediaStream track'lerini ekler.
2. WHEN SDP offer oluşturulduğunda, THE WHIPClient SHALL WHIP endpoint'ine HTTP POST isteği ile SDP offer gönderir.
3. WHEN SDP answer alındığında, THE WHIPClient SHALL ICE negotiation sürecini tamamlar.
4. IF WHIPClient bağlantısı başarısız olursa, THEN THE WHIPClient SHALL 3 saniye bekleyerek en fazla 3 kez yeniden bağlanmayı dener.
5. IF 3 yeniden deneme sonrasında bağlantı kurulamazsa, THEN THE LiveStreamingService SHALL kullanıcıya "Yayın sunucusuna bağlanılamadı" hata mesajı gösterir ve OBS alternatifini önerir.
6. WHEN bağlantı durumu değiştiğinde, THE WHIPClient SHALL `onConnectionStateChange` geri çağırımını tetikler.

---

### Gereksinim 4: HLS Player ile Yayın İzleme

**Kullanıcı Hikayesi:** Bir izleyici olarak, aktif yayınları tarayıcımda sorunsuz izlemek istiyorum; böylece herhangi bir ek yazılım kurmadan yayınları takip edebileyim.

#### Kabul Kriterleri

1. WHEN bir izleyici yayın seçtiğinde, THE HLSPlayer SHALL HLS URL'ini yükler ve oynatmayı başlatır.
2. WHILE Safari tarayıcısı kullanılıyorken, THE HLSPlayer SHALL native HLS desteği ile `video.src` üzerinden oynatır.
3. WHILE Safari dışı bir tarayıcı kullanılıyorken, THE HLSPlayer SHALL HLS.js kütüphanesi ile `lowLatencyMode: true` ayarıyla oynatır.
4. IF HLS.js `NETWORK_ERROR` hatası alırsa, THEN THE HLSPlayer SHALL `hls.startLoad()` ile otomatik kurtarma dener.
5. IF HLS.js `MEDIA_ERROR` hatası alırsa, THEN THE HLSPlayer SHALL `hls.recoverMediaError()` ile otomatik kurtarma dener.
6. WHEN HLS stream yüklenirken, THE HLSPlayer SHALL kullanıcıya yükleniyor göstergesi sunar.
7. IF HLS desteklenmiyorsa, THEN THE HLSPlayer SHALL kullanıcıya tarayıcı uyumsuzluğu hata mesajı gösterir.

---

### Gereksinim 5: Yayın Meta Verisi ve Firebase Entegrasyonu

**Kullanıcı Hikayesi:** Bir platform kullanıcısı olarak, aktif yayınların listesini ve detaylarını gerçek zamanlı görmek istiyorum; böylece ilgilendiğim yayınları kolayca bulabilirim.

#### Kabul Kriterleri

1. THE LiveStreamingService SHALL StreamMetadata içinde `uid`, `username`, `title`, `category`, `mode`, `quality`, `status`, `started_at`, `hlsUrl`, `streamKey` ve `viewerCount` alanlarını içerir.
2. WHEN bir yayın başladığında, THE LiveStreamingService SHALL `started_at` alanını Unix timestamp (ms) olarak yazar.
3. WHEN bir yayın sonlandırıldığında, THE LiveStreamingService SHALL `live_streams/{userId}` kaydını Firebase'den siler.
4. WHEN yayıncının bağlantısı koptuğunda, THE Firebase_RTDB SHALL `onDisconnect` mekanizması ile `live_streams/{userId}` kaydını otomatik siler.
5. THE StreamList SHALL Firebase `live_streams` düğümünü gerçek zamanlı dinleyerek aktif yayınları listeler.
6. WHEN yayın başlığı güncellenmek istendiğinde, THE LiveStreamingService SHALL `live_streams/{userId}/title` alanını günceller.
7. THE LiveStreamingService SHALL yayın başlığını en fazla 100 karakter ile sınırlar.

---

### Gereksinim 6: Gerçek Zamanlı Yayın Sohbeti

**Kullanıcı Hikayesi:** Bir izleyici veya yayıncı olarak, yayın sırasında diğer kullanıcılarla sohbet etmek istiyorum; böylece topluluk etkileşimi sağlayabilirim.

#### Kabul Kriterleri

1. WHEN bir kullanıcı sohbet mesajı gönderdiğinde, THE StreamChat SHALL mesajı Firebase `stream_chat/{streamId}` düğümüne `uid`, `user`, `text` ve `ts` alanları ile yazar.
2. THE StreamChat SHALL mesaj içeriğini en fazla 500 karakter ile sınırlar.
3. THE StreamChat SHALL Firebase `stream_chat/{streamId}` düğümünü gerçek zamanlı dinleyerek yeni mesajları görüntüler.
4. THE StreamChat SHALL en son 200 mesajı görüntüler.
5. IF kullanıcı yasaklıysa (`is_banned`), THEN THE StreamChat SHALL mesaj gönderme işlemini reddeder.
6. WHEN yeni mesaj geldiğinde, THE StreamChat SHALL sohbet alanını en son mesaja kaydırır.

---

### Gereksinim 7: İzleyici Takibi (Presence Tracking)

**Kullanıcı Hikayesi:** Bir yayıncı olarak, yayınımı kaç kişinin izlediğini gerçek zamanlı görmek istiyorum; böylece izleyici kitlem hakkında bilgi sahibi olabilirim.

#### Kabul Kriterleri

1. WHEN bir izleyici yayına katıldığında, THE LiveStreamingService SHALL `stream_viewers/{streamId}/{viewerId}` düğümüne `true` değeri yazar.
2. WHEN bir izleyici yayından ayrıldığında, THE Firebase_RTDB SHALL `onDisconnect` mekanizması ile `stream_viewers/{streamId}/{viewerId}` kaydını otomatik siler.
3. THE StreamList SHALL `stream_viewers/{streamId}` düğümündeki kayıt sayısını gerçek zamanlı izleyici sayısı olarak görüntüler.
4. WHILE yayıncı yayın yapıyorken, THE LiveStreamingService SHALL yayıncının kendi izleyici kaydını `stream_viewers` düğümüne yazmaz.

---

### Gereksinim 8: Cihaz Yönetimi ve Hot-Swap

**Kullanıcı Hikayesi:** Bir yayıncı olarak, yayın sırasında kamera veya mikrofon cihazımı değiştirmek istiyorum; böylece yayını kesmeden cihaz sorunlarını çözebilirim.

#### Kabul Kriterleri

1. WHEN izin verildiğinde, THE StreamSetupWizard SHALL mevcut kamera, mikrofon ve hoparlör cihazlarını listeler.
2. WHEN bir cihaz takılır veya çıkarılırsa, THE LiveStreamingService SHALL `devicechange` olayını dinleyerek cihaz listesini günceller.
3. IF yayın sırasında aktif bir cihazın bağlantısı kesilirse, THEN THE LiveStreamingService SHALL kullanıcıya "Bir cihaz bağlantısı kesildi" uyarı mesajı gösterir.
4. WHEN yayıncı yayın sırasında farklı bir kamera seçerse, THE LiveStreamingService SHALL eski video track'ini durdurup yeni cihazdan alınan track ile değiştirir (hot-swap).
5. WHEN yayıncı yayın sırasında farklı bir mikrofon seçerse, THE LiveStreamingService SHALL eski ses track'ini durdurup yeni cihazdan alınan track ile değiştirir (hot-swap).
6. THE StreamSetupWizard SHALL seçili cihaz artık listede yoksa varsayılan cihaza geri döner.

---

### Gereksinim 9: Yayın Kalitesi ve Performans

**Kullanıcı Hikayesi:** Bir yayıncı olarak, yayın kalitesini ihtiyacıma göre ayarlamak istiyorum; böylece bant genişliğim ile görüntü kalitesi arasında denge kurabilirim.

#### Kabul Kriterleri

1. THE StreamSetupWizard SHALL 360p, 720p ve 1080p kalite seçeneklerini sunar.
2. WHEN 720p seçildiğinde, THE LiveStreamingService SHALL video kısıtlamalarını `width: 1280, height: 720` olarak ayarlar.
3. WHEN 1080p seçildiğinde, THE LiveStreamingService SHALL video kısıtlamalarını `width: 1920, height: 1080` olarak ayarlar.
4. WHEN 360p seçildiğinde, THE LiveStreamingService SHALL video kısıtlamalarını `width: 640, height: 360` olarak ayarlar.
5. THE HLSPlayer SHALL `lowLatencyMode: true`, `backBufferLength: 30` ve `maxBufferLength: 20` ayarları ile düşük gecikme modunda çalışır.
6. THE StreamChat SHALL Firebase `stream_chat/{streamId}` düğümünde en son 200 mesajı sınır olarak uygular.

---

### Gereksinim 10: Güvenlik ve Erişim Kontrolü

**Kullanıcı Hikayesi:** Bir platform yöneticisi olarak, yayın sisteminin güvenli çalışmasını istiyorum; böylece kullanıcılar başkasının yayınını ele geçiremesin.

#### Kabul Kriterleri

1. THE LiveStreamingService SHALL StreamKey değerini her zaman yayıncının Firebase UID'si ile özdeş olarak üretir.
2. THE Firebase_RTDB SHALL `live_streams/{userId}` düğümüne yazma işlemini yalnızca `auth.uid === userId` koşulunu sağlayan kullanıcılara izin verir.
3. WHILE uygulama HTTPS dışında bir protokol üzerinden çalışıyorken, THE LiveStreamingService SHALL kamera/mikrofon izni talep etmez ve kullanıcıya HTTPS zorunluluğunu bildirir.
4. THE StreamChat SHALL sohbet mesajlarını React'ın varsayılan kaçış mekanizması ile render eder; `dangerouslySetInnerHTML` kullanmaz.
5. THE Firebase_RTDB SHALL `stream_chat/{streamId}` düğümüne yazma işlemini yalnızca `is_banned` değeri `false` olan kullanıcılara izin verir.

---

### Gereksinim 11: Yayın Sona Erme ve Temizlik

**Kullanıcı Hikayesi:** Bir yayıncı olarak, yayını sonlandırdığımda tüm kaynakların düzgünce temizlenmesini istiyorum; böylece gereksiz Firebase yazmaları ve medya akışları devam etmesin.

#### Kabul Kriterleri

1. WHEN yayıncı "Yayını Bitir" butonuna tıkladığında, THE LiveStreamingService SHALL `live_streams/{userId}` kaydını Firebase'den siler.
2. WHEN yayın sonlandırıldığında, THE LiveStreamingService SHALL tüm MediaStream track'lerini durdurur.
3. WHEN yayın sonlandırıldığında, THE WHIPClient SHALL WebRTC bağlantısını kapatır.
4. WHEN yayıncının bağlantısı beklenmedik şekilde koptuğunda, THE Firebase_RTDB SHALL `onDisconnect` mekanizması ile `live_streams/{userId}` kaydını otomatik siler.
5. WHEN izlenen yayın sona erdiğinde, THE HLSPlayer SHALL izleyiciye "Yayın sona erdi" mesajı gösterir ve yayın listesine yönlendirir.
6. WHEN yayın sonlandırıldığında, THE LiveStreamingService SHALL `stream_viewers/{streamId}` düğümündeki tüm izleyici kayıtlarının `onDisconnect` ile temizleneceğini garanti eder.

---

### Gereksinim 12: Parser ve Serileştirme (StreamMetadata)

**Kullanıcı Hikayesi:** Bir geliştirici olarak, StreamMetadata nesnelerinin Firebase'e doğru yazılıp okunmasını istiyorum; böylece veri tutarsızlıkları oluşmasın.

#### Kabul Kriterleri

1. WHEN bir StreamMetadata nesnesi Firebase'e yazıldığında, THE LiveStreamingService SHALL tüm zorunlu alanları (`uid`, `username`, `title`, `category`, `mode`, `quality`, `status`, `started_at`, `hlsUrl`, `streamKey`) içerir.
2. WHEN Firebase'den StreamMetadata okunduğunda, THE LiveStreamingService SHALL okunan nesneyi geçerli bir StreamMetadata tipine dönüştürür.
3. THE LiveStreamingService SHALL StreamMetadata'yı Firebase'e yazıp okuduktan sonra eşdeğer bir nesne elde eder (round-trip özelliği).
4. IF Firebase'den okunan StreamMetadata eksik zorunlu alan içeriyorsa, THEN THE LiveStreamingService SHALL bu kaydı geçersiz sayar ve yayın listesinde göstermez.
