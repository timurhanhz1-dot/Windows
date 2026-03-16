# Requirements Document

## Introduction

Bu doküman, Nature.co platformu için Instagram benzeri sosyal medya profil sisteminin gereksinimlerini tanımlar. Sistem, kullanıcıların içerik paylaşabileceği, birbirlerini takip edebileceği ve etkileşimde bulunabileceği modern bir sosyal medya deneyimi sunacaktır. Mevcut Robot House (nature_posts) altyapısı üzerine inşa edilecek ve Nature.co'nun doğa temalı estetiğini koruyacaktır.

## Glossary

- **Profile_System**: Kullanıcı profil sayfalarını ve sosyal medya özelliklerini yöneten sistem
- **Post**: Kullanıcıların paylaştığı içerik (fotoğraf, video, metin)
- **Story**: 24 saat sonra kaybolan kısa süreli içerik
- **Follow_System**: Kullanıcıların birbirlerini takip etmesini sağlayan mekanizma
- **Engagement**: Beğeni, yorum ve paylaşım gibi etkileşim metrikleri
- **Feed**: Kullanıcının takip ettiği kişilerin içeriklerinin kronolojik akışı
- **Grid_Layout**: Instagram tarzı ızgara düzeninde içerik gösterimi
- **Profile_Stats**: Kullanıcının post sayısı, takipçi ve takip edilen sayısı gibi istatistikleri
- **Nature_Posts_Collection**: Firebase Realtime Database'de mevcut içerik koleksiyonu
- **Eco_Points**: Kullanıcı aktivitesine göre kazanılan doğa temalı puan sistemi
- **Robot_House**: Mevcut içerik paylaşım ve keşif bölümü
- **User_Profile**: Kullanıcının kişisel bilgilerini, içeriklerini ve istatistiklerini içeren sayfa

## Requirements

### Requirement 1: Profil Sayfası Görüntüleme

**User Story:** Kullanıcı olarak, kendi profilimi ve diğer kullanıcıların profillerini görüntüleyebilmek istiyorum, böylece içeriklerini ve bilgilerini keşfedebilirim.

#### Acceptance Criteria

1. WHEN bir kullanıcı /profile/:userId URL'sine gittiğinde, THE Profile_System SHALL ilgili kullanıcının profil sayfasını yükleyip göstermelidir
2. THE Profile_System SHALL profil fotoğrafı, kapak fotoğrafı, kullanıcı adı, bio ve konum bilgilerini görüntülemelidir
3. THE Profile_System SHALL kullanıcının post sayısı, takipçi sayısı ve takip edilen sayısını Profile_Stats olarak göstermelidir
4. WHEN kullanıcı kendi profilini görüntülediğinde, THE Profile_System SHALL "Profili Düzenle" butonunu göstermelidir
5. WHEN kullanıcı başka birinin profilini görüntülediğinde, THE Profile_System SHALL "Takip Et" veya "Takipten Çık" butonunu göstermelidir
6. THE Profile_System SHALL profil sayfasını 1 saniye içinde yüklemelidir

### Requirement 2: Profil Bilgilerini Düzenleme

**User Story:** Kullanıcı olarak, profil bilgilerimi güncelleyebilmek istiyorum, böylece kendimi doğru şekilde ifade edebilirim.

#### Acceptance Criteria

1. WHEN kullanıcı "Profili Düzenle" butonuna tıkladığında, THE Profile_System SHALL düzenleme modunu aktif etmelidir
2. THE Profile_System SHALL kullanıcının bio, konum, sosyal medya linkleri ve durum mesajını düzenlemesine izin vermelidir
3. THE Profile_System SHALL bio için maksimum 300 karakter sınırı uygulamalıdır
4. WHEN kullanıcı profil fotoğrafı yüklediğinde, THE Profile_System SHALL fotoğrafı Firebase Storage'a yüklemeli ve URL'yi kullanıcı kaydına kaydetmelidir
5. WHEN kullanıcı kapak fotoğrafı yüklediğinde, THE Profile_System SHALL fotoğrafı Firebase Storage'a yüklemeli ve URL'yi kullanıcı kaydına kaydetmelidir
6. THE Profile_System SHALL yüklenen görsellerin maksimum 5MB boyutunda olmasını zorunlu kılmalıdır
7. THE Profile_System SHALL sadece JPG, PNG, WebP ve GIF formatlarını kabul etmelidir
8. WHEN kullanıcı değişiklikleri kaydettiğinde, THE Profile_System SHALL güncellemeleri Firebase Realtime Database'e yazmalıdır

### Requirement 3: İçerik Paylaşımı (Post Sistemi)

**User Story:** Kullanıcı olarak, fotoğraf, video ve metin içerikleri paylaşabilmek istiyorum, böylece topluluğa katkıda bulunabilirim.

#### Acceptance Criteria

1. WHEN kullanıcı "İçerik Paylaş" butonuna tıkladığında, THE Profile_System SHALL içerik oluşturma modalını açmalıdır
2. THE Profile_System SHALL kullanıcının metin, fotoğraf, video, müzik, kod, doğa ve teknoloji türlerinde içerik paylaşmasına izin vermelidir
3. THE Profile_System SHALL içerik metni için maksimum 500 karakter sınırı uygulamalıdır
4. WHEN kullanıcı medya dosyası yüklediğinde, THE Profile_System SHALL dosyayı Firebase Storage'a yüklemeli ve URL'yi Post kaydına eklemelidir
5. THE Profile_System SHALL her yeni Post'u nature_posts koleksiyonuna timestamp ile birlikte kaydetmelidir
6. THE Profile_System SHALL Post'a otomatik olarak kullanıcı ID'si, kullanıcı adı, avatar, içerik türü ve mood bilgilerini eklemelidir
7. WHEN Post başarıyla oluşturulduğunda, THE Profile_System SHALL kullanıcıya 10 Eco_Points kazandırmalıdır
8. THE Profile_System SHALL yeni Post'u kullanıcının profil grid'ine anında eklemelidir

### Requirement 4: İçerik Grid Görünümü

**User Story:** Kullanıcı olarak, paylaşılan içerikleri Instagram benzeri grid düzeninde görmek istiyorum, böylece içeriklere kolayca göz atabilirim.

#### Acceptance Criteria

1. THE Profile_System SHALL kullanıcının tüm Post'larını Grid_Layout formatında görüntülemelidir
2. THE Profile_System SHALL grid'i en yeni içerikten en eskiye doğru sıralamalıdır
3. WHEN kullanıcı bir Post'a tıkladığında, THE Profile_System SHALL Post detay görünümünü açmalıdır
4. THE Profile_System SHALL grid'de her Post için önizleme görseli, içerik türü ikonu ve beğeni/yorum sayılarını göstermelidir
5. THE Profile_System SHALL mobil cihazlarda 2 sütunlu, masaüstünde 3 sütunlu grid düzeni kullanmalıdır
6. THE Profile_System SHALL grid'de 50'den fazla Post olduğunda lazy loading uygulamalıdır

### Requirement 5: Beğeni Sistemi

**User Story:** Kullanıcı olarak, beğendiğim içerikleri işaretleyebilmek istiyorum, böylece takdirimi gösterebilirim.

#### Acceptance Criteria

1. WHEN kullanıcı bir Post'un beğeni butonuna tıkladığında, THE Profile_System SHALL beğeniyi nature_posts/{postId}/likes/{userId} yoluna kaydetmelidir
2. WHEN kullanıcı zaten beğendiği bir Post'a tekrar tıkladığında, THE Profile_System SHALL beğeniyi kaldırmalıdır
3. THE Profile_System SHALL her Post için toplam beğeni sayısını gerçek zamanlı olarak göstermelidir
4. WHEN kullanıcı bir Post'u beğendiğinde, THE Profile_System SHALL kullanıcıya 1 Eco_Points kazandırmalıdır
5. THE Profile_System SHALL beğeni butonunu beğenilmiş Post'larda dolu kalp, beğenilmemiş Post'larda boş kalp olarak göstermelidir
6. THE Profile_System SHALL beğeni işlemini 200ms içinde tamamlamalıdır

### Requirement 6: Yorum Sistemi

**User Story:** Kullanıcı olarak, içeriklere yorum yapabilmek istiyorum, böylece düşüncelerimi paylaşabilirim.

#### Acceptance Criteria

1. WHEN kullanıcı bir Post'un yorum butonuna tıkladığında, THE Profile_System SHALL yorum modalını açmalıdır
2. THE Profile_System SHALL Post'a ait tüm yorumları kronolojik sırada göstermelidir
3. WHEN kullanıcı yorum yazdığında, THE Profile_System SHALL yorumu nature_posts/{postId}/comments koleksiyonuna kaydetmelidir
4. THE Profile_System SHALL her yorumda kullanıcı adı, avatar, yorum metni ve timestamp göstermelidir
5. THE Profile_System SHALL yorum metni için maksimum 500 karakter sınırı uygulamalıdır
6. THE Profile_System SHALL Post'un toplam yorum sayısını gerçek zamanlı olarak güncellemelidir
7. WHEN kullanıcı yorum yaptığında, THE Profile_System SHALL kullanıcıya 2 Eco_Points kazandırmalıdır

### Requirement 7: Takip Sistemi

**User Story:** Kullanıcı olarak, ilgilendiğim kullanıcıları takip edebilmek istiyorum, böylece içeriklerini akışımda görebilirim.

#### Acceptance Criteria

1. WHEN kullanıcı "Takip Et" butonuna tıkladığında, THE Follow_System SHALL takip ilişkisini followers/{targetUserId}/{currentUserId} ve following/{currentUserId}/{targetUserId} yollarına kaydetmelidir
2. WHEN kullanıcı "Takipten Çık" butonuna tıkladığında, THE Follow_System SHALL her iki takip kaydını da silmelidir
3. THE Follow_System SHALL kullanıcının takipçi sayısını gerçek zamanlı olarak güncellemelidir
4. THE Follow_System SHALL kullanıcının takip ettiği kişi sayısını gerçek zamanlı olarak güncellemelidir
5. THE Follow_System SHALL kullanıcının kendi profilinde "Takip Et" butonunu göstermemelidir
6. WHEN kullanıcı takipçi sayısına tıkladığında, THE Follow_System SHALL takipçi listesini modal olarak göstermelidir
7. WHEN kullanıcı takip edilen sayısına tıkladığında, THE Follow_System SHALL takip edilen kullanıcı listesini modal olarak göstermelidir

### Requirement 8: Story (Hikaye) Sistemi

**User Story:** Kullanıcı olarak, 24 saat sonra kaybolan hikayeler paylaşabilmek istiyorum, böylece geçici içerikler oluşturabilirim.

#### Acceptance Criteria

1. WHEN kullanıcı story oluştur butonuna tıkladığında, THE Profile_System SHALL story oluşturma arayüzünü açmalıdır
2. THE Profile_System SHALL kullanıcının fotoğraf veya video yüklemesine izin vermelidir
3. WHEN story oluşturulduğunda, THE Profile_System SHALL story'yi stories/{userId}/{storyId} yoluna timestamp ile kaydetmelidir
4. THE Profile_System SHALL story'ye otomatik olarak 24 saat sonrası için expiresAt timestamp'i eklemelidir
5. THE Profile_System SHALL süresi dolan story'leri otomatik olarak silmelidir
6. WHEN kullanıcı bir story'ye tıkladığında, THE Profile_System SHALL story'yi tam ekran Instagram tarzında göstermelidir
7. THE Profile_System SHALL story görüntüleme sırasında otomatik ilerleme çubuğu göstermelidir
8. THE Profile_System SHALL kullanıcının story'lere emoji tepkisi vermesine izin vermelidir
9. THE Profile_System SHALL aktif story'si olan kullanıcıların profil fotoğraflarının etrafında renkli halka göstermelidir

### Requirement 9: Robot House Entegrasyonu

**User Story:** Kullanıcı olarak, Robot House'da paylaştığım içeriklerin otomatik olarak profilime eklenmesini istiyorum, böylece ayrı ayrı paylaşmak zorunda kalmayayım.

#### Acceptance Criteria

1. WHEN kullanıcı Robot House'da içerik paylaştığında, THE Profile_System SHALL aynı Post'u kullanıcının profiline de eklemelidir
2. THE Profile_System SHALL Robot House ve profil sayfası arasında nature_posts koleksiyonunu paylaşmalıdır
3. THE Profile_System SHALL Robot House'daki beğeni ve yorumları profil sayfasında da göstermelidir
4. THE Profile_System SHALL her iki bölümde de aynı Post ID'sini kullanmalıdır
5. WHEN kullanıcı profilden bir Post sildiğinde, THE Profile_System SHALL Post'u Robot House'dan da kaldırmalıdır

### Requirement 10: Profil İstatistikleri ve Gamification

**User Story:** Kullanıcı olarak, aktivitelerime göre istatistikler ve rozetler görmek istiyorum, böylece ilerlememı takip edebilirim.

#### Acceptance Criteria

1. THE Profile_System SHALL kullanıcının toplam post sayısını gerçek zamanlı olarak hesaplamalıdır
2. THE Profile_System SHALL kullanıcının toplam beğeni sayısını tüm Post'lardan toplayarak göstermelidir
3. THE Profile_System SHALL kullanıcının Eco_Points değerini profilde belirgin şekilde göstermelidir
4. THE Profile_System SHALL kullanıcının seviyesini Eco_Points'e göre hesaplamalıdır (her 100 puan = 1 seviye)
5. THE Profile_System SHALL seviye ilerlemesini progress bar ile görselleştirmelidir
6. THE Profile_System SHALL kullanıcının kazandığı rozetleri profilde göstermelidir
7. THE Profile_System SHALL kullanıcının katılma tarihini profilde göstermelidir

### Requirement 11: Responsive Tasarım

**User Story:** Kullanıcı olarak, profil sistemini hem mobil hem masaüstü cihazlarda sorunsuz kullanabilmek istiyorum.

#### Acceptance Criteria

1. THE Profile_System SHALL mobil cihazlarda (< 768px) tek sütunlu düzen kullanmalıdır
2. THE Profile_System SHALL tablet cihazlarda (768px - 1024px) iki sütunlu grid düzeni kullanmalıdır
3. THE Profile_System SHALL masaüstü cihazlarda (> 1024px) üç sütunlu grid düzeni kullanmalıdır
4. THE Profile_System SHALL tüm butonları mobil cihazlarda minimum 44x44px dokunma alanı ile göstermelidir
5. THE Profile_System SHALL mobil cihazlarda modal'ları tam ekran olarak göstermelidir
6. THE Profile_System SHALL tüm görselleri cihaz boyutuna göre optimize etmelidir

### Requirement 12: Animasyonlar ve Kullanıcı Deneyimi

**User Story:** Kullanıcı olarak, akıcı ve modern animasyonlarla zenginleştirilmiş bir deneyim yaşamak istiyorum.

#### Acceptance Criteria

1. THE Profile_System SHALL Framer Motion kütüphanesini kullanarak sayfa geçişlerini animasyonlamalıdır
2. THE Profile_System SHALL beğeni butonuna tıklandığında kalp animasyonu göstermelidir
3. THE Profile_System SHALL yeni Post eklendiğinde fade-in animasyonu uygulamalıdır
4. THE Profile_System SHALL modal açılış/kapanışlarında scale ve opacity animasyonları kullanmalıdır
5. THE Profile_System SHALL hover efektlerinde smooth transition uygulamalıdır
6. THE Profile_System SHALL tüm animasyonları 60 FPS'de çalıştırmalıdır

### Requirement 13: Güvenlik ve Yetkilendirme

**User Story:** Kullanıcı olarak, sadece yetkili olduğum işlemleri yapabilmek istiyorum, böylece sistem güvenli kalır.

#### Acceptance Criteria

1. THE Profile_System SHALL kullanıcının sadece kendi profilini düzenlemesine izin vermelidir
2. THE Profile_System SHALL kullanıcının sadece kendi Post'larını silmesine izin vermelidir
3. THE Profile_System SHALL admin kullanıcıların tüm Post'ları silmesine izin vermelidir
4. THE Profile_System SHALL yasaklanmış (is_banned) kullanıcıların içerik paylaşmasını engellemeli
5. THE Profile_System SHALL tüm Firebase işlemlerinde authentication kontrolü yapmalıdır
6. THE Profile_System SHALL Firebase Database Rules ile backend seviyesinde yetkilendirme uygulamalıdır

### Requirement 14: Performans ve Optimizasyon

**User Story:** Kullanıcı olarak, hızlı yüklenen ve akıcı çalışan bir profil sistemi kullanmak istiyorum.

#### Acceptance Criteria

1. THE Profile_System SHALL profil sayfasını ilk yüklemede 2 saniye içinde render etmelidir
2. THE Profile_System SHALL görselleri lazy loading ile yüklemelidir
3. THE Profile_System SHALL Firebase listener'larını component unmount olduğunda temizlemelidir
4. THE Profile_System SHALL Post listesini sayfalama (pagination) ile yüklemelidir
5. THE Profile_System SHALL gereksiz re-render'ları önlemek için React.memo kullanmalıdır
6. THE Profile_System SHALL büyük listelerde virtualization uygulamalıdır

### Requirement 15: Arama ve Keşfet

**User Story:** Kullanıcı olarak, diğer kullanıcıları ve içerikleri arayabilmek istiyorum, böylece ilgi alanlarıma uygun profiller keşfedebilirim.

#### Acceptance Criteria

1. WHEN kullanıcı arama kutusuna kullanıcı adı yazdığında, THE Profile_System SHALL eşleşen kullanıcıları gerçek zamanlı olarak göstermelidir
2. THE Profile_System SHALL arama sonuçlarında kullanıcı adı, avatar ve takipçi sayısını göstermelidir
3. WHEN kullanıcı arama sonucuna tıkladığında, THE Profile_System SHALL ilgili kullanıcının profiline yönlendirmelidir
4. THE Profile_System SHALL popüler kullanıcıları "Keşfet" bölümünde önermelidir
5. THE Profile_System SHALL önerileri takipçi sayısı ve Engagement metriklerine göre sıralamalıdır

