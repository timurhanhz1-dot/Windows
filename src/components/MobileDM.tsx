import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Send, ArrowLeft, Phone, Video, MoreVertical, Check, CheckCheck, Smile, Paperclip, Reply, X, Mic, Image, File, Users, Settings, Archive, Star, Block, Volume2, Zap, Sparkles, Heart, Gift, Crown, Shield } from 'lucide-react';
import { db } from '../firebase';
import { ref, onValue, push, off, update, remove, get } from 'firebase/database';
import { checkRateLimit } from '../services/securityService';
import { playDmSound } from '../services/soundService';

const EMOJIS = ['👍','❤️','😂','😮','😢','🔥','🎉','👀','✅','💯','🎯','🚀','💎','🌟','⚡'];

// Modern color palette
const MODERN_COLORS = {
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

function shortTime(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function listTime(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) return shortTime(ts);
  if (diff < 172800000) return 'Dün';
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function dayLabel(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) return 'Bugün';
  if (diff < 172800000) return 'Dün';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isSameDay(ts1: string, ts2: string) {
  return new Date(ts1).toDateString() === new Date(ts2).toDateString();
}

function Avatar({ user, size = 48, showStatus = true, status = 'online' }: { user: any; size?: number; showStatus?: boolean; status?: string }) {
  const initials = (user?.username || user?.id || '?').substring(0, 2).toUpperCase();
  const colors = [MODERN_COLORS.primary, MODERN_COLORS.info, MODERN_COLORS.secondary, MODERN_COLORS.accent, MODERN_COLORS.danger, MODERN_COLORS.warning];
  const color = colors[(user?.username || '').charCodeAt(0) % colors.length] || MODERN_COLORS.primary;
  
  return (
    <div style={{ 
      width: size, 
      height: size, 
      borderRadius: size * 0.3, 
      overflow: 'hidden', 
      background: MODERN_COLORS.glass, 
      border: `2px solid ${MODERN_COLORS.glassBorder}`, 
      backdropFilter: 'blur(10px)',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      flexShrink: 0,
      position: 'relative',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
    }}>
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(135deg, ${color}22 0%, ${color}44 100%)`,
        borderRadius: size * 0.3
      }} />
      
      {/* Avatar content */}
      {user?.avatar
        ? <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }} alt="" />
        : <span style={{ fontSize: size * 0.35, fontWeight: 700, color: color, position: 'relative', zIndex: 1 }}>{initials}</span>}
      
      {/* Status indicator */}
      {showStatus && (
        <div style={{
          position: 'absolute',
          bottom: 2,
          right: 2,
          width: size * 0.25,
          height: size * 0.25,
          borderRadius: '50%',
          background: status === 'online' ? MODERN_COLORS.success : status === 'away' ? MODERN_COLORS.warning : MODERN_COLORS.danger,
          border: '2px solid #0B0E11',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          zIndex: 2
        }} />
      )}
    </div>
  );
}

export const MobileDM = ({ userId, currentUserName, activeDmUserId: initialId, onStartCall, onKeyboard }: {
  userId: string; currentUserName?: string; activeDmUserId?: string | null;
  onStartCall?: (targetId: string, targetName: string, mode: 'voice' | 'video') => void;
  onKeyboard?: (open: boolean) => void;
}) => {
  const [screen, setScreen] = useState<'list' | 'chat'>(initialId ? 'chat' : 'list');
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(initialId || null);

  // Prop'tan gelen yeni DM hedefi (FriendSystem'den gelince güncelle)
  useEffect(() => {
    if (initialId && initialId !== activeDmUserId) {
      setActiveDmUserId(initialId);
      setScreen('chat');
    }
  }, [initialId]);
  
  // Enhanced state variables
  const [users, setUsers] = useState<any[]>([]);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [replyTo, setReplyTo] = useState<any>(null);
  const [emojiFor, setEmojiFor] = useState<string | null>(null);
  const [lastMessages, setLastMessages] = useState<Record<string, any>>({});
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showSearch, setShowSearch] = useState(false);
  const [filteredByStatus, setFilteredByStatus] = useState<'all' | 'online' | 'favorites'>('all');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    onValue(usersRef, snap => {
      const data = snap.val() || {};
      const list: any[] = [];
      const seen = new Set<string>();
      Object.entries(data).forEach(([id, val]: any) => {
        if (id === userId || !val) return;
        const uname = val.username || id;
        if (!seen.has(uname.toLowerCase())) {
          seen.add(uname.toLowerCase());
          list.push({ id, username: uname, avatar: val.avatar || '', status: val.status || 'offline' });
        }
      });
      setUsers(list);
    });
    const onlineRef = ref(db, 'online');
    onValue(onlineRef, snap => {
      const data = snap.val() || {};
      setOnlineIds(Object.keys(data).filter(k => data[k] === true));
    });
    return () => { off(ref(db, 'users')); off(ref(db, 'online')); };
  }, []);

  // Load last messages for list preview
  useEffect(() => {
    users.forEach(user => {
      const dmKey = [userId, user.id].sort().join('_');
      const r = ref(db, `dm/${dmKey}`);
      onValue(r, snap => {
        const data = snap.val() || {};
        const msgs = Object.values(data).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const last = msgs[msgs.length - 1] as any;
        if (last) setLastMessages(prev => ({ ...prev, [user.id]: last }));
      });
    });
  }, [users.length]);

  useEffect(() => {
    if (!activeDmUserId) return;
    const dmKey = [userId, activeDmUserId].sort().join('_');
    let init = false;
    const r = ref(db, `dm/${dmKey}`);
    onValue(r, snap => {
      const data = snap.val() || {};
      const msgs = Object.entries(data).map(([id, val]: any) => ({ id, ...val }))
        .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      if (init) { const last = msgs[msgs.length - 1]; if (last?.sender_id || last?.senderId !== userId) playDmSound(); }
      init = true;
      setMessages(msgs);
    });
    return () => off(r);
  }, [activeDmUserId]);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
  }, [messages.length]);

  const openChat = (user: any) => {
    setActiveDmUserId(user.id);
    setScreen('chat');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeDmUserId) return;
    if (!checkRateLimit(`dm_${userId}`, 20)) return;
    const content = input.trim();
    setInput('');
    const dmKey = [userId, activeDmUserId].sort().join('_');
    await push(ref(db, `dm/${dmKey}`), {
      senderId: userId, sender_name: currentUserName || userId,
      receiverId: activeDmUserId, text: content,
      timestamp: new Date().toISOString(), type: 'text',
      reactions: {}, is_edited: false,
      reply_to_id: replyTo?.id || null,
      reply_to_content: replyTo?.content || null,
    });
    setReplyTo(null);
  };

  const handleReact = async (msgId: string, emoji: string) => {
    const dmKey = [userId, activeDmUserId].sort().join('_');
    const r = ref(db, `dm/${dmKey}/${msgId}/reactions/${emoji}`);
    const snap = await get(r);
    const arr: string[] = snap.val() || [];
    const idx = arr.indexOf(userId);
    if (idx === -1) arr.push(userId); else arr.splice(idx, 1);
    if (arr.length === 0) await remove(r);
    else await update(ref(db, `dm/${dmKey}/${msgId}/reactions`), { [emoji]: arr });
    setEmojiFor(null);
  };

  const activeUser = users.find(u => u.id === activeDmUserId);
  const isOnline = activeDmUserId ? onlineIds.includes(activeDmUserId) : false;

  const filteredUsers = users.filter(u =>
    (u.username || '').toLowerCase().includes(search.toLowerCase())
  );

  // Group messages by day
  const grouped: { date: string; msgs: any[] }[] = [];
  messages.forEach((msg, i) => {
    if (i === 0 || !isSameDay(msg.timestamp, messages[i - 1].timestamp)) {
      grouped.push({ date: msg.timestamp, msgs: [msg] });
    } else {
      grouped[grouped.length - 1].msgs.push(msg);
    }
  });

  const accent = MODERN_COLORS.primary;

  // ── SOHBET LİSTESİ ──────────────────────────────────────────────────
  if (screen === 'list') return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      background: MODERN_COLORS.dark, 
      color: '#E3E5E8',
      backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '20px 20px 12px', 
        paddingTop: 'calc(env(safe-area-inset-top) + 20px)',
        background: MODERN_COLORS.glass,
        backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${MODERN_COLORS.glassBorder}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
              width: 40, 
              height: 40, 
              borderRadius: 12, 
              background: MODERN_COLORS.gradient, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
            }}>
              <Sparkles size={20} color="#fff" />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0 }}>Sohbetler</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowSearch(!showSearch)}
              style={{ 
                background: MODERN_COLORS.glass, 
                border: `1px solid ${MODERN_COLORS.glassBorder}`, 
                borderRadius: 12, 
                padding: '8px 12px', 
                color: MODERN_COLORS.primary, 
                fontSize: 12, 
                fontWeight: 600,
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => { setSearch(''); setTimeout(() => document.querySelector<HTMLInputElement>('.dm-search-input')?.focus(), 100); }}
              style={{ 
                background: MODERN_COLORS.gradient, 
                border: 'none', 
                borderRadius: 12, 
                padding: '8px 16px', 
                color: '#fff', 
                fontSize: 12, 
                fontWeight: 600,
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              + Yeni
            </button>
          </div>
        </div>
        
        {/* Status filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[
            { key: 'all', label: 'Tümü', icon: Users },
            { key: 'online', label: 'Çevrimiçi', icon: Check },
            { key: 'favorites', label: 'Favoriler', icon: Star }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setFilteredByStatus(key as any)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 12px',
                background: filteredByStatus === key ? MODERN_COLORS.gradient : MODERN_COLORS.glass,
                border: filteredByStatus === key ? 'none' : `1px solid ${MODERN_COLORS.glassBorder}`,
                borderRadius: 10,
                color: filteredByStatus === key ? '#fff' : MODERN_COLORS.primary,
                fontSize: 12,
                fontWeight: 600,
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        
        {/* Search bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ position: 'relative' }}
            >
              <Search style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: MODERN_COLORS.primary }} size={16} />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Kullanıcı ara..."
                className="dm-search-input"
                style={{ 
                  width: '100%', 
                  background: MODERN_COLORS.glass, 
                  border: `1px solid ${MODERN_COLORS.glassBorder}`, 
                  borderRadius: 16, 
                  padding: '12px 16px 12px 48px', 
                  color: '#fff', 
                  fontSize: 14, 
                  outline: 'none', 
                  boxSizing: 'border-box',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease'
                }} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* User list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {filteredUsers.map(user => {
          const last = lastMessages[user.id];
          const isOwn = last?.sender_id || last?.senderId === userId;
          const isOnline = onlineIds.includes(user.id);
          const isFavorite = false; // TODO: Implement favorites logic
          
          return (
            <motion.button
              key={user.id} 
              onClick={() => openChat(user)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 16, 
                padding: '16px 20px', 
                background: MODERN_COLORS.glass, 
                border: `1px solid ${MODERN_COLORS.glassBorder}`, 
                borderRadius: 16, 
                cursor: 'pointer', 
                textAlign: 'left', 
                marginBottom: 8,
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
            >
              {/* Online indicator glow */}
              {isOnline && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'radial-gradient(circle at 10% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
                  borderRadius: 16,
                  pointerEvents: 'none'
                }} />
              )}
              
              <div style={{ position: 'relative' }}>
                <Avatar user={user} size={56} showStatus={true} status={isOnline ? 'online' : 'offline'} />
                {isFavorite && (
                  <div style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: MODERN_COLORS.accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #0B0E11'
                  }}>
                    <Star size={10} color="#fff" fill="#fff" />
                  </div>
                )}
              </div>
              
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>{user.username}</span>
                    {isOnline && (
                      <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: MODERN_COLORS.success,
                        boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)'
                      }} />
                    )}
                  </div>
                  {last && (
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
                      {listTime(last.timestamp)}
                    </span>
                  )}
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isOwn && <CheckCheck size={12} style={{ color: MODERN_COLORS.success, flexShrink: 0 }} />}
                  <span style={{ 
                    fontSize: 13, 
                    color: 'rgba(255,255,255,0.5)', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    fontWeight: 400
                  }}>
                    {last ? (isOwn ? 'Sen: ' : '') + last.content : isOnline ? '🟢 Çevrimiçi' : '💬 Merhaba de...'}
                  </span>
                </div>
              </div>
              
              {/* Quick actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartCall?.(user.id, user.username, 'voice');
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: MODERN_COLORS.glass,
                    border: `1px solid ${MODERN_COLORS.glassBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  <Phone size={16} color={MODERN_COLORS.primary} />
                </button>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  // ── SOHBET EKRANI ────────────────────────────────────────────────────
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      background: MODERN_COLORS.dark, 
      color: '#E3E5E8',
      backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 12, 
        padding: '16px 20px', 
        paddingTop: 'calc(env(safe-area-inset-top) + 16px)', 
        background: MODERN_COLORS.glass, 
        backdropFilter: 'blur(20px)', 
        borderBottom: `1px solid ${MODERN_COLORS.glassBorder}`,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
      }}>
        <button 
          onClick={() => setScreen('list')} 
          style={{ 
            background: MODERN_COLORS.glass, 
            border: `1px solid ${MODERN_COLORS.glassBorder}`, 
            borderRadius: 12, 
            cursor: 'pointer', 
            color: MODERN_COLORS.primary, 
            padding: 8,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease'
          }}
        >
          <ArrowLeft size={20} />
        </button>
        
        <Avatar user={activeUser} size={44} showStatus={true} status={isOnline ? 'online' : 'offline'} />
        
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 2 }}>
            {activeUser?.username || '...'}
          </div>
          <div style={{ fontSize: 12, color: isOnline ? MODERN_COLORS.success : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: isOnline ? MODERN_COLORS.success : MODERN_COLORS.danger,
              boxShadow: isOnline ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none'
            }} />
            {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            onClick={() => onStartCall?.(activeDmUserId!, activeUser?.username || '', 'voice')} 
            style={{ 
              background: MODERN_COLORS.glass, 
              border: `1px solid ${MODERN_COLORS.glassBorder}`, 
              borderRadius: 12, 
              cursor: 'pointer', 
              color: MODERN_COLORS.primary, 
              padding: 8,
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
          >
            <Phone size={18} />
          </button>
          <button 
            onClick={() => onStartCall?.(activeDmUserId!, activeUser?.username || '', 'video')} 
            style={{ 
              background: MODERN_COLORS.glass, 
              border: `1px solid ${MODERN_COLORS.glassBorder}`, 
              borderRadius: 12, 
              cursor: 'pointer', 
              color: MODERN_COLORS.secondary, 
              padding: 8,
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
          >
            <Video size={18} />
          </button>
          <button 
            style={{ 
              background: MODERN_COLORS.glass, 
              border: `1px solid ${MODERN_COLORS.glassBorder}`, 
              borderRadius: 12, 
              cursor: 'pointer', 
              color: MODERN_COLORS.warning, 
              padding: 8,
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
          >
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '20px 16px',
        background: 'transparent'
      }}>
        {grouped.map(group => (
          <div key={group.date}>
            {/* Day separator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: MODERN_COLORS.glassBorder }} />
              <span style={{ 
                fontSize: 12, 
                color: 'rgba(255,255,255,0.4)', 
                padding: '6px 16px', 
                background: MODERN_COLORS.glass, 
                borderRadius: 20,
                backdropFilter: 'blur(10px)',
                border: `1px solid ${MODERN_COLORS.glassBorder}`,
                fontWeight: 600
              }}>
                {dayLabel(group.date)}
              </span>
              <div style={{ flex: 1, height: 1, background: MODERN_COLORS.glassBorder }} />
            </div>

            {group.msgs.map((msg, index) => {
              const isOwn = msg.sender_id || msg.senderId === userId;
              const reactions = Object.entries(msg.reactions || {}) as [string, string[]][];
              const showAvatar = index === 0 || !isSameDay(msg.timestamp, group.msgs[index - 1]?.timestamp);
              
              return (
                <motion.div
                  key={msg.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  style={{ 
                    display: 'flex', 
                    flexDirection: isOwn ? 'row-reverse' : 'row', 
                    alignItems: 'flex-end', 
                    gap: 12, 
                    marginBottom: 16, 
                    padding: '0 4px'
                  }}
                  onClick={() => setEmojiFor(emojiFor === msg.id ? null : msg.id)}>

                  {/* Avatar */}
                  {!isOwn && (showAvatar || index === 0) && <Avatar user={activeUser} size={36} />}

                  <div style={{ 
                    maxWidth: '70%', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: isOwn ? 'flex-end' : 'flex-start' 
                  }}>
                    {/* Reply preview */}
                    {msg.reply_to_content && (
                      <div style={{ 
                        fontSize: 12, 
                        color: 'rgba(255,255,255,0.5)', 
                        borderLeft: `3px solid ${MODERN_COLORS.primary}`, 
                        paddingLeft: 12, 
                        marginBottom: 8, 
                        maxWidth: 250, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        background: MODERN_COLORS.glass,
                        borderRadius: 8,
                        padding: '6px 12px',
                        backdropFilter: 'blur(10px)'
                      }}>
                        ↩️ {msg.reply_to_content}
                      </div>
                    )}

                    {/* Bubble */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        background: isOwn ? MODERN_COLORS.gradient : MODERN_COLORS.glass,
                        color: isOwn ? '#fff' : '#E3E5E8',
                        padding: '12px 16px',
                        borderRadius: isOwn ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                        fontSize: 14,
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                        backdropFilter: 'blur(10px)',
                        border: isOwn ? 'none' : `1px solid ${MODERN_COLORS.glassBorder}`,
                        boxShadow: isOwn ? '0 4px 20px rgba(16, 185, 129, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.1)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                      {/* Gradient overlay for own messages */}
                      {isOwn && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%)',
                          borderRadius: '20px 20px 6px 20px',
                          pointerEvents: 'none'
                        }} />
                      )}
                      
                      <span style={{ position: 'relative', zIndex: 1 }}>
                        {msg.text || msg.content}
                      </span>
                    </motion.div>

                    {/* Time + ticks */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 6, 
                      marginTop: 6, 
                      flexDirection: isOwn ? 'row-reverse' : 'row' 
                    }}>
                      <span style={{ 
                        fontSize: 11, 
                        color: 'rgba(255,255,255,0.3)', 
                        fontWeight: 500 
                      }}>
                        {shortTime(msg.timestamp)}
                      </span>
                      {isOwn && <CheckCheck size={12} style={{ color: MODERN_COLORS.success }} />}
                      {msg.is_edited && (
                        <span style={{ 
                          fontSize: 10, 
                          color: 'rgba(255,255,255,0.2)', 
                          fontStyle: 'italic' 
                        }}>
                          düzenlendi
                        </span>
                      )}
                    </div>

                    {/* Reactions */}
                    {reactions.length > 0 && (
                      <div style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: 6, 
                        marginTop: 8, 
                        justifyContent: isOwn ? 'flex-end' : 'flex-start' 
                      }}>
                        {reactions.map(([emoji, arr]) => (
                          <motion.button
                            key={emoji} 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={e => { e.stopPropagation(); handleReact(msg.id, emoji); }}
                            style={{ 
                              background: arr.includes(userId) ? MODERN_COLORS.primary + '33' : MODERN_COLORS.glass, 
                              border: `1px solid ${arr.includes(userId) ? MODERN_COLORS.primary + '66' : MODERN_COLORS.glassBorder}`, 
                              borderRadius: 20, 
                              padding: '4px 10px', 
                              fontSize: 13, 
                              color: arr.includes(userId) ? MODERN_COLORS.primary : 'rgba(255,255,255,0.6)', 
                              cursor: 'pointer',
                              backdropFilter: 'blur(10px)',
                              transition: 'all 0.3s ease'
                            }}>
                            {emoji} {arr.length}
                          </motion.button>
                        ))}
                      </div>
                    )}

                    {/* Emoji picker on tap */}
                    <AnimatePresence>
                      {emojiFor === msg.id && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.8, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.8, y: 10 }}
                          style={{ 
                            display: 'flex', 
                            gap: 6, 
                            background: MODERN_COLORS.surface, 
                            border: `1px solid ${MODERN_COLORS.glassBorder}`, 
                            borderRadius: 24, 
                            padding: '8px 12px', 
                            marginTop: 8, 
                            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(20px)'
                          }}
                          onClick={e => e.stopPropagation()}>
                          {EMOJIS.slice(0, 8).map(emoji => (
                            <motion.button
                              key={emoji}
                              whileHover={{ scale: 1.2 }}
                              whileTap={{ scale: 0.8 }}
                              onClick={() => handleReact(msg.id, emoji)} 
                              style={{ 
                                fontSize: 20, 
                                background: 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                padding: 4,
                                transition: 'all 0.3s ease'
                              }}>
                              {emoji}
                            </motion.button>
                          ))}
                          <motion.button
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.8 }}
                            onClick={() => setReplyTo(msg)} 
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              cursor: 'pointer', 
                              color: MODERN_COLORS.primary, 
                              padding: 4,
                              transition: 'all 0.3s ease'
                            }}>
                            <Reply size={16} />
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Reply bar */}
      <AnimatePresence>
        {replyTo && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: 'auto', opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              padding: '12px 20px', 
              background: MODERN_COLORS.glass, 
              borderTop: `2px solid ${MODERN_COLORS.primary}`, 
              gap: 12,
              backdropFilter: 'blur(20px)',
              borderLeft: `1px solid ${MODERN_COLORS.glassBorder}`,
              borderRight: `1px solid ${MODERN_COLORS.glassBorder}`
            }}>
            <Reply size={16} style={{ color: MODERN_COLORS.primary }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Yanıtlanıyor</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {replyTo.content}
              </div>
            </div>
            <button 
              onClick={() => setReplyTo(null)} 
              style={{ 
                background: MODERN_COLORS.glass, 
                border: `1px solid ${MODERN_COLORS.glassBorder}`, 
                borderRadius: 8, 
                cursor: 'pointer', 
                color: 'rgba(255,255,255,0.4)', 
                padding: 6,
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <form onSubmit={handleSend} style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 12, 
        padding: '16px 20px', 
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', 
        background: MODERN_COLORS.glass, 
        borderTop: `1px solid ${MODERN_COLORS.glassBorder}`,
        backdropFilter: 'blur(20px)'
      }}>
        {/* File input */}
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          accept="image/*,video/*,.pdf,.doc,.docx"
          onChange={(e) => {
            // TODO: Handle file upload
            console.log('File upload:', e.target.files);
          }}
        />
        
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()}
          style={{ 
            background: MODERN_COLORS.glass, 
            border: `1px solid ${MODERN_COLORS.glassBorder}`, 
            borderRadius: 12, 
            cursor: 'pointer', 
            color: MODERN_COLORS.primary, 
            padding: 10,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease'
          }}
        >
          <Paperclip size={20} />
        </button>
        
        {/* Main input */}
        <div style={{ flex: 1, position: 'relative' }}>
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)}
            placeholder="Mesaj yazın..."
            style={{ 
              flex: 1, 
              background: MODERN_COLORS.glass, 
              border: `1px solid ${MODERN_COLORS.glassBorder}`, 
              borderRadius: 24, 
              padding: '12px 20px', 
              color: '#fff', 
              fontSize: 14, 
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }} 
            onFocus={() => onKeyboard?.(true)} 
            onBlur={() => onKeyboard?.(false)} 
          />
          
          {/* Quick reply suggestions */}
          <AnimatePresence>
            {showQuickReplies && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                style={{
                  position: 'absolute',
                  bottom: '100%',
                  left: 0,
                  right: 0,
                  background: MODERN_COLORS.surface,
                  border: `1px solid ${MODERN_COLORS.glassBorder}`,
                  borderRadius: 12,
                  padding: '8px',
                  marginBottom: 8,
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                }}
              >
                {['Tamam!', 'Harika!', 'Anladım 👍', 'Teşekkürler'].map(reply => (
                  <button
                    key={reply}
                    onClick={() => setInput(reply)}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      background: MODERN_COLORS.glass,
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                      textAlign: 'left',
                      cursor: 'pointer',
                      marginBottom: 4,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    {reply}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Send button */}
        {input.trim()
          ? (
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ 
                background: MODERN_COLORS.gradient, 
                border: 'none', 
                borderRadius: '50%', 
                width: 48, 
                height: 48, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                cursor: 'pointer', 
                flexShrink: 0,
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
                transition: 'all 0.3s ease'
              }}
            >
              <Send size={20} color="#fff" />
            </motion.button>
          )
          : (
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{ 
                  background: MODERN_COLORS.glass, 
                  border: `1px solid ${MODERN_COLORS.glassBorder}`, 
                  borderRadius: '50%', 
                  width: 48, 
                  height: 48, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  flexShrink: 0,
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease'
                }}
              >
                <Smile size={20} color={MODERN_COLORS.primary} />
              </motion.button>
              
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onPointerDown={() => setVoiceRecording(true)}
                onPointerUp={() => setVoiceRecording(false)}
                style={{ 
                  background: voiceRecording ? MODERN_COLORS.danger : MODERN_COLORS.glass, 
                  border: `1px solid ${voiceRecording ? MODERN_COLORS.danger : MODERN_COLORS.glassBorder}`, 
                  borderRadius: '50%', 
                  width: 48, 
                  height: 48, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  flexShrink: 0,
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease'
                }}
              >
                <Mic size={20} color={voiceRecording ? '#fff' : MODERN_COLORS.primary} />
              </motion.button>
            </div>
          )
        }
      </form>
    </div>
  );
};
