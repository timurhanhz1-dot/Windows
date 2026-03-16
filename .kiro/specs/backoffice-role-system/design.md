# Tasarım Belgesi: Backoffice Rol Sistemi

## Genel Bakış

Bu belge, `nature.co` platformuna eklenecek `/backoffice` rotasının teknik tasarımını tanımlar.
Mevcut `/admin` paneli (AdminPanel.tsx) korunur ve hiçbir değişiklik yapılmaz.

Backoffice; `super_admin`, `admin` ve `moderator` rollerini destekleyen, Firebase Realtime Database
üzerinde çalışan, React + TypeScript + Tailwind CSS + Framer Motion ile geliştirilmiş bir yönetim
arayüzüdür. Tüm bileşenler `src/components/backoffice/` dizininde organize edilir.

### Temel Tasarım Kararları

- Rol verisi `users/{uid}/backoffice_role` alanında tutulur; mevcut `is_admin` alanına dokunulmaz.
- İstemci tarafı kontrol (RoleGuard) ile Firebase kuralları birlikte çalışır; ikisi de zorunludur.
- Her yetkili işlem `logs/` koleksiyonuna `admin_uid` ve `admin_role` alanlarıyla kaydedilir.
- Navigasyon menüsü kullanıcının rolüne göre dinamik olarak filtrelenir.

---

## Mimari

### Yüksek Seviye Mimari

```
src/App.tsx
  └── Route "/backoffice"
        └── RoleGuard
              ├── [Yetkisiz] → Redirect "/"
              └── [Yetkili]  → BackofficeLayout
                    ├── BackofficeTopBar   (kullanıcı adı + rol badge)
                    ├── BackofficeSidebar  (rol bazlı navigasyon)
                    └── <Outlet>           (aktif modül)
                          ├── DashboardModule
                          ├── UserManagementModule
                          ├── ChannelManagementModule
                          ├── MessageManagementModule
                          ├── ForumManagementModule
                          ├── SupportTicketsModule
                          ├── VerificationModule
                          ├── AnnouncementsModule
                          ├── GamesModule
                          ├── TvChannelsModule
                          ├── GuildsModule
                          ├── DesignSettingsModule
                          ├── SiteSettingsModule
                          ├── FeatureFlagsModule
                          ├── AnalyticsModule
                          ├── SecurityModule
                          └── AuditLogModule
```

### Veri Akışı

```
Firebase RTDB
  └── users/{uid}/backoffice_role  ←→  useBackofficeAuth (hook)
                                         └── RoleGuard (bileşen)
                                               └── useRoleAccess (hook)
                                                     └── Her modül
```

Tüm Firebase okuma/yazma işlemleri `src/components/backoffice/services/backofficeService.ts`
üzerinden geçer. Modüller doğrudan `db` referansına erişmez.

---

## Bileşenler ve Arayüzler

### Dizin Yapısı

```
src/components/backoffice/
├── BackofficeApp.tsx          # Ana giriş noktası, RoleGuard + Layout
├── BackofficeLayout.tsx       # TopBar + Sidebar + Outlet
├── BackofficeTopBar.tsx       # Kullanıcı adı, rol badge, çıkış butonu
├── BackofficeSidebar.tsx      # Rol bazlı navigasyon menüsü
├── RoleGuard.tsx              # Erişim kontrolü bileşeni
│
├── hooks/
│   ├── useBackofficeAuth.ts   # Firebase'den rol okuma + oturum doğrulama
│   └── useRoleAccess.ts       # Rol bazlı izin kontrol yardımcısı
│
├── services/
│   ├── backofficeService.ts   # Tüm Firebase CRUD işlemleri
│   └── auditLogService.ts     # AuditLog yazma servisi
│
├── types/
│   └── backoffice.types.ts    # BackofficeRole, AuditLogEntry, vb. tipler
│
└── modules/
    ├── DashboardModule.tsx
    ├── UserManagementModule.tsx
    ├── ChannelManagementModule.tsx
    ├── MessageManagementModule.tsx
    ├── ForumManagementModule.tsx
    ├── SupportTicketsModule.tsx
    ├── VerificationModule.tsx
    ├── AnnouncementsModule.tsx
    ├── GamesModule.tsx
    ├── TvChannelsModule.tsx
    ├── GuildsModule.tsx
    ├── DesignSettingsModule.tsx
    ├── SiteSettingsModule.tsx
    ├── FeatureFlagsModule.tsx
    ├── AnalyticsModule.tsx
    ├── SecurityModule.tsx
    └── AuditLogModule.tsx
```

### Temel Bileşen Arayüzleri

```typescript
// RoleGuard.tsx
interface RoleGuardProps {
  allowedRoles: BackofficeRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// BackofficeSidebar.tsx
interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  allowedRoles: BackofficeRole[];
}

// useBackofficeAuth.ts
interface BackofficeAuthState {
  uid: string | null;
  role: BackofficeRole | null;
  isLoading: boolean;
  isAuthorized: boolean;
}
```

### Rol Yetki Matrisi

| Modül / İşlem                        | super_admin | admin | moderator |
|--------------------------------------|:-----------:|:-----:|:---------:|
| Dashboard (istatistikler)            | ✅          | ✅    | ❌        |
| Kullanıcı listeleme                  | ✅          | ✅    | ❌        |
| Kullanıcı banlama / ban kaldırma     | ✅          | ✅    | ✅        |
| Kullanıcı susturma / mute kaldırma   | ✅          | ✅    | ✅        |
| Kullanıcı profili düzenleme          | ✅          | ❌    | ❌        |
| Kullanıcı silme                      | ✅          | ❌    | ❌        |
| backoffice_role atama (super_admin)  | ✅          | ❌    | ❌        |
| backoffice_role atama (admin/mod)    | ✅          | ✅    | ❌        |
| Şifre sıfırlama e-postası            | ✅          | ❌    | ❌        |
| Kanal oluşturma / silme              | ✅          | ✅    | ❌        |
| Kanal kilitleme / gizleme            | ✅          | ✅    | ❌        |
| Mesaj silme                          | ✅          | ✅    | ✅        |
| Mesaj sabitleme / düzenleme          | ✅          | ✅    | ❌        |
| Toplu mesaj silme                    | ✅          | ✅    | ❌        |
| Forum gönderisi silme                | ✅          | ✅    | ❌        |
| Forum kategorisi yönetimi            | ✅          | ❌    | ❌        |
| Destek talebi görüntüleme            | ✅          | ✅    | ✅        |
| Destek talebi yanıtlama              | ✅          | ✅    | ✅        |
| Destek talebi kapatma                | ✅          | ✅    | ❌        |
| Rozet talebi onaylama / reddetme     | ✅          | ✅    | ❌        |
| Duyuru / sistem mesajı gönderme      | ✅          | ✅    | ❌        |
| Oyun sunucusu onaylama               | ✅          | ✅    | ❌        |
| Turnuva yönetimi                     | ✅          | ✅    | ❌        |
| TV kanalı yönetimi                   | ✅          | ✅    | ❌        |
| Guild listeleme                      | ✅          | ✅    | ❌        |
| Guild silme                          | ✅          | ❌    | ❌        |
| Tasarım ayarları                     | ✅          | ❌    | ❌        |
| Site ayarları                        | ✅          | ❌    | ❌        |
| Feature flag yönetimi                | ✅          | ❌    | ❌        |
| Analytics görüntüleme                | ✅          | ✅    | ❌        |
| IP ban yönetimi                      | ✅          | ❌    | ❌        |
| Force logout (tüm oturumlar)         | ✅          | ❌    | ❌        |
| Audit log görüntüleme                | ✅          | ✅    | ❌        |
| Audit log dışa aktarma               | ✅          | ❌    | ❌        |
| Emoji paketi yönetimi                | ✅          | ❌    | ❌        |

### Route Yapısı

```
/backoffice                    → DashboardModule
/backoffice/users              → UserManagementModule
/backoffice/channels           → ChannelManagementModule
/backoffice/messages           → MessageManagementModule
/backoffice/forum              → ForumManagementModule
/backoffice/support            → SupportTicketsModule
/backoffice/verification       → VerificationModule
/backoffice/announcements      → AnnouncementsModule
/backoffice/games              → GamesModule
/backoffice/tv-channels        → TvChannelsModule
/backoffice/guilds             → GuildsModule
/backoffice/design             → DesignSettingsModule
/backoffice/settings           → SiteSettingsModule
/backoffice/feature-flags      → FeatureFlagsModule
/backoffice/analytics          → AnalyticsModule
/backoffice/security           → SecurityModule
/backoffice/audit-log          → AuditLogModule
```

`src/App.tsx`'e eklenecek tek değişiklik:

```tsx
import { BackofficeApp } from './components/backoffice/BackofficeApp';
// ...
<Route path="/backoffice/*" element={<BackofficeApp />} />
```

---

## Veri Modelleri

### Firebase RTDB Şeması

#### Kullanıcı Rol Alanı

```
users/
  {uid}/
    backoffice_role: "super_admin" | "admin" | "moderator"  // YENİ ALAN
    is_admin: boolean   // MEVCUT — dokunulmaz
    username: string
    email: string
    ...
```

#### Audit Log Kaydı

```
logs/
  {pushId}/
    action: string          // "BAN_USER", "DELETE_MESSAGE", "UPDATE_ROLE", vb.
    detail: string          // İnsan okunabilir açıklama
    timestamp: string       // ISO8601
    admin_uid: string       // İşlemi yapan yöneticinin UID'i
    admin_role: string      // "super_admin" | "admin" | "moderator"
    target_uid?: string     // Hedef kullanıcı UID'i (varsa)
```

#### Feature Flags

```
settings/
  feature_flags/
    forum_enabled: boolean
    games_enabled: boolean
    live_tv_enabled: boolean
    guild_enabled: boolean
    registration_enabled: boolean
    {custom_flag}: boolean
```

#### Özel Emoji Paketi

```
settings/
  custom_emojis/
    {emojiId}/
      name: string      // "kedi_dans"
      value: string     // Unicode veya CDN URL
      addedBy: string   // admin_uid
      addedAt: number   // timestamp
```

### TypeScript Tip Tanımları

```typescript
// src/components/backoffice/types/backoffice.types.ts

export type BackofficeRole = 'super_admin' | 'admin' | 'moderator';

export interface AuditLogEntry {
  action: string;
  detail: string;
  timestamp: string;
  admin_uid: string;
  admin_role: BackofficeRole;
  target_uid?: string;
}

export interface BackofficeUser {
  uid: string;
  username: string;
  email: string;
  backoffice_role?: BackofficeRole;
  is_admin: boolean;
  is_banned: boolean;
  is_muted: boolean;
  mute_until?: string;
  created_at: number;
  message_count: number;
}

export interface FeatureFlags {
  forum_enabled: boolean;
  games_enabled: boolean;
  live_tv_enabled: boolean;
  guild_enabled: boolean;
  registration_enabled: boolean;
  [key: string]: boolean;
}

export interface RolePermissions {
  canManageUsers: boolean;
  canDeleteUsers: boolean;
  canAssignSuperAdmin: boolean;
  canManageChannels: boolean;
  canDeleteMessages: boolean;
  canPinMessages: boolean;
  canManageForum: boolean;
  canManageForumCategories: boolean;
  canViewSupport: boolean;
  canCloseSupport: boolean;
  canManageVerification: boolean;
  canSendAnnouncements: boolean;
  canManageGames: boolean;
  canManageTvChannels: boolean;
  canManageGuilds: boolean;
  canDeleteGuilds: boolean;
  canManageDesign: boolean;
  canManageSiteSettings: boolean;
  canManageFeatureFlags: boolean;
  canViewAnalytics: boolean;
  canManageSecurity: boolean;
  canViewAuditLog: boolean;
  canExportAuditLog: boolean;
  canManageEmojis: boolean;
}
```

### Rol → İzin Eşlemesi (getRolePermissions)

```typescript
export function getRolePermissions(role: BackofficeRole): RolePermissions {
  const base: RolePermissions = {
    canManageUsers: false, canDeleteUsers: false, canAssignSuperAdmin: false,
    canManageChannels: false, canDeleteMessages: false, canPinMessages: false,
    canManageForum: false, canManageForumCategories: false,
    canViewSupport: false, canCloseSupport: false, canManageVerification: false,
    canSendAnnouncements: false, canManageGames: false, canManageTvChannels: false,
    canManageGuilds: false, canDeleteGuilds: false, canManageDesign: false,
    canManageSiteSettings: false, canManageFeatureFlags: false,
    canViewAnalytics: false, canManageSecurity: false,
    canViewAuditLog: false, canExportAuditLog: false, canManageEmojis: false,
  };

  if (role === 'moderator') {
    return { ...base,
      canDeleteMessages: true, canViewSupport: true,
      // ban/mute ayrı parametre olarak geçilir (banUser, muteUser fonksiyonları)
    };
  }

  if (role === 'admin') {
    return { ...base,
      canManageUsers: true, canDeleteMessages: true, canPinMessages: true,
      canManageChannels: true, canManageForum: true, canViewSupport: true,
      canCloseSupport: true, canManageVerification: true, canSendAnnouncements: true,
      canManageGames: true, canManageTvChannels: true, canManageGuilds: true,
      canViewAnalytics: true, canViewAuditLog: true,
    };
  }

  // super_admin: tüm yetkiler
  return Object.fromEntries(
    Object.keys(base).map(k => [k, true])
  ) as RolePermissions;
}
```

---

## Modül Teknik Yaklaşımları

### useBackofficeAuth Hook

Her render'da Firebase'den rol okunur; önbellek tek doğrulama kaynağı değildir.

```typescript
// Her oturum açışta ve bileşen mount'unda Firebase'den taze veri çeker
export function useBackofficeAuth(): BackofficeAuthState {
  const [state, setState] = useState<BackofficeAuthState>({
    uid: null, role: null, isLoading: true, isAuthorized: false
  });

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) { setState({ uid: null, role: null, isLoading: false, isAuthorized: false }); return; }
      // Her seferinde Firebase'den oku — önbelleğe güvenme
      const snap = await get(ref(db, `users/${user.uid}/backoffice_role`));
      const role = snap.val() as BackofficeRole | null;
      const validRoles: BackofficeRole[] = ['super_admin', 'admin', 'moderator'];
      setState({
        uid: user.uid,
        role,
        isLoading: false,
        isAuthorized: role !== null && validRoles.includes(role),
      });
    });
  }, []);

  return state;
}
```

### RoleGuard Bileşeni

```typescript
export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { role, isLoading, isAuthorized } = useBackofficeAuth();

  if (isLoading) return <BackofficeLoadingScreen />;
  if (!isAuthorized) return <Navigate to="/" replace />;
  if (allowedRoles.length > 0 && !allowedRoles.includes(role!)) {
    return <AccessDeniedScreen />;  // 403 ekranı, "/" yönlendirmesi değil
  }
  return <>{children}</>;
}
```

### auditLogService

```typescript
export async function writeAuditLog(
  entry: Omit<AuditLogEntry, 'timestamp'>
): Promise<void> {
  await push(ref(db, 'logs'), {
    ...entry,
    timestamp: new Date().toISOString(),
  });
}
```

### Firebase Güvenlik Kuralları Güncellemesi

`database.rules.json`'a eklenecek kural bloğu:

```json
"users": {
  "$uid": {
    "backoffice_role": {
      ".read": "auth != null && auth.uid === $uid",
      ".write": "auth != null && root.child('users').child(auth.uid).child('backoffice_role').val() === 'super_admin'"
    }
  }
}
```

`settings/`, `tv_channels/`, `ip_bans/`, `logs/` koleksiyonları için mevcut `is_admin` kurallarına
`backoffice_role` kontrolü eklenir:

```json
"settings": {
  ".write": "auth != null && (root.child('users').child(auth.uid).child('is_admin').val() === true || root.child('users').child(auth.uid).child('backoffice_role').val() === 'super_admin' || root.child('users').child(auth.uid).child('backoffice_role').val() === 'admin')"
}
```

### BackofficeService Temel Fonksiyonlar

```typescript
// src/components/backoffice/services/backofficeService.ts

// Kullanıcı işlemleri
export const banUser = (uid: string, banned: boolean) =>
  update(ref(db, `users/${uid}`), { is_banned: banned });

export const muteUser = (uid: string, minutes: number) =>
  update(ref(db, `users/${uid}`), {
    is_muted: true,
    mute_until: new Date(Date.now() + minutes * 60000).toISOString()
  });

export const assignBackofficeRole = async (
  targetUid: string,
  role: BackofficeRole | null,
  callerRole: BackofficeRole
) => {
  if (role === 'super_admin' && callerRole !== 'super_admin') {
    throw new Error('PERMISSION_DENIED: Yalnızca super_admin, super_admin atayabilir.');
  }
  await update(ref(db, `users/${targetUid}`), { backoffice_role: role });
};

// Kanal işlemleri
export const lockChannel = (channelId: string, locked: boolean) =>
  update(ref(db, `channels/${channelId}`), { is_locked: locked });

// Mesaj işlemleri
export const deleteMessage = (channelId: string, messageId: string) =>
  remove(ref(db, `messages/${channelId}/${messageId}`));

// Feature flags
export const updateFeatureFlag = (flagName: string, value: boolean) =>
  update(ref(db, `settings/feature_flags`), { [flagName]: value });
```

### Navigasyon Menüsü (Rol Bazlı Filtreleme)

```typescript
const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'dashboard',     label: 'Dashboard',        icon: BarChart2,  path: '/backoffice',                allowedRoles: ['super_admin', 'admin'] },
  { id: 'users',         label: 'Kullanıcılar',      icon: Users,      path: '/backoffice/users',          allowedRoles: ['super_admin', 'admin'] },
  { id: 'messages',      label: 'Mesajlar',          icon: MessageSq,  path: '/backoffice/messages',       allowedRoles: ['super_admin', 'admin', 'moderator'] },
  { id: 'support',       label: 'Destek Talepleri',  icon: Mail,       path: '/backoffice/support',        allowedRoles: ['super_admin', 'admin', 'moderator'] },
  { id: 'channels',      label: 'Kanallar',          icon: Hash,       path: '/backoffice/channels',       allowedRoles: ['super_admin', 'admin'] },
  { id: 'forum',         label: 'Forum',             icon: FileText,   path: '/backoffice/forum',          allowedRoles: ['super_admin', 'admin'] },
  { id: 'verification',  label: 'Rozet Talepleri',   icon: BadgeCheck, path: '/backoffice/verification',   allowedRoles: ['super_admin', 'admin'] },
  { id: 'announcements', label: 'Duyurular',         icon: Bell,       path: '/backoffice/announcements',  allowedRoles: ['super_admin', 'admin'] },
  { id: 'games',         label: 'Oyunlar',           icon: Gamepad,    path: '/backoffice/games',          allowedRoles: ['super_admin', 'admin'] },
  { id: 'tv-channels',   label: 'TV Kanalları',      icon: Tv,         path: '/backoffice/tv-channels',    allowedRoles: ['super_admin', 'admin'] },
  { id: 'guilds',        label: 'Guild\'ler',        icon: Shield,     path: '/backoffice/guilds',         allowedRoles: ['super_admin', 'admin'] },
  { id: 'analytics',     label: 'Analytics',         icon: TrendingUp, path: '/backoffice/analytics',      allowedRoles: ['super_admin', 'admin'] },
  { id: 'audit-log',     label: 'Denetim Logu',      icon: Activity,   path: '/backoffice/audit-log',      allowedRoles: ['super_admin', 'admin'] },
  { id: 'design',        label: 'Tasarım',           icon: Palette,    path: '/backoffice/design',         allowedRoles: ['super_admin'] },
  { id: 'settings',      label: 'Site Ayarları',     icon: Settings,   path: '/backoffice/settings',       allowedRoles: ['super_admin'] },
  { id: 'feature-flags', label: 'Feature Flags',     icon: Zap,        path: '/backoffice/feature-flags',  allowedRoles: ['super_admin'] },
  { id: 'security',      label: 'Güvenlik',          icon: Lock,       path: '/backoffice/security',       allowedRoles: ['super_admin'] },
];

// Filtreleme
const visibleItems = SIDEBAR_ITEMS.filter(item => item.allowedRoles.includes(userRole));
```

---

## Hata Yönetimi

### Hata Kategorileri

| Kategori | Durum | Kullanıcıya Gösterilen |
|----------|-------|------------------------|
| Yetki hatası | Rol yetersiz | "Bu işlem için yetkiniz bulunmamaktadır." |
| Firebase yazma hatası | RTDB kuralı reddetti | "İşlem gerçekleştirilemedi. Lütfen tekrar deneyin." |
| Ağ hatası | Bağlantı kesildi | "Bağlantı hatası. İnternet bağlantınızı kontrol edin." |
| Doğrulama hatası | Geçersiz form verisi | Alan bazlı hata mesajı |
| Oturum hatası | Auth token süresi doldu | Otomatik yönlendirme: "/" |

### Hata Yönetim Stratejisi

- Her modül `try/catch` bloğu kullanır; hata `toast` bildirimi ile gösterilir.
- `assignBackofficeRole` fonksiyonu izin hatalarını `throw` ile fırlatır; çağıran bileşen yakalar.
- Firebase yazma hataları `backofficeService.ts` içinde yakalanır ve standart `BackofficeError` tipine dönüştürülür.
- Başarılı işlemler yeşil toast, başarısız işlemler kırmızı toast ile bildirilir (Gereksinim 20.4, 20.5).

```typescript
export class BackofficeError extends Error {
  constructor(
    message: string,
    public code: 'PERMISSION_DENIED' | 'FIREBASE_ERROR' | 'VALIDATION_ERROR' | 'NETWORK_ERROR'
  ) {
    super(message);
  }
}
```

---

## Doğruluk Özellikleri (Correctness Properties)

*Bir özellik (property), sistemin tüm geçerli çalışmalarında doğru olması gereken bir karakteristik veya davranıştır — temelde sistemin ne yapması gerektiğine dair biçimsel bir ifadedir. Özellikler, insan tarafından okunabilir spesifikasyonlar ile makine tarafından doğrulanabilir doğruluk garantileri arasındaki köprüyü oluşturur.*

### Property 1: Geçersiz Rol → Erişim Engeli

*Herhangi bir* kullanıcı için, `backoffice_role` alanı `super_admin`, `admin` veya `moderator` değerlerinden biri değilse (null, undefined veya rastgele string dahil), `useBackofficeAuth` hook'u `isAuthorized: false` döndürmeli ve RoleGuard erişimi engellemelidir.

**Validates: Requirements 1.2, 1.3, 1.4**

### Property 2: Rol İzin Matrisi Doğruluğu

*Herhangi bir* `BackofficeRole` değeri için, `getRolePermissions(role)` fonksiyonu şu invariantları sağlamalıdır:
- `super_admin` için tüm izin alanları `true` olmalıdır.
- `admin` için `canAssignSuperAdmin`, `canDeleteUsers`, `canManageDesign`, `canManageSiteSettings`, `canManageFeatureFlags`, `canManageSecurity`, `canExportAuditLog`, `canManageEmojis`, `canDeleteGuilds` alanları `false` olmalıdır.
- `moderator` için yalnızca `canDeleteMessages` ve `canViewSupport` alanları `true` olmalıdır.

**Validates: Requirements 2.2, 2.3, 2.4**

### Property 3: Admin super_admin Atayamaz

*Herhangi bir* `admin` rolündeki kullanıcı için, `assignBackofficeRole(targetUid, 'super_admin', 'admin')` çağrısı `PERMISSION_DENIED` hatasıyla reddedilmeli ve Firebase'de hiçbir değişiklik yapılmamalıdır.

**Validates: Requirements 2.3, 2.6, 4.7**

### Property 4: Her Backoffice İşlemi AuditLog Invariantı

*Herhangi bir* yetkili backoffice işlemi (ban, mute, delete, update, assign vb.) gerçekleştirildiğinde, `logs/` koleksiyonundaki kayıt sayısı tam olarak bir artmalıdır.

**Validates: Requirements 2.5, 4.8, 5.7, 6.6, 7.5, 8.5, 9.4, 10.4, 11.5, 12.4, 13.4, 14.4, 16.4, 17.4, 18.3, 19.1**

### Property 5: AuditLog Kaydı Alan Bütünlüğü

*Herhangi bir* `writeAuditLog` çağrısı için, oluşturulan log kaydı `action`, `detail`, `timestamp`, `admin_uid`, `admin_role` alanlarını içermeli; `timestamp` geçerli bir ISO8601 formatında olmalıdır.

**Validates: Requirements 16.5, 19.3**

### Property 6: Kullanıcı Arama Filtreleme Doğruluğu

*Herhangi bir* kullanıcı listesi ve arama sorgusu için, filtreleme sonucundaki her kullanıcının `username` veya `email` alanı arama sorgusunu (büyük/küçük harf duyarsız) içermelidir; sorguyla eşleşmeyen hiçbir kullanıcı sonuçta yer almamalıdır.

**Validates: Requirements 4.2**

### Property 7: Kullanıcı Durum Güncelleme Round-Trip

*Herhangi bir* kullanıcı UID'i için, `banUser(uid, true)` çağrısından sonra `users/{uid}/is_banned` değeri `true` olmalı; `banUser(uid, false)` çağrısından sonra `false` olmalıdır. Aynı invariant `muteUser` için de geçerlidir.

**Validates: Requirements 4.3, 4.4**

### Property 8: Kanal Durum Güncelleme Round-Trip

*Herhangi bir* kanal ID'si için, `lockChannel(id, true)` çağrısından sonra `channels/{id}/is_locked` değeri `true` olmalı; `lockChannel(id, false)` çağrısından sonra `false` olmalıdır. Aynı invariant `hideChannel` için de geçerlidir.

**Validates: Requirements 5.4, 5.5**

### Property 9: Ayar Yazma Round-Trip

*Herhangi bir* geçerli ayar nesnesi için, `settings/` yoluna yazılan değer okunduğunda aynı değeri döndürmelidir. Bu özellik `settings/design/`, `settings/feature_flags/` ve `settings/` kök yolu için geçerlidir.

**Validates: Requirements 7.2, 14.1, 18.1**

### Property 10: Log Listesi Boyut Sınırı

*Herhangi bir* log koleksiyonu için, `getAuditLogs(limit)` fonksiyonu 1000'den fazla kayıt olduğunda en fazla 500 kayıt döndürmeli ve döndürülen kayıtlar en yeni olanlar olmalıdır.

**Validates: Requirements 19.5**

---

## Test Stratejisi

### Çift Katmanlı Test Yaklaşımı

Hem unit testler hem de property-based testler kullanılır; ikisi birbirini tamamlar.

**Unit testler** şunlara odaklanır:
- Belirli örnekler ve kenar durumlar (moderator'ın admin işlemi yapamaması gibi)
- Bileşenler arası entegrasyon noktaları (RoleGuard + useBackofficeAuth)
- Hata durumları (Firebase yazma reddi, ağ hatası)

**Property-based testler** şunlara odaklanır:
- Tüm girdiler için geçerli evrensel özellikler
- Rastgele üretilmiş verilerle kapsamlı girdi testi

### Property-Based Test Kütüphanesi

**fast-check** (TypeScript için) kullanılır. Her property testi minimum **100 iterasyon** çalıştırır.

Her test şu etiket formatını kullanır:
`// Feature: backoffice-role-system, Property {N}: {property_text}`

### Property Test Örnekleri

```typescript
// Property 1: Geçersiz rol → erişim engeli
import fc from 'fast-check';

test('geçersiz rol değerleri erişimi engeller', () => {
  // Feature: backoffice-role-system, Property 1: Geçersiz/eksik rol → erişim engeli
  fc.assert(fc.property(
    fc.oneof(fc.constant(null), fc.constant(undefined), fc.string()),
    (invalidRole) => {
      if (['super_admin', 'admin', 'moderator'].includes(invalidRole as string)) return true;
      const result = isValidBackofficeRole(invalidRole);
      return result === false;
    }
  ), { numRuns: 100 });
});

// Property 2: Rol izin matrisi doğruluğu
test('super_admin tüm izinlere sahip', () => {
  // Feature: backoffice-role-system, Property 2: Rol izin matrisi doğruluğu
  fc.assert(fc.property(
    fc.constant('super_admin' as BackofficeRole),
    (role) => {
      const perms = getRolePermissions(role);
      return Object.values(perms).every(v => v === true);
    }
  ), { numRuns: 100 });
});

// Property 4: AuditLog invariantı
test('her işlem sonrası log sayısı bir artar', () => {
  // Feature: backoffice-role-system, Property 4: Her backoffice işlemi AuditLog invariantı
  fc.assert(fc.property(
    fc.record({ action: fc.string(), detail: fc.string(), admin_uid: fc.string(), admin_role: fc.constantFrom('super_admin', 'admin', 'moderator') }),
    async (entry) => {
      const before = await getLogCount();
      await writeAuditLog(entry);
      const after = await getLogCount();
      return after === before + 1;
    }
  ), { numRuns: 100 });
});

// Property 6: Arama filtreleme doğruluğu
test('arama sonuçları her zaman sorguyu içerir', () => {
  // Feature: backoffice-role-system, Property 6: Kullanıcı arama filtreleme doğruluğu
  fc.assert(fc.property(
    fc.array(fc.record({ username: fc.string(), email: fc.emailAddress() }), { minLength: 1 }),
    fc.string({ minLength: 1 }),
    (users, query) => {
      const results = filterUsers(users, query);
      return results.every(u =>
        u.username.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase())
      );
    }
  ), { numRuns: 100 });
});
```

### Unit Test Kapsamı

- `RoleGuard`: oturumsuz kullanıcı yönlendirmesi, geçersiz rol yönlendirmesi, geçerli rol erişimi
- `useBackofficeAuth`: Firebase mock ile rol okuma, oturum değişikliği
- `backofficeService`: her CRUD fonksiyonu için başarı ve hata senaryoları
- `auditLogService`: log kaydı alan doğrulaması
- `getRolePermissions`: her rol için izin matrisi doğrulaması
- `assignBackofficeRole`: admin'in super_admin atayamaması
- Modüller: render testleri, form doğrulama, hata bildirimleri

### Test Dosya Yapısı

```
src/components/backoffice/
├── __tests__/
│   ├── rolePermissions.test.ts       # Property testler (P1, P2, P3)
│   ├── auditLog.test.ts              # Property testler (P4, P5)
│   ├── userSearch.test.ts            # Property testler (P6)
│   ├── statusUpdates.test.ts         # Property testler (P7, P8)
│   ├── settingsRoundTrip.test.ts     # Property testler (P9)
│   ├── logPagination.test.ts         # Property testler (P10)
│   ├── RoleGuard.test.tsx            # Unit testler
│   └── backofficeService.test.ts     # Unit testler
```
