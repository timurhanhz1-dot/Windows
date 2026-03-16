import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { BackofficeRole } from './types/backoffice.types';
import { LogOut, Shield } from 'lucide-react';

interface BackofficeTopBarProps {
  displayName: string | null;
  role: BackofficeRole | null;
}

const ROLE_LABELS: Record<BackofficeRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  moderator: 'Moderatör',
};

const ROLE_COLORS: Record<BackofficeRole, string> = {
  super_admin: '#f59e0b',
  admin: '#6366f1',
  moderator: '#6b7280',
};

export function BackofficeTopBar({ displayName, role }: BackofficeTopBarProps) {
  return (
    <div style={{
      height: 56, background: '#0d0d1a', borderBottom: '1px solid rgba(99,102,241,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Shield size={18} color="#6366f1" />
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '0.05em' }}>
          BACKOFFICE
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {role && (
          <span style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: ROLE_COLORS[role] + '22', color: ROLE_COLORS[role],
            border: `1px solid ${ROLE_COLORS[role]}44`,
          }}>
            {ROLE_LABELS[role]}
          </span>
        )}
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{displayName}</span>
        <button
          onClick={() => signOut(auth)}
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 12px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
        >
          <LogOut size={13} /> Çıkış
        </button>
      </div>
    </div>
  );
}
