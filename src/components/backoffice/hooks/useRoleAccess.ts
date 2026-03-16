import { useBackofficeAuth } from './useBackofficeAuth';
import { getRolePermissions, RolePermissions } from '../types/backoffice.types';

export function useRoleAccess(): RolePermissions & { role: string | null } {
  const { role } = useBackofficeAuth();
  if (!role) {
    return {
      role: null,
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
  }
  return { role, ...getRolePermissions(role) };
}

export function hasPermission(role: string | null, key: keyof RolePermissions): boolean {
  if (!role) return false;
  const perms = getRolePermissions(role as any);
  return perms[key] === true;
}
