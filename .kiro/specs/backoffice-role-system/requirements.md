# Gereksinimler Belgesi

## Giriş

Bu belge, mevcut `/admin` panelinin yanına ek olarak gelecek olan `/backoffice` rotasının gereksinimlerini tanımlar. Sistem; `super_admin`, `admin` ve `moderator` olmak üzere üç kademeli bir rol yapısı sunar. Mevcut admin paneli korunur ve dokunulmaz. Backoffice, platform sahibi ve ekip üyelerine sitenin tüm alanları üzerinde granüler kontrol sağlar. Firebase Authentication ile entegre çalışır; ayrı bir giriş sistemi yoktur. Firebase Realtime Database kuralları ile yetkisiz erişim engellenir.

## Sözlük

- **Backoffice**: `/backoffice` rotasında çalışan, rol tabanlı yönetim arayüzü
- **BackofficeAuth**: Firebase Auth kimliğini doğrulayan ve kullanıcının backoffice rolünü `users/{uid}/backoffice_role` alanından okuyan servis
- **RoleGuard**: Kullanıcının backoffice rolünü kontrol eden ve yetersiz yetkide erişimi engelleyen bileşen
- **super_admin**: Platform sahibi; tüm yetkilere sahip rol
- **admin**: Ekip üyesi; geniş yetkilere sahip, super_admin atamalarını yapamaz
- **moderator**: Sınırlı yetkili rol; mesaj silme ve kullanıcı banlama işlemleri yapabilir
- **AuditLog**: Her yetkili işlemin `logs/` koleksiyonuna kaydedildiği denetim izi sistemi
- **FeatureFlag**: `settings/feature_flags/` altında tutulan, özellikleri açıp kapatan boolean değerler
- **SiteSettings**: `settings/` altında tutulan site geneli yapılandırma değerleri
- **DesignSettings**: `settings/design/` altında tutulan görsel tema değerleri

---

## Gereksinimler

### Gereksinim 1: Rota ve Erişim Kontrolü

**Kullanıcı Hikayesi:** Platform yöneticisi olarak, `/backoffice` rotasına yalnızca yetkili kullanıcıların erişebilmesini istiyorum; böylece URL'yi bilen yetkisiz kişiler panele giremez.

#### Kabul Kriterleri

1. THE Backoffice SHALL yalnızca `/backoffice` rotasında render edilmeli; mevcut `/admin` rotası ve bileşenleri değiştirilmemeli.
2. WHEN bir kullanıcı `/backoffice` rotasına erişmeye çalıştığında, THE RoleGuard SHALL Firebase Auth oturumunu doğrulamalı ve `users/{uid}/backoffice_role` değerini okumalı.
3. IF kullanıcının `backoffice_role` değeri `super_admin`, `admin` veya `moderator` değilse, THEN THE RoleGuard SHALL kullanıcıyı `/` rotasına yönlendirmeli.
4. IF kullanıcı Firebase Auth ile oturum açmamışsa, THEN THE RoleGuard SHALL kullanıcıyı `/` rotasına yönlendirmeli.
5. THE BackofficeAuth SHALL `users/{uid}/backoffice_role` alanını yalnızca Firebase Realtime Database kuralları aracılığıyla doğrulamalı; istemci tarafı kontrol tek güvenlik katmanı olmamalı.
6. WHEN bir `moderator` rolündeki kullanıcı `super_admin` veya `admin`'e özel bir işlemi tetiklemeye çalıştığında, THE RoleGuard SHALL işlemi reddetmeli ve kullanıcıya yetki hatası göstermeli.

### Gereksinim 2: Rol Sistemi ve Yetki Matrisi

**Kullanıcı Hikayesi:** Platform sahibi olarak, farklı ekip üyelerine farklı yetki seviyeleri atamak istiyorum; böylece her kişi yalnızca kendi sorumluluğundaki alanlara erişebilir.

#### Kabul Kriterleri

1. THE Backoffice SHALL üç rol tanımlamalı: `super_admin`, `admin`, `moderator`.
2. THE super_admin SHALL bu belgede tanımlanan tüm işlemleri gerçekleştirebilmeli.
3. THE admin SHALL kullanıcı yönetimi, kanal yönetimi, mesaj yönetimi, forum yönetimi, duyurular, destek talepleri, oyun onayları ve analytics işlemlerini gerçekleştirebilmeli; ancak başka bir kullanıcıya `super_admin` rolü atayamamalı ve site güvenlik ayarlarını (IP ban, force logout) değiştiremememeli.
4. THE moderator SHALL yalnızca mesaj silme, kullanıcı banlama/mute ve destek talebi yanıtlama işlemlerini gerçekleştirebilmeli.
5. WHEN bir `super_admin` başka bir kullanıcıya `backoffice_role` atadığında, THE BackofficeAuth SHALL bu değişikliği `users/{uid}/backoffice_role` alanına yazmalı ve AuditLog'a kaydetmeli.
6. IF bir `admin` başka bir kullanıcıya `super_admin` rolü atamaya çalışırsa, THEN THE RoleGuard SHALL işlemi reddetmeli.
7. THE Backoffice SHALL her oturum açışta kullanıcının rolünü Firebase'den yeniden okumalı; önbelleğe alınmış rol verisi tek doğrulama kaynağı olmamalı.

### Gereksinim 3: Firebase Güvenlik Kuralları Entegrasyonu

**Kullanıcı Hikayesi:** Platform sahibi olarak, backoffice yetkilerinin yalnızca istemci tarafında değil Firebase kuralları düzeyinde de korunmasını istiyorum; böylece kötü niyetli kullanıcılar API çağrılarıyla veri manipüle edemez.

#### Kabul Kriterleri

1. THE BackofficeAuth SHALL `users/{uid}/backoffice_role` alanını yalnızca mevcut `super_admin` rolündeki kullanıcıların yazabilmesi için Firebase kurallarına kural eklenmesini gerektirmeli.
2. WHEN `backoffice_role` alanı güncellendiğinde, THE Firebase kuralları SHALL yalnızca `users/{auth.uid}/backoffice_role === 'super_admin'` olan kullanıcıların bu alanı yazabilmesine izin vermeli.
3. THE Backoffice SHALL `settings/`, `tv_channels/`, `ip_bans/` ve `logs/` koleksiyonlarına erişim için mevcut `is_admin` kurallarına ek olarak `backoffice_role` kontrolü de desteklemeli.
4. IF bir kullanıcı `backoffice_role` alanını doğrudan Firebase REST API üzerinden değiştirmeye çalışırsa, THEN THE Firebase kuralları SHALL bu isteği reddetmeli.

### Gereksinim 4: Kullanıcı Yönetimi

**Kullanıcı Hikayesi:** Yönetici olarak, tüm platform kullanıcılarını tek bir ekrandan görmek, aramak ve yönetmek istiyorum; böylece moderasyon işlemlerini hızlıca gerçekleştirebilirim.

#### Kabul Kriterleri

1. THE Backoffice SHALL tüm kullanıcıları `users/` koleksiyonundan listelemeli; kullanıcı adı, e-posta, kayıt tarihi, son aktiflik, mesaj sayısı ve mevcut backoffice rolü bilgilerini göstermeli.
2. WHEN bir yönetici kullanıcı adı veya e-posta ile arama yaptığında, THE Backoffice SHALL sonuçları 300ms içinde filtrelemeli.
3. THE super_admin ve admin SHALL bir kullanıcıyı banlayabilmeli (`is_banned: true`) ve ban kaldırabilmeli.
4. THE super_admin ve admin SHALL bir kullanıcıyı belirli bir süre için susturabilmeli (`is_muted: true`, `mute_until: ISO8601`).
5. THE super_admin SHALL bir kullanıcının profilini düzenleyebilmeli (kullanıcı adı, biyografi, avatar URL).
6. THE super_admin SHALL bir kullanıcı hesabını kalıcı olarak silebilmeli; silme işlemi Firebase Auth kaydını ve `users/{uid}` verisini kaldırmalı.
7. THE super_admin ve admin SHALL bir kullanıcıya `backoffice_role` atayabilmeli veya mevcut rolü kaldırabilmeli; ancak `admin` rolündeki kullanıcı `super_admin` atayamamalı.
8. WHEN bir kullanıcı banlandığında veya silindiğinde, THE AuditLog SHALL işlemi gerçekleştiren yöneticinin uid'i, hedef kullanıcı uid'i, işlem türü ve zaman damgasıyla kaydetmeli.
9. THE super_admin SHALL bir kullanıcıya şifre sıfırlama e-postası gönderebilmeli.
10. THE super_admin SHALL tüm aktif oturumları sonlandırmak için `settings/force_logout` değerini güncelleyebilmeli.

### Gereksinim 5: Kanal Yönetimi

**Kullanıcı Hikayesi:** Yönetici olarak, tüm kanalları oluşturmak, düzenlemek ve silmek istiyorum; böylece platform içeriğini tam olarak kontrol edebilirim.

#### Kabul Kriterleri

1. THE super_admin ve admin SHALL `channels/` koleksiyonundaki tüm kanalları listeleyebilmeli; kanal adı, emoji, açıklama, kilit durumu ve gizlilik durumunu göstermeli.
2. THE super_admin ve admin SHALL yeni kanal oluşturabilmeli; kanal adı, emoji ve açıklama alanlarını belirleyebilmeli.
3. THE super_admin ve admin SHALL mevcut bir kanalı silebilmeli; silme işlemi `channels/{id}` ve `messages/{id}` verilerini kaldırmalı.
4. THE super_admin ve admin SHALL bir kanalı kilitleyebilmeli (`is_locked: true`) veya kilidini açabilmeli.
5. THE super_admin ve admin SHALL bir kanalı gizleyebilmeli (`is_hidden: true`) veya görünür yapabilmeli.
6. THE super_admin ve admin SHALL bir kanalın emoji ve açıklamasını güncelleyebilmeli.
7. WHEN bir kanal silindiğinde, THE AuditLog SHALL işlemi kaydetmeli.

### Gereksinim 6: Mesaj Yönetimi

**Kullanıcı Hikayesi:** Yönetici olarak, tüm kanallardaki mesajları görmek, silmek, düzenlemek ve sabitlemek istiyorum; böylece içerik moderasyonunu etkin biçimde yapabilirim.

#### Kabul Kriterleri

1. THE super_admin, admin ve moderator SHALL tüm kanallardaki mesajları listeleyebilmeli; gönderen adı, içerik ve zaman damgasını göstermeli.
2. THE super_admin, admin ve moderator SHALL herhangi bir mesajı silebilmeli (`messages/{channelId}/{messageId}` kaldırılmalı).
3. THE super_admin ve admin SHALL bir mesajı sabitleyebilmeli (`is_pinned: true`) veya sabitlemeyi kaldırabilmeli.
4. THE super_admin ve admin SHALL bir mesajı düzenleyebilmeli; düzenleme `is_edited: true` ve `edited_content` alanlarını güncellenmeli.
5. THE super_admin ve admin SHALL bir kanalın tüm mesajlarını toplu olarak silebilmeli.
6. WHEN bir mesaj silindiğinde veya düzenlendiğinde, THE AuditLog SHALL işlemi kaydetmeli.

### Gereksinim 7: Site Görünümü Yönetimi

**Kullanıcı Hikayesi:** Platform sahibi olarak, sitenin görsel tasarımını (renkler, fontlar, border radius, arka plan stili) kod değişikliği yapmadan yönetmek istiyorum.

#### Kabul Kriterleri

1. THE super_admin SHALL `settings/design/` altındaki tasarım değerlerini güncelleyebilmeli: `primary_color`, `bg_color`, `font_size`, `border_radius`, `bg_style`.
2. WHEN tasarım ayarları kaydedildiğinde, THE Backoffice SHALL değerleri `settings/design/` yoluna yazmalı; mevcut `App.tsx` dinleyicisi bu değişiklikleri otomatik olarak CSS değişkenlerine yansıtmalı.
3. THE super_admin SHALL logo URL'sini (`settings/logo_url`) ve favicon URL'sini (`settings/favicon_url`) güncelleyebilmeli.
4. THE super_admin SHALL özel emoji paketleri ekleyebilmeli ve kaldırabilmeli; emoji verileri `settings/custom_emojis/` altında saklanmalı.
5. WHEN tasarım ayarları değiştirildiğinde, THE AuditLog SHALL değişikliği kaydetmeli.

### Gereksinim 8: Bildirim ve Duyuru Yönetimi

**Kullanıcı Hikayesi:** Yönetici olarak, tüm kullanıcılara veya belirli kullanıcılara toplu bildirim ve duyuru göndermek istiyorum.

#### Kabul Kriterleri

1. THE super_admin ve admin SHALL tüm kanallara veya belirli bir kanala sistem mesajı gönderebilmeli.
2. THE super_admin ve admin SHALL tüm kullanıcılara in-app bildirim gönderebilmeli; bildirim `notifications/{uid}/` altına yazılmalı.
3. WHERE FCM Cloud Function yapılandırılmışsa, THE super_admin ve admin SHALL toplu push bildirimi gönderebilmeli.
4. THE super_admin ve admin SHALL belirli bir kullanıcıya hedefli bildirim gönderebilmeli.
5. WHEN bir duyuru gönderildiğinde, THE AuditLog SHALL gönderen yönetici, hedef ve içeriği kaydetmeli.

### Gereksinim 9: Forum Yönetimi

**Kullanıcı Hikayesi:** Yönetici olarak, forum gönderilerini ve kategorilerini yönetmek istiyorum; böylece içerik kalitesini koruyabilirim.

#### Kabul Kriterleri

1. THE super_admin ve admin SHALL tüm forum gönderilerini listeleyebilmeli; başlık, yazar, tarih ve yorum sayısını göstermeli.
2. THE super_admin ve admin SHALL herhangi bir forum gönderisini silebilmeli.
3. THE super_admin SHALL forum kategorilerini oluşturabilmeli, yeniden adlandırabilmeli ve silebilmeli; kategori verileri `settings/forum_categories/` altında saklanmalı.
4. WHEN bir forum gönderisi silindiğinde, THE AuditLog SHALL işlemi kaydetmeli.

### Gereksinim 10: Oyun ve Turnuva Yönetimi

**Kullanıcı Hikayesi:** Yönetici olarak, oyun sunucularını onaylamak ve turnuvaları yönetmek istiyorum.

#### Kabul Kriterleri

1. THE super_admin ve admin SHALL `game_servers/` koleksiyonundaki tüm sunucuları listeleyebilmeli; onay durumunu göstermeli.
2. THE super_admin ve admin SHALL bir oyun sunucusunu onaylayabilmeli (`approved: true`) veya onayı kaldırabilmeli.
3. THE super_admin ve admin SHALL `tournaments/` koleksiyonundaki turnuvaları listeleyebilmeli, düzenleyebilmeli ve silebilmeli.
4. WHEN bir sunucu onaylandığında veya reddedildiğinde, THE AuditLog SHALL işlemi kaydetmeli.

### Gereksinim 11: TV Kanalı Yönetimi

**Kullanıcı Hikayesi:** Platform sahibi olarak, TV kanallarını eklemek, silmek ve sıralamak istiyorum.

#### Kabul Kriterleri

1. THE super_admin ve admin SHALL `tv_channels/` koleksiyonundaki tüm TV kanallarını listeleyebilmeli.
2. THE super_admin ve admin SHALL yeni TV kanalı ekleyebilmeli; ad, emoji, açıklama, YouTube kanal ID'si, renk ve sıra numarası alanlarını belirleyebilmeli.
3. THE super_admin ve admin SHALL mevcut bir TV kanalını düzenleyebilmeli veya silebilmeli.
4. THE super_admin ve admin SHALL TV kanallarının sırasını (`order` alanı) güncelleyebilmeli.
5. WHEN bir TV kanalı eklendiğinde, düzenlendiğinde veya silindiğinde, THE AuditLog SHALL işlemi kaydetmeli.

### Gereksinim 12: Destek Talebi Yönetimi

**Kullanıcı Hikayesi:** Yönetici olarak, kullanıcıların destek taleplerini görmek, yanıtlamak ve kapatmak istiyorum.

#### Kabul Kriterleri

1. THE super_admin, admin ve moderator SHALL `support_tickets/` koleksiyonundaki tüm destek taleplerini listeleyebilmeli; durum (açık/kapalı), kategori ve tarih bilgilerini göstermeli.
2. THE super_admin, admin ve moderator SHALL bir destek talebini yanıtlayabilmeli; yanıt `support_tickets/{id}/admin_reply` alanına yazılmalı.
3. THE super_admin ve admin SHALL bir destek talebini kapatabilmeli (`status: 'closed'`).
4. WHEN bir destek talebi yanıtlandığında veya kapatıldığında, THE AuditLog SHALL işlemi kaydetmeli.

### Gereksinim 13: Rozet ve Doğrulama Talebi Yönetimi

**Kullanıcı Hikayesi:** Yönetici olarak, kullanıcıların rozet ve doğrulama taleplerini incelemek ve onaylamak/reddetmek istiyorum.

#### Kabul Kriterleri

1. THE super_admin ve admin SHALL `verification_requests/` koleksiyonundaki tüm talepleri listeleyebilmeli; kullanıcı adı, e-posta, talep notu ve durum bilgilerini göstermeli.
2. THE super_admin ve admin SHALL bir talebi onaylayabilmeli; onay işlemi `users/{uid}/is_verified: true` ve `verification_requests/{uid}/status: 'approved'` değerlerini güncellenmeli.
3. THE super_admin ve admin SHALL bir talebi reddedebilmeli; red işlemi `verification_requests/{uid}/status: 'rejected'` ve isteğe bağlı `adminNote` alanını güncellenmeli.
4. WHEN bir talep onaylandığında veya reddedildiğinde, THE AuditLog SHALL işlemi kaydetmeli.

### Gereksinim 14: Site Ayarları Yönetimi

**Kullanıcı Hikayesi:** Platform sahibi olarak, bakım modu, kayıt izni ve davet kodu gibi site geneli ayarları yönetmek istiyorum.

#### Kabul Kriterleri

1. THE super_admin SHALL `settings/` koleksiyonundaki site ayarlarını güncelleyebilmeli: `site_name`, `welcome_message`, `allow_registration`, `maintenance_mode`, `invite_code`, `banned_words`, `message_history_limit`.
2. WHEN `maintenance_mode: 'true'` olarak ayarlandığında, THE SiteSettings SHALL mevcut uygulama mantığı aracılığıyla bakım ekranını göstermeli.
3. THE super_admin SHALL `invite_code` değerini belirleyebilmeli; kayıt sırasında bu kod zorunlu hale getirilebilmeli.
4. WHEN site ayarları kaydedildiğinde, THE AuditLog SHALL değişikliği kaydetmeli.

### Gereksinim 15: Analytics

**Kullanıcı Hikayesi:** Platform sahibi olarak, kullanıcı büyümesi, mesaj trendi ve aktif kullanıcı sayısı gibi metrikleri görmek istiyorum.

#### Kabul Kriterleri

1. THE super_admin ve admin SHALL toplam kullanıcı sayısını, çevrimiçi kullanıcı sayısını, banlı kullanıcı sayısını ve toplam mesaj sayısını görebilmeli.
2. THE super_admin ve admin SHALL son 7 günlük yeni kayıt sayısını ve mesaj sayısını görebilmeli; veriler `users/` ve `messages/` koleksiyonlarından hesaplanmalı.
3. THE super_admin ve admin SHALL en aktif kanalları mesaj sayısına göre sıralı olarak görebilmeli.
4. THE super_admin ve admin SHALL en aktif kullanıcıları mesaj sayısına göre sıralı olarak görebilmeli.

### Gereksinim 16: Güvenlik Yönetimi

**Kullanıcı Hikayesi:** Platform sahibi olarak, IP banlama, zorla çıkış ve denetim logu gibi güvenlik araçlarına erişmek istiyorum.

#### Kabul Kriterleri

1. THE super_admin SHALL `ip_bans/` koleksiyonuna IP adresi ekleyebilmeli ve kaldırabilmeli.
2. THE super_admin SHALL tüm aktif kullanıcı oturumlarını sonlandırabilmeli; bu işlem `settings/force_logout` değerini güncel zaman damgasıyla güncellenmeli.
3. THE super_admin ve admin SHALL `logs/` koleksiyonundaki denetim loglarını listeleyebilmeli; işlem türü, yönetici adı, hedef ve zaman damgasına göre filtreleyebilmeli.
4. WHEN bir IP ban eklendiğinde veya kaldırıldığında, THE AuditLog SHALL işlemi kaydetmeli.
5. THE AuditLog SHALL her yetkili backoffice işlemini `logs/` koleksiyonuna şu alanlarla kaydetmeli: `action`, `detail`, `timestamp`, `admin_uid`, `admin_role`.

### Gereksinim 17: Guild/Sunucu Yönetimi

**Kullanıcı Hikayesi:** Platform sahibi olarak, tüm guild'leri görmek ve yönetmek istiyorum; böylece topluluk içeriğini denetleyebilirim.

#### Kabul Kriterleri

1. THE super_admin ve admin SHALL `guilds/` koleksiyonundaki tüm guild'leri listeleyebilmeli; ad, sahip, üye sayısı ve oluşturma tarihi bilgilerini göstermeli.
2. THE super_admin SHALL herhangi bir guild'i silebilmeli; silme işlemi `guilds/{id}` ve `userGuilds/` altındaki ilgili kayıtları kaldırmalı.
3. THE super_admin ve admin SHALL bir guild'in üyelerini listeleyebilmeli ve üye rollerini güncelleyebilmeli.
4. WHEN bir guild silindiğinde, THE AuditLog SHALL işlemi kaydetmeli.

### Gereksinim 18: Feature Flag Yönetimi

**Kullanıcı Hikayesi:** Platform sahibi olarak, belirli özellikleri kod değişikliği yapmadan açıp kapatmak istiyorum.

#### Kabul Kriterleri

1. THE super_admin SHALL `settings/feature_flags/` altındaki feature flag değerlerini listeleyebilmeli ve güncelleyebilmeli.
2. THE super_admin SHALL yeni bir feature flag ekleyebilmeli; flag adı ve boolean değeri belirleyebilmeli.
3. WHEN bir feature flag değiştirildiğinde, THE AuditLog SHALL değişikliği kaydetmeli.
4. THE Backoffice SHALL en az şu varsayılan flag'leri desteklemeli: `forum_enabled`, `games_enabled`, `live_tv_enabled`, `guild_enabled`, `registration_enabled`.

### Gereksinim 19: Denetim Logu (Audit Log)

**Kullanıcı Hikayesi:** Platform sahibi olarak, tüm yönetici işlemlerinin kaydını görmek istiyorum; böylece hesap verebilirliği sağlayabilirim.

#### Kabul Kriterleri

1. THE AuditLog SHALL her backoffice işlemini `logs/` koleksiyonuna otomatik olarak kaydetmeli.
2. THE super_admin ve admin SHALL logları işlem türüne, yönetici adına ve tarih aralığına göre filtreleyebilmeli.
3. THE AuditLog SHALL her log kaydında şu alanları içermeli: `action` (işlem türü), `detail` (açıklama), `timestamp` (ISO8601), `admin_uid`, `admin_role`, `target_uid` (varsa).
4. THE super_admin SHALL logları JSON formatında dışa aktarabilmeli.
5. WHILE log listesi 1000 kayıttan fazla olduğunda, THE Backoffice SHALL yalnızca en son 500 kaydı göstermeli ve sayfalama sunmalı.

### Gereksinim 20: Backoffice Navigasyon ve Arayüz

**Kullanıcı Hikayesi:** Yönetici olarak, backoffice panelinde hızlıca gezinmek ve hangi bölümde olduğumu anlamak istiyorum.

#### Kabul Kriterleri

1. THE Backoffice SHALL sol kenar çubuğunda navigasyon menüsü sunmalı; her menü öğesi kullanıcının rolüne göre görünür veya gizli olmalı.
2. THE Backoffice SHALL mevcut `/admin` panelinden görsel olarak ayrışmalı; farklı renk şeması veya başlık kullanmalı.
3. THE Backoffice SHALL kullanıcının adını ve rolünü üst çubukta göstermeli.
4. WHEN bir işlem başarıyla tamamlandığında, THE Backoffice SHALL kullanıcıya başarı bildirimi göstermeli.
5. IF bir işlem başarısız olursa, THEN THE Backoffice SHALL kullanıcıya hata mesajı göstermeli ve işlemi geri almalı.
6. THE Backoffice SHALL React + TypeScript + Tailwind CSS + Framer Motion teknoloji yığınını kullanmalı; mevcut projenin bağımlılıklarıyla uyumlu olmalı.
7. THE Backoffice SHALL `src/components/backoffice/` dizininde organize edilmeli; mevcut `src/components/AdminPanel.tsx` dosyasına dokunulmamalı.

### Gereksinim 21: Emoji Paketi Yönetimi

**Kullanıcı Hikayesi:** Platform sahibi olarak, özel emoji paketleri eklemek ve kaldırmak istiyorum; böylece topluluğa özgü emojiler sunabilirim.

#### Kabul Kriterleri

1. THE super_admin SHALL `settings/custom_emojis/` altına yeni emoji ekleyebilmeli; emoji adı, unicode veya URL değeri belirleyebilmeli.
2. THE super_admin SHALL mevcut özel emojileri listeleyebilmeli ve silebilmeli.
3. WHEN bir emoji eklendiğinde veya silindiğinde, THE AuditLog SHALL işlemi kaydetmeli.
4. THE Backoffice SHALL özel emoji listesini mevcut `EmojiPicker` bileşeniyle uyumlu formatta saklamalı.

### Gereksinim 22: Sistem Mesajları ve Duyurular

**Kullanıcı Hikayesi:** Yönetici olarak, tüm kullanıcılara veya belirli kanallara sistem mesajı ve duyuru göndermek istiyorum.

#### Kabul Kriterleri

1. THE super_admin ve admin SHALL tüm kanallara veya seçili bir kanala sistem mesajı gönderebilmeli; mesaj `sender_id: 'system'`, `type: 'system'` alanlarıyla kaydedilmeli.
2. THE super_admin ve admin SHALL `notifications/` koleksiyonu aracılığıyla tüm kullanıcılara in-app duyuru gönderebilmeli.
3. THE super_admin ve admin SHALL duyuru geçmişini görebilmeli; gönderen, içerik ve tarih bilgilerini listeleyebilmeli.
4. WHEN bir sistem mesajı gönderildiğinde, THE AuditLog SHALL işlemi kaydetmeli.
