# Gereksinimler Belgesi

## Giriş

Bu belge, Nature.co uygulamasına çoklu dil desteği (Türkçe / İngilizce) eklenmesine ilişkin gereksinimleri tanımlar. Uygulama şu anda yalnızca Türkçe hardcoded string içermektedir. Bu özellik; i18next + react-i18next kütüphaneleri kullanılarak tüm UI metinlerini çeviri anahtarlarına dönüştürmeyi, kullanıcının dil tercihini UserSettings sayfasından değiştirebilmesini ve bu tercihin hem localStorage hem de Firebase'de (`users/{uid}/preferences/language`) kalıcı olarak saklanmasını kapsar.

---

## Sözlük

- **I18n_System**: i18next + react-i18next altyapısını kapsayan çeviri sistemi bütünü.
- **Language_Preference**: Kullanıcının seçtiği dil kodu (`tr` veya `en`).
- **Translation_Key**: UI metnini temsil eden, dil bağımsız tanımlayıcı string (örn. `common.save`).
- **Locale_File**: Belirli bir dile ait tüm çeviri anahtarı-değer çiftlerini içeren JSON dosyası (`public/locales/{lang}/translation.json`).
- **UserSettings**: Kullanıcının uygulama tercihlerini yönettiği ayarlar sayfası bileşeni.
- **Firebase_Preferences**: Firebase Realtime Database'de `users/{uid}/preferences` yolunda saklanan kullanıcı tercihleri nesnesi.
- **Fallback_Language**: Çeviri anahtarı bulunamadığında kullanılan varsayılan dil (`tr`).
- **Admin_Panel**: Yöneticilere özel arayüz bileşenleri topluluğu (`AdminPanel` ve alt bileşenleri).

---

## Gereksinimler

### Gereksinim 1: i18next Altyapısının Kurulumu

**Kullanıcı Hikayesi:** Bir geliştirici olarak, uygulamanın i18next altyapısıyla başlatılmasını istiyorum; böylece tüm bileşenler çeviri sistemine erişebilsin.

#### Kabul Kriterleri

1. THE I18n_System SHALL `i18next`, `react-i18next` ve `i18next-browser-languagedetector` paketlerini bağımlılık olarak içermelidir.
2. THE I18n_System SHALL uygulama başlangıcında (`main.tsx` içinde React ağacı render edilmeden önce) başlatılmalıdır.
3. THE I18n_System SHALL desteklenen dilleri `tr` ve `en` olarak tanımlamalıdır.
4. THE I18n_System SHALL Fallback_Language olarak `tr` kullanmalıdır.
5. THE I18n_System SHALL Locale_File dosyalarını `public/locales/{lang}/translation.json` yolundan yüklemeli ve HTTP üzerinden erişilebilir kılmalıdır.
6. IF bir Translation_Key mevcut dilde bulunamazsa, THEN THE I18n_System SHALL Fallback_Language karşılığını döndürmelidir.
7. IF Fallback_Language karşılığı da bulunamazsa, THEN THE I18n_System SHALL Translation_Key değerinin kendisini döndürmelidir.

---

### Gereksinim 2: Dil Tercihinin Yüklenmesi ve Kalıcı Saklanması

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, seçtiğim dilin her oturumda hatırlanmasını istiyorum; böylece her girişte tekrar ayar yapmak zorunda kalmayayım.

#### Kabul Kriterleri

1. WHEN uygulama başlatılırken, THE I18n_System SHALL Language_Preference'ı şu öncelik sırasıyla yüklemelidir: (1) Firebase_Preferences, (2) localStorage, (3) tarayıcı dili, (4) Fallback_Language.
2. WHEN kullanıcı oturum açtıktan sonra, THE I18n_System SHALL Firebase_Preferences'tan Language_Preference'ı okumalı ve aktif dili buna göre güncellemelidir.
3. WHEN Language_Preference değiştirildiğinde, THE I18n_System SHALL yeni değeri `localStorage` anahtarı `i18nextLng` altında eş zamanlı olarak kaydetmelidir.
4. WHEN Language_Preference değiştirildiğinde ve kullanıcı oturum açmışsa, THE I18n_System SHALL yeni değeri `users/{uid}/preferences/language` yoluna Firebase'e yazmalıdır.
5. IF Firebase yazma işlemi başarısız olursa, THEN THE I18n_System SHALL dil değişikliğini yalnızca localStorage'da saklayarak kullanıcıya hata göstermeksizin devam etmelidir.
6. WHILE kullanıcı oturum açmamışken, THE I18n_System SHALL Language_Preference'ı yalnızca localStorage'da saklamalıdır.

---

### Gereksinim 3: Dil Seçimi Arayüzü (UserSettings)

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, UserSettings sayfasından uygulama dilini Türkçe veya İngilizce olarak seçebilmek istiyorum; böylece arayüzü tercih ettiğim dilde kullanabileyim.

#### Kabul Kriterleri

1. THE UserSettings SHALL "Dil / Language" başlıklı yeni bir sekme veya bölüm içermelidir.
2. THE UserSettings SHALL Türkçe ve İngilizce seçeneklerini görsel olarak ayırt edilebilir biçimde (bayrak ikonu + dil adı) listelemeli ve aktif dili vurgulamalıdır.
3. WHEN kullanıcı bir dil seçeneğine tıkladığında, THE UserSettings SHALL Language_Preference'ı anında güncellemeli ve arayüzü yeniden render etmeksizin dil değişikliğini yansıtmalıdır (sayfa yenilemesi gerekmemelidir).
4. WHEN dil değiştirildiğinde, THE UserSettings SHALL Gereksinim 2'deki kalıcı saklama kurallarını tetiklemelidir.
5. THE UserSettings SHALL dil seçim bölümündeki etiket ve açıklamaları aktif Language_Preference'a göre çevrilmiş olarak göstermelidir.

---

### Gereksinim 4: UI Stringlerinin Çevrilmesi — Ortak Bileşenler

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, uygulamanın tüm ortak arayüz metinlerini seçtiğim dilde görmek istiyorum; böylece dil deneyimi tutarlı olsun.

#### Kabul Kriterleri

1. THE I18n_System SHALL `src/components/` altındaki tüm 80+ bileşende hardcoded Türkçe string içermemesini sağlamalıdır; her metin bir Translation_Key ile temsil edilmelidir.
2. THE I18n_System SHALL `AuthPage`, `UserSettings`, `Sidebar`, `ChannelSidebar`, `ChatArea`, `DirectMessages`, `Forum`, `FriendSystem`, `NotificationCenter`, `ProfilePage` bileşenlerindeki tüm kullanıcıya görünen metinleri Translation_Key'e dönüştürmelidir.
3. THE I18n_System SHALL tarih/saat formatlarını aktif Language_Preference'a uygun locale ile göstermelidir (`tr-TR` veya `en-US`).
4. THE I18n_System SHALL çoğul ifadeler için i18next `count` interpolasyonunu kullanmalıdır (örn. "1 mesaj" / "5 mesaj").
5. IF bir bileşen Translation_Key yerine hardcoded string içeriyorsa, THEN THE I18n_System SHALL Fallback_Language metnini göstererek sessizce devam etmelidir (uygulama çökmemelidir).

---

### Gereksinim 5: UI Stringlerinin Çevrilmesi — Admin Paneli

**Kullanıcı Hikayesi:** Bir yönetici olarak, Admin Paneli arayüzünü de seçtiğim dilde görmek istiyorum; böylece yönetim işlemlerini tercih ettiğim dilde yürütebileyim.

#### Kabul Kriterleri

1. THE I18n_System SHALL `AdminPanel` ve tüm alt Admin bileşenlerindeki (`AdminAiAnalyticsCard`, `AdminAiIntelligencePanel`, `AdminCommunityBrainCard`, `AdminGrowthRadarCard`, `AdminModerationOverviewCard`, `AdminSecuritySignalsCard`, `AdminViralContentCard`) hardcoded Türkçe stringleri Translation_Key'e dönüştürmelidir.
2. THE I18n_System SHALL Admin Paneli çevirilerini ayrı bir namespace (`admin`) altında organize etmelidir.
3. WHEN yönetici Language_Preference'ı değiştirdiğinde, THE I18n_System SHALL Admin Paneli metinlerini de anında güncellemeli; sayfa yenilemesi gerekmemelidir.

---

### Gereksinim 6: Locale Dosyalarının Yapısı ve Kalitesi

**Kullanıcı Hikayesi:** Bir geliştirici olarak, çeviri dosyalarının tutarlı ve bakımı kolay bir yapıda olmasını istiyorum; böylece yeni çeviriler eklemek ve mevcut çevirileri güncellemek kolaylaşsın.

#### Kabul Kriterleri

1. THE I18n_System SHALL Türkçe çevirileri `public/locales/tr/translation.json` dosyasında saklamalıdır.
2. THE I18n_System SHALL İngilizce çevirileri `public/locales/en/translation.json` dosyasında saklamalıdır.
3. THE I18n_System SHALL her iki Locale_File'ın aynı Translation_Key kümesini içermesini sağlamalıdır; eksik anahtar bulunmamalıdır.
4. THE I18n_System SHALL Translation_Key'leri bileşen veya özellik bazlı namespace'lere göre gruplandırmalıdır (örn. `auth.login`, `settings.language`, `admin.moderation`).
5. IF bir Translation_Key Locale_File'da eksikse, THEN THE I18n_System SHALL Fallback_Language karşılığını kullanmalı ve geliştirme ortamında konsola uyarı yazmalıdır.

---

### Gereksinim 7: Dil Değişikliğinin Anlık Yansıması

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, dil değiştirdiğimde tüm arayüzün anında güncellenmesini istiyorum; sayfa yenilemesi veya yeniden giriş gerekmemelidir.

#### Kabul Kriterleri

1. WHEN Language_Preference değiştirildiğinde, THE I18n_System SHALL `i18next.changeLanguage()` metodunu çağırarak tüm `useTranslation` hook'larını reaktif biçimde yeniden render etmelidir.
2. WHEN Language_Preference değiştirildiğinde, THE I18n_System SHALL sayfa yenilemesi (`window.location.reload`) gerektirmeksizin tüm görünür metinleri güncellemeli; bu işlem 300ms içinde tamamlanmalıdır.
3. WHILE dil değişikliği işlemi sürerken, THE I18n_System SHALL mevcut dildeki metinleri göstermeye devam etmeli; boş veya undefined metin göstermemelidir.
4. THE I18n_System SHALL `document.documentElement.lang` niteliğini aktif Language_Preference'a göre (`tr` veya `en`) güncellemeli; bu SEO ve erişilebilirlik için gereklidir.

---

### Gereksinim 8: Geriye Dönük Uyumluluk ve Veri Bütünlüğü

**Kullanıcı Hikayesi:** Bir kullanıcı olarak, dil desteği eklenmeden önce oluşturulmuş hesabımın sorunsuz çalışmaya devam etmesini istiyorum; mevcut tercihlerim kaybolmamalıdır.

#### Kabul Kriterleri

1. IF `users/{uid}/preferences/language` alanı Firebase'de mevcut değilse, THEN THE I18n_System SHALL Language_Preference olarak `tr` değerini varsayılan kabul etmelidir.
2. THE I18n_System SHALL mevcut `users/{uid}/preferences` nesnesindeki `theme`, `compact`, `fontSize` alanlarını değiştirmemeli veya silmemelidir.
3. WHEN dil tercihi Firebase'e yazılırken, THE I18n_System SHALL yalnızca `language` alanını güncellemeli; diğer tercih alanlarını korumak için `update()` (merge) kullanmalıdır.
4. IF kullanıcı daha önce localStorage'da `i18nextLng` anahtarı altında bir dil tercihi kaydetmişse, THEN THE I18n_System SHALL bu değeri Firebase'den yüklenen değer mevcut olana kadar geçici olarak kullanmalıdır.
