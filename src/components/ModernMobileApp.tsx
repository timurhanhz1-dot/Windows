import { useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { MessageCircle, Users, Bot, User, Plus, Search, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MobileDM } from './MobileDM';
import { Forum } from './Forum';
import { ProfilePage } from './ProfilePage';
import { RobotHouse } from './RobotHouse';

type TabType = 'dm' | 'forum' | 'robot' | 'profile';

interface ModernMobileAppProps {
  theme: any;
  userId: string;
  currentUserName?: string;
  onStartCall?: (targetId: string, targetName: string, mode: 'voice' | 'video') => void;
}

export const ModernMobileApp = ({ theme, userId, currentUserName, onStartCall }: ModernMobileAppProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('dm');
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleDragEnd = (_event: any, info: PanInfo) => {
    const threshold = 50;
    const tabs: TabType[] = ['dm', 'forum', 'robot', 'profile'];
    const currentIndex = tabs.indexOf(activeTab);

    if (info.offset.x > threshold && currentIndex > 0) {
      setActiveTab(tabs[currentIndex - 1]);
    } else if (info.offset.x < -threshold && currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1]);
    }
  };

  const getHeaderTitle = () => {
    switch(activeTab) {
      case 'dm': return t('mobile.messages');
      case 'forum': return t('mobile.forum');
      case 'robot': return t('mobile.robotHouse');
      case 'profile': return t('mobile.profile');
      default: return 'Nature.co';
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-[#0B0E11] via-[#0D1117] to-[#0B0E11] overflow-hidden relative">
      {/* Top Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-xl border-b border-white/5"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-emerald-500/30 flex-shrink-0">
            N
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-black text-base leading-tight truncate">Nature.co</h1>
            <p className="text-white/40 text-xs truncate">{getHeaderTitle()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowSearch(!showSearch)}
            className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all"
          >
            <Search size={18} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all relative"
          >
            <Bell size={18} />
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
          </motion.button>
        </div>
      </motion.header>

      {/* Content Area with Swipe */}
      <motion.div 
        className="flex-1 overflow-hidden relative"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ paddingBottom: '70px' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 overflow-y-auto"
          >
            {activeTab === 'dm' && (
              <MobileDM 
                userId={userId} 
                currentUserName={currentUserName}
                onStartCall={onStartCall}
              />
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
      </motion.div>

      {/* Floating Action Button */}
      <AnimatePresence>
        {activeTab === 'dm' && (
          <motion.button
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            className="absolute bottom-20 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/50 z-40"
          >
            <Plus size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom Tab Bar - Minimal thin line style */}
      <div 
        className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-1 bg-transparent border-t border-white/10"
        style={{ 
          height: '56px',
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)'
        }}
      >
        {[
          { id: 'dm' as TabType, icon: MessageCircle, label: t('mobile.messages'), gradient: 'from-blue-500 to-cyan-500' },
          { id: 'forum' as TabType, icon: Users, label: t('mobile.forum'), gradient: 'from-purple-500 to-pink-500' },
          { id: 'robot' as TabType, icon: Bot, label: t('mobile.robot'), gradient: 'from-orange-500 to-red-500' },
          { id: 'profile' as TabType, icon: User, label: t('mobile.profile'), gradient: 'from-emerald-500 to-teal-500' },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-all"
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className={`absolute inset-0 bg-gradient-to-br ${tab.gradient} opacity-15 rounded-lg`}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              
              <div className={`relative ${isActive ? `bg-gradient-to-br ${tab.gradient}` : 'bg-white/5'} p-1.5 rounded-lg transition-all`}>
                <Icon 
                  size={18} 
                  className={isActive ? 'text-white' : 'text-white/40'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              
              <span className={`text-[8px] font-bold ${isActive ? 'text-white' : 'text-white/40'} transition-colors`}>
                {tab.label}
              </span>

              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className={`absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r ${tab.gradient} rounded-full`}
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
