# Sosyal Medya Profil Sistemi - Teknik Tasarım Dokümanı

## Overview

Bu doküman, Nature.co platformu için Instagram benzeri sosyal medya profil sisteminin teknik tasarımını tanımlar. Sistem, mevcut Robot House (nature_posts) altyapısı üzerine inşa edilecek ve kullanıcıların içerik paylaşabileceği, birbirlerini takip edebileceği ve etkileşimde bulunabileceği modern bir sosyal medya deneyimi sunacaktır.

### Temel Özellikler

- Kullanıcı profil sayfaları (/profile/:userId routing)
- Instagram tarzı içerik grid görünümü
- Post oluşturma ve paylaşma (metin, fotoğraf, video, müzik, kod, doğa, teknoloji)
- Beğeni ve yorum sistemi
- Takip/takipçi mekanizması
- Story sistemi (24 saat sonra kaybolan içerikler)
- Eco Points gamification sistemi
- Robot House entegrasyonu
- Real-time güncellemeler

### Teknoloji Stack'i

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS (via @tailwindcss/vite)
- **Animasyon**: Framer Motion
- **İkonlar**: Lucide React
- **Backend**: Firebase Realtime Database
- **Storage**: Firebase Storage
- **Auth**: Firebase Authentication
- **Routing**: React Router v6

## Architecture

### High-Level Mimari

```
┌─────────────────────────────────────────────────────────────┐
│                     React Application                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ ProfilePage  │  │ RobotHouse   │  │ Other Pages  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │
│         │                  │                                  │
│         └──────────────────┴──────────────────┐              │
│                                                │              │
│         ┌──────────────────────────────────────▼────┐        │
│         │      Profile Service Layer                │        │
│         │  - profileService.ts                      │        │
│         │  - postService.ts                         │        │
│         │  - followService.ts                       │        │
│         │  - storyService.ts                        │        │
│         └──────────────────┬────────────────────────┘        │
└────────────────────────────┼─────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Firebase Services                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Realtime   │  │   Storage    │  │     Auth     │      │
│  │   Database   │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Component Hiyerarşisi

```
App.tsx
└── ProfilePage.tsx (yeni)
    ├── ProfileHeader
    │   ├── CoverPhoto
    │   ├── ProfileAvatar
    │   ├── ProfileInfo
    │   └── ProfileActions (Edit/Follow buttons)
    ├── ProfileStats
    │   ├── PostCount
    │   ├── FollowerCount
    │   └── FollowingCount
    ├── ProfileTabs
    │   ├── PostsTab
    │   ├── BadgesTab
    │   └── AboutTab
    ├── PostGrid (yeni)
    │   └── PostCard[]
    ├── StoryRing (yeni)
    │   └── StoryItem[]
    ├── CreatePostModal (yeni)
    ├── PostDetailModal (yeni)
    ├── FollowerListModal (yeni)
    └── FollowingListModal (yeni)
```


## Components and Interfaces

### 1. ProfilePage Component

**Dosya**: `src/components/ProfilePage.tsx` (mevcut, genişletilecek)

**Props**:
```typescript
interface ProfilePageProps {
  theme: Theme;
  userId: string;        // Current logged-in user
  viewUserId?: string;   // Profile being viewed (optional, defaults to userId)
}
```

**State**:
```typescript
interface ProfilePageState {
  user: UserProfile | null;
  posts: Post[];
  stories: Story[];
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isOwnProfile: boolean;
  activeTab: 'posts' | 'badges' | 'about';
  selectedPost: Post | null;
  showCreatePostModal: boolean;
  showFollowerModal: boolean;
  showFollowingModal: boolean;
}
```

**Sorumluluklar**:
- Profil bilgilerini Firebase'den çekme ve görüntüleme
- Post grid'ini render etme
- Story ring'ini görüntüleme
- Takip/takipten çık işlemlerini yönetme
- Modal'ları kontrol etme

### 2. PostGrid Component (Yeni)

**Dosya**: `src/components/PostGrid.tsx`

**Props**:
```typescript
interface PostGridProps {
  posts: Post[];
  onPostClick: (post: Post) => void;
  columns: 2 | 3;  // Responsive: 2 for mobile, 3 for desktop
}
```

**Özellikler**:
- CSS Grid layout kullanarak responsive grid
- Lazy loading (Intersection Observer API)
- Post önizleme kartları
- Hover efektleri (beğeni/yorum sayıları)

### 3. CreatePostModal Component (Yeni)

**Dosya**: `src/components/CreatePostModal.tsx`

**Props**:
```typescript
interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: (post: Post) => void;
  userId: string;
  username: string;
}
```

**State**:
```typescript
interface CreatePostModalState {
  content: string;
  postType: PostType;
  mediaFile: File | null;
  mediaPreview: string | null;
  mood: string;
  isUploading: boolean;
  error: string | null;
}
```

**Özellikler**:
- Metin girişi (max 500 karakter)
- Post tipi seçimi (text, photo, video, music, code, nature, tech)
- Medya dosyası yükleme ve önizleme
- Mood emoji seçimi
- Karakter sayacı
- Validation

### 4. PostDetailModal Component (Yeni)

**Dosya**: `src/components/PostDetailModal.tsx`

**Props**:
```typescript
interface PostDetailModalProps {
  post: Post;
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onLike: (postId: string) => void;
  onComment: (postId: string, content: string) => void;
  onDelete?: (postId: string) => void;
}
```

**Özellikler**:
- Post detaylarını tam boyutta gösterme
- Yorum listesi (real-time)
- Yorum ekleme formu
- Beğeni butonu
- Silme butonu (sadece post sahibi veya admin için)

### 5. StoryRing Component (Yeni)

**Dosya**: `src/components/StoryRing.tsx`

**Props**:
```typescript
interface StoryRingProps {
  stories: Story[];
  onStoryClick: (story: Story) => void;
  onCreateStory: () => void;
  currentUserId: string;
}
```

**Özellikler**:
- Horizontal scroll story listesi
- Aktif story'leri renkli ring ile gösterme
- "Create Story" butonu
- Story önizleme avatarları

### 6. StoryViewer Component (Yeni)

**Dosya**: `src/components/StoryViewer.tsx`

**Props**:
```typescript
interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onReaction: (storyId: string, emoji: string) => void;
}
```

**Özellikler**:
- Fullscreen story görüntüleme
- Otomatik ilerleme (5 saniye)
- Progress bar
- Swipe navigation
- Emoji reaction picker
- Story bilgileri (kullanıcı, zaman)

### 7. FollowerListModal Component (Yeni)

**Dosya**: `src/components/FollowerListModal.tsx`

**Props**:
```typescript
interface FollowerListModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
  onUserClick: (userId: string) => void;
}
```

**Özellikler**:
- Takipçi listesini gösterme
- Kullanıcı arama
- Profil önizleme
- Takip/takipten çık butonları


## Data Models

### Firebase Realtime Database Yapısı

```typescript
// Root structure
{
  users: {
    [userId: string]: UserProfile
  },
  nature_posts: {
    [postId: string]: Post
  },
  followers: {
    [userId: string]: {
      [followerId: string]: FollowRelation
    }
  },
  following: {
    [userId: string]: {
      [followingId: string]: FollowRelation
    }
  },
  stories: {
    [userId: string]: {
      [storyId: string]: Story
    }
  },
  user_posts_index: {
    [userId: string]: {
      [postId: string]: boolean
    }
  }
}
```

### UserProfile Interface

```typescript
interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  avatar?: string;
  cover_photo?: string;
  bio?: string;
  location?: string;
  status_message?: string;
  social_links?: {
    twitter?: string;
    github?: string;
    instagram?: string;
    website?: string;
  };
  xp: number;
  eco_points: number;
  message_count: number;
  is_admin: boolean;
  is_verified: boolean;
  is_banned: boolean;
  badges: string[];
  createdAt: string;
  last_seen: string;
  status: 'online' | 'offline' | 'away' | 'busy';
}
```

### Post Interface

```typescript
interface Post {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  content: string;
  type: 'text' | 'photo' | 'video' | 'music' | 'code' | 'nature' | 'tech';
  media?: {
    url: string;
    type: string;
    thumbnail?: string;
  };
  likes: {
    [userId: string]: boolean;
  };
  comments: {
    [commentId: string]: Comment;
  };
  shares: number;
  views: number;
  timestamp: number;
  tags?: string[];
  mood?: string;
  location?: string;
}
```

### Comment Interface

```typescript
interface Comment {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  content: string;
  timestamp: number;
  likes?: {
    [userId: string]: boolean;
  };
}
```

### Story Interface

```typescript
interface Story {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  media: {
    url: string;
    type: 'photo' | 'video';
    thumbnail?: string;
  };
  duration: number;  // seconds
  createdAt: number;
  expiresAt: number;  // createdAt + 24 hours
  views: {
    [userId: string]: number;  // timestamp of view
  };
  reactions: {
    [userId: string]: string;  // emoji
  };
}
```

### FollowRelation Interface

```typescript
interface FollowRelation {
  at: number;  // timestamp
}
```

### ProfileStats Interface

```typescript
interface ProfileStats {
  postCount: number;
  followerCount: number;
  followingCount: number;
  totalLikes: number;
  level: number;
  xp: number;
}
```


## Service Layer

### 1. profileService.ts (Yeni)

**Dosya**: `src/services/profileService.ts`

**Fonksiyonlar**:

```typescript
// Profil bilgilerini getir
export async function getProfile(userId: string): Promise<UserProfile | null>

// Profil bilgilerini güncelle
export async function updateProfile(
  userId: string, 
  updates: Partial<UserProfile>
): Promise<void>

// Profil fotoğrafı yükle
export async function uploadProfilePhoto(
  userId: string, 
  file: File
): Promise<string>  // Returns URL

// Kapak fotoğrafı yükle
export async function uploadCoverPhoto(
  userId: string, 
  file: File
): Promise<string>  // Returns URL

// Profil istatistiklerini hesapla
export async function calculateProfileStats(
  userId: string
): Promise<ProfileStats>

// Kullanıcı arama
export function searchUsers(
  query: string, 
  limit: number = 20
): Promise<UserProfile[]>

// Popüler kullanıcıları getir
export function getPopularUsers(limit: number = 10): Promise<UserProfile[]>
```

### 2. postService.ts (Yeni)

**Dosya**: `src/services/postService.ts`

**Fonksiyonlar**:

```typescript
// Post oluştur
export async function createPost(
  userId: string,
  username: string,
  content: string,
  type: PostType,
  options?: {
    mediaFile?: File;
    mood?: string;
    tags?: string[];
    location?: string;
  }
): Promise<string>  // Returns postId

// Kullanıcının post'larını getir
export function listenUserPosts(
  userId: string,
  callback: (posts: Post[]) => void,
  limit?: number
): () => void  // Returns unsubscribe function

// Post detayını getir
export async function getPost(postId: string): Promise<Post | null>

// Post sil
export async function deletePost(postId: string, userId: string): Promise<void>

// Post beğen/beğeniyi kaldır
export async function toggleLike(
  postId: string, 
  userId: string
): Promise<boolean>  // Returns new like state

// Yorum ekle
export async function addComment(
  postId: string,
  userId: string,
  username: string,
  content: string
): Promise<string>  // Returns commentId

// Yorumları dinle
export function listenComments(
  postId: string,
  callback: (comments: Comment[]) => void
): () => void

// Medya dosyası yükle
export async function uploadMedia(
  file: File,
  userId: string,
  type: 'post' | 'story'
): Promise<{ url: string; thumbnail?: string }>

// Post görüntüleme sayısını artır
export async function incrementViews(postId: string): Promise<void>

// Eco points kazandır
export async function awardEcoPoints(
  userId: string, 
  points: number, 
  reason: string
): Promise<void>
```

### 3. followService.ts (Yeni)

**Dosya**: `src/services/followService.ts`

**Fonksiyonlar**:

```typescript
// Takip et
export async function followUser(
  currentUserId: string,
  targetUserId: string
): Promise<void>

// Takipten çık
export async function unfollowUser(
  currentUserId: string,
  targetUserId: string
): Promise<void>

// Takip durumunu kontrol et
export async function isFollowing(
  currentUserId: string,
  targetUserId: string
): Promise<boolean>

// Takipçi sayısını getir
export async function getFollowerCount(userId: string): Promise<number>

// Takip edilen sayısını getir
export async function getFollowingCount(userId: string): Promise<number>

// Takipçi listesini getir
export function listenFollowers(
  userId: string,
  callback: (followers: UserProfile[]) => void
): () => void

// Takip edilen listesini getir
export function listenFollowing(
  userId: string,
  callback: (following: UserProfile[]) => void
): () => void

// Takipçi sayısını real-time dinle
export function listenFollowerCount(
  userId: string,
  callback: (count: number) => void
): () => void

// Takip edilen sayısını real-time dinle
export function listenFollowingCount(
  userId: string,
  callback: (count: number) => void
): () => void
```

### 4. storyService.ts (Yeni)

**Dosya**: `src/services/storyService.ts`

**Fonksiyonlar**:

```typescript
// Story oluştur
export async function createStory(
  userId: string,
  username: string,
  mediaFile: File,
  duration: number = 5
): Promise<string>  // Returns storyId

// Kullanıcının story'lerini getir
export function listenUserStories(
  userId: string,
  callback: (stories: Story[]) => void
): () => void

// Takip edilen kullanıcıların story'lerini getir
export function listenFollowingStories(
  userId: string,
  callback: (stories: Story[]) => void
): () => void

// Story görüntüle (view count artır)
export async function viewStory(
  storyId: string,
  userId: string,
  ownerId: string
): Promise<void>

// Story'ye reaction ekle
export async function addStoryReaction(
  storyId: string,
  userId: string,
  ownerId: string,
  emoji: string
): Promise<void>

// Süresi dolan story'leri temizle (background job)
export async function cleanupExpiredStories(): Promise<void>

// Aktif story'si olan kullanıcıları getir
export async function getUsersWithActiveStories(
  userIds: string[]
): Promise<string[]>
```


## Routing Yapısı

### React Router Konfigürasyonu

**Dosya**: `src/App.tsx` (güncellenecek)

```typescript
// Yeni route'lar eklenecek
const routes = [
  // ... mevcut route'lar
  {
    path: '/profile',
    element: <ProfilePage userId={currentUser.uid} />
  },
  {
    path: '/profile/:userId',
    element: <ProfilePage userId={currentUser.uid} viewUserId={params.userId} />
  }
];
```

### URL Yapısı

- `/profile` - Kendi profilini görüntüle
- `/profile/:userId` - Başka bir kullanıcının profilini görüntüle
- Query parameters:
  - `?tab=posts|badges|about` - Aktif tab
  - `?post=:postId` - Belirli bir post'u aç

### Navigation Flow

```
1. Sidebar'dan "Profile" butonuna tıklama
   → navigate('/profile')

2. Kullanıcı adına tıklama (herhangi bir yerde)
   → navigate(`/profile/${userId}`)

3. Post'a tıklama
   → navigate(`/profile/${userId}?post=${postId}`)

4. Takipçi/takip edilen listesinden kullanıcıya tıklama
   → navigate(`/profile/${userId}`)
```

## Firebase Storage Yapısı

### Dosya Organizasyonu

```
storage/
├── avatars/
│   └── {userId}
│       └── profile.jpg
├── covers/
│   └── {userId}
│       └── cover.jpg
├── posts/
│   └── {userId}/
│       └── {postId}/
│           ├── original.jpg
│           └── thumbnail.jpg
└── stories/
    └── {userId}/
        └── {storyId}/
            ├── original.jpg
            └── thumbnail.jpg
```

### Upload Stratejisi

1. **Profil/Kapak Fotoğrafları**:
   - Maksimum boyut: 5MB
   - Desteklenen formatlar: JPG, PNG, WebP, GIF
   - Resize: 400x400 (profil), 1200x400 (kapak)
   - Compression: 80% quality

2. **Post Medyası**:
   - Maksimum boyut: 10MB
   - Desteklenen formatlar: JPG, PNG, WebP, GIF, MP4
   - Thumbnail oluştur: 300x300
   - Compression: 85% quality

3. **Story Medyası**:
   - Maksimum boyut: 10MB
   - Desteklenen formatlar: JPG, PNG, MP4
   - Aspect ratio: 9:16 (Instagram story format)
   - Thumbnail oluştur: 200x355

### Upload Fonksiyonu

```typescript
async function uploadWithCompression(
  file: File,
  path: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    createThumbnail?: boolean;
  }
): Promise<{ url: string; thumbnail?: string }> {
  // 1. Validate file
  if (file.size > options.maxSize) {
    throw new Error('File too large');
  }

  // 2. Compress image (if image)
  const compressed = await compressImage(file, options);

  // 3. Upload to Firebase Storage
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, compressed);
  const url = await getDownloadURL(storageRef);

  // 4. Create thumbnail (if requested)
  let thumbnail;
  if (options.createThumbnail) {
    const thumbnailFile = await createThumbnail(compressed);
    const thumbnailRef = ref(storage, `${path}_thumb`);
    await uploadBytes(thumbnailRef, thumbnailFile);
    thumbnail = await getDownloadURL(thumbnailRef);
  }

  return { url, thumbnail };
}
```

## Real-time Listener Stratejisi

### Listener Yönetimi

```typescript
// Component mount olduğunda listener'ları başlat
useEffect(() => {
  const unsubscribers: (() => void)[] = [];

  // 1. Profil bilgilerini dinle
  const profileRef = ref(db, `users/${userId}`);
  const unsubProfile = onValue(profileRef, (snapshot) => {
    setUser(snapshot.val());
  });
  unsubscribers.push(() => off(profileRef));

  // 2. Post'ları dinle
  const unsubPosts = listenUserPosts(userId, setPosts);
  unsubscribers.push(unsubPosts);

  // 3. Takipçi sayısını dinle
  const unsubFollowers = listenFollowerCount(userId, setFollowerCount);
  unsubscribers.push(unsubFollowers);

  // 4. Takip edilen sayısını dinle
  const unsubFollowing = listenFollowingCount(userId, setFollowingCount);
  unsubscribers.push(unsubFollowing);

  // 5. Story'leri dinle
  const unsubStories = listenUserStories(userId, setStories);
  unsubscribers.push(unsubStories);

  // Cleanup: Component unmount olduğunda tüm listener'ları temizle
  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
}, [userId]);
```

### Optimizasyon Stratejileri

1. **Debouncing**: Arama gibi sık tetiklenen işlemler için
2. **Throttling**: Scroll event'leri için
3. **Memoization**: Pahalı hesaplamalar için (useMemo, React.memo)
4. **Lazy Loading**: Görsel yükleme için Intersection Observer
5. **Pagination**: Post listesi için (limitToLast kullanarak)


## Performance Optimizasyonları

### 1. Component Optimizasyonları

```typescript
// React.memo ile gereksiz re-render'ları önle
export const PostCard = React.memo(({ post, onLike, onComment }: PostCardProps) => {
  // ...
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.post.id === nextProps.post.id &&
         prevProps.post.likes === nextProps.post.likes &&
         prevProps.post.comments === nextProps.post.comments;
});

// useMemo ile pahalı hesaplamaları cache'le
const sortedPosts = useMemo(() => {
  return posts.sort((a, b) => b.timestamp - a.timestamp);
}, [posts]);

// useCallback ile fonksiyon referanslarını stabil tut
const handleLike = useCallback((postId: string) => {
  toggleLike(postId, userId);
}, [userId]);
```

### 2. Lazy Loading Stratejisi

```typescript
// Intersection Observer ile görsel lazy loading
const LazyImage = ({ src, alt }: { src: string; alt: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src={isLoaded ? src : '/placeholder.jpg'}
      alt={alt}
      loading="lazy"
    />
  );
};
```

### 3. Pagination Stratejisi

```typescript
// Firebase query ile pagination
export function listenUserPostsPaginated(
  userId: string,
  callback: (posts: Post[]) => void,
  pageSize: number = 20,
  lastPostTimestamp?: number
) {
  const postsRef = ref(db, 'nature_posts');
  
  let q = query(
    postsRef,
    orderByChild('userId'),
    equalTo(userId),
    limitToLast(pageSize)
  );

  if (lastPostTimestamp) {
    q = query(q, endBefore(lastPostTimestamp));
  }

  return onValue(q, (snapshot) => {
    const posts: Post[] = [];
    snapshot.forEach((child) => {
      posts.push({ id: child.key!, ...child.val() });
    });
    callback(posts.reverse());
  });
}
```

### 4. Caching Stratejisi

```typescript
// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedProfile(userId: string): Promise<UserProfile | null> {
  const cached = cache.get(`profile_${userId}`);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const profile = await getProfile(userId);
  
  if (profile) {
    cache.set(`profile_${userId}`, {
      data: profile,
      timestamp: Date.now()
    });
  }

  return profile;
}
```

### 5. Bundle Size Optimizasyonu

```typescript
// Code splitting ile lazy load
const ProfilePage = lazy(() => import('./components/ProfilePage'));
const PostDetailModal = lazy(() => import('./components/PostDetailModal'));
const StoryViewer = lazy(() => import('./components/StoryViewer'));

// Suspense ile loading state
<Suspense fallback={<LoadingSpinner />}>
  <ProfilePage userId={userId} />
</Suspense>
```

## Animasyon Stratejisi

### Framer Motion Konfigürasyonu

```typescript
// Sayfa geçiş animasyonları
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.3
};

// Post grid animasyonları
const gridItemVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.3
    }
  })
};

// Modal animasyonları
const modalVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    transition: { duration: 0.2 }
  }
};

// Beğeni butonu animasyonu
const likeVariants = {
  initial: { scale: 1 },
  tap: { scale: 0.9 },
  liked: {
    scale: [1, 1.3, 1],
    transition: { duration: 0.3 }
  }
};
```

### Animasyon Best Practices

1. **60 FPS hedefi**: Transform ve opacity kullan (layout shift'ten kaçın)
2. **will-change**: Animasyonlu elementlere `will-change: transform` ekle
3. **GPU acceleration**: `transform: translateZ(0)` ile GPU'yu aktif et
4. **Reduced motion**: `prefers-reduced-motion` media query'sine saygı göster

```typescript
// Reduced motion desteği
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const animationConfig = prefersReducedMotion
  ? { duration: 0 }
  : { duration: 0.3, ease: 'easeInOut' };
```


## Firebase Database Rules Güncellemeleri

### Yeni Rules (database.rules.json'a eklenecek)

```json
{
  "rules": {
    "followers": {
      "$userId": {
        ".read": "auth != null",
        ".indexOn": ["at"],
        "$followerId": {
          ".write": "auth != null && (auth.uid === $followerId || auth.uid === $userId)"
        }
      }
    },
    "following": {
      "$userId": {
        ".read": "auth != null",
        ".indexOn": ["at"],
        "$followingId": {
          ".write": "auth != null && auth.uid === $userId"
        }
      }
    },
    "stories": {
      "$userId": {
        ".read": "auth != null",
        ".indexOn": ["createdAt", "expiresAt"],
        "$storyId": {
          ".write": "auth != null && auth.uid === $userId",
          ".validate": "newData.hasChildren(['media', 'createdAt', 'expiresAt']) && newData.child('createdAt').isNumber() && newData.child('expiresAt').isNumber()",
          "views": {
            "$viewerId": {
              ".write": "auth != null && auth.uid === $viewerId"
            }
          },
          "reactions": {
            "$reactorId": {
              ".write": "auth != null && auth.uid === $reactorId"
            }
          }
        }
      }
    },
    "user_posts_index": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $userId"
      }
    },
    "nature_posts": {
      ".read": "auth != null",
      ".indexOn": ["userId", "timestamp", "type"],
      "$postId": {
        ".write": "auth != null && root.child('users').child(auth.uid).child('is_banned').val() !== true && (!data.exists() || data.child('userId').val() === auth.uid || root.child('users').child(auth.uid).child('is_admin').val() === true)",
        ".validate": "!newData.exists() || (newData.hasChildren(['userId', 'content', 'timestamp']) && newData.child('userId').val() === auth.uid && newData.child('content').isString() && newData.child('content').val().length >= 1 && newData.child('content').val().length <= 500 && newData.child('timestamp').isNumber())",
        "likes": {
          "$likerId": {
            ".write": "auth != null && auth.uid === $likerId"
          }
        },
        "comments": {
          "$commentId": {
            ".write": "auth != null && root.child('users').child(auth.uid).child('is_banned').val() !== true",
            ".validate": "newData.hasChildren(['userId', 'content', 'timestamp']) && newData.child('userId').val() === auth.uid && newData.child('content').isString() && newData.child('content').val().length >= 1 && newData.child('content').val().length <= 500"
          }
        }
      }
    }
  }
}
```

### Security Rules Açıklamaları

1. **followers/following**: 
   - Herkes okuyabilir (takipçi listelerini görmek için)
   - Sadece ilgili kullanıcılar yazabilir (takip et/takipten çık)

2. **stories**:
   - Herkes okuyabilir (story'leri görmek için)
   - Sadece story sahibi story oluşturabilir/silebilir
   - Herkes kendi view/reaction'ını ekleyebilir

3. **nature_posts**:
   - Herkes okuyabilir
   - Sadece yasaklanmamış kullanıcılar post oluşturabilir
   - Sadece post sahibi veya admin silebilir
   - Herkes kendi like/comment'ini ekleyebilir

### Database Indexleme

Performans için gerekli indexler:

```json
{
  "rules": {
    ".indexOn": ["timestamp", "userId", "type"],
    "followers": {
      ".indexOn": ["at"]
    },
    "following": {
      ".indexOn": ["at"]
    },
    "stories": {
      ".indexOn": ["createdAt", "expiresAt"]
    },
    "nature_posts": {
      ".indexOn": ["userId", "timestamp", "type"]
    }
  }
}
```

## State Management Stratejisi

### Context API Kullanımı

```typescript
// ProfileContext.tsx
interface ProfileContextValue {
  currentProfile: UserProfile | null;
  posts: Post[];
  stories: Story[];
  followerCount: number;
  followingCount: number;
  isFollowing: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  createPost: (content: string, type: PostType, options?: any) => Promise<void>;
  toggleFollow: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const ProfileContext = createContext<ProfileContextValue | null>(null);

export const ProfileProvider = ({ userId, children }: { userId: string; children: React.ReactNode }) => {
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true);
        const profile = await getProfile(userId);
        setCurrentProfile(profile);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [userId]);

  // Listen to real-time updates
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    unsubscribers.push(listenUserPosts(userId, setPosts));
    unsubscribers.push(listenUserStories(userId, setStories));
    unsubscribers.push(listenFollowerCount(userId, setFollowerCount));
    unsubscribers.push(listenFollowingCount(userId, setFollowingCount));

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [userId]);

  const value: ProfileContextValue = {
    currentProfile,
    posts,
    stories,
    followerCount,
    followingCount,
    isFollowing,
    isLoading,
    error,
    updateProfile: async (updates) => {
      await updateProfile(userId, updates);
      setCurrentProfile(prev => prev ? { ...prev, ...updates } : null);
    },
    createPost: async (content, type, options) => {
      await createPost(userId, currentProfile?.username || '', content, type, options);
    },
    toggleFollow: async () => {
      if (isFollowing) {
        await unfollowUser(auth.currentUser!.uid, userId);
      } else {
        await followUser(auth.currentUser!.uid, userId);
      }
      setIsFollowing(!isFollowing);
    },
    refreshProfile: async () => {
      const profile = await getProfile(userId);
      setCurrentProfile(profile);
    }
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return context;
};
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Prework analizinden sonra, aşağıdaki property'leri birleştirme ve gereksiz olanları çıkarma işlemi yapıldı:

**Birleştirilen Property'ler**:
- 2.4 ve 2.5 (profil/kapak fotoğrafı upload) → tek bir "media upload round-trip" property'sine birleştirildi
- 5.1 ve 5.2 (like toggle) → tek bir "like toggle idempotence" property'sine birleştirildi
- 7.1 ve 7.2 (follow/unfollow) → tek bir "follow toggle" property'sine birleştirildi
- 7.3 ve 7.4 (follower/following count) → tek bir "follow counts accuracy" property'sine birleştirildi
- 10.1 ve 10.2 (post count ve total likes) → tek bir "profile stats accuracy" property'sine birleştirildi

**Çıkarılan Property'ler**:
- Performans gereksinimleri (1.6, 5.6, 14.1) - unit test'te ölçülemez
- UI animasyonları (12.1-12.6) - test edilmesi zor, subjektif
- Implementation details (14.2, 14.4, 14.5, 14.6) - nasıl yapıldığından çok ne yapıldığı önemli

### Property 1: Profile Data Round-Trip

*For any* user profile with valid updates (bio, status_message, social_links), updating the profile and then fetching it should return the same updated values.

**Validates: Requirements 2.8**

**Test Strategy**: Generate random profile updates, apply them, fetch profile, verify all fields match.

### Property 2: Media Upload Round-Trip

*For any* valid image file (JPG, PNG, WebP, GIF) under 5MB, uploading it to Firebase Storage and retrieving the URL should allow downloading the same image.

**Validates: Requirements 2.4, 2.5**

**Test Strategy**: Upload test images, retrieve URLs, verify images are accessible and match original.

### Property 3: Post Creation Completeness

*For any* post created with userId, username, content, and type, the post should automatically include all required fields (timestamp, likes, comments, views, mood).

**Validates: Requirements 3.5, 3.6**

**Test Strategy**: Create posts with minimal data, verify all auto-generated fields exist.

### Property 4: Eco Points Award

*For any* user action that awards eco points (post creation: +10, like: +1, comment: +2), the user's eco_points should increase by exactly that amount.

**Validates: Requirements 3.7, 5.4, 6.7**

**Test Strategy**: Track eco_points before and after actions, verify delta matches expected value.

### Property 5: Post Grid Ordering

*For any* user's post collection, the posts should be displayed in descending order by timestamp (newest first).

**Validates: Requirements 4.2**

**Test Strategy**: Create posts with different timestamps, verify grid order matches timestamp order.

### Property 6: Like Toggle Idempotence

*For any* post, liking it twice should result in the like being removed (toggle behavior), and the like count should reflect this accurately.

**Validates: Requirements 5.1, 5.2, 5.3**

**Test Strategy**: Like post → verify like exists, like again → verify like removed, check count accuracy.

### Property 7: Comment Persistence

*For any* valid comment (content 1-500 chars), adding it to a post should persist it in nature_posts/{postId}/comments and increment the post's comment count.

**Validates: Requirements 6.3, 6.6**

**Test Strategy**: Add comments, verify they exist in DB and count increments correctly.

### Property 8: Follow Relationship Symmetry

*For any* two users A and B, when A follows B, the relationship should exist in both followers/{B}/{A} and following/{A}/{B}, and unfollowing should remove both.

**Validates: Requirements 7.1, 7.2**

**Test Strategy**: Follow user, verify both paths exist, unfollow, verify both paths removed.

### Property 9: Follow Counts Accuracy

*For any* user, the follower count should equal the number of entries in followers/{userId}, and following count should equal entries in following/{userId}.

**Validates: Requirements 7.3, 7.4**

**Test Strategy**: Add/remove followers, verify counts match actual DB entries.

### Property 10: Story Expiration

*For any* story, the expiresAt timestamp should be exactly createdAt + 24 hours, and stories with expiresAt < now should be automatically removed.

**Validates: Requirements 8.4, 8.5**

**Test Strategy**: Create stories, verify expiresAt calculation, mock time passage, verify cleanup.

### Property 11: Robot House Integration

*For any* post created in Robot House, it should appear in the user's profile with the same postId, and deleting it from either location should remove it from both.

**Validates: Requirements 9.1, 9.3, 9.4, 9.5**

**Test Strategy**: Create post in Robot House, verify it appears in profile, delete from profile, verify removed from Robot House.

### Property 12: Profile Stats Accuracy

*For any* user, the profile stats (post count, total likes) should accurately reflect the sum of their posts and likes across all posts.

**Validates: Requirements 10.1, 10.2**

**Test Strategy**: Create posts, add likes, verify stats match actual counts.

### Property 13: Level Calculation

*For any* user with eco_points, the level should be calculated as floor(eco_points / 100) + 1, and progress should be eco_points % 100.

**Validates: Requirements 10.4**

**Test Strategy**: Set various eco_points values, verify level and progress calculations.

### Property 14: Authorization Enforcement

*For any* user attempting to edit a profile or delete a post, the operation should succeed only if userId matches the resource owner or user is admin.

**Validates: Requirements 13.1, 13.2, 13.3**

**Test Strategy**: Attempt unauthorized operations, verify they fail; attempt authorized operations, verify they succeed.

### Property 15: Banned User Restriction

*For any* user with is_banned === true, attempting to create posts or comments should fail.

**Validates: Requirements 13.4**

**Test Strategy**: Set user as banned, attempt post/comment creation, verify failure.

### Property 16: Listener Cleanup

*For any* component using Firebase listeners, unmounting the component should call all unsubscribe functions and prevent memory leaks.

**Validates: Requirements 14.3**

**Test Strategy**: Mount component, verify listeners active, unmount, verify listeners cleaned up.

### Property 17: User Search Filtering

*For any* search query, the results should only include users whose username contains the query string (case-insensitive).

**Validates: Requirements 15.1**

**Test Strategy**: Search with various queries, verify all results match query.

### Property 18: Popular Users Ranking

*For any* set of users, the popular users list should be sorted by follower count in descending order.

**Validates: Requirements 15.5**

**Test Strategy**: Create users with different follower counts, verify ranking order.


## Error Handling

### Error Types

```typescript
// Custom error types
export class ProfileError extends Error {
  constructor(
    message: string,
    public code: ProfileErrorCode,
    public details?: any
  ) {
    super(message);
    this.name = 'ProfileError';
  }
}

export enum ProfileErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  USER_BANNED = 'USER_BANNED',
  
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  CONTENT_TOO_LONG = 'CONTENT_TOO_LONG',
  
  // Resource errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  POST_NOT_FOUND = 'POST_NOT_FOUND',
  STORY_NOT_FOUND = 'STORY_NOT_FOUND',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}
```

### Error Handling Strategy

```typescript
// Service layer error handling
export async function createPost(
  userId: string,
  username: string,
  content: string,
  type: PostType,
  options?: any
): Promise<string> {
  try {
    // 1. Validate input
    if (!content || content.trim().length === 0) {
      throw new ProfileError(
        'İçerik boş olamaz',
        ProfileErrorCode.INVALID_INPUT
      );
    }

    if (content.length > 500) {
      throw new ProfileError(
        'İçerik maksimum 500 karakter olabilir',
        ProfileErrorCode.CONTENT_TOO_LONG,
        { maxLength: 500, actualLength: content.length }
      );
    }

    // 2. Check user status
    const user = await getUser(userId);
    if (!user) {
      throw new ProfileError(
        'Kullanıcı bulunamadı',
        ProfileErrorCode.USER_NOT_FOUND
      );
    }

    if (user.is_banned) {
      throw new ProfileError(
        'Yasaklı kullanıcılar içerik paylaşamaz',
        ProfileErrorCode.USER_BANNED
      );
    }

    // 3. Upload media if exists
    let mediaUrl;
    if (options?.mediaFile) {
      if (options.mediaFile.size > 10 * 1024 * 1024) {
        throw new ProfileError(
          'Dosya boyutu 10MB\'dan büyük olamaz',
          ProfileErrorCode.FILE_TOO_LARGE,
          { maxSize: 10 * 1024 * 1024, actualSize: options.mediaFile.size }
        );
      }

      try {
        const { url } = await uploadMedia(options.mediaFile, userId, 'post');
        mediaUrl = url;
      } catch (err) {
        throw new ProfileError(
          'Dosya yüklenemedi',
          ProfileErrorCode.UPLOAD_FAILED,
          { originalError: err }
        );
      }
    }

    // 4. Create post
    const postRef = push(ref(db, 'nature_posts'));
    const postId = postRef.key!;

    await set(postRef, {
      userId,
      username,
      avatar: user.avatar || '',
      content: content.trim(),
      type,
      media: mediaUrl ? { url: mediaUrl } : null,
      likes: {},
      comments: {},
      shares: 0,
      views: 0,
      timestamp: Date.now(),
      mood: options?.mood || '🌿',
      tags: options?.tags || []
    });

    // 5. Award eco points
    await awardEcoPoints(userId, 10, 'post_created');

    return postId;

  } catch (err) {
    // Re-throw ProfileError as-is
    if (err instanceof ProfileError) {
      throw err;
    }

    // Wrap unknown errors
    throw new ProfileError(
      'Post oluşturulurken bir hata oluştu',
      ProfileErrorCode.DATABASE_ERROR,
      { originalError: err }
    );
  }
}
```

### Component Error Handling

```typescript
// Error boundary for profile section
export class ProfileErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Profile error:', error, errorInfo);
    // Log to error tracking service (e.g., Sentry)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="text-6xl mb-4">😕</div>
            <h2 className="text-xl font-bold text-white mb-2">
              Bir şeyler ters gitti
            </h2>
            <p className="text-white/60 mb-4">
              {this.state.error?.message || 'Profil yüklenirken hata oluştu'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-500 text-white rounded-xl"
            >
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage in App.tsx
<ProfileErrorBoundary>
  <ProfilePage userId={userId} />
</ProfileErrorBoundary>
```

### User-Facing Error Messages

```typescript
// Error message mapping
export const ERROR_MESSAGES: Record<ProfileErrorCode, string> = {
  [ProfileErrorCode.UNAUTHORIZED]: 'Bu işlem için giriş yapmalısınız',
  [ProfileErrorCode.FORBIDDEN]: 'Bu işlemi yapmaya yetkiniz yok',
  [ProfileErrorCode.USER_BANNED]: 'Hesabınız yasaklandı',
  [ProfileErrorCode.INVALID_INPUT]: 'Geçersiz veri girişi',
  [ProfileErrorCode.FILE_TOO_LARGE]: 'Dosya boyutu çok büyük',
  [ProfileErrorCode.INVALID_FILE_TYPE]: 'Geçersiz dosya formatı',
  [ProfileErrorCode.CONTENT_TOO_LONG]: 'İçerik çok uzun',
  [ProfileErrorCode.USER_NOT_FOUND]: 'Kullanıcı bulunamadı',
  [ProfileErrorCode.POST_NOT_FOUND]: 'İçerik bulunamadı',
  [ProfileErrorCode.STORY_NOT_FOUND]: 'Hikaye bulunamadı',
  [ProfileErrorCode.NETWORK_ERROR]: 'Bağlantı hatası',
  [ProfileErrorCode.UPLOAD_FAILED]: 'Dosya yüklenemedi',
  [ProfileErrorCode.DATABASE_ERROR]: 'Veritabanı hatası',
  [ProfileErrorCode.RATE_LIMIT_EXCEEDED]: 'Çok fazla istek gönderdiniz',
};

// Toast notification for errors
export function showError(error: ProfileError) {
  const message = ERROR_MESSAGES[error.code] || error.message;
  
  // Use existing toast system or create new one
  toast.error(message, {
    duration: 4000,
    position: 'top-center',
  });
}
```

### Retry Logic

```typescript
// Exponential backoff retry
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      
      // Don't retry on validation errors
      if (err instanceof ProfileError && [
        ProfileErrorCode.INVALID_INPUT,
        ProfileErrorCode.FILE_TOO_LARGE,
        ProfileErrorCode.INVALID_FILE_TYPE,
        ProfileErrorCode.CONTENT_TOO_LONG,
        ProfileErrorCode.USER_BANNED,
        ProfileErrorCode.FORBIDDEN,
      ].includes(err.code)) {
        throw err;
      }

      // Wait before retry
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

// Usage
const post = await retryWithBackoff(() => createPost(userId, username, content, type));
```


## Testing Strategy

### Dual Testing Approach

Bu proje için hem unit testler hem de property-based testler kullanılacaktır. Her iki yaklaşım da birbirini tamamlar:

- **Unit testler**: Spesifik örnekler, edge case'ler ve hata durumları için
- **Property testler**: Evrensel kuralların tüm girdiler için geçerliliğini doğrulamak için

### Property-Based Testing Konfigürasyonu

**Kütüphane**: `fast-check` (JavaScript/TypeScript için property-based testing)

```bash
npm install --save-dev fast-check @types/fast-check
```

**Konfigürasyon**:
- Minimum 100 iterasyon per test (randomizasyon nedeniyle)
- Her property test, design dokümanındaki property'ye referans verecek
- Tag format: `Feature: social-media-profile-system, Property {number}: {property_text}`

### Property Test Örnekleri

```typescript
import fc from 'fast-check';
import { describe, it, expect } from 'vitest';

describe('Profile System Properties', () => {
  /**
   * Feature: social-media-profile-system, Property 1: Profile Data Round-Trip
   * For any user profile with valid updates, updating and fetching should return same values
   */
  it('profile updates should persist correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          bio: fc.string({ maxLength: 300 }),
          status_message: fc.string({ maxLength: 100 }),
          location: fc.string({ maxLength: 100 }),
        }),
        async (updates) => {
          const userId = 'test-user-' + Date.now();
          
          // Update profile
          await updateProfile(userId, updates);
          
          // Fetch profile
          const profile = await getProfile(userId);
          
          // Verify
          expect(profile?.bio).toBe(updates.bio);
          expect(profile?.status_message).toBe(updates.status_message);
          expect(profile?.location).toBe(updates.location);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: social-media-profile-system, Property 4: Eco Points Award
   * For any user action, eco_points should increase by expected amount
   */
  it('eco points should be awarded correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          action: fc.constantFrom('post', 'like', 'comment'),
          userId: fc.string(),
        }),
        async ({ action, userId }) => {
          const initialPoints = (await getUser(userId))?.eco_points || 0;
          
          const expectedIncrease = {
            post: 10,
            like: 1,
            comment: 2,
          }[action];
          
          // Perform action
          await awardEcoPoints(userId, expectedIncrease, action);
          
          // Verify
          const finalPoints = (await getUser(userId))?.eco_points || 0;
          expect(finalPoints - initialPoints).toBe(expectedIncrease);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: social-media-profile-system, Property 6: Like Toggle Idempotence
   * For any post, liking twice should remove the like
   */
  it('like toggle should be idempotent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          postId: fc.string(),
          userId: fc.string(),
        }),
        async ({ postId, userId }) => {
          // Like once
          const firstState = await toggleLike(postId, userId);
          expect(firstState).toBe(true);
          
          // Like again
          const secondState = await toggleLike(postId, userId);
          expect(secondState).toBe(false);
          
          // Verify like is removed
          const post = await getPost(postId);
          expect(post?.likes[userId]).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: social-media-profile-system, Property 8: Follow Relationship Symmetry
   * For any two users, follow relationship should exist in both paths
   */
  it('follow relationship should be symmetric', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userA: fc.string(),
          userB: fc.string(),
        }),
        async ({ userA, userB }) => {
          // Follow
          await followUser(userA, userB);
          
          // Verify both paths exist
          const followingExists = await get(ref(db, `following/${userA}/${userB}`));
          const followerExists = await get(ref(db, `followers/${userB}/${userA}`));
          
          expect(followingExists.exists()).toBe(true);
          expect(followerExists.exists()).toBe(true);
          
          // Unfollow
          await unfollowUser(userA, userB);
          
          // Verify both paths removed
          const followingAfter = await get(ref(db, `following/${userA}/${userB}`));
          const followerAfter = await get(ref(db, `followers/${userB}/${userA}`));
          
          expect(followingAfter.exists()).toBe(false);
          expect(followerAfter.exists()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: social-media-profile-system, Property 13: Level Calculation
   * For any eco_points value, level should be calculated correctly
   */
  it('level calculation should be correct', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        (ecoPoints) => {
          const expectedLevel = Math.floor(ecoPoints / 100) + 1;
          const expectedProgress = ecoPoints % 100;
          
          const { level, progress } = calculateLevel(ecoPoints);
          
          expect(level).toBe(expectedLevel);
          expect(progress).toBe(expectedProgress);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Test Örnekleri

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Profile Service', () => {
  let testUserId: string;

  beforeEach(() => {
    testUserId = 'test-user-' + Date.now();
  });

  afterEach(async () => {
    // Cleanup test data
    await remove(ref(db, `users/${testUserId}`));
  });

  it('should reject bio longer than 300 characters', async () => {
    const longBio = 'a'.repeat(301);
    
    await expect(
      updateProfile(testUserId, { bio: longBio })
    ).rejects.toThrow(ProfileError);
  });

  it('should reject files larger than 5MB', async () => {
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg');
    
    await expect(
      uploadProfilePhoto(testUserId, largeFile)
    ).rejects.toThrow(ProfileError);
  });

  it('should reject invalid file types', async () => {
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    await expect(
      uploadProfilePhoto(testUserId, invalidFile)
    ).rejects.toThrow(ProfileError);
  });

  it('should prevent banned users from creating posts', async () => {
    await updateUser(testUserId, { is_banned: true });
    
    await expect(
      createPost(testUserId, 'testuser', 'test content', 'text')
    ).rejects.toThrow(ProfileError);
  });

  it('should only allow post owner or admin to delete posts', async () => {
    const postId = await createPost(testUserId, 'testuser', 'test', 'text');
    const otherUserId = 'other-user';
    
    await expect(
      deletePost(postId, otherUserId)
    ).rejects.toThrow(ProfileError);
  });
});

describe('Story Service', () => {
  it('should set expiresAt to 24 hours after creation', async () => {
    const userId = 'test-user';
    const storyId = await createStory(userId, 'testuser', mockFile);
    
    const story = await get(ref(db, `stories/${userId}/${storyId}`));
    const storyData = story.val();
    
    const expectedExpiry = storyData.createdAt + (24 * 60 * 60 * 1000);
    expect(storyData.expiresAt).toBe(expectedExpiry);
  });

  it('should cleanup expired stories', async () => {
    const userId = 'test-user';
    const storyId = await createStory(userId, 'testuser', mockFile);
    
    // Manually set expiry to past
    await update(ref(db, `stories/${userId}/${storyId}`), {
      expiresAt: Date.now() - 1000
    });
    
    // Run cleanup
    await cleanupExpiredStories();
    
    // Verify story is deleted
    const story = await get(ref(db, `stories/${userId}/${storyId}`));
    expect(story.exists()).toBe(false);
  });
});

describe('Follow Service', () => {
  it('should not show follow button on own profile', () => {
    const { container } = render(
      <ProfilePage userId="user1" viewUserId="user1" />
    );
    
    expect(container.querySelector('[data-testid="follow-button"]')).toBeNull();
  });

  it('should show follower list modal when clicking follower count', async () => {
    const { getByText, getByTestId } = render(
      <ProfilePage userId="user1" viewUserId="user2" />
    );
    
    const followerCount = getByTestId('follower-count');
    fireEvent.click(followerCount);
    
    expect(getByText('Takipçiler')).toBeInTheDocument();
  });
});
```

### Integration Test Örnekleri

```typescript
describe('Robot House Integration', () => {
  it('should show posts created in Robot House on profile', async () => {
    const userId = 'test-user';
    
    // Create post in Robot House
    const postId = await createPost(userId, 'testuser', 'test content', 'nature');
    
    // Fetch user posts
    const posts = await new Promise<Post[]>((resolve) => {
      const unsub = listenUserPosts(userId, (posts) => {
        resolve(posts);
        unsub();
      });
    });
    
    // Verify post appears
    expect(posts.find(p => p.id === postId)).toBeDefined();
  });

  it('should remove post from both locations when deleted', async () => {
    const userId = 'test-user';
    const postId = await createPost(userId, 'testuser', 'test', 'text');
    
    // Delete from profile
    await deletePost(postId, userId);
    
    // Verify removed from nature_posts
    const post = await get(ref(db, `nature_posts/${postId}`));
    expect(post.exists()).toBe(false);
  });
});
```

### Test Coverage Hedefleri

- **Unit test coverage**: Minimum %80
- **Property test coverage**: Tüm critical properties için testler
- **Integration test coverage**: Tüm major user flows için testler

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run property tests
        run: npm run test:property
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Generate coverage report
        run: npm run test:coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```


## Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)

**Hedef**: Temel profil sistemi ve veri yapıları

1. **Service Layer**:
   - `profileService.ts` oluştur
   - `postService.ts` oluştur (mevcut RobotHouse kodundan refactor)
   - `followService.ts` oluştur
   - Firebase Database Rules güncelle

2. **Data Models**:
   - TypeScript interface'lerini tanımla
   - Firebase Database yapısını oluştur
   - Migration script'leri (mevcut nature_posts verilerini korumak için)

3. **Routing**:
   - `/profile` ve `/profile/:userId` route'larını ekle
   - URL parameter handling
   - Navigation guards (authentication check)

**Deliverables**:
- Tüm service fonksiyonları implement edilmiş
- Database rules deploy edilmiş
- Routing çalışıyor

### Phase 2: Profile Page UI (Week 2)

**Hedef**: Profil sayfası görünümü ve temel özellikler

1. **ProfilePage Component**:
   - ProfileHeader (avatar, cover, stats)
   - ProfileInfo (bio, social links)
   - ProfileActions (edit/follow buttons)
   - ProfileTabs (posts, badges, about)

2. **PostGrid Component**:
   - Grid layout (responsive)
   - Post cards
   - Lazy loading
   - Hover effects

3. **Profil Düzenleme**:
   - Edit mode toggle
   - Form validation
   - Avatar/cover upload
   - Save functionality

**Deliverables**:
- Profil sayfası görüntüleme çalışıyor
- Profil düzenleme çalışıyor
- Responsive design tamamlanmış

### Phase 3: Post System (Week 3)

**Hedef**: İçerik oluşturma ve etkileşim

1. **CreatePostModal Component**:
   - Post type selection
   - Content input
   - Media upload
   - Mood selection

2. **PostDetailModal Component**:
   - Post detail view
   - Comment list
   - Comment form
   - Like button

3. **Engagement Features**:
   - Like system
   - Comment system
   - View tracking
   - Eco points integration

**Deliverables**:
- Post oluşturma çalışıyor
- Beğeni/yorum sistemi çalışıyor
- Eco points kazanımı çalışıyor

### Phase 4: Follow System (Week 4)

**Hedef**: Takip mekanizması ve sosyal özellikler

1. **Follow Functionality**:
   - Follow/unfollow buttons
   - Follow state management
   - Real-time count updates

2. **FollowerListModal Component**:
   - Follower list
   - Following list
   - User search
   - Quick follow/unfollow

3. **Social Features**:
   - Popular users recommendation
   - User search
   - Profile discovery

**Deliverables**:
- Takip sistemi çalışıyor
- Takipçi/takip edilen listeleri çalışıyor
- Kullanıcı arama çalışıyor

### Phase 5: Story System (Week 5)

**Hedef**: 24 saatlik hikaye özelliği

1. **Story Components**:
   - StoryRing (horizontal scroll)
   - StoryViewer (fullscreen)
   - CreateStoryModal

2. **Story Features**:
   - Story creation
   - Story viewing
   - Auto-progression
   - Emoji reactions

3. **Story Management**:
   - Expiration logic
   - Cleanup job
   - View tracking

**Deliverables**:
- Story oluşturma çalışıyor
- Story görüntüleme çalışıyor
- Otomatik silme çalışıyor

### Phase 6: Polish & Optimization (Week 6)

**Hedef**: Performans, animasyonlar ve son rötuşlar

1. **Performance**:
   - Code splitting
   - Lazy loading optimization
   - Caching implementation
   - Bundle size optimization

2. **Animations**:
   - Page transitions
   - Modal animations
   - Like animations
   - Smooth scrolling

3. **Testing**:
   - Unit tests
   - Property-based tests
   - Integration tests
   - E2E tests

4. **Documentation**:
   - API documentation
   - Component documentation
   - User guide

**Deliverables**:
- Tüm animasyonlar tamamlanmış
- Test coverage %80+
- Performans optimize edilmiş
- Dokümantasyon tamamlanmış

## Deployment Strategy

### Development Environment

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

### Firebase Configuration

```typescript
// firebase.config.ts
export const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};
```

### Environment Variables

```bash
# .env.production
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_DATABASE_URL=your_database_url
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Deployment Steps

1. **Database Rules Deploy**:
```bash
firebase deploy --only database
```

2. **Storage Rules Deploy**:
```bash
firebase deploy --only storage
```

3. **Build & Deploy**:
```bash
npm run build
firebase deploy --only hosting
```

### Monitoring & Analytics

1. **Firebase Analytics**:
   - Page views
   - User engagement
   - Post creation rate
   - Follow/unfollow rate

2. **Performance Monitoring**:
   - Page load time
   - API response time
   - Error rate
   - Crash rate

3. **Custom Events**:
   - `profile_view`
   - `post_created`
   - `post_liked`
   - `comment_added`
   - `user_followed`
   - `story_created`
   - `story_viewed`

## Maintenance & Future Enhancements

### Scheduled Maintenance Tasks

1. **Daily**:
   - Story cleanup (expired stories)
   - Analytics aggregation

2. **Weekly**:
   - Popular users calculation
   - Trending posts identification

3. **Monthly**:
   - Database optimization
   - Storage cleanup (orphaned files)
   - Performance audit

### Future Enhancement Ideas

1. **Advanced Features**:
   - Post scheduling
   - Draft posts
   - Post analytics (reach, engagement)
   - Story highlights (permanent stories)
   - Story polls and questions
   - Live streaming integration

2. **Social Features**:
   - Direct messaging from profile
   - Mutual friends display
   - Friend suggestions
   - Block/mute users
   - Report content

3. **Gamification**:
   - Achievement system
   - Leaderboards
   - Seasonal challenges
   - Eco points shop

4. **Content Features**:
   - Multi-photo posts (carousel)
   - Video posts
   - Audio posts
   - Collaborative posts
   - Post templates

5. **Discovery**:
   - Explore page
   - Hashtag system
   - Trending topics
   - Location-based discovery

## Conclusion

Bu tasarım dokümanı, Nature.co platformu için Instagram benzeri sosyal medya profil sisteminin kapsamlı teknik tasarımını sunmaktadır. Sistem, mevcut Robot House altyapısı üzerine inşa edilecek ve kullanıcılara modern, akıcı ve etkileşimli bir sosyal medya deneyimi sunacaktır.

Tasarım, performans, güvenlik ve kullanıcı deneyimi öncelikli olarak hazırlanmış ve property-based testing ile doğrulanabilir correctness garantileri içermektedir. 6 haftalık implementation roadmap, sistemi aşamalı olarak hayata geçirmek için net bir yol haritası sunmaktadır.

