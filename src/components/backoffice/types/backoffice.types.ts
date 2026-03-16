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
    return { ...base, canDeleteMessages: true, canViewSupport: true };
  }

  if (role === 'admin') {
    return {
      ...base,
      canManageUsers: true, canDeleteMessages: true, canPinMessages: true,
      canManageChannels: true, canManageForum: true, canViewSupport: true,
      canCloseSupport: true, canManageVerification: true, canSendAnnouncements: true,
      canManageGames: true, canManageTvChannels: true, canManageGuilds: true,
      canViewAnalytics: true, canViewAuditLog: true,
    };
  }

  // super_admin: tüm yetkiler
  return Object.fromEntries(Object.keys(base).map(k => [k, true])) as RolePermissions;
}

export function isValidBackofficeRole(role: unknown): role is BackofficeRole {
  return role === 'super_admin' || role === 'admin' || role === 'moderator';
}

export class BackofficeError extends Error {
  constructor(
    message: string,
    public code: 'PERMISSION_DENIED' | 'FIREBASE_ERROR' | 'VALIDATION_ERROR' | 'NETWORK_ERROR'
  ) {
    super(message);
    this.name = 'BackofficeError';
  }
}
