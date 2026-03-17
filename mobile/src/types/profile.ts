// ─── PROFILE TYPES ────────────────────────────────────────────────────────────

export interface UserProfile {
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

export interface Post {
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

export type PostType = 'text' | 'photo' | 'video' | 'music' | 'code' | 'nature' | 'tech';

export interface Comment {
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

export interface Story {
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

export interface FollowRelation {
  at: number;  // timestamp
}

export interface ProfileStats {
  postCount: number;
  followerCount: number;
  followingCount: number;
  totalLikes: number;
  level: number;
  xp: number;
}

// ─── ERROR TYPES ──────────────────────────────────────────────────────────────

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
