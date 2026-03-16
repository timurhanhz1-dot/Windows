# Implementation Plan: Sosyal Medya Profil Sistemi

## Overview

Bu implementation plan, Nature.co platformu için Instagram benzeri sosyal medya profil sisteminin 6 haftalık geliştirme sürecini detaylandırır. Sistem, mevcut Robot House (nature_posts) altyapısı üzerine inşa edilecek ve kullanıcıların içerik paylaşabileceği, birbirlerini takip edebileceği ve etkileşimde bulunabileceği modern bir sosyal medya deneyimi sunacaktır.

**Teknoloji Stack**: React 19 + TypeScript + Firebase Realtime Database + Firebase Storage + Framer Motion

**Mevcut Componentler**: ProfilePage.tsx (genişletilecek), RobotHouse.tsx (entegre edilecek)

## Tasks

### Phase 1: Core Infrastructure (Week 1)

- [x] 1. Firebase Database yapısını ve service layer'ı oluştur
  - [x] 1.1 profileService.ts servisini oluştur
    - getProfile, updateProfile, uploadProfilePhoto, uploadCoverPhoto, calculateProfileStats, searchUsers, getPopularUsers fonksiyonlarını implement et
    - _Requirements: 1.1, 2.1, 2.4, 2.5, 15.1, 15.4_
  
  - [x] 1.2 postService.ts servisini oluştur
    - createPost, listenUserPosts, getPost, deletePost, toggleLike, addComment, listenComments, uploadMedia, incrementViews, awardEcoPoints fonksiyonlarını implement et
    - Mevcut RobotHouse kodundan post oluşturma mantığını refactor et
    - _Requirements: 3.1, 3.5, 3.6, 3.7, 4.1, 5.1, 5.2, 6.3, 6.6_
  
  - [x] 1.3 followService.ts servisini oluştur
    - followUser, unfollowUser, isFollowing, getFollowerCount, getFollowingCount, listenFollowers, listenFollowing, listenFollowerCount, listenFollowingCount fonksiyonlarını implement et
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.6, 7.7_
  
  - [x] 1.4 storyService.ts servisini oluştur
    - createStory, listenUserStories, listenFollowingStories, viewStory, addStoryReaction, cleanupExpiredStories, getUsersWithActiveStories fonksiyonlarını implement et
    - _Requirements: 8.1, 8.3, 8.4, 8.5, 8.8_


- [x] 2. Firebase Database Rules ve data models'i güncelle
  - [x] 2.1 database.rules.json dosyasını güncelle
    - followers, following, stories, user_posts_index için yeni rules ekle
    - nature_posts için mevcut rules'ı güncelle (yorum ve beğeni yetkilendirmesi)
    - Indexleme kurallarını ekle (timestamp, userId, type, createdAt, expiresAt)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_
  
  - [x] 2.2 TypeScript interface'lerini tanımla
    - src/types/profile.ts dosyası oluştur
    - UserProfile, Post, Comment, Story, FollowRelation, ProfileStats interface'lerini tanımla
    - ProfileError ve ProfileErrorCode enum'larını oluştur
    - _Requirements: 1.1, 3.1, 6.1, 8.1_
  
  - [x] 2.3 Firebase Database Rules'ı deploy et
    - firebase deploy --only database komutunu çalıştır
    - Rules'ın doğru çalıştığını test et
    - _Requirements: 13.6_

- [x] 3. Routing yapısını güncelle
  - [x] 3.1 App.tsx'e profil route'larını ekle
    - /profile route'u ekle (kendi profili)
    - /profile/:userId route'u ekle (başka kullanıcının profili)
    - Query parameter desteği ekle (?tab=posts|badges|about, ?post=:postId)
    - _Requirements: 1.1_
  
  - [x] 3.2 Navigation guard'ları ekle
    - Authentication kontrolü ekle
    - Unauthorized kullanıcıları AuthPage'e yönlendir
    - _Requirements: 13.5_

- [x] 4. Checkpoint - Service layer ve infrastructure tamamlandı
  - Tüm service fonksiyonlarının çalıştığını doğrula
  - Database rules'ın deploy edildiğini kontrol et
  - Routing'in çalıştığını test et
  - Kullanıcıya sorular varsa sor

### Phase 2: Profile Page UI (Week 2)

- [x] 5. ProfilePage component'ini genişlet
  - [x] 5.1 ProfileHeader bölümünü oluştur
    - Cover photo (nature temalı gradient background + user's cover photo overlay)
    - Profile avatar (crystal frame with nature glow effect)
    - Profile info (username, displayName, bio, verification badge)
    - Profile actions (Edit/Follow buttons, logout button)
    - Floating nature elements (🌿🍃🌱🌲 emojileri)
    - _Requirements: 1.2, 1.3, 1.4, 1.5_
  
  - [x] 5.2 ProfileStats bölümünü oluştur
    - Post count, follower count, following count, friend count kartları
    - Nature ecosystem themed stats cards (gradient backgrounds, icons)
    - XP progress bar (nature style with emerald/teal gradient)
    - Level badge ve eco points gösterimi
    - _Requirements: 1.3, 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 5.3 ProfileTabs bölümünü oluştur
    - Posts, Badges, About tab'larını oluştur
    - Tab switching mantığını implement et
    - Active tab için nature themed highlight effect
    - _Requirements: 1.1_


- [x] 6. Profil düzenleme özelliklerini implement et
  - [x] 6.1 Edit mode toggle mantığını ekle
    - "Profili Düzenle" butonu ile edit mode'u aktif et
    - Edit mode'da form alanlarını göster
    - "Kaydet" butonu ile değişiklikleri kaydet
    - _Requirements: 2.1_
  
  - [x] 6.2 Bio ve status message düzenleme
    - Bio için textarea (max 300 karakter)
    - Status message için input (max 100 karakter)
    - Karakter sayacı ekle
    - _Requirements: 2.2, 2.3_
  
  - [x] 6.3 Sosyal medya linkleri düzenleme
    - Twitter, GitHub, Instagram input alanları
    - Link validation
    - _Requirements: 2.2_
  
  - [x] 6.4 Avatar upload özelliği
    - File input ile avatar seçimi
    - Preview gösterimi
    - Firebase Storage'a upload
    - Compression (400x400, 80% quality)
    - Validation (max 5MB, JPG/PNG/WebP/GIF)
    - _Requirements: 2.4, 2.6, 2.7_
  
  - [x] 6.5 Cover photo upload özelliği
    - File input ile cover photo seçimi
    - Preview gösterimi
    - Firebase Storage'a upload
    - Compression (1200x400, 80% quality)
    - Validation (max 5MB, JPG/PNG/WebP/GIF)
    - _Requirements: 2.5, 2.6, 2.7_
  
  - [x] 6.6 Profil güncellemelerini Firebase'e kaydet
    - updateProfile service fonksiyonunu kullan
    - Real-time güncelleme
    - Error handling
    - _Requirements: 2.8_

- [x] 7. PostGrid component'ini oluştur
  - [x] 7.1 PostGrid.tsx dosyasını oluştur
    - CSS Grid layout (responsive: 2 col mobile, 3 col desktop)
    - Post card'ları render et
    - Grid item hover effects (beğeni/yorum sayıları göster)
    - _Requirements: 4.1, 4.4, 4.5_
  
  - [x] 7.2 Lazy loading implement et
    - Intersection Observer API kullan
    - İlk 20 post'u yükle, scroll'da daha fazla yükle
    - Loading spinner göster
    - _Requirements: 4.6, 14.2_
  
  - [x] 7.3 Post sıralama mantığını ekle
    - Timestamp'e göre descending order (en yeni önce)
    - _Requirements: 4.2_
  
  - [x] 7.4 Post card onClick handler
    - Post'a tıklandığında PostDetailModal'ı aç
    - _Requirements: 4.3_

- [x] 8. Checkpoint - Profile page UI tamamlandı
  - Profil sayfasının görüntülendiğini doğrula
  - Profil düzenlemenin çalıştığını test et
  - Post grid'in responsive olduğunu kontrol et
  - Kullanıcıya sorular varsa sor

### Phase 3: Post System (Week 3)

- [x] 9. CreatePostModal component'ini oluştur
  - [x] 9.1 CreatePostModal.tsx dosyasını oluştur
    - Modal açılış/kapanış animasyonları (Framer Motion)
    - Post type seçimi (text, photo, video, music, code, nature, tech)
    - Content textarea (max 500 karakter)
    - Karakter sayacı
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 9.2 Medya upload özelliği
    - File input ile medya seçimi
    - Preview gösterimi
    - Firebase Storage'a upload
    - Thumbnail oluşturma (300x300)
    - Validation (max 10MB, JPG/PNG/WebP/GIF/MP4)
    - _Requirements: 3.4_
  
  - [x] 9.3 Mood emoji seçimi
    - Emoji picker component
    - Seçilen mood'u post'a ekle
    - _Requirements: 3.6_
  
  - [x] 9.4 Post oluşturma mantığı
    - createPost service fonksiyonunu kullan
    - nature_posts koleksiyonuna kaydet
    - Otomatik alanları ekle (timestamp, userId, username, avatar, likes, comments, views)
    - Eco points kazandır (+10)
    - Post'u kullanıcının profiline ekle
    - _Requirements: 3.5, 3.6, 3.7, 3.8_


- [x] 10. PostDetailModal component'ini oluştur
  - [x] 10.1 PostDetailModal.tsx dosyasını oluştur
    - Modal layout (post detail + comment section)
    - Post bilgilerini göster (kullanıcı, içerik, medya, timestamp)
    - Modal açılış/kapanış animasyonları
    - _Requirements: 6.1_
  
  - [x] 10.2 Yorum listesini göster
    - Comment listesini render et
    - Real-time yorum güncellemeleri (listenComments)
    - Yorum sıralaması (kronolojik)
    - _Requirements: 6.2, 6.4_
  
  - [x] 10.3 Yorum ekleme formu
    - Textarea (max 500 karakter)
    - "Gönder" butonu
    - addComment service fonksiyonunu kullan
    - Yorum sayısını güncelle
    - Eco points kazandır (+2)
    - _Requirements: 6.3, 6.5, 6.6, 6.7_
  
  - [x] 10.4 Post silme özelliği
    - "Sil" butonu (sadece post sahibi veya admin için)
    - Onay modalı
    - deletePost service fonksiyonunu kullan
    - _Requirements: 13.2, 13.3_

- [x] 11. Beğeni sistemi
  - [x] 11.1 Like butonu component'i
    - Heart icon (dolu/boş)
    - Beğeni sayısı gösterimi
    - onClick handler (toggleLike)
    - Animasyon (kalp büyüme efekti)
    - _Requirements: 5.1, 5.5_
  
  - [x] 11.2 Like toggle mantığı
    - toggleLike service fonksiyonunu kullan
    - nature_posts/{postId}/likes/{userId} yoluna kaydet
    - Beğeni varsa kaldır, yoksa ekle
    - Eco points kazandır (+1)
    - _Requirements: 5.1, 5.2, 5.4_
  
  - [x] 11.3 Real-time beğeni sayısı
    - Beğeni sayısını gerçek zamanlı güncelle
    - Firebase listener kullan
    - _Requirements: 5.3, 5.6_

- [x] 12. RobotHouse entegrasyonu
  - [x] 12.1 RobotHouse.tsx'i refactor et
    - Post oluşturma kodunu postService.createPost ile değiştir
    - Aynı nature_posts koleksiyonunu kullan
    - _Requirements: 9.1, 9.2_
  
  - [x] 12.2 Post silme entegrasyonu
    - ProfilePage'den silinen post'ların RobotHouse'dan da silindiğini doğrula
    - RobotHouse'dan silinen post'ların ProfilePage'den de silindiğini doğrula
    - _Requirements: 9.5_
  
  - [x] 12.3 Beğeni ve yorum senkronizasyonu
    - Her iki bölümde de aynı beğeni/yorum verilerini göster
    - Real-time güncellemeler
    - _Requirements: 9.3, 9.4_

- [x] 13. Checkpoint - Post system tamamlandı
  - Post oluşturmanın çalıştığını doğrula
  - Beğeni/yorum sisteminin çalıştığını test et
  - RobotHouse entegrasyonunun çalıştığını kontrol et
  - Eco points kazanımının doğru olduğunu doğrula
  - Kullanıcıya sorular varsa sor

### Phase 4: Follow System (Week 4)

- [x] 14. Follow/Unfollow özelliği
  - [x] 14.1 Follow butonu component'i
    - "Takip Et" / "Takipten Çık" butonu
    - Kendi profilinde gösterme
    - onClick handler (toggleFollow)
    - _Requirements: 7.1, 7.2, 7.5_
  
  - [x] 14.2 Follow toggle mantığı
    - followUser / unfollowUser service fonksiyonlarını kullan
    - followers/{targetUserId}/{currentUserId} yoluna kaydet
    - following/{currentUserId}/{targetUserId} yoluna kaydet
    - Her iki kaydı da senkron tut
    - _Requirements: 7.1, 7.2_
  
  - [x] 14.3 Real-time takipçi/takip edilen sayıları
    - listenFollowerCount ve listenFollowingCount kullan
    - Sayıları gerçek zamanlı güncelle
    - _Requirements: 7.3, 7.4_


- [x] 15. FollowerListModal component'ini oluştur
  - [x] 15.1 FollowerListModal.tsx dosyasını oluştur
    - Modal layout (kullanıcı listesi)
    - Takipçi listesini göster
    - Takip edilen listesini göster
    - Modal açılış/kapanış animasyonları
    - _Requirements: 7.6, 7.7_
  
  - [x] 15.2 Kullanıcı listesi render
    - Avatar, username, displayName göster
    - Takip/takipten çık butonları
    - Kullanıcıya tıklandığında profiline git
    - _Requirements: 7.6, 7.7_
  
  - [x] 15.3 Kullanıcı arama
    - Arama input'u
    - Real-time filtreleme
    - _Requirements: 15.1_

- [x] 16. Kullanıcı arama ve keşfet
  - [x] 16.1 GlobalSearch component'ini güncelle
    - Kullanıcı arama özelliği ekle
    - searchUsers service fonksiyonunu kullan
    - Arama sonuçlarını göster (avatar, username, takipçi sayısı)
    - _Requirements: 15.1, 15.2_
  
  - [x] 16.2 Arama sonuçlarına tıklama
    - Kullanıcı profiline yönlendir
    - _Requirements: 15.3_
  
  - [x] 16.3 Popüler kullanıcılar önerisi
    - getPopularUsers service fonksiyonunu kullan
    - Takipçi sayısına göre sırala
    - "Keşfet" bölümünde göster
    - _Requirements: 15.4, 15.5_

- [x] 17. Checkpoint - Follow system tamamlandı
  - Takip/takipten çık özelliğinin çalıştığını doğrula
  - Takipçi/takip edilen listelerinin doğru gösterildiğini test et
  - Kullanıcı aramanın çalıştığını kontrol et
  - Real-time güncellemelerin çalıştığını doğrula
  - Kullanıcıya sorular varsa sor

### Phase 5: Story System (Week 5)

- [x] 18. Story oluşturma
  - [x] 18.1 CreateStoryModal component'ini oluştur
    - Modal layout (medya upload + preview)
    - File input (fotoğraf/video)
    - Preview gösterimi
    - "Paylaş" butonu
    - _Requirements: 8.1, 8.2_
  
  - [x] 18.2 Story upload mantığı
    - createStory service fonksiyonunu kullan
    - Firebase Storage'a upload
    - stories/{userId}/{storyId} yoluna kaydet
    - createdAt ve expiresAt (24 saat sonra) timestamp'lerini ekle
    - _Requirements: 8.3, 8.4_

- [x] 19. StoryRing component'ini oluştur
  - [x] 19.1 StoryRing.tsx dosyasını oluştur
    - Horizontal scroll story listesi
    - Story avatarları (renkli ring ile)
    - "Create Story" butonu
    - _Requirements: 8.9_
  
  - [x] 19.2 Aktif story'leri göster
    - getUsersWithActiveStories kullan
    - Aktif story'si olan kullanıcıların avatarlarını göster
    - Renkli ring efekti (gradient border)
    - _Requirements: 8.9_
  
  - [x] 19.3 Story onClick handler
    - Story'ye tıklandığında StoryViewer'ı aç
    - _Requirements: 8.6_

- [x] 20. StoryViewer component'ini oluştur
  - [x] 20.1 StoryViewer.tsx dosyasını oluştur
    - Fullscreen story görüntüleme
    - Story medyasını göster
    - Kullanıcı bilgileri (avatar, username, timestamp)
    - _Requirements: 8.6_
  
  - [x] 20.2 Otomatik ilerleme
    - Progress bar (5 saniye)
    - Otomatik sonraki story'ye geçiş
    - Swipe navigation (önceki/sonraki)
    - _Requirements: 8.7_
  
  - [x] 20.3 Emoji reaction picker
    - Emoji picker component
    - addStoryReaction service fonksiyonunu kullan
    - Reaction'ı story'ye kaydet
    - _Requirements: 8.8_
  
  - [x] 20.4 Story view tracking
    - viewStory service fonksiyonunu kullan
    - View count'u artır
    - _Requirements: 8.6_


- [x] 21. Story cleanup job
  - [x] 21.1 Expired story cleanup fonksiyonu
    - cleanupExpiredStories service fonksiyonunu implement et
    - expiresAt < now olan story'leri sil
    - Firebase Storage'dan medya dosyalarını sil
    - _Requirements: 8.5_
  
  - [x] 21.2 Scheduled cleanup job
    - Firebase Functions ile scheduled job oluştur (her saat)
    - Veya client-side periodic check (her 5 dakika)
    - _Requirements: 8.5_

- [x] 22. Checkpoint - Story system tamamlandı
  - Story oluşturmanın çalıştığını doğrula
  - Story görüntülemenin çalıştığını test et
  - Otomatik ilerlemenin çalıştığını kontrol et
  - Story cleanup'ın çalıştığını doğrula
  - Kullanıcıya sorular varsa sor

### Phase 6: Polish & Optimization (Week 6)

- [x] 23. Animasyonlar ve kullanıcı deneyimi
  - [x] 23.1 Sayfa geçiş animasyonları
    - Framer Motion ile page transition
    - Fade-in/fade-out efektleri
    - _Requirements: 12.1_
  
  - [x] 23.2 Modal animasyonları
    - Scale ve opacity animasyonları
    - Spring physics kullan
    - _Requirements: 12.4_
  
  - [x] 23.3 Beğeni butonu animasyonu
    - Kalp büyüme efekti
    - Color transition
    - _Requirements: 12.2_
  
  - [x] 23.4 Post grid animasyonları
    - Staggered fade-in (her post 0.05s delay)
    - Hover efektleri (smooth transition)
    - _Requirements: 12.3, 12.5_
  
  - [x] 23.5 Reduced motion desteği
    - prefers-reduced-motion media query
    - Animasyonları devre dışı bırak
    - _Requirements: 12.6_

- [x] 24. Performance optimizasyonları
  - [x] 24.1 Code splitting
    - React.lazy ile component lazy loading
    - ProfilePage, PostDetailModal, StoryViewer için lazy load
    - Suspense ile loading state
    - _Requirements: 14.1_
  
  - [x] 24.2 Image optimization
    - Lazy loading (Intersection Observer)
    - Placeholder gösterimi
    - Progressive loading
    - _Requirements: 14.2_
  
  - [x] 24.3 React.memo optimizasyonları
    - PostCard, CommentItem, StoryItem için React.memo
    - Custom comparison fonksiyonları
    - _Requirements: 14.5_
  
  - [x] 24.4 Firebase listener cleanup
    - useEffect cleanup fonksiyonları
    - Component unmount'da listener'ları temizle
    - Memory leak önleme
    - _Requirements: 14.3, 16.1_
  
  - [x] 24.5 Pagination implementation
    - listenUserPostsPaginated fonksiyonu
    - "Load More" butonu
    - Infinite scroll (optional)
    - _Requirements: 14.4_

- [x] 25. Error handling ve güvenlik
  - [x] 25.1 ProfileError class'ı oluştur
    - Custom error types (ProfileError, ProfileErrorCode)
    - Error message mapping
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  
  - [x] 25.2 Service layer error handling
    - Try-catch blokları
    - Validation errors
    - Network errors
    - _Requirements: 2.3, 2.6, 2.7, 3.3_
  
  - [x] 25.3 ProfileErrorBoundary component'i
    - Error boundary ile hata yakalama
    - User-friendly error messages
    - Retry mekanizması
    - _Requirements: 13.1_
  
  - [x] 25.4 Authorization checks
    - Profil düzenleme yetkilendirmesi (sadece kendi profili)
    - Post silme yetkilendirmesi (sadece post sahibi veya admin)
    - Banned user kontrolü
    - _Requirements: 13.1, 13.2, 13.3, 13.4_


- [x] 26. Testing
  - [x] 26.1 Property-based testler
    - [x]* 26.1.1 Property 1: Profile Data Round-Trip testi
      - **Property 1: Profile Data Round-Trip**
      - **Validates: Requirements 2.8**
      - fast-check ile random profile updates generate et
      - updateProfile ve getProfile fonksiyonlarını test et
    
    - [x]* 26.1.2 Property 4: Eco Points Award testi
      - **Property 4: Eco Points Award**
      - **Validates: Requirements 3.7, 5.4, 6.7**
      - Post, like, comment aksiyonları için eco points kazanımını test et
    
    - [x]* 26.1.3 Property 6: Like Toggle Idempotence testi
      - **Property 6: Like Toggle Idempotence**
      - **Validates: Requirements 5.1, 5.2, 5.3**
      - Like toggle'ın idempotent olduğunu test et
    
    - [x]* 26.1.4 Property 8: Follow Relationship Symmetry testi
      - **Property 8: Follow Relationship Symmetry**
      - **Validates: Requirements 7.1, 7.2**
      - Follow/unfollow'un her iki path'i de güncellediğini test et
    
    - [x]* 26.1.5 Property 13: Level Calculation testi
      - **Property 13: Level Calculation**
      - **Validates: Requirements 10.4**
      - Level ve progress hesaplamasının doğru olduğunu test et
  
  - [x] 26.2 Unit testler
    - [x]* 26.2.1 profileService unit testleri
      - getProfile, updateProfile, uploadProfilePhoto fonksiyonlarını test et
      - Validation error'larını test et (bio > 300 char, file > 5MB)
    
    - [x]* 26.2.2 postService unit testleri
      - createPost, toggleLike, addComment fonksiyonlarını test et
      - Banned user kontrolünü test et
      - Content length validation'ı test et
    
    - [x]* 26.2.3 followService unit testleri
      - followUser, unfollowUser, getFollowerCount fonksiyonlarını test et
      - Kendi kendini takip etmeyi engellemeyi test et
    
    - [x]* 26.2.4 storyService unit testleri
      - createStory, cleanupExpiredStories fonksiyonlarını test et
      - expiresAt hesaplamasını test et (24 saat)
  
  - [x] 26.3 Integration testler
    - [x]* 26.3.1 Robot House entegrasyon testi
      - Robot House'da oluşturulan post'un profilde göründüğünü test et
      - Profilden silinen post'un Robot House'dan da silindiğini test et
    
    - [x]* 26.3.2 Real-time listener testleri
      - Beğeni/yorum güncellemelerinin real-time çalıştığını test et
      - Takipçi sayısının real-time güncellendiğini test et

- [x] 27. Responsive design testleri
  - [x] 27.1 Mobil görünüm testi
    - 2 sütunlu grid düzenini test et (< 768px)
    - Modal'ların tam ekran olduğunu doğrula
    - Touch target'ların minimum 44x44px olduğunu kontrol et
    - _Requirements: 11.1, 11.4, 11.5_
  
  - [x] 27.2 Tablet görünüm testi
    - 2 sütunlu grid düzenini test et (768px - 1024px)
    - _Requirements: 11.2_
  
  - [x] 27.3 Desktop görünüm testi
    - 3 sütunlu grid düzenini test et (> 1024px)
    - _Requirements: 11.3_

- [x] 28. Final checkpoint - Tüm özellikler tamamlandı
  - Tüm testlerin geçtiğini doğrula
  - Performans metriklerini kontrol et (profil yükleme < 2s)
  - Animasyonların 60 FPS'de çalıştığını test et
  - Responsive design'ın tüm cihazlarda çalıştığını doğrula
  - Error handling'in doğru çalıştığını test et
  - Kullanıcıya final sorular varsa sor

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at the end of each phase
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- Mevcut ProfilePage.tsx ve RobotHouse.tsx componentleri refactor edilecek, sıfırdan yazılmayacak
- Firebase Database Rules güncellemeleri dikkatli yapılmalı, mevcut veriler korunmalı
- Real-time listener'lar her zaman cleanup edilmeli (memory leak önleme)
- Tüm medya upload'ları compression ve validation ile yapılmalı
- Eco points sistemi her aksiyonda doğru şekilde çalışmalı

