import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { ref, set, onValue, onDisconnect, serverTimestamp } from 'firebase/database';

export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

const STATUS_CONFIG_KEYS: Record<UserStatus, { color: string; labelKey: string; emoji: string }> = {
  online: { color: '#10b981', labelKey: 'status.online', emoji: '🟢' },
  idle: { color: '#f59e0b', labelKey: 'status.idle', emoji: '🟡' },
  dnd: { color: '#ef4444', labelKey: 'status.dnd', emoji: '🔴' },
  offline: { color: '#6b7280', labelKey: 'status.offline', emoji: '⚫' },
};

export function setUserStatus(userId: string, status: UserStatus, customMessage?: string) {
  const statusRef = ref(db, `status/${userId}`);
  set(statusRef, {
    status,
    customMessage: customMessage || '',
    lastSeen: Date.now(),
  });
  if (status !== 'offline') {
    onDisconnect(statusRef).set({ status: 'offline', lastSeen: Date.now(), customMessage: '' });
  }
}

export function useUserStatus(userId: string): { status: UserStatus; customMessage: string; lastSeen: number } {
  const [data, setData] = useState<{ status: UserStatus; customMessage: string; lastSeen: number }>({
    status: 'offline', customMessage: '', lastSeen: 0,
  });

  useEffect(() => {
    if (!userId) return;
    const statusRef = ref(db, `status/${userId}`);
    const unsub = onValue(statusRef, snap => {
      const val = snap.val();
      if (val) setData(val);
      else setData({ status: 'offline', customMessage: '', lastSeen: 0 });
    });
    return () => unsub();
  }, [userId]);

  return data;
}

interface StatusDotProps {
  status: UserStatus;
  size?: number;
  showLabel?: boolean;
}

export const StatusDot: React.FC<StatusDotProps> = ({ status, size = 10, showLabel = false }) => {
  const { t } = useTranslation();
  const config = STATUS_CONFIG_KEYS[status];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%', background: config.color,
        border: `2px solid #1a1d29`, boxShadow: `0 0 4px ${config.color}40`,
      }} />
      {showLabel && <span style={{ fontSize: 11, color: config.color, fontWeight: 500 }}>{t(config.labelKey)}</span>}
    </div>
  );
};

interface StatusPickerProps {
  userId: string;
  currentStatus: UserStatus;
  onClose: () => void;
}

export const StatusPicker: React.FC<StatusPickerProps> = ({ userId, currentStatus, onClose }) => {
  const { t } = useTranslation();
  const [customMessage, setCustomMessage] = useState('');
  const statuses: UserStatus[] = ['online', 'idle', 'dnd', 'offline'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        background: '#1a1d29', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
        padding: 16, width: 240, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{t('status.title')}</div>
      {statuses.map(s => {
        const config = STATUS_CONFIG_KEYS[s];
        return (
          <button
            key={s}
            onClick={() => { setUserStatus(userId, s, customMessage); onClose(); }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              background: currentStatus === s ? 'rgba(255,255,255,0.06)' : 'transparent',
              border: 'none', borderRadius: 8, cursor: 'pointer', color: 'white', fontSize: 13,
              marginBottom: 2, transition: 'background 0.15s',
            }}
          >
            <StatusDot status={s} size={10} />
            <span>{t(config.labelKey)}</span>
          </button>
        );
      })}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 8, paddingTop: 8 }}>
        <input
          value={customMessage}
          onChange={e => setCustomMessage(e.target.value)}
          placeholder={t('status.customPlaceholder')}
          maxLength={50}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '6px 10px', color: 'white', fontSize: 12, outline: 'none',
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              setUserStatus(userId, currentStatus, customMessage);
              onClose();
            }
          }}
        />
      </div>
    </motion.div>
  );
};

export default StatusDot;
