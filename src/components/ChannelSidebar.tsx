import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { 
  ChevronDown, 
  Cpu, 
  Plus, 
  Filter, 
  Hash,
  Tv,
  Radio,
  Users,
  Eye,
  Video,
  Mic,
  Monitor
} from 'lucide-react';
import { NatureBotMascot } from './NatureBotMascot';
import { GuildSystem } from './GuildSystem';
import { GuildListCompact } from './GuildListCompact';
import { Channel } from '../types';
import { estimateCO2 } from '../services/securityService';
import { db } from '../firebase';
import { ref, onValue, set as fbSet } from 'firebase/database';
import { NotificationCenter } from './NotificationCenter';

// Modern glassmorphism colors
const GLASS_COLORS = {
  primary: '#10B981',
  secondary: '#8B5CF6',
  accent: '#F59E0B',
  danger: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  dark: '#0F172A',
  surface: '#1E293B',
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  gradient: 'linear-gradient(135deg, #10B981 0%, #8B5CF6 100%)',
  gradientSecondary: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
};

// Varsayılan kanallar (Firebase boşsa kullanılır)
export const DEFAULT_TV_CHANNELS = [
  { id: 'trt1',        name: 'TRT 1',        emoji: '📺', desc: "Türkiye'nin ana kanalı",    youtubeChannelId: 'UCwHT8qSom5HF9OqMEGHbLEg', color: '#e11d48' },
  { id: 'trt2',        name: 'TRT 2',        emoji: '🎭', desc: 'Kültür & sanat',            youtubeChannelId: 'UC8JLeB4RNFwm7GQ5wDEWGsQ', color: '#7c3aed' },
  { id: 'trthaber',    name: 'TRT Haber',    emoji: '📰', desc: 'Canlı haber yayını',        youtubeChannelId: 'UCLGoFOSxuOPSuVXQdoJjDDg', color: '#0284c7' },
  { id: 'trtspor',     name: 'TRT Spor',     emoji: '⚽', desc: 'Spor yayınları',            youtubeChannelId: 'UCZ5JFpVdSgGMpbzHAGVH6SA', color: '#16a34a' },
  { id: 'trtmuzik',    name: 'TRT Müzik',    emoji: '🎵', desc: 'Müzik & eğlence',          youtubeChannelId: 'UCl0S7h7xLdKFDMHxTVlUiyQ', color: '#db2777' },
  { id: 'trtbelgesel', name: 'TRT Belgesel', emoji: '🌿', desc: 'Belgesel & doğa',          youtubeChannelId: 'UCWHgOvkJEMHLJOSgJj4H5oA', color: '#10b981' },
  { id: 'trtcocuk',    name: 'TRT Çocuk',    emoji: '🧒', desc: 'Çocuk programları',         youtubeChannelId: 'UCsVvhNgxAHQfhW4bCqP7WYA', color: '#f59e0b' },
  { id: 'trtworld',    name: 'TRT World',    emoji: '🌍', desc: 'İngilizce dünya haberleri', youtubeChannelId: 'UCe_HHnvyHJLJGJKpP-swNMg', color: '#06b6d4' },
];

// TV kanallarını Firebase'den oku (global hook)
export const useTvChannels = () => {
  const [channels, setChannels] = useState<any[]>(DEFAULT_TV_CHANNELS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const r = ref(db, 'tv_channels');
    const unsub = onValue(r, snap => {
      const d = snap.val();
      if (d && Object.keys(d).length > 0) {
        // Firebase'de veri var — onu kullan (ASLA üzerine yazma)
        const list = Object.entries(d)
          .map(([id, v]: any) => ({ id, ...v }))
          .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
        setChannels(list);
      } else if (!loaded) {
        // İlk yüklemede Firebase boşsa UI'da default göster (Firebase'e YAZMA)
        setChannels(DEFAULT_TV_CHANNELS);
      }
      setLoaded(true);
    }, (error) => {
      // Okuma hatası — sadece UI'da default göster, Firebase'e dokunma
      console.warn('tv_channels okuma hatası:', error.message);
      setChannels(DEFAULT_TV_CHANNELS);
      setLoaded(true);
    });
    return () => unsub();
  }, []);

  return channels;
};

// Geriye dönük uyumluluk için
export const TV_CHANNELS = DEFAULT_TV_CHANNELS;

interface ChannelSidebarProps {
  theme: any;
  siteSettings: any;
  view: string;
  setView: (view: any) => void;
  activeChannel: string;
  setActiveChannel: (name: string) => void;
  channels: Channel[];
  currentChannelId: string;
  setCurrentChannelId: (id: string) => void;
  onlineUsers: string[];
  allUsers: any[];
  userId: string | null;
  setActiveDmUserId: (id: string) => void;
  activeDmUserId: string | null;
  setIsCreateChannelModalOpen: (open: boolean) => void;
  tvChannel?: string;
  setTvChannel?: (ch: string) => void;
  isVerified?: boolean;
  unreadChannels?: Record<string, number>;
  unreadDms?: Record<string, number>;
  onOpenVoiceRoom?: () => void;
  currentUser?: any;
}

export const ChannelSidebar = ({ 
  theme, 
  siteSettings, 
  view, 
  setView, 
  activeChannel, 
  setActiveChannel, 
  channels, 
  currentChannelId, 
  setCurrentChannelId, 
  onlineUsers,
  allUsers,
  userId, 
  setActiveDmUserId, 
  activeDmUserId,
  setIsCreateChannelModalOpen,
  tvChannel,
  setTvChannel,
  isVerified,
  unreadChannels = {},
  unreadDms = {},
  onOpenVoiceRoom,
  currentUser
}: ChannelSidebarProps) => {
  const [sessionStart] = useState(Date.now());
  const [co2, setCo2] = useState(0);
  const [msgCount, setMsgCount] = useState(0);
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const tvChannels = useTvChannels();
  const { t } = useTranslation();

  // Kullanıcının toplam mesaj sayısını Firebase'den çek
  useEffect(() => {
    if (!userId) return;
    const userRef = ref(db, `users/${userId}/message_count`);
    const unsub = onValue(userRef, snap => {
      const count = snap.val() || 0;
      setMsgCount(count);
    });
    return () => unsub();
  }, [userId]);

  // CO2 hesapla — hemen ve her 10 saniyede bir
  useEffect(() => {
    const calc = () => {
      const minutes = (Date.now() - sessionStart) / 60000;
      setCo2(estimateCO2(msgCount, minutes));
    };
    calc(); // ilk hesaplama hemen
    const interval = setInterval(calc, 10000);
    return () => clearInterval(interval);
  }, [sessionStart, msgCount]);

  // Canlı yayınları dinle
  useEffect(() => {
    if (view !== 'live-chat') return;
    const streamsRef = ref(db, 'live_streams');
    const unsub = onValue(streamsRef, snap => {
      const data = snap.val();
      if (!data) { setLiveStreams([]); return; }
      const list = Object.entries(data)
        .map(([id, v]: any) => ({ id, ...v }))
        .filter(s => s.status === 'live')
        .sort((a: any, b: any) => (b.viewers || 0) - (a.viewers || 0));
      setLiveStreams(list);
    });
    return () => unsub();
  }, [view]);

  return (
    <aside 
      className={`w-64 h-screen flex flex-col border-r border-white/5 z-10 transition-all duration-500 ${theme.glass ? 'backdrop-blur-lg' : ''}`}
      style={{ backgroundColor: theme.channelSidebar }}
    >
      {/* Header - Modern */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-black text-base text-white tracking-tight">{siteSettings.site_name}</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mt-0.5">{siteSettings.site_description}</p>
          </div>
          <div className="flex items-center gap-1.5">
            {userId && <NotificationCenter theme={theme} userId={userId} />}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="px-2.5 py-1.5 text-[10px] font-bold rounded-xl border flex items-center gap-1.5 transition-all shadow-lg cursor-default"
              style={{ backgroundColor: theme.accentLight, color: theme.accent, borderColor: theme.accentBorder }}
              title={`Bu oturumda tahmini karbon ayak izi\n${msgCount} mesaj · ${Math.round((Date.now() - sessionStart) / 60000)} dk oturum`}
            >
              <Cpu size={11} /> {co2.toFixed(3)}g CO₂
            </motion.div>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-6 custom-scrollbar" style={{ backdropFilter: 'blur(10px)' }}>
        {view === 'chat' && (
          <>
            {/* NatureBot - Modern */}
            <div>
              <div className="flex items-center gap-2 px-3 mb-3">
                <ChevronDown size={12} style={{ color: GLASS_COLORS.primary }} />
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Guardian AI</span>
              </div>
              <motion.div
                whileHover={{ scale: 1.02, x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setActiveChannel('NatureBot'); setView('chat'); }}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer group transition-all shadow-lg`}
                style={{
                  background: activeChannel === 'NatureBot' ? GLASS_COLORS.gradient : GLASS_COLORS.glass,
                  border: activeChannel === 'NatureBot' ? 'none' : `1px solid ${GLASS_COLORS.glassBorder}`,
                  backdropFilter: 'blur(10px)'
                }}
              >
                <div className="relative">
                  <motion.div 
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-500 shadow-xl overflow-hidden"
                    style={{ 
                      background: GLASS_COLORS.glass, 
                      border: `2px solid ${GLASS_COLORS.glassBorder}`,
                      backdropFilter: 'blur(10px)',
                      boxShadow: activeChannel === 'NatureBot' ? `0 0 20px ${GLASS_COLORS.primary}` : 'none' 
                    }}
                  >
                    <NatureBotMascot size={36} />
                  </motion.div>
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 rounded-full"
                    style={{ 
                      background: GLASS_COLORS.success, 
                      borderColor: '#111418',
                      boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)'
                    }}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black transition-colors duration-500" style={{ color: activeChannel === 'NatureBot' ? '#fff' : '#fff' }}>NatureBot</p>
                  <p className="text-[10px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Aktif • Dünyanın En Gelişmiş AI</p>
                </div>
              </motion.div>
            </div>

            {/* Bilgi Kanalları - Modern */}
            <div>
              <div className="flex items-center justify-between px-3 mb-3">
                <div className="flex items-center gap-2">
                  <ChevronDown size={12} style={{ color: GLASS_COLORS.primary }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Bilgi</span>
                </div>
              </div>
              {channels.filter(c => ['duyurular', 'yardim'].includes(c.id)).map(channel => (
                <motion.div 
                  key={channel.id}
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setCurrentChannelId(channel.id); setActiveChannel(channel.name); setView('chat'); }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all mb-1 ${currentChannelId === channel.id && view === 'chat' ? 'bg-white/10 shadow-lg' : 'hover:bg-white/5 text-white/50 hover:text-white'}`}
                >
                  {currentChannelId === channel.id && view === 'chat' && (
                    <motion.div
                      layoutId="channelIndicator"
                      className="absolute left-0 w-1 h-6 bg-emerald-500 rounded-r-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${currentChannelId === channel.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                    {channel.emoji ? <span className="text-base leading-none">{channel.emoji}</span> : <Hash size={16} />}
                  </div>
                  <span className="text-sm font-bold flex-1">{channel.name}</span>
                  {unreadChannels[channel.id] > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-red-500/30"
                    >
                      {unreadChannels[channel.id] > 99 ? '99+' : unreadChannels[channel.id]}
                    </motion.span>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Sohbet Kanalları - Modern */}
            <div>
              <div className="flex items-center justify-between px-3 mb-3">
                <div className="flex items-center gap-2">
                  <ChevronDown size={12} className="text-white/30" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Sohbet (Gruplar)</span>
                </div>
                {currentUser?.is_admin && (
                  <motion.button
                    whileHover={{ scale: 1.2, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Plus 
                      size={14} 
                      className="text-white/30 hover:text-emerald-400 cursor-pointer transition-colors" 
                      onClick={() => setIsCreateChannelModalOpen(true)}
                    />
                  </motion.button>
                )}
              </div>
              {channels.filter(c => !['duyurular', 'yardim'].includes(c.id)).map(channel => (
                <motion.div 
                  key={channel.id}
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setCurrentChannelId(channel.id); setActiveChannel(channel.name); setView('chat'); }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all mb-1 relative ${currentChannelId === channel.id && view === 'chat' ? 'bg-white/10 shadow-lg' : 'hover:bg-white/5 text-white/50 hover:text-white'}`}
                >
                  {currentChannelId === channel.id && view === 'chat' && (
                    <motion.div
                      layoutId="channelIndicator"
                      className="absolute left-0 w-1 h-6 bg-emerald-500 rounded-r-full"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${currentChannelId === channel.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40'}`}>
                    {channel.emoji ? <span className="text-base leading-none">{channel.emoji}</span> : <Hash size={16} />}
                  </div>
                  <span className="text-sm font-bold flex-1">{channel.name}</span>
                  {unreadChannels[channel.id] > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-lg shadow-red-500/30"
                    >
                      {unreadChannels[channel.id] > 99 ? '99+' : unreadChannels[channel.id]}
                    </motion.span>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Gruplar (Guilds) Section */}
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-1">
                  <ChevronDown size={12} className="text-white/20" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Gruplar</span>
                </div>
                <Plus 
                  size={14} 
                  className="text-white/20 hover:text-white cursor-pointer" 
                  onClick={() => setView('guilds')}
                />
              </div>
              <GuildListCompact 
                userId={userId || ''} 
                onGuildClick={(guild) => {
                  // Navigate to guild view with selected guild
                  setView('guilds');
                }}
                theme={theme}
              />
            </div>

            {/* Bağlantılar (DM) Section - Modern */}
            <div>
              <div className="flex items-center justify-between px-3 mb-3">
                <div className="flex items-center gap-2">
                  <ChevronDown size={12} className="text-white/30" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Bağlantılar (DM)</span>
                </div>
              </div>
              <div className="space-y-1">
                {allUsers.filter(u => u.id !== userId).length === 0 ? (
                  <p className="px-3 text-[11px] text-white/30 italic">Henüz kullanıcı yok...</p>
                ) : (
                  allUsers.filter(u => u.id !== userId).map(user => {
                    const isOnline = user.status === 'online';
                    const dmUnread = unreadDms[user.id] || 0;
                    return (
                      <motion.div 
                        key={user.id}
                        whileHover={{ scale: 1.02, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setActiveDmUserId(user.id); setView('dm'); }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${activeDmUserId === user.id ? 'bg-white/10 shadow-lg' : 'hover:bg-white/5'}`}
                      >
                        <div className="relative">
                          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500/20 to-teal-600/20 rounded-xl flex items-center justify-center text-xs font-black text-white border-2 border-white/10 shadow-lg">
                            {(user.username || user.id).substring(0, 2).toUpperCase()}
                          </div>
                          <motion.div 
                            animate={isOnline ? { scale: [1, 1.2, 1] } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-[#111418] rounded-full ${isOnline ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-gray-500'}`} 
                          />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className={`text-sm font-bold truncate ${dmUnread > 0 ? 'text-white' : 'text-white/80'}`}>{user.username || user.id}</p>
                          <p className="text-[10px] text-white/30 truncate font-medium">{isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}</p>
                        </div>
                        {dmUnread > 0 && (
                          <motion.span 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/30"
                          >
                            {dmUnread > 99 ? '99+' : dmUnread}
                          </motion.span>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}

        {view === 'dm' && (
          <div>
            <div className="flex items-center justify-between px-2 mb-2">
              <div className="flex items-center gap-1">
                <ChevronDown size={12} className="text-white/20" />
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Direkt Mesajlar</span>
              </div>
            </div>
            {allUsers.filter(u => u.id !== userId).map(user => {
              const isOnline = user.status === 'online';
              return (
                <div
                  key={user.id}
                  onClick={() => { setActiveDmUserId(user.id); }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all ${activeDmUserId === user.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                >
                  <div className="relative">
                    <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-xs font-bold text-white/40 border border-white/10">
                      {(user.username || user.id).substring(0, 2).toUpperCase()}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-[#111418] rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium text-white/80 truncate">{user.username || user.id}</p>
                    <p className="text-[10px] text-white/20 truncate">{isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TV KANALLARI ── */}
        {view === 'live-tv' && (
          <div className="space-y-1">
            <div className="px-3 py-2 flex items-center gap-2">
              <Tv size={12} className="text-white/30" />
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Kanallar</span>
            </div>
            {tvChannels.map(ch => (
              <div
                key={ch.id}
                onClick={() => setTvChannel && setTvChannel(ch.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all mx-1 ${
                  tvChannel === ch.id ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
                style={tvChannel === ch.id ? { borderLeft: `2px solid ${ch.color}` } : {}}
              >
                <span className="text-xl">{ch.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{ch.name}</p>
                  <p className="text-[10px] text-white/30 truncate">{ch.desc}</p>
                </div>
                {tvChannel === ch.id && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-[9px] text-red-400 font-bold">CANLI</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── CANLI YAYINLAR ── */}
        {view === 'live-chat' && (
          <div className="space-y-1">
            <div className="px-3 py-2 flex items-center gap-2">
              <Radio size={12} className="text-red-400" />
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Yayınlar</span>
              {liveStreams.length > 0 && (
                <span className="ml-auto text-[9px] font-black text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded-full">
                  {liveStreams.length}
                </span>
              )}
            </div>
            {liveStreams.length === 0 && (
              <div className="px-3 py-4 text-center">
                <p className="text-[11px] text-white/20">Şu an aktif yayın yok</p>
                {isVerified && (
                  <p className="text-[10px] text-emerald-400/50 mt-1">İlk yayını sen başlat!</p>
                )}
              </div>
            )}
            {liveStreams.map(stream => (
              <div
                key={stream.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-white/5 transition-all mx-1"
              >
                <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-xs font-bold text-white/40 border border-white/10 relative flex-shrink-0">
                  {(stream.username || '?').substring(0, 2).toUpperCase()}
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{stream.username}</p>
                  <p className="text-[10px] text-white/30 truncate">{stream.title || 'Canlı Yayın'}</p>
                </div>
                <div className="flex items-center gap-1 text-white/30">
                  <Eye size={10} />
                  <span className="text-[10px]">{stream.viewers || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

    </aside>
  );
};
