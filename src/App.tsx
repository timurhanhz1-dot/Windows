import React, { Suspense } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import LoadingSpinner from './components/LoadingSpinner';

import { useState, useEffect, useRef, FormEvent, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion'; // changed from 'motion/react'
import { pageVariants, pageTransition, getMotionProps } from './utils/animations';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, off, query, orderByChild, limitToLast, update } from 'firebase/database';
import { Home, MessageSquare, Tv, Users, Menu, BookOpen, User } from 'lucide-react';

import { Sidebar } from './components/Sidebar';
import { ChannelSidebar } from './components/ChannelSidebar';
import { ChatArea } from './components/ChatArea';
import { AdminPanel } from './components/AdminPanel';
import { NatureBotMascot } from './components/NatureBotMascot';
import { Forum } from './components/Forum';
import { DirectMessages } from './components/DirectMessages';
import { Games } from './components/Games';
import { LiveSectionWrapper as LiveSection } from './components/LiveSection';
import { RobotHouse } from './components/RobotHouse';
import { ProfileErrorBoundary } from './components/ProfileErrorBoundary';
import { GuildSystem } from './components/GuildSystem';

// Lazy load profile-related components for better performance
const ProfilePage = React.lazy(() => import('./components/ProfilePage').then(module => ({ default: module.ProfilePage })));
const PostDetailModal = React.lazy(() => import('./components/PostDetailModal').then(module => ({ default: module.PostDetailModal })));
const StoryViewer = React.lazy(() => import('./components/StoryViewer').then(module => ({ default: module.StoryViewer })));
import { ModernMobileApp } from './components/ModernMobileApp';

import { GlobalSearch } from './components/GlobalSearch';
import { AuthPage } from './components/AuthPage';
import { NotificationCenter } from './components/NotificationCenter';
import { CallWindow, IncomingCallNotification, useCallManager } from './components/CallWindow';
import { FriendSystem } from './components/FriendSystem';
import { UserSettings } from './components/UserSettings';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { VoiceRooms, ActiveRoom } from './components/VoiceRooms';
import { VideoConferenceRooms } from './components/VideoConferenceRoom';

import { themes, ThemeKey } from './constants/themes';
import { Channel, Message, SiteSettings } from './types';
import { NatureBotService } from './services/aiService';
import { checkRateLimit } from './services/securityService';
import { aiModerationService } from './services/aiModerationService';
import { clearConversationHistory } from './services/rtdbChatHistoryService';
import { clearUserMemoryProfile } from './services/aiMemoryProfileService';
import { playMessageSound, playDmSound, startRingtone, stopRingtone, playCallConnected, playCallEnded } from './services/soundService';
import OnboardingFlow from './components/OnboardingFlow';
import { BadgeDisplay, awardBadge, addXP, getLevel } from './components/BadgeSystem';
import { useUserStatus, setUserStatus, StatusDot, StatusPicker } from './components/UserStatusSystem';
import { TwoFactorAuth } from './components/TwoFactorAuth';
import { useScreenShare, ScreenShareView } from './components/ScreenShare';
import { useStoryCleanup } from './hooks/useStoryCleanup';
import { initFCM, listenForegroundMessages } from './services/fcmService';
import {
  listenChannels, listenMessages, listenOnlineUsers, listenSettings,
  sendMessage as fbSendMessage, createChannel as fbCreateChannel,
  setUserOnline, setUserOffline, addReaction, pinMessage, editMessage, deleteMessage,
  listenPolls, votePoll as fbVotePoll, uploadFile, createPoll as fbCreatePoll,
  closePoll as fbClosePoll, deletePoll as fbDeletePoll
} from './services/firebaseService';

// Mobil tespiti
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

function AppContent() {
  const isMobile = useIsMobile();
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  type ViewType = 'chat'|'forum'|'dm'|'games'|'live-chat'|'live-tv'|'robot-house'|'admin'|'profile'|'guilds'|'search'|'friends'|'browser';
  const navigate = useNavigate();
  const location = useLocation();

  // URL'den view'i belirle
  const pathToView: Record<string, ViewType> = {
    '/': 'chat', '/chat': 'chat', '/forum': 'forum', '/dm': 'dm',
    '/games': 'games', '/live-chat': 'live-chat', '/live-tv': 'live-tv',
    '/robot-house': 'robot-house', '/admin': 'admin', '/profile': 'profile',
    '/guilds': 'guilds', '/search': 'search', '/friends': 'friends', '/browser': 'browser',
  };
  const viewToPath: Record<ViewType, string> = {
    chat: '/chat', forum: '/forum', dm: '/dm', games: '/games',
    'live-chat': '/live-chat', 'live-tv': '/live-tv', 'robot-house': '/robot-house',
    admin: '/admin', profile: '/profile', guilds: '/guilds', search: '/search',
    friends: '/friends', browser: '/browser',
  };

  // Handle dynamic profile routes (/profile/:userId)
  const getViewFromPath = (pathname: string): ViewType => {
    if (pathname.startsWith('/profile')) return 'profile';
    return pathToView[pathname] || 'chat';
  };

  const view: ViewType = getViewFromPath(location.pathname);

  // Extract userId from /profile/:userId route
  const profileUserId = location.pathname.startsWith('/profile/') 
    ? location.pathname.split('/profile/')[1] 
    : undefined;

  // Admin sayfasına geçişi sadece onaylı admin için izin ver
  const setView = (v: ViewType) => {
    if (v === 'admin' && !isAdmin) return;
    navigate(viewToPath[v]);
  };
  type MobileTab = 'dm'|'friends'|'forum'|'profile';
  const mobilePathToTab: Record<string, MobileTab> = {
    '/dm': 'dm', '/friends': 'friends', '/forum': 'forum', '/profile': 'profile',
    '/': 'dm', '/chat': 'dm',
  };
  const mobileTab: MobileTab = (mobilePathToTab[location.pathname] as MobileTab) || 'dm';
  const setMobileTab = (tab: MobileTab) => navigate('/' + tab);
  const [themeKey, setThemeKey] = useState<ThemeKey>(() => {
    try { return (localStorage.getItem('themeKey') as ThemeKey) || 'harmony'; } catch { return 'harmony'; }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [activeChannel, setActiveChannel] = useState('NatureBot');
  const [activeVoiceRoom, setActiveVoiceRoom] = useState<{ id: string; name: string } | null>(null);
  const [voiceMinimized, setVoiceMinimized] = useState(false);
  const [currentChannelId, setCurrentChannelId] = useState('genel');
  const [tvChannel, setTvChannel] = useState('trt1');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [aiHistory, setAiHistory] = useState<any[]>([]);
  const [memoryProfile, setMemoryProfile] = useState<any>({ goals: [], interests: [], preferences: [], tone: 'dengeli', summary: '' });
  const [companionInsight, setCompanionInsight] = useState('NatureBot bugün sana eşlik etmeye hazır.');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const { isSharing, stream, startScreenShare, stopScreenShare } = useScreenShare();
  const [isCreateChannelModalOpen, setIsCreateChannelModalOpen] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [unreadChannels, setUnreadChannels] = useState<Record<string, number>>({});
  const [unreadDms, setUnreadDms] = useState<Record<string, number>>({});
  const [unreadGuilds, setUnreadGuilds] = useState<Record<string, number>>({});
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    site_name: 'Nature.co', maintenance_mode: 'false',
    maintenance_message: 'Sistem bakımdadır.', allow_registration: 'true'
  });

  // Admin tasarım ayarlarını Firebase'den dinle ve CSS variables olarak uygula
  useEffect(() => {
    const designRef = ref(db, 'settings/design');
    const unsub = onValue(designRef, snap => {
      const d = snap.val();
      if (!d) return;
      const root = document.documentElement;
      if (d.primary_color) root.style.setProperty('--color-primary', d.primary_color);
      if (d.bg_color) root.style.setProperty('--color-bg', d.bg_color);
      if (d.font_size) root.style.setProperty('--font-size-base', d.font_size + 'px');
      if (d.border_radius) root.style.setProperty('--border-radius', d.border_radius + 'px');
      if (d.bg_style) {
        const bgMap: Record<string, string> = {
          dark: '#0B0E11',
          gradient: 'linear-gradient(135deg, #0B0E11 0%, #0d1f1a 100%)',
          deep: '#050709',
        };
        if (bgMap[d.bg_style]) root.style.setProperty('--color-bg', bgMap[d.bg_style]);
      }
    });
    return () => off(designRef);
  }, []);

  const theme = themes[themeKey];
  const chatEndRef = useRef<HTMLDivElement>(null);
  const botService = useMemo(() => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY || '';
    return new NatureBotService(apiKey);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async user => {
      try {
        setCurrentUser(user);
        setAuthReady(true);
        // Giriş yapınca IP adresini kaydet
        if (user) {
          try {
            const ipRes = await fetch('https://api.ipify.org?format=json');
            const { ip } = await ipRes.json();
            if (ip) {
              await update(ref(db, `users/${user.uid}`), {
                last_ip: ip,
                last_seen: Date.now(),
              });
            }
          } catch {
            // IP alınamazsa sessizce geç
          }
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setCurrentUser(null);
        setAuthReady(true);
      }
    });
    return unsub;
  }, []);

  const userId = currentUser?.uid || '';
  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || userId;
  const userStatus = useUserStatus(userId);
  
  // Kendi kullanıcı verisini ayrı yükle (allUsers artık sadece arkadaşları içeriyor)
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  useEffect(() => {
    if (!userId) return;
    const userRef = ref(db, `users/${userId}`);
    const unsub = onValue(userRef, snap => {
      setCurrentUserData(snap.val());
    });
    return () => off(userRef);
  }, [userId]);
  
  const isAdmin = currentUserData?.is_admin === true;
  // isAdmin false olarak kesinleşirse admin view'dan çık
  useEffect(() => {
    if (currentUserData !== undefined && !isAdmin && view === 'admin') {
      navigate('/chat');
    }
  }, [isAdmin, currentUserData]);
  const isVerified = currentUserData?.is_verified === true;

  const { activeCall, incomingCall, startCall, acceptCall, rejectCall, endCall } = useCallManager(userId, displayName);

  useEffect(() => {
    if (incomingCall) { startRingtone(); } else { stopRingtone(); }
    return () => stopRingtone();
  }, [incomingCall]);

  const prevActiveCallRef = useRef<any>(null);
  useEffect(() => {
    if (activeCall && !prevActiveCallRef.current) playCallConnected();
    else if (!activeCall && prevActiveCallRef.current) playCallEnded();
    prevActiveCallRef.current = activeCall;
  }, [activeCall]);

  // Story cleanup job - runs every 5 minutes
  // Requirements: 8.5
  useStoryCleanup(userId);

  // FCM push notification başlat
  useEffect(() => {
    if (!userId) return;
    initFCM(userId).catch(() => {});
    const unsub = listenForegroundMessages((title, body) => {
      // Ön planda bildirim — tarayıcı Notification API ile göster
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon-192.png' });
      }
    });
    return () => { unsub?.(); };
  }, [userId]);

  useEffect(() => {
    if (!currentUser) return;
    
    try {
      setUserOnline(userId, displayName).catch(error => {
        console.error('Set user online error:', error);
      });

      // Android TV için window'a expose et — online presence ping kullanır
      if (typeof window !== 'undefined') {
        (window as any)._currentUserId = userId;
        (window as any)._firebaseDB = db;
      }
      
      const unsubs = [
        listenChannels(setChannels),
        listenOnlineUsers(setOnlineUsers),
        // listenUsers removed - we'll load friends only instead of all users
        listenSettings(s => setSiteSettings(prev => ({ ...prev, ...s }))),
      ];
      
      return () => { 
        unsubs.forEach(u => u()); 
        setUserOffline(userId); 
      };
    } catch (error) {
      console.error('User setup error:', error);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    if (activeChannel === 'NatureBot') {
      setMessages([]);
      return;
    }
    return listenMessages(currentChannelId, setMessages as any);
  }, [currentChannelId, currentUser, activeChannel]);

  useEffect(() => {
    if (!currentUser) return;
    return listenPolls(currentChannelId, setPolls);
  }, [currentChannelId, currentUser]);

  // ── Arkadaş listesi dinleyici ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const fRef = ref(db, `users/${userId}/friends`);
    onValue(fRef, snap => {
      try {
        const d = snap.val() || {};
        setFriendIds(Object.keys(d).filter(k => d[k] === true));
      } catch (error) {
        console.error('Friends listener error:', error);
        setFriendIds([]);
      }
    });
    return () => off(fRef);
  }, [userId]);

  // ── Arkadaş verilerini yükle (sadece arkadaşlar, tüm kullanıcılar değil) ─────
  useEffect(() => {
    if (!userId || friendIds.length === 0) {
      setAllUsers([]);
      return;
    }

    // Her arkadaş için veri dinle
    const unsubscribers: (() => void)[] = [];
    const friendDataMap = new Map<string, any>();

    friendIds.forEach(friendId => {
      const friendRef = ref(db, `users/${friendId}`);
      const unsub = onValue(friendRef, snap => {
        const data = snap.val();
        if (data) {
          friendDataMap.set(friendId, {
            id: friendId,
            username: data.username || 'Unknown',
            status: data.status || 'offline',
            avatar: data.avatar || data.photoURL || '',
            is_admin: data.is_admin || data.isAdmin || false,
            is_verified: data.is_verified === true,
            is_banned: data.is_banned || data.banned || false,
            eco_points: data.eco_points || 0,
            displayName: data.displayName || data.username || 'Unknown',
            photoURL: data.photoURL || data.avatar || null,
            isOnline: data.isOnline || false,
            lastSeen: data.lastSeen || null,
          });
        } else {
          friendDataMap.delete(friendId);
        }
        // Her güncelleme sonrası allUsers'ı yeniden oluştur
        setAllUsers(Array.from(friendDataMap.values()));
      });
      unsubscribers.push(unsub);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [userId, friendIds.join(',')]); // friendIds array'i değişince yeniden dinle

  // ── Keşfet için users node'undan yükle (silinmiş hesaplar otomatik filtrelenir) ──
  const [discoverUsers, setDiscoverUsers] = useState<any[]>([]);
  useEffect(() => {
    if (!userId) return;
    const usersRef = ref(db, 'users');
    const unsub = onValue(usersRef, snap => {
      const d = snap.val() || {};
      const list = Object.entries(d)
        .filter(([id, v]: any) => {
          // Silinmiş, banned veya username'i olmayan hesapları filtrele
          if (id === userId) return false;
          if (!v || !v.username) return false;
          if (v.is_deleted || v.deleted) return false;
          if (v.is_banned || v.banned) return false;
          return true;
        })
        .map(([id, v]: any) => ({
          id,
          username: v.username || 'Kullanıcı',
          displayName: v.displayName || v.username || 'Kullanıcı',
          avatar: v.avatar || v.photoURL || '',
          photoURL: v.photoURL || v.avatar || null,
          status: v.status || 'offline',
          is_admin: v.is_admin || v.isAdmin || false,
          is_verified: v.is_verified === true,
        }));
      setDiscoverUsers(list);
    });
    return () => off(usersRef);
  }, [userId]);

  // ── user_index backfill (mevcut kullanicilari index'e yaz) ──────────────────
  const backfillDoneRef = useRef(false);
  useEffect(() => {
    if (!userId || allUsers.length === 0 || backfillDoneRef.current) return;
    backfillDoneRef.current = true;
    const doBackfill = async () => {
      const { get: fbGet, ref: fbRef, set: fbSet } = await import('firebase/database');
      const snap = await fbGet(fbRef(db, 'user_index')).catch(() => null);
      if (snap && Object.keys(snap.val() || {}).length >= allUsers.length) return; // already indexed
      const updates: Record<string, any> = {};
      allUsers.forEach(u => { if (u.id && u.username) updates[u.id] = { username: u.username }; });
      for (const [uid, val] of Object.entries(updates)) {
        await fbSet(fbRef(db, `user_index/${uid}`), val).catch(() => {});
      }
    };
    doBackfill();
  }, [userId, allUsers.length]);

  // ── Ses motorunu ilk etkileşimde başlat (tarayıcı politikası) ────────────────
  useEffect(() => {
    const unlock = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          const ctx = new AudioContext();
          ctx.resume().then(() => ctx.close());
        }
      } catch (_) {}
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, []);

  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current && prevMsgCountRef.current > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.sender_id !== userId) {
        if (!isMuted) { try { playMessageSound(); } catch (_) {} }
        if ((document.hidden || currentChannelId !== activeChannel) && activeChannel !== 'NatureBot') {
          setUnreadChannels(prev => ({ ...prev, [currentChannelId]: (prev[currentChannelId] || 0) + 1 }));
        }
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, userId, isMuted, currentChannelId, activeChannel]);

  // ── Global DM dinleyici: sadece arkadaşlarla olan konuşmaların son mesajı ──────
  useEffect(() => {
    if (!userId || friendIds.length === 0) return;

    const unsubs: (() => void)[] = [];
    const prevLastTs = new Map<string, string>();

    friendIds.forEach(friendId => {
      const dmKey = [userId, friendId].sort().join('_');
      // limitToLast(1) ile sadece son mesajı dinle — tüm konuşmayı çekmiyoruz
      const dmRef = query(ref(db, `dm/${dmKey}`), orderByChild('timestamp'), limitToLast(1));
      const unsub = onValue(dmRef, snap => {
        const data = snap.val();
        if (!data) return;
        const msgs = Object.values(data) as any[];
        const lastMsg = msgs[0];
        if (!lastMsg) return;
        const ts = lastMsg.timestamp || '';
        const prev = prevLastTs.get(dmKey);
        if (prev === undefined) { prevLastTs.set(dmKey, ts); return; } // ilk yükleme
        if (ts === prev) return; // değişiklik yok
        prevLastTs.set(dmKey, ts);
        if (lastMsg.sender_id !== userId) {
          if (!isMuted && (view !== 'dm' || activeDmUserId !== friendId || document.hidden)) {
            try { playDmSound(); } catch (_) {}
          }
          if (view !== 'dm' || activeDmUserId !== friendId) {
            setUnreadDms(prev => ({ ...prev, [friendId]: (prev[friendId] || 0) + 1 }));
          }
        }
      });
      unsubs.push(() => off(dmRef));
    });

    return () => unsubs.forEach(u => u());
  }, [userId, friendIds, isMuted, view, activeDmUserId]);

  // ── Guild mesaj dinleyici ──────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    // userGuilds'i dinle, her guild'in kanallarını takip et
    const userGuildsRef = ref(db, `userGuilds/${userId}`);
    let channelUnsubs: (() => void)[] = [];
    const prevLastTs = new Map<string, string>();

    const guildUnsub = onValue(userGuildsRef, async snap => {
      channelUnsubs.forEach(u => u());
      channelUnsubs = [];
      const guildIds = Object.keys(snap.val() || {});

      for (const guildId of guildIds) {
        // Her guild için genel kanalı dinle (guild_ID_genel)
        const channelId = `guild_${guildId}_genel`;
        const msgRef = query(ref(db, `messages/${channelId}`), orderByChild('timestamp'), limitToLast(1));
        const unsub = onValue(msgRef, (msgSnap) => {
          const data = msgSnap.val();
          if (!data) return;
          const lastMsg = Object.values(data)[0] as any;
          if (!lastMsg) return;
          const ts = lastMsg.timestamp || '';
          const prev = prevLastTs.get(channelId);
          if (prev === undefined) { prevLastTs.set(channelId, ts); return; }
          if (ts === prev) return;
          prevLastTs.set(channelId, ts);
          if (lastMsg.sender_id !== userId) {
            if (!isMuted && (view !== 'guilds' || document.hidden)) {
              try { playDmSound(); } catch (_) {}
            }
            if (view !== 'guilds') {
              setUnreadGuilds(prev => ({ ...prev, [guildId]: (prev[guildId] || 0) + 1 }));
            }
          }
        });
        channelUnsubs.push(() => off(msgRef));
      }
    });

    return () => {
      off(userGuildsRef);
      channelUnsubs.forEach(u => u());
    };
  }, [userId, isMuted, view]);

  useEffect(() => {
    // Sadece yeni mesaj eklendiğinde scroll yap, input değişikliklerinde değil
    if (messages.length > 0) {
      // Scroll'u bir sonraki frame'e ertele ki input focus'u bozulmasın
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
  }, [messages.length]); // messages yerine messages.length kullan

  // Sayfa başlığını URL'e göre güncelle
  useEffect(() => {
    const titles: Record<string, string> = {
      '/chat': activeChannel ? `#${activeChannel} · Nature.co` : 'Nature.co',
      '/': 'Nature.co',
      '/dm': 'Mesajlar · Nature.co',
      '/forum': 'Forum · Nature.co',
      '/games': 'Oyunlar · Nature.co',
      '/live-chat': 'Canlı Sohbet · Nature.co',
      '/live-tv': 'Canlı TV · Nature.co',
      '/robot-house': 'Robot Evi · Nature.co',
      '/admin': 'Admin · Nature.co',
      '/profile': 'Profil · Nature.co',
      '/guilds': 'Guilds · Nature.co',
      '/search': 'Ara · Nature.co',
      '/friends': 'Arkadaşlar · Nature.co',
      '/browser': 'Sesli Odalar · Nature.co',
    };
    const title = titles[location.pathname] || 'Nature.co';
    document.title = title;
    const titleEl = document.querySelector('title');
    if (titleEl) titleEl.textContent = title;
  }, [location.pathname, activeChannel]);

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !currentUser) return;
    if (!checkRateLimit(`msg_${userId}`, 20)) return;

    // Kanal kilitli mi kontrol et (admin değilse engelle)
    const currentChannel = channels.find(c => c.id === currentChannelId);
    if (currentChannel?.is_locked && !isAdmin) {
      alert('Bu kanal kilitli. Mesaj gönderemezsiniz.');
      return;
    }

    const userMessage = input.trim();
    setInput('');
    if (activeChannel === 'NatureBot') {
      setIsLoading(true);
      const newMsg: any = { id: Date.now().toString(), sender_id: userId, sender_name: displayName, content: userMessage, timestamp: new Date().toISOString(), type: 'text' };
      setMessages(prev => [...prev, newMsg]);
      try {
        const aiData = await botService.chat(userMessage);
        const botMsg: any = { id: (Date.now()+1).toString(), sender_id: 'NatureBot', sender_name: 'NatureBot', content: aiData.content, timestamp: new Date().toISOString(), type: 'text' };
        setMessages(prev => [...prev, botMsg]);
        if (!isMuted) botService.speak(aiData.content);
      } catch {} finally { setIsLoading(false); }
    } else {
      // AI moderasyon kontrolü
      try {
        const modResult = await aiModerationService.analyzeContent(userMessage, userId, currentChannelId);
        if (modResult.isViolation && modResult.confidence >= 75) {
          // Yüksek güvenli ihlal — mesajı engelle
          const blockedMsg: any = {
            id: Date.now().toString(),
            sender_id: 'system',
            sender_name: 'Sistem',
            content: `⚠️ Mesajın gönderilmedi: ${modResult.reasoning}`,
            timestamp: new Date().toISOString(),
            type: 'system',
          };
          setMessages(prev => [...prev, blockedMsg]);
          return;
        }
      } catch {
        // Moderasyon hatası sessizce geç, mesajı engelleme
      }
      const mentions: string[] = [];
      const mentionRegex = /@(\w+)/g;
      let match;
      while ((match = mentionRegex.exec(userMessage)) !== null) {
        const u = allUsers.find(u => u.username?.toLowerCase() === match[1].toLowerCase());
        if (u) mentions.push(u.id);
      }
      await fbSendMessage(currentChannelId, userId, displayName, userMessage, { mentions, senderAvatar: currentUser.photoURL || '' });
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const { url, name, type } = await uploadFile(file, userId);
      await fbSendMessage(currentChannelId, userId, displayName, name, { fileUrl: url, fileName: name, fileType: type, senderAvatar: currentUser.photoURL || '' });
    } finally { setIsLoading(false); }
  };

  const filteredMessages = useMemo(() => {
    if (!searchQuery) return messages;
    return messages.filter((m: any) => m.content?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [messages, searchQuery]);

  // Auth yüklenene kadar bekle
  if (!authReady) {
    return (
      <div style={{ background: '#0B0E11', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #10B981', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Auth hazır, kullanıcı yok → AuthPage göster
  if (!currentUser) {
    return <AuthPage onAuth={() => {}} />;
  }

  // ── MOBİL GÖRÜNÜM ─────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <>
        <ModernMobileApp 
          theme={theme}
          userId={userId}
          currentUserName={displayName}
          onStartCall={(targetId, targetName, mode) => startCall(targetId, targetName, mode)}
        />
        <AnimatePresence>
          {incomingCall && <IncomingCallNotification call={incomingCall} onAccept={acceptCall} onReject={rejectCall} />}
        </AnimatePresence>
        <AnimatePresence>
          {activeCall && <CallWindow userId={userId} username={displayName} targetUserId={activeCall.targetUserId} targetUsername={activeCall.targetUsername} mode={activeCall.mode} isIncoming={activeCall.isIncoming} onEnd={endCall} />}
        </AnimatePresence>
      </>
    );
  }

  // ── MASAÜSTÜ GÖRÜNÜM ──────────────────────────────────────────────────
  return (
    <div className="flex h-screen font-sans select-none transition-all duration-700 relative"
      style={{ background: theme.bg, color: theme.text }}>

      <div className="hidden md:flex">
        <Sidebar view={view} setView={v => { setView(v); setMobileSidebarOpen(false); }} theme={theme} siteSettings={siteSettings} setActiveDmUserId={setActiveDmUserId} onShowSettings={() => setShowSettings(true)} onShowPrivacy={() => setShowPrivacy(true)} isAdmin={isAdmin} totalUnreadDms={Object.values(unreadDms).reduce((a,b) => a+b, 0)} totalUnreadChannels={Object.values(unreadChannels).reduce((a,b) => a+b, 0)} totalUnreadGuilds={Object.values(unreadGuilds).reduce((a,b) => a+b, 0)} userId={userId} />
      </div>

      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
            <motion.div initial={{ x: -300 }} animate={{ x: 0 }} exit={{ x: -300 }} transition={{ type: 'spring', damping: 25 }} className="fixed left-0 top-0 bottom-0 z-50 md:hidden flex" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
              <Sidebar view={view} setView={v => { setView(v); setMobileSidebarOpen(false); }} theme={theme} siteSettings={siteSettings} setActiveDmUserId={setActiveDmUserId} onShowSettings={() => { setShowSettings(true); setMobileSidebarOpen(false); }} onShowPrivacy={() => { setShowPrivacy(true); setMobileSidebarOpen(false); }} isAdmin={isAdmin} userId={userId} />
              <ChannelSidebar theme={theme} siteSettings={siteSettings} view={view} setView={v => { setView(v); setMobileSidebarOpen(false); }} activeChannel={activeChannel} setActiveChannel={setActiveChannel} channels={channels} currentChannelId={currentChannelId} setCurrentChannelId={id => { setCurrentChannelId(id); setUnreadChannels(p => ({ ...p, [id]: 0 })); }} onlineUsers={onlineUsers} allUsers={allUsers.filter(u => friendIds.includes(u.id))} userId={userId} setActiveDmUserId={id => { setActiveDmUserId(id); setMobileSidebarOpen(false); setUnreadDms(p => ({ ...p, [id || '']: 0 })); }} activeDmUserId={activeDmUserId} setIsCreateChannelModalOpen={setIsCreateChannelModalOpen} tvChannel={tvChannel} setTvChannel={setTvChannel} isVerified={isVerified} unreadChannels={unreadChannels} unreadDms={unreadDms} onOpenVoiceRoom={() => setView('browser')} currentUser={currentUser} />
            </motion.div>
            </>
        )}
      </AnimatePresence>

      {!['forum','dm','games','robot-house','browser','friends','guilds','search','profile'].includes(view) && <div className="hidden md:flex">
        <ChannelSidebar theme={theme} siteSettings={siteSettings} view={view} setView={setView} activeChannel={activeChannel} setActiveChannel={setActiveChannel} channels={channels} currentChannelId={currentChannelId} setCurrentChannelId={id => { setCurrentChannelId(id); setUnreadChannels(p => ({ ...p, [id]: 0 })); }} onlineUsers={onlineUsers} allUsers={allUsers.filter(u => friendIds.includes(u.id))} userId={userId} setActiveDmUserId={id => { setActiveDmUserId(id); setUnreadDms(p => ({ ...p, [id || '']: 0 })); }} activeDmUserId={activeDmUserId} setIsCreateChannelModalOpen={setIsCreateChannelModalOpen} tvChannel={tvChannel} setTvChannel={setTvChannel} isVerified={isVerified} unreadChannels={unreadChannels} unreadDms={unreadDms} onOpenVoiceRoom={() => setView('browser')} currentUser={currentUser} />
      </div>}

      <AnimatePresence>
        {isCreateChannelModalOpen && isAdmin && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-md bg-[#111418] border border-white/10 rounded-2xl p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-4">Yeni Kanal</h3>
              <form onSubmit={async e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const name = fd.get('name') as string; if (!name) return; await fbCreateChannel(name); setIsCreateChannelModalOpen(false); }}>
                <input name="name" placeholder="kanal-adı" autoFocus className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 mb-4" />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsCreateChannelModalOpen(false)} className="flex-1 px-4 py-2 bg-white/5 text-white/60 rounded-xl text-sm">İptal</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold">Oluştur</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col relative z-0 min-w-0 overflow-hidden" style={{ paddingBottom: 0 }}>
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {view === 'chat' && <ChatArea theme={theme} activeChannel={activeChannel} searchQuery={searchQuery} setSearchQuery={setSearchQuery} isMuted={isMuted} setIsMuted={setIsMuted} polls={polls} votePoll={(pollId, idx) => fbVotePoll(currentChannelId, pollId, userId, idx)} filteredMessages={filteredMessages} userId={userId} currentUser={currentUser} input={input} setInput={setInput} handleSendMessage={handleSendMessage} isLoading={isLoading} chatEndRef={chatEndRef} onFileUpload={handleFileUpload} onImageUpload={() => {}} onVoiceRecord={() => {}} onStartDM={(id) => { setActiveDmUserId(id); setView('dm'); }} allUsers={allUsers.filter(u => friendIds.includes(u.id))} onReact={(msgId, emoji) => addReaction(currentChannelId, msgId, emoji, userId)} onPin={(msgId, pinned) => pinMessage(currentChannelId, msgId, pinned)} onEdit={(msgId, content) => editMessage(currentChannelId, msgId, content)} onDelete={(msgId) => deleteMessage(currentChannelId, msgId)} onCreatePoll={(q, opts) => fbCreatePoll(currentChannelId, userId, q, opts)} onClosePoll={(pollId) => fbClosePoll(currentChannelId, pollId)} onDeletePoll={(pollId) => fbDeletePoll(currentChannelId, pollId)} aiHistory={[]} onQuickPrompt={(prompt) => setInput(prompt)} onClearAiHistory={() => {
  if (!userId) return;
  // UI'ı hemen güncelle, Firebase işlemini arka planda yap
  try { setAiHistory([]); } catch {}
  try {
    setMemoryProfile({
      goals: [],
      interests: [],
      preferences: [],
      tone: 'dengeli',
      summary: ''
    });
  } catch {}
  try { setCompanionInsight('NatureBot bugün sana eşlik etmeye hazır.'); } catch {}
  try { clearUserMemoryProfile(userId); } catch {}
  // Firebase silme işlemi arka planda — UI'ı bloke etme
  setTimeout(() => {
    clearConversationHistory(userId).catch(() => {});
  }, 0);
}} quickPrompts={[]} isCompact={isCompact} fontSize={fontSize} isChannelLocked={!!(channels.find(c => c.id === currentChannelId)?.is_locked)} isAdmin={isAdmin} />}
        {view === 'admin' && isAdmin && <AdminPanel theme={theme} siteSettings={siteSettings} updateSiteSettings={() => {}} />}
        {view === 'forum' && <Forum theme={theme} userId={userId} displayName={displayName} />}
        {view === 'dm' && <DirectMessages theme={theme} userId={userId} activeDmUserId={activeDmUserId} currentUserName={displayName} onStartCall={(targetId, targetName, mode) => startCall(targetId, targetName, mode)} />}
        {view === 'games' && <Games theme={theme} />}
        {view === 'live-tv' && <LiveSection theme={theme} type="tv" tvChannel={tvChannel} />}
        {view === 'live-chat' && <LiveSection theme={theme} type="chat" userId={userId} username={displayName} />}
        {view === 'robot-house' && <RobotHouse theme={theme} />}
        {view === 'browser' && (
          import.meta.env.VITE_ENABLE_VIDEO_ROOMS === 'true'
            ? <VideoConferenceRooms userId={userId} username={displayName} theme={theme} />
            : <VoiceRooms userId={userId} username={displayName} theme={theme} activeVoiceRoom={activeVoiceRoom} onJoinRoom={(id, name) => { setActiveVoiceRoom({ id, name }); setVoiceMinimized(false); }} onLeaveRoom={() => setActiveVoiceRoom(null)} />
        )}
        {view === 'profile' && (
          <ProfileErrorBoundary>
            <Suspense fallback={
              <div className="flex-1 flex items-center justify-center">
                <LoadingSpinner />
              </div>
            }>
              <motion.div
                key="profile-page"
                {...getMotionProps({
                  initial: pageVariants.initial,
                  animate: pageVariants.animate,
                  exit: pageVariants.exit,
                  transition: pageTransition
                })}
                className="flex-1 min-h-0"
              >
                <ProfilePage theme={theme} userId={userId} viewUserId={profileUserId} />
              </motion.div>
            </Suspense>
          </ProfileErrorBoundary>
        )}
        {view === 'guilds' && <GuildSystem theme={theme} userId={userId} username={displayName} onGuildOpen={(guildId: string) => setUnreadGuilds(prev => ({ ...prev, [guildId]: 0 }))} />}
        {view === 'friends' && <FriendSystem theme={theme} userId={userId} allUsers={allUsers} discoverUsers={discoverUsers} onStartDM={(id) => { setActiveDmUserId(id); setView('dm'); }} />}
        {view === 'search' && <GlobalSearch theme={theme} onNavigate={(type, id) => { 
          if (type === 'channel') { 
            setCurrentChannelId(id); 
            setActiveChannel(id); 
            setView('chat'); 
          } else if (type === 'user') { 
            navigate(`/profile/${id}`);
          } else if (type === 'profile') {
            navigate(`/profile/${id}`);
          }
        }} />}
        </div>
      </main>

      <AnimatePresence>
        {incomingCall && <IncomingCallNotification call={incomingCall} onAccept={acceptCall} onReject={rejectCall} />}
      </AnimatePresence>
      <AnimatePresence>
        {activeCall && <CallWindow userId={userId} username={displayName} targetUserId={activeCall.targetUserId} targetUsername={activeCall.targetUsername} mode={activeCall.mode} isIncoming={activeCall.isIncoming} onEnd={endCall} />}
      </AnimatePresence>
      <AnimatePresence>
        {showSettings && <UserSettings userId={userId} currentTheme={themeKey} onThemeChange={(t) => { setThemeKey(t as ThemeKey); try { localStorage.setItem('themeKey', t); } catch {} }} onClose={() => setShowSettings(false)} onCompactChange={setIsCompact} onFontSizeChange={setFontSize} isCompact={isCompact} fontSize={fontSize} />}
      </AnimatePresence>
      <AnimatePresence>
        {showPrivacy && <PrivacyPolicy onClose={() => setShowPrivacy(false)} />}
      </AnimatePresence>

      {/* ── GLOBAL FLOATING VOICE PANEL ─────────────────────────────── */}
      {/* ActiveRoom: AnimatePresence DIŞINDA — her zaman mounted, asla unmount olmaz */}
      {activeVoiceRoom && (
        <>
          {/* Tam ekran panel — minimize değilken görünür */}
          <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#0B0E11',
            visibility: voiceMinimized ? 'hidden' : 'visible',
            pointerEvents: voiceMinimized ? 'none' : 'auto',
          }}>
            <ActiveRoom
              roomId={activeVoiceRoom.id}
              roomName={activeVoiceRoom.name}
              userId={userId}
              username={displayName}
              onMinimize={() => setVoiceMinimized(true)}
              onLeave={() => { setActiveVoiceRoom(null); setVoiceMinimized(false); }}
            />
          </div>

          {/* Mini pill — minimize'da görünür */}
          {voiceMinimized && (
            <motion.div
              key="voice-pill"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 10000 }}
            >
              <motion.div
                style={{ background: 'rgba(11,14,17,0.96)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 16, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, backdropFilter: 'blur(24px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', cursor: 'pointer' }}
                onClick={() => setVoiceMinimized(false)}
                whileHover={{ scale: 1.03 }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981', flexShrink: 0 }} />
                <span style={{ color: '#fff', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{activeVoiceRoom.name}</span>
                <div style={{ display: 'flex', gap: 3, alignItems: 'center', height: 20 }}>
                  {[0,1,2,3].map(i => (
                    <motion.div key={i} style={{ width: 3, background: '#10B981', borderRadius: 2, height: 4 }}
                      animate={{ height: [4, 12+i*2, 6, 14-i, 4] }}
                      transition={{ duration: 0.7+i*0.15, repeat: Infinity, ease: 'easeInOut', delay: i*0.1 }} />
                  ))}
                </div>
                <button onClick={e => { e.stopPropagation(); setVoiceMinimized(false); }}
                  style={{ marginLeft: 4, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 26, height: 26, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                  ↑
                </button>
              </motion.div>
            </motion.div>
          )}
        </>
      )}

      
      {/* Onboarding Flow */}
      {showOnboarding && (
        <OnboardingFlow
          userId={userId}
          displayName={displayName}
          onComplete={() => setShowOnboarding(false)}
          theme={theme}
        />
      )}

      {/* Two Factor Auth */}
      {show2FA && (
        <TwoFactorAuth
          userId={userId}
          theme={theme}
          onClose={() => setShow2FA(false)}
        />
      )}

      {/* Status Picker */}
      {showStatusPicker && (
        <div style={{ position: 'fixed', top: 80, right: 20, zIndex: 9999 }}>
          <StatusPicker
            userId={userId}
            currentStatus={userStatus.status}
            onClose={() => setShowStatusPicker(false)}
          />
        </div>
      )}

      {/* Screen Share View */}
      {isSharing && stream && (
        <div style={{ position: 'fixed', bottom: 20, right: 20, width: 400, maxWidth: '60vw', zIndex: 1000 }}>
          <ScreenShareView
            stream={stream}
            onStop={stopScreenShare}
            theme={theme}
          />
        </div>
      )}

    </div>
  );
}

// Main App wrapper with Error Boundary
function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;