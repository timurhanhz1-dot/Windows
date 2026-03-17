import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Users, Bot, User, Hash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MobileDM } from './MobileDM';
import { Forum } from './Forum';
import { ProfilePage } from './ProfilePage';
import { RobotHouse } from './RobotHouse';
import { GuildSystem } from './GuildSystem';

type TabType = 'dm' | 'channels' | 'forum' | 'robot' | 'profile';

interface ModernMobileAppProps {
  theme: any;
  userId: string;
  currentUserName?: string;
  onStartCall?: (targetId: string, targetName: string, mode: 'voice' | 'video') => void;
}

export const ModernMobileApp = ({ theme, userId, currentUserName, onStartCall }: ModernMobileAppProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('dm');

  // iOS keyboard fix — viewport height
  useEffect(() => {
    const setVh = () => {
      document.documentElement.style.setProperty('--mobile-vh', `${window.innerHeight * 0.01}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  const tabs = [
    { id: 'dm' as TabType, icon: MessageCircle, label: 'Sohbet', color: '#10B981' },
    { id: 'channels' as TabType, icon: Hash, label: 'Kanallar', color: '#8B5CF6' },
    { id: 'forum' as TabType, icon: Users, label: 'Forum', color: '#F59E0B' },
    { id: 'robot' as TabType, icon: Bot, label: 'Robot', color: '#EF4444' },
    { id: 'profile' as TabType, icon: User, label: 'Profil', color: '#3B82F6' },
  ];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(var(--mobile-vh, 1vh) * 100)',
        width: '100%',
        background: '#0B0E11',
        overflow: 'hidden',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      {/* Content — fills all space above bottom nav */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
          >
            {activeTab === 'dm' && (
              <MobileDM
                userId={userId}
                currentUserName={currentUserName}
                onStartCall={onStartCall}
              />
            )}
            {activeTab === 'channels' && (
              <GuildSystem theme={theme} userId={userId} username={currentUserName || ''} />
            )}
            {activeTab === 'forum' && (
              <Forum theme={theme} userId={userId} displayName={currentUserName} />
            )}
            {activeTab === 'robot' && (
              <RobotHouse theme={theme} />
            )}
            {activeTab === 'profile' && (
              <ProfilePage theme={theme} userId={userId} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Tab Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          background: 'rgba(11, 14, 17, 0.97)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
          flexShrink: 0,
          zIndex: 50,
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                padding: '10px 4px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                minHeight: 56,
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  style={{
                    position: 'absolute',
                    top: 6,
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: tab.color,
                    boxShadow: `0 0 8px ${tab.color}`,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                size={22}
                color={isActive ? tab.color : 'rgba(255,255,255,0.35)'}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 700 : 400,
                  color: isActive ? tab.color : 'rgba(255,255,255,0.35)',
                  letterSpacing: '0.02em',
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
