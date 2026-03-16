import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  BarChart2, Users, MessageSquare, Mail, Hash, FileText,
  BadgeCheck, Bell, Gamepad2, Tv, Shield, TrendingUp,
  Activity, Palette, Settings, Zap, Lock,
} from 'lucide-react';
import { BackofficeRole } from './types/backoffice.types';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  allowedRoles: BackofficeRole[];
}

const ITEMS: SidebarItem[] = [
  { id: 'dashboard',     label: 'Dashboard',        icon: BarChart2,   path: '/backoffice',                allowedRoles: ['super_admin', 'admin'] },
  { id: 'users',         label: 'Kullanıcılar',      icon: Users,       path: '/backoffice/users',          allowedRoles: ['super_admin', 'admin'] },
  { id: 'messages',      label: 'Mesajlar',          icon: MessageSquare, path: '/backoffice/messages',     allowedRoles: ['super_admin', 'admin', 'moderator'] },
  { id: 'support',       label: 'Destek Talepleri',  icon: Mail,        path: '/backoffice/support',        allowedRoles: ['super_admin', 'admin', 'moderator'] },
  { id: 'channels',      label: 'Kanallar',          icon: Hash,        path: '/backoffice/channels',       allowedRoles: ['super_admin', 'admin'] },
  { id: 'forum',         label: 'Forum',             icon: FileText,    path: '/backoffice/forum',          allowedRoles: ['super_admin', 'admin'] },
  { id: 'verification',  label: 'Rozet Talepleri',   icon: BadgeCheck,  path: '/backoffice/verification',   allowedRoles: ['super_admin', 'admin'] },
  { id: 'announcements', label: 'Duyurular',         icon: Bell,        path: '/backoffice/announcements',  allowedRoles: ['super_admin', 'admin'] },
  { id: 'games',         label: 'Oyunlar',           icon: Gamepad2,    path: '/backoffice/games',          allowedRoles: ['super_admin', 'admin'] },
  { id: 'tv',            label: 'TV Kanalları',      icon: Tv,          path: '/backoffice/tv-channels',    allowedRoles: ['super_admin', 'admin'] },
  { id: 'guilds',        label: "Guild'ler",         icon: Shield,      path: '/backoffice/guilds',         allowedRoles: ['super_admin', 'admin'] },
  { id: 'analytics',     label: 'Analytics',         icon: TrendingUp,  path: '/backoffice/analytics',      allowedRoles: ['super_admin', 'admin'] },
  { id: 'audit',         label: 'Denetim Logu',      icon: Activity,    path: '/backoffice/audit-log',      allowedRoles: ['super_admin', 'admin'] },
  { id: 'design',        label: 'Tasarım',           icon: Palette,     path: '/backoffice/design',         allowedRoles: ['super_admin'] },
  { id: 'settings',      label: 'Site Ayarları',     icon: Settings,    path: '/backoffice/settings',       allowedRoles: ['super_admin'] },
  { id: 'flags',         label: 'Feature Flags',     icon: Zap,         path: '/backoffice/feature-flags',  allowedRoles: ['super_admin'] },
  { id: 'security',      label: 'Güvenlik',          icon: Lock,        path: '/backoffice/security',       allowedRoles: ['super_admin'] },
];

interface BackofficeSidebarProps {
  role: BackofficeRole | null;
}

export function BackofficeSidebar({ role }: BackofficeSidebarProps) {
  const visible = role ? ITEMS.filter(i => i.allowedRoles.includes(role)) : [];

  return (
    <div style={{
      width: 220, background: '#0a0a16', borderRight: '1px solid rgba(99,102,241,0.15)',
      display: 'flex', flexDirection: 'column', padding: '12px 8px', gap: 2, overflowY: 'auto',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 8px 8px' }}>
        Yönetim
      </p>
      {visible.map(item => (
        <NavLink
          key={item.id}
          to={item.path}
          end={item.path === '/backoffice'}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
            borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: isActive ? 700 : 400,
            color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
            background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
            transition: 'all 0.15s',
          })}
        >
          <item.icon size={15} />
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}
