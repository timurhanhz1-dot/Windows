import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { 
  Home, Layout, Users, Gamepad2, Radio, Tv, Bot, Headphones, Search, Shield, UserCheck, Settings, Swords
} from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';

interface SidebarProps {
  view: string;
  setView: (view: any) => void;
  theme: any;
  siteSettings: any;
  setActiveDmUserId: (id: string | null) => void;
  onShowSettings?: () => void;
  onShowPrivacy?: () => void;
  isAdmin?: boolean;
  totalUnreadDms?: number;
  totalUnreadChannels?: number;
  totalUnreadGuilds?: number;
  userId?: string;
}

export const Sidebar = ({ view, setView, theme, siteSettings, setActiveDmUserId, onShowSettings, onShowPrivacy, isAdmin, totalUnreadDms = 0, totalUnreadChannels = 0, totalUnreadGuilds = 0, userId = '' }: SidebarProps) => {
  const { t } = useTranslation();
  return (
    <nav 
      className={`w-[72px] h-screen flex flex-col items-center py-4 border-r border-white/10 z-20 transition-all duration-500 backdrop-blur-2xl`}
      style={{ 
        background: 'rgba(10, 20, 15, 0.45)',
        boxShadow: '1px 0 20px rgba(16, 185, 129, 0.05), inset -1px 0 0 rgba(255,255,255,0.05)'
      }}
    >
      {/* Logo */}
      <motion.div 
        whileHover={{ scale: 1.08, rotate: 3 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { setView('chat'); setActiveDmUserId(null); }}
        className="flex items-center justify-center cursor-pointer transition-all mb-2"
      >
        <CompanyLogo size={48} color="#ffffff" siteName={siteSettings.site_name} />
      </motion.div>
      
      <div className="w-10 h-px bg-white/10 my-2" />

      {/* Navigation Items — scrollable */}
      <div className="flex-1 w-full flex flex-col items-center overflow-y-auto overflow-x-hidden py-1 gap-2 scrollbar-hide">
        <NavItem icon={Home} view={view} targetView="chat" onClick={() => setView('chat')} badge={totalUnreadChannels} badgeColor="emerald" title={t('common.online')} theme={theme} />
        <NavItem icon={Bot} view={view} targetView="robot-house" onClick={() => setView('robot-house')} title="Robot Evi" theme={theme} />
        <NavItem icon={Layout} view={view} targetView="forum" onClick={() => setView('forum')} title="Forum" theme={theme} />
        <NavItem icon={Users} view={view} targetView="dm" onClick={() => setView('dm')} badge={totalUnreadDms} badgeColor="red" title={t('dm.newMessage')} theme={theme} />
        <NavItem icon={Headphones} view={view} targetView="browser" onClick={() => setView('browser')} title="Sesli Odalar" theme={theme} />
        <NavItem icon={Gamepad2} view={view} targetView="games" onClick={() => setView('games')} title="Oyunlar" theme={theme} />
        <NavItem icon={Radio} view={view} targetView="live-chat" onClick={() => setView('live-chat')} title={t('live.liveNow')} theme={theme} />
        <NavItem icon={Tv} view={view} targetView="live-tv" onClick={() => setView('live-tv')} title="Canlı TV" theme={theme} />
        <NavItem icon={Search} view={view} targetView="search" onClick={() => setView('search')} title={t('common.search')} theme={theme} />
        <NavItem icon={UserCheck} view={view} targetView="friends" onClick={() => setView('friends')} title={t('friends.allFriends')} theme={theme} />
        <NavItem icon={Swords} view={view} targetView="guilds" onClick={() => setView('guilds')} badge={totalUnreadGuilds} badgeColor="purple" title="Sunucular" theme={theme} />
      </div>

      {isAdmin && (
        <NavItem icon={Shield} view={view} targetView="admin" onClick={() => setView('admin')} title="Admin" theme={theme} />
      )}

      <div className="w-10 h-px bg-white/10 my-2" />

      {/* Profile */}
      <div className="relative group">
        <motion.div 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setView('profile')}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold cursor-pointer border-2 transition-all ${view === 'profile' ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-[#0B0E11]' : ''}`} 
          style={{ 
            backgroundColor: 'rgb(245, 158, 11)',
            borderColor: view === 'profile' ? theme.accent : 'transparent',
            color: 'black'
          }}
          title="Profil"
        >
          GE
        </motion.div>
        {onShowSettings && (
          <motion.div
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={e => { e.stopPropagation(); onShowSettings(); }}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer bg-[#1a1d22] border border-white/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg"
            title="Ayarlar"
          >
            <Settings size={13} color="rgba(255,255,255,0.8)" />
          </motion.div>
        )}
      </div>
    </nav>
  );
};

// NavItem Component
const NavItem = ({ icon: Icon, view, targetView, onClick, badge, badgeColor = 'emerald', title, theme }: any) => {
  const isActive = view === targetView;
  
  return (
    <div className="relative">
      <motion.div
        whileHover={{ scale: 1.1, x: 2 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className={`w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-all relative ${
          isActive 
            ? 'text-white shadow-lg' 
            : 'text-white/50 hover:text-white hover:bg-white/5'
        }`}
        style={{ 
          backgroundColor: isActive ? theme.accentLight : 'transparent',
        }}
        title={title}
      >
        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 rounded-r-full"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
      </motion.div>
      {badge !== undefined && badge !== null && badge > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full ${
            badgeColor === 'red' ? 'bg-red-500' : badgeColor === 'purple' ? 'bg-purple-500' : 'bg-emerald-500'
          } text-white text-[10px] font-black flex items-center justify-center pointer-events-none shadow-lg`}
        >
          {badge > 99 ? '99+' : badge}
        </motion.span>
      )}
    </div>
  );
};
