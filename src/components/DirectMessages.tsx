import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Phone, Video, Paperclip, Send, Search, Smile, Edit3, Trash2, Pin, Reply, Check, X, Download, Brain, ChevronDown, ChevronUp, Sparkles, TrendingUp, MessageCircle, Ban, CheckCheck, Zap, Mic } from 'lucide-react';
import { db } from '../firebase';
import { ref, onValue, push, off, update, remove, get, set } from 'firebase/database';
import { setTyping, clearTyping, TypingIndicator } from './TypingIndicator';
import { checkRateLimit } from '../services/securityService';
import { playDmSound } from '../services/soundService';
import { EmojiPickerSVG } from './EmojiPickerSVG';
import { MediaEmbed, extractUrls, containsMediaUrl } from './MediaEmbed';
import { ImageViewer } from './ImageViewer';
import { isBlocked, isBlockedBy } from '../services/blockService';
import { advancedDMService } from '../services/advancedDMService';
import { aiModerationService } from '../services/aiModerationService';
import AdvancedDMPanel from './AdvancedDMPanel';

const EMOJIS = ['👍','❤️','😂','😮','😢','🔥','🎉','👀','✅','💯'];

function formatTime(ts: string) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const day = 24 * 60 * 60 * 1000;
  if (diff < day && d.getDate() === now.getDate()) return 'Bugün ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  if (diff < 2 * day) return 'Dün ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(ts1: string, ts2: string) {
  return new Date(ts1).toDateString() === new Date(ts2).toDateString();
}

function dayLabel(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 24 * 60 * 60 * 1000 && d.getDate() === now.getDate()) return 'Bugün';
  if (diff < 2 * 24 * 60 * 60 * 1000) return 'Dün';
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export const DirectMessages = ({ theme, userId, activeDmUserId: initialActiveDmUserId, currentUserName, onStartCall }: {
  theme: any, userId: string, activeDmUserId: string | null, currentUserName?: string,
  onStartCall?: (targetId: string, targetName: string, mode: 'voice' | 'video') => void
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeDmUserId, setActiveDmUserId] = useState<string | null>(initialActiveDmUserId);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [viewingImage, setViewingImage] = useState<{url: string, name: string} | null>(null);
  const [blockedStatus, setBlockedStatus] = useState<'none' | 'blocked_by_me' | 'blocked_by_them'>('none');
  const [dmSearchQuery, setDmSearchQuery] = useState('');
  const [showDmSearch, setShowDmSearch] = useState(false);
  const [showAdvancedPanel, setShowAdvancedPanel] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceRecorder, setVoiceRecorder] = useState<MediaRecorder | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const smartReplySuggestions = ['Tamam, not aldım', 'Bunu biraz daha açabilir misin?', 'İstersen kısa plan çıkarayım'];

  useEffect(() => {
    const friendsRef = ref(db, `users/${userId}/friends`);
    onValue(friendsRef, snap => {
      const d = snap.val() || {};
      setFriendIds(Object.keys(d).filter(k => d[k]));
    });
    return () => off(friendsRef);
  }, [userId]);

  useEffect(() => {
    const usersRef = ref(db, 'users');
    onValue(usersRef, snap => {
      const data = snap.val() || {};
      
      const byUsername = new Map<string, any>();
      Object.entries(data).forEach(([id, val]: any) => {
        if (id === userId || !val || typeof val !== 'object') return;
        const username = val.username || id;
        const lc = username.toLowerCase();
        if (!byUsername.has(lc)) {
          byUsername.set(lc, { id, username, val });
        } else {
          const existing = byUsername.get(lc);
          if (val.username && !existing.val.username) byUsername.set(lc, { id, username, val });
        }
      });
      const list: any[] = [];
      byUsername.forEach(({ id, username, val }) => {
        list.push({ id, username, avatar: val.avatar || val.photoURL || '', status: val.status || (val.statusObj && val.statusObj.status) || 'offline' });
      });
      setUsers(list); // full list, filtered below
    });
    const onlineRef = ref(db, 'online');
    onValue(onlineRef, snap => {
      const data = snap.val() || {};
      setOnlineIds(Object.keys(data).filter(k => data[k] === true));
    });
    return () => { off(ref(db, 'users')); off(ref(db, 'online')); };
  }, []);

  useEffect(() => {
    if (!activeDmUserId) return;
    const dmKey = [userId, activeDmUserId].sort().join('_');
    const dmRef = ref(db, `dm/${dmKey}`);
    let initialized = false;
    onValue(dmRef, snap => {
      const data = snap.val() || {};
      const msgs = Object.entries(data).map(([id, val]: any) => ({ id, ...val }))
        .sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));
      if (initialized) {
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg?.sender_id !== userId) playDmSound();
      }
      initialized = true;
      setMessages(msgs);
    });
    return () => off(ref(db, `dm/${[userId, activeDmUserId].sort().join('_')}`));
  }, [activeDmUserId]);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
  }, [messages.length]);

  const dmKey = activeDmUserId ? [userId, activeDmUserId].sort().join('_') : null;

  // Engelleme durumunu kontrol et
  useEffect(() => {
    if (!activeDmUserId) { setBlockedStatus('none'); return; }
    Promise.all([isBlocked(userId, activeDmUserId), isBlockedBy(userId, activeDmUserId)]).then(([iBlocked, theyBlocked]) => {
      if (iBlocked) setBlockedStatus('blocked_by_me');
      else if (theyBlocked) setBlockedStatus('blocked_by_them');
      else setBlockedStatus('none');
    });
  }, [activeDmUserId, userId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeDmUserId || !dmKey) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Dosya boyutu 10MB\'dan küçük olmalıdır');
      return;
    }

    try {
      // Upload to Firebase Storage
      const { ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('../firebase');
      
      const timestamp = Date.now();
      const path = `dm_files/${userId}/${timestamp}_${file.name}`;
      const sRef = storageRef(storage, path);
      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);

      // Send message with file
      await push(ref(db, `dm/${dmKey}`), {
        sender_id: userId,
        sender_name: currentUserName || userId,
        receiver_id: activeDmUserId,
        content: file.name,
        fileUrl: url,
        fileName: file.name,
        fileType: file.type,
        timestamp: new Date().toISOString(),
        type: 'file',
        reactions: {},
        is_edited: false,
        is_pinned: false,
        reply_to_id: replyTo?.id || null,
      });
      setReplyTo(null);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('File upload error:', error);
      alert('Dosya yüklenemedi. Lütfen tekrar dene.');
    }
  };

  // Yazıyor göstergesi
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleInputChange = (val: string) => {
    setInput(val);
    if (!activeDmUserId) return;
    const dmTypingKey = `dm_${[userId, activeDmUserId].sort().join('_')}`;
    if (val.trim()) {
      setTyping(dmTypingKey, userId, currentUserName || userId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => clearTyping(dmTypingKey, userId), 3000);
    } else {
      clearTyping(dmTypingKey, userId);
    }
  };

  // Mesajları okundu olarak işaretle
  useEffect(() => {
    if (!activeDmUserId || !dmKey) return;
    // Karşı tarafın okunmamış mesajlarını okundu yap
    messages.forEach(msg => {
      if (msg.sender_id !== userId && !msg.read) {
        update(ref(db, `dm/${dmKey}/${msg.id}`), { read: true }).catch(() => {});
      }
    });
  }, [messages, activeDmUserId, userId, dmKey]);

  // Generate smart replies when new message arrives from other user
  useEffect(() => {
    if (messages.length > 0 && dmKey) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.sender_id !== userId) {
        advancedDMService.generateSmartReplies(dmKey, lastMsg)
          .then(result => setSmartReplies(result.suggestions))
          .catch(() => setSmartReplies([]));
      }
    }
  }, [messages.length, userId, dmKey]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeDmUserId || !dmKey) return;
    if (blockedStatus !== 'none') return; // engelleme varsa gönderme
    if (!checkRateLimit(`dm_${userId}`, 20)) return;
    const content = input.trim();
    setInput('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    clearTyping(`dm_${[userId, activeDmUserId].sort().join('_')}`, userId);

    // AI Moderation check
    try {
      const moderation = await aiModerationService.analyzeContent(content, userId, dmKey);
      if (moderation.isViolation && moderation.confidence > 90) {
        alert(`Mesaj engellendi: ${moderation.reasoning}`);
        setInput(content);
        return;
      }
      if (moderation.isViolation && moderation.confidence > 70) {
        const proceed = confirm(`Uyarı: ${moderation.reasoning}\n\nYine de göndermek istiyor musun?`);
        if (!proceed) { setInput(content); return; }
      }
    } catch (modErr) {
      console.error('Moderation check failed, proceeding:', modErr);
    }

    // Send via advancedDMService (fire and forget)
    if (!advancedDMService.getConversation(dmKey)) {
      advancedDMService.createConversation([userId, activeDmUserId], userId, 'dm');
    }
    advancedDMService.sendMessage(dmKey, userId, content, 'text')
      .catch(e => console.error('advancedDMService.sendMessage failed:', e));

    // Sync to Firebase (primary storage)
    await push(ref(db, `dm/${dmKey}`), {
      sender_id: userId,
      sender_name: currentUserName || userId,
      receiver_id: activeDmUserId,
      content,
      timestamp: new Date().toISOString(),
      type: 'text',
      reactions: {},
      is_edited: false,
      is_pinned: false,
      reply_to_id: replyTo?.id || null,
      read: false,
    });
    setReplyTo(null);
    setSmartReplies([]);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/ogg; codecs=opus' });
        stream.getTracks().forEach(track => track.stop());
        if (!dmKey || !activeDmUserId) return;
        try {
          const { ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage');
          const { storage } = await import('../firebase');
          const path = `dm_voice/${userId}/${Date.now()}.ogg`;
          const sRef = storageRef(storage, path);
          await uploadBytes(sRef, blob);
          const url = await getDownloadURL(sRef);
          await push(ref(db, `dm/${dmKey}`), {
            sender_id: userId,
            sender_name: currentUserName || userId,
            receiver_id: activeDmUserId,
            content: '🎤 Sesli mesaj',
            fileUrl: url,
            fileName: 'voice_message.ogg',
            fileType: 'audio/ogg',
            timestamp: new Date().toISOString(),
            type: 'voice',
            reactions: {},
            is_edited: false,
            is_pinned: false,
            reply_to_id: replyTo?.id || null,
            read: false,
          });
          setReplyTo(null);
        } catch (err) {
          console.error('Voice upload failed:', err);
          alert('Ses mesajı gönderilemedi.');
        }
      };
      recorder.start();
      setVoiceRecorder(recorder);
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } catch (error) {
      console.error('Voice recording failed:', error);
      alert('Mikrofon erişimi reddedildi veya desteklenmiyor.');
    }
  };

  const stopVoiceRecording = () => {
    if (voiceRecorder) {
      voiceRecorder.stop();
      setVoiceRecorder(null);
      setIsRecordingVoice(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingSeconds(0);
    }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    if (!dmKey) return;
    const r = ref(db, `dm/${dmKey}/${msgId}/reactions/${emoji}`);
    const snap = await get(r);
    const users: string[] = snap.val() || [];
    const idx = users.indexOf(userId);
    if (idx === -1) users.push(userId);
    else users.splice(idx, 1);
    if (users.length === 0) await remove(r);
    else await update(ref(db, `dm/${dmKey}/${msgId}/reactions`), { [emoji]: users });
  };

  const handleEditSave = async (msgId: string) => {
    if (!dmKey || !editValue.trim()) return;
    const msgRef = ref(db, `dm/${dmKey}/${msgId}`);
    const snap = await get(msgRef);
    const old = snap.val();
    const history = old.edit_history || [];
    history.push(old.content);
    await update(msgRef, { content: editValue.trim(), is_edited: true, edit_history: history });
    setEditingId(null);
  };

  const handleDelete = async (msgId: string) => {
    if (!dmKey) return;
    await remove(ref(db, `dm/${dmKey}/${msgId}`));
  };

  const handlePin = async (msgId: string, isPinned: boolean) => {
    if (!dmKey) return;
    await update(ref(db, `dm/${dmKey}/${msgId}`), { is_pinned: !isPinned });
  };

  const friendUsers = users.filter(u => friendIds.includes(u.id));
  const activeUser = users.find(u => u.id === activeDmUserId);
  const isOnline = activeDmUserId ? onlineIds.includes(activeDmUserId) : false;
  const pinnedMessages = messages.filter(m => m.is_pinned);

  // Group by day — arama filtresi uygula
  const filteredMsgs = dmSearchQuery
    ? messages.filter(m => m.content?.toLowerCase().includes(dmSearchQuery.toLowerCase()))
    : messages;

  const grouped: { date: string; messages: any[] }[] = [];
  filteredMsgs.forEach((msg, i) => {
    if (i === 0 || !isSameDay(msg.timestamp, filteredMsgs[i - 1].timestamp)) {
      grouped.push({ date: msg.timestamp, messages: [msg] });
    } else {
      grouped[grouped.length - 1].messages.push(msg);
    }
  });

  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: '#0B0E11', backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)' }}>
      {/* DM Sidebar */}
      <aside className="w-72 border-r border-white/5 flex flex-col bg-black/10 backdrop-blur-xl">
        <header className="h-16 border-b border-white/5 flex items-center px-5 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
            <input type="text" placeholder={t('friends.searchFriends')} className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-11 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all" />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {friendUsers.map(user => (
            <motion.button 
              key={user.id} 
              onClick={() => setActiveDmUserId(user.id)}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all relative overflow-hidden ${
                activeDmUserId === user.id 
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30 shadow-lg shadow-blue-500/10' 
                  : 'text-white/50 hover:bg-white/5 hover:text-white border border-transparent'
              }`}
            >
              {activeDmUserId === user.id && (
                <motion.div 
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-r-full"
                />
              )}
              <div className="relative">
                <div
                  className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/30 to-indigo-500/30 flex items-center justify-center text-blue-400 font-bold border border-blue-500/30 overflow-hidden backdrop-blur-sm cursor-pointer hover:ring-2 hover:ring-blue-400/50 transition-all"
                  onClick={e => { e.stopPropagation(); navigate(`/profile/${user.id}`); }}
                  title={`${user.username} profilini gör`}
                >
                  {user.avatar ? <img src={user.avatar} className="w-full h-full object-cover" alt="" /> : user.username.substring(0, 2).toUpperCase()}
                </div>
                <motion.div 
                  animate={{ scale: onlineIds.includes(user.id) ? [1, 1.2, 1] : 1 }}
                  transition={{ repeat: onlineIds.includes(user.id) ? Infinity : 0, duration: 2 }}
                  className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#0D1117] ${onlineIds.includes(user.id) ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-white/20'}`} 
                />
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-sm font-bold truncate">{user.username}</p>
                <p className="text-[11px] opacity-50 truncate flex items-center gap-1">
                  {onlineIds.includes(user.id) ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Çevrimiçi
                    </>
                  ) : 'Çevrimdışı'}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </aside>

      {/* Chat */}
      <div className="flex-1 flex flex-col relative">
        {!activeDmUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-32 h-32 rounded-[48px] bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-8 border border-white/10 backdrop-blur-xl shadow-2xl"
            >
              <MessageSquare size={56} className="text-white/20" />
            </motion.div>
            <motion.h3 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-bold text-white mb-3"
            >
              {t('dm.startConversation')}
            </motion.h3>
            <motion.p 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-white/50 max-w-sm leading-relaxed"
            >
              {t('dm.noMessages')}
            </motion.p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <header className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 backdrop-blur-xl">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/30 to-indigo-500/30 flex items-center justify-center text-blue-400 font-bold border border-blue-500/30 overflow-hidden backdrop-blur-sm shadow-lg"
                  >
                    {activeUser?.avatar ? <img src={activeUser.avatar} className="w-full h-full object-cover" alt="" /> : activeUser?.username?.substring(0, 2).toUpperCase() || '??'}
                  </motion.div>
                  <motion.div 
                    animate={{ scale: onlineIds.includes(activeDmUserId) ? [1, 1.2, 1] : 1 }}
                    transition={{ repeat: onlineIds.includes(activeDmUserId) ? Infinity : 0, duration: 2 }}
                    className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-[#0D1117] ${onlineIds.includes(activeDmUserId) ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-white/20'}`} 
                  />
                </div>
                <div>
                  <p className="text-base font-bold text-white">{activeUser?.username || 'Kullanıcı'}</p>
                  <p className="text-xs text-white/50 flex items-center gap-1.5">
                    {onlineIds.includes(activeDmUserId) ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Çevrimiçi
                      </>
                    ) : 'Çevrimdışı'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onStartCall?.(activeDmUserId!, activeUser?.username || activeDmUserId!, 'voice')} 
                  className="p-3 text-white/50 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-2xl transition-all border border-transparent hover:border-emerald-500/30"
                  title="Sesli Arama"
                >
                  <Phone size={20} />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onStartCall?.(activeDmUserId!, activeUser?.username || activeDmUserId!, 'video')} 
                  className="p-3 text-white/50 hover:text-blue-400 hover:bg-blue-500/10 rounded-2xl transition-all border border-transparent hover:border-blue-500/30"
                  title="Görüntülü Arama"
                >
                  <Video size={20} />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setShowDmSearch(p => !p); setDmSearchQuery(''); }}
                  className={`p-3 rounded-2xl transition-all ${showDmSearch ? 'text-blue-400 bg-blue-500/10 border border-blue-500/30' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                  title="Mesajlarda Ara"
                >
                  <Search size={20} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAdvancedPanel(p => !p)}
                  className={`p-3 rounded-2xl transition-all ${showAdvancedPanel ? 'text-purple-400 bg-purple-500/10 border border-purple-500/30' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                  title="Gelişmiş Özellikler"
                >
                  <Zap size={20} />
                </motion.button>
              </div>
            </header>

            {/* Advanced DM Panel - Absolute positioned overlay */}
            {showAdvancedPanel && dmKey && (
              <div className="absolute right-0 top-16 w-72 z-50" style={{ height: 'calc(100% - 4rem)' }}>
                <AdvancedDMPanel
                  conversationId={dmKey}
                  userId={userId}
                  onFeatureUse={(feature) => {
                    setShowAdvancedPanel(false);
                    if (feature === 'voice') {
                      if (!isRecordingVoice) startVoiceRecording();
                    } else if (feature === 'smart-reply') {
                      const lastMsg = messages[messages.length - 1];
                      if (lastMsg) {
                        advancedDMService.generateSmartReplies(dmKey, lastMsg)
                          .then(result => setSmartReplies(result.suggestions))
                          .catch(() => {});
                      }
                    }
                  }}
                  onClose={() => setShowAdvancedPanel(false)}
                />
              </div>
            )}

            {/* DM Arama Barı */}
            <AnimatePresence>
              {showDmSearch && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-white/5 bg-black/20 px-5 py-3 overflow-hidden"
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
                    <input
                      autoFocus
                      value={dmSearchQuery}
                      onChange={e => setDmSearchQuery(e.target.value)}
                      placeholder="Mesajlarda ara..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                    {dmSearchQuery && (
                      <button onClick={() => setDmSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  {dmSearchQuery && (
                    <p className="text-xs text-white/30 mt-1.5">
                      {messages.filter(m => m.content?.toLowerCase().includes(dmSearchQuery.toLowerCase())).length} sonuç
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* AI Panel - Collapsible */}
            <div className="border-b border-white/5 bg-gradient-to-r from-purple-500/5 to-blue-500/5 backdrop-blur-xl">
              <div className="flex items-center justify-between px-5 py-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowAiPanel(!showAiPanel)}
                  className="flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 px-4 py-2 rounded-2xl hover:from-purple-500/30 hover:to-blue-500/30 transition-all shadow-lg shadow-purple-500/10"
                >
                  <Brain size={14} className="text-purple-400" />
                  <span className="text-xs font-bold text-purple-300">AI Asistan</span>
                  <motion.div
                    animate={{ rotate: showAiPanel ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown size={12} className="text-purple-400" />
                  </motion.div>
                </motion.button>
                <div className="flex items-center gap-2 text-[10px] text-white/40">
                  <Sparkles size={10} className="text-purple-400" />
                  <span>Akıllı özellikler</span>
                </div>
              </div>
              
              <AnimatePresence>
                {showAiPanel && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 py-4 space-y-3">
                      {/* AI Asistan */}
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl p-4 backdrop-blur-sm"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Brain size={14} className="text-purple-400" />
                          <span className="text-sm font-bold text-purple-300">AI Asistan</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setInput('Bu konuyu daha detaylı anlatabilir misin?')}
                            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/70 hover:bg-white/10 hover:text-white hover:border-purple-500/30 transition-all"
                          >
                            Detay iste
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setInput('Özetleyebilir misin?')}
                            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/70 hover:bg-white/10 hover:text-white hover:border-purple-500/30 transition-all"
                          >
                            Özetle
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setInput('Fikirlerim var, paylaşır mısın?')}
                            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/70 hover:bg-white/10 hover:text-white hover:border-purple-500/30 transition-all"
                          >
                            Fikir paylaş
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setInput('Bu konuda ne düşünüyorsun?')}
                            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/70 hover:bg-white/10 hover:text-white hover:border-purple-500/30 transition-all"
                          >
                            Görüşünü al
                          </motion.button>
                        </div>
                      </motion.div>

                      {/* Akıllı Öneriler */}
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-4 backdrop-blur-sm"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles size={14} className="text-blue-400" />
                          <span className="text-sm font-bold text-blue-300">Akıllı Öneriler</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {['Tamam!', 'Harika!', 'Anladım 👍', 'Kesinlikle!'].map((text, i) => (
                            <motion.button
                              key={i}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setInput(text)}
                              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white/70 hover:bg-white/10 hover:text-white hover:border-blue-500/30 transition-all"
                            >
                              {text}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>

                      {/* Konuşma Analizi */}
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-4 backdrop-blur-sm"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp size={14} className="text-green-400" />
                          <span className="text-sm font-bold text-green-300">Konuşma Analizi</span>
                        </div>
                        <div className="text-xs text-white/70 space-y-2">
                          <div className="flex justify-between items-center">
                            <span>Mesaj sayısı:</span>
                            <span className="text-white font-bold">{messages.length}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Etkileşim:</span>
                            <span className="text-green-400 font-bold">Yüksek</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span>Mood:</span>
                            <span className="text-yellow-400 font-bold">😊 Pozitif</span>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Pin bar */}
            <AnimatePresence>
              {pinnedMessages.length > 0 && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }} 
                  animate={{ height: 'auto', opacity: 1 }} 
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-yellow-500/20 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 px-6 py-3 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3 text-sm text-yellow-400/90">
                    <Pin size={14} className="shrink-0" />
                    <span className="font-bold">Sabitlenmiş:</span>
                    <span className="truncate text-white/70">{pinnedMessages[pinnedMessages.length - 1]?.content}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-1 custom-scrollbar">
              {grouped.map(group => (
                <div key={group.date}>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-white/5" />
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2">{dayLabel(group.date)}</span>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>

                  {group.messages.map(msg => {
                    const isOwn = msg.sender_id === userId;
                    const isEditing = editingId === msg.id;
                    const reactionEntries = Object.entries(msg.reactions || {}) as [string, string[]][];

                    return (
                      <div key={msg.id}
                        className={`flex gap-3 group mb-2 relative ${isOwn ? 'flex-row-reverse' : ''}`}
                        onMouseEnter={() => setHoveredMsg(msg.id)}
                        onMouseLeave={() => { setHoveredMsg(null); setEmojiPickerFor(null); }}>

                        <div className="w-9 h-9 rounded-xl shrink-0 overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-white/40">
                          {msg.sender_id === userId
                            ? (currentUserName || 'Sen').substring(0, 2).toUpperCase()
                            : (activeUser?.avatar ? <img src={activeUser.avatar} className="w-full h-full object-cover" alt="" /> : activeUser?.username?.substring(0, 2).toUpperCase() || '??')}
                        </div>

                        <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : ''}`}>
                          <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                            <span className="text-xs font-bold text-white/60">{msg.sender_name || msg.sender_id}</span>
                            <span className="text-[10px] text-white/20">{formatTime(msg.timestamp)}</span>
                            {msg.is_edited && <span className="text-[9px] text-white/20 italic">(düzenlendi)</span>}
                            {msg.is_pinned && <Pin size={10} className="text-yellow-400" />}
                          </div>

                          {msg.reply_to_id && (
                            <div className={`text-[11px] text-white/30 border-l-2 border-white/20 pl-2 mb-1 italic ${isOwn ? 'text-right border-l-0 border-r-2 pr-2' : ''}`}>
                              Yanıtlandı
                            </div>
                          )}

                          {isEditing ? (
                            <div className="flex gap-2 items-center">
                              <input value={editValue} onChange={e => setEditValue(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleEditSave(msg.id); if (e.key === 'Escape') setEditingId(null); }}
                                className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 min-w-48" autoFocus />
                              <button onClick={() => handleEditSave(msg.id)} className="p-1.5 bg-blue-500 rounded-lg text-white"><Check size={14} /></button>
                              <button onClick={() => setEditingId(null)} className="p-1.5 bg-white/10 rounded-lg text-white/60"><X size={14} /></button>
                            </div>
                          ) : (
                            <motion.div 
                              initial={{ scale: 0.9, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className={`rounded-3xl text-sm leading-relaxed shadow-lg overflow-hidden ${
                                isOwn 
                                  ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-md' 
                                  : 'bg-white/5 text-white/90 border border-white/10 rounded-tl-md backdrop-blur-sm'
                              }`}
                            >
                              {msg.fileUrl && msg.fileType?.startsWith('image/') ? (
                                <div className="relative">
                                  <img 
                                    src={msg.fileUrl} 
                                    alt={msg.fileName || 'Image'} 
                                    className="max-w-xs max-h-96 rounded-2xl cursor-pointer hover:opacity-90 transition-opacity" 
                                    onClick={() => setViewingImage({url: msg.fileUrl, name: msg.fileName || 'image.jpg'})} 
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const a = document.createElement('a');
                                      a.href = msg.fileUrl;
                                      a.download = msg.fileName || 'image.jpg';
                                      a.click();
                                    }}
                                    className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-lg transition-colors backdrop-blur-sm"
                                  >
                                    <Download size={16} className="text-white" />
                                  </button>
                                  {msg.content && msg.content !== msg.fileName && (
                                    <div className="px-5 py-3">{msg.content}</div>
                                  )}
                                </div>
                              ) : msg.fileUrl && (msg.fileType?.startsWith('audio/') || msg.type === 'voice') ? (
                                <div className="flex items-center gap-3 px-4 py-3">
                                  <Mic size={16} className="text-emerald-400 shrink-0" />
                                  <audio src={msg.fileUrl} controls className="max-w-[220px] h-8" style={{ filter: 'invert(0.8)' }} />
                                </div>
                              ) : msg.fileUrl && msg.fileType?.startsWith('video/') ? (
                                <div className="relative">
                                  <video 
                                    src={msg.fileUrl} 
                                    controls 
                                    className="max-w-xs max-h-96 rounded-2xl"
                                  />
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const a = document.createElement('a');
                                      a.href = msg.fileUrl;
                                      a.download = msg.fileName || 'video.mp4';
                                      a.click();
                                    }}
                                    className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-lg transition-colors backdrop-blur-sm"
                                  >
                                    <Download size={16} className="text-white" />
                                  </button>
                                  {msg.content && msg.content !== msg.fileName && (
                                    <div className="px-5 py-3">{msg.content}</div>
                                  )}
                                </div>
                              ) : msg.fileUrl ? (
                                <div className="flex items-center gap-3 px-5 py-3">
                                  <div className="flex-1">
                                    <div className="font-medium">{msg.fileName || 'Dosya'}</div>
                                    {msg.fileType && (
                                      <div className="text-xs opacity-60">{msg.fileType}</div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => {
                                      const a = document.createElement('a');
                                      a.href = msg.fileUrl;
                                      a.download = msg.fileName || 'file';
                                      a.click();
                                    }}
                                    className="p-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors"
                                  >
                                    <Download size={16} className="text-white" />
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <div className="px-5 py-3">
                                    {dmSearchQuery && msg.content?.toLowerCase().includes(dmSearchQuery.toLowerCase()) ? (
                                      (() => {
                                        const idx = msg.content.toLowerCase().indexOf(dmSearchQuery.toLowerCase());
                                        return <>
                                          {msg.content.slice(0, idx)}
                                          <mark className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">{msg.content.slice(idx, idx + dmSearchQuery.length)}</mark>
                                          {msg.content.slice(idx + dmSearchQuery.length)}
                                        </>;
                                      })()
                                    ) : msg.content}
                                  </div>
                                  {/* Check for media URLs in content */}
                                  {(() => {
                                    const urls = extractUrls(msg.content || '');
                                    const mediaUrl = urls.find(url => containsMediaUrl(url));
                                    return mediaUrl ? (
                                      <div className="px-3 pb-3">
                                        <MediaEmbed url={mediaUrl} className="max-w-md" />
                                      </div>
                                    ) : null;
                                  })()}
                                </div>
                              )}
                            </motion.div>
                          )}

                          {reactionEntries.length > 0 && (
                            <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
                              {reactionEntries.map(([emoji, users]) => (
                                <button key={emoji} onClick={() => handleReact(msg.id, emoji)}
                                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${users.includes(userId) ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30'}`}>
                                  {emoji} <span>{users.length}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          {/* Okundu bilgisi */}
                          {isOwn && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {msg.read
                                ? <CheckCheck size={12} className="text-blue-400" title="Görüldü" />
                                : <Check size={12} className="text-white/20" title="Gönderildi" />}
                            </div>
                          )}
                        </div>

                        {/* Action toolbar */}
                        <AnimatePresence>
                          {hoveredMsg === msg.id && !isEditing && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                              className={`absolute top-0 flex items-center gap-1 bg-[#1a1d21] border border-white/10 rounded-xl p-1 shadow-lg z-10 ${isOwn ? 'right-12' : 'left-12'}`}>
                              <div className="relative">
                                <button onClick={() => setEmojiPickerFor(emojiPickerFor === msg.id ? null : msg.id)}
                                  className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"><Smile size={14} /></button>
                                <AnimatePresence>
                                  {emojiPickerFor === msg.id && (
                                    <>
                                      <div className="fixed inset-0 z-10" onClick={() => setEmojiPickerFor(null)} />
                                      <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                                        className="absolute bottom-8 left-0 flex gap-1 bg-[#1a1d21] border border-white/10 rounded-xl p-2 shadow-xl z-20">
                                        {EMOJIS.map(emoji => (
                                          <button key={emoji} onClick={() => { handleReact(msg.id, emoji); setEmojiPickerFor(null); }}
                                            className="text-lg hover:scale-125 transition-transform">{emoji}</button>
                                        ))}
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                              <button onClick={() => setReplyTo(msg)} className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"><Reply size={14} /></button>
                              <button onClick={() => handlePin(msg.id, msg.is_pinned)} className="p-1.5 text-white/40 hover:text-yellow-400 hover:bg-white/10 rounded-lg transition-all"><Pin size={14} /></button>
                              {isOwn && <>
                                <button onClick={() => { setEditingId(msg.id); setEditValue(msg.content); }}
                                  className="p-1.5 text-white/40 hover:text-blue-400 hover:bg-white/10 rounded-lg transition-all"><Edit3 size={14} /></button>
                                <button onClick={() => handleDelete(msg.id)}
                                  className="p-1.5 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all"><Trash2 size={14} /></button>
                              </>}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Yazıyor göstergesi */}
            {activeDmUserId && (
              <TypingIndicator
                channelId={`dm_${[userId, activeDmUserId].sort().join('_')}`}
                userId={userId}
                displayName={currentUserName || userId}
              />
            )}

            {/* Reply bar */}
            <AnimatePresence>
              {replyTo && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                  className="mx-6 px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Reply size={14} className="text-blue-400" />
                    <span className="text-xs text-white/40">{replyTo.sender_name}'e yanıt:</span>
                    <span className="text-xs text-white/60 truncate max-w-48">{replyTo.content}</span>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="text-white/30 hover:text-white"><X size={14} /></button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <form onSubmit={handleSend} className="p-6 pt-4 bg-gradient-to-r from-black/20 via-black/10 to-black/20 border-t border-white/5 backdrop-blur-xl">
              {/* Voice Recording Banner */}
              <AnimatePresence>
                {isRecordingVoice && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.2 }}
                    className="mb-3 px-4 py-3 bg-red-500/15 border border-red-500/30 rounded-2xl flex items-center gap-3"
                  >
                    {/* Pulsing dot */}
                    <motion.div
                      animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"
                    />
                    {/* Waveform bars */}
                    <div className="flex items-center gap-0.5">
                      {[0.4, 0.7, 1, 0.6, 0.9, 0.5, 0.8].map((h, i) => (
                        <motion.div
                          key={i}
                          animate={{ scaleY: [h, h * 0.3, h] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.08, ease: 'easeInOut' }}
                          className="w-1 bg-red-400 rounded-full origin-center"
                          style={{ height: 20 }}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-red-400 flex-1">Ses kaydediliyor...</span>
                    <span className="text-sm font-mono text-red-300/80">
                      {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}
                    </span>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={stopVoiceRecording}
                      className="ml-1 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Gönder
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Smart Reply Suggestions */}
              {blockedStatus !== 'none' && (
                <div className="mb-3 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-400">
                  <Ban size={14} />
                  {blockedStatus === 'blocked_by_me'
                    ? 'Bu kullanıcıyı engellediniz. Mesaj gönderemezsiniz.'
                    : 'Bu kullanıcı sizi engelledi. Mesaj gönderemezsiniz.'}
                </div>
              )}
              <div className="relative flex items-center gap-3">
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
                <motion.button 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  className="p-3 text-white/30 hover:text-white hover:bg-white/10 rounded-2xl transition-all border border-transparent hover:border-white/20"
                >
                  <Paperclip size={22} />
                </motion.button>
                <div className="flex-1 relative">
                  <input 
                    value={input} 
                    onChange={e => handleInputChange(e.target.value)}
                    placeholder={`${activeUser?.username || 'Arkadaşına'} mesaj gönder...`}
                    className="w-full bg-white/5 border border-white/10 rounded-3xl px-6 py-4 pr-14 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all backdrop-blur-sm shadow-lg" 
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                    >
                      <Smile size={20} />
                    </motion.button>
                    <AnimatePresence>
                      {showEmojiPicker && (
                        <EmojiPickerSVG
                          onSelect={(emoji) => setInput(prev => prev + emoji)}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <motion.button 
                  whileHover={{ scale: input.trim() ? 1.05 : 1 }}
                  whileTap={{ scale: input.trim() ? 0.95 : 1 }}
                  type="submit" 
                  disabled={!input.trim()}
                  className={`p-4 rounded-3xl transition-all ${
                    input.trim() 
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50' 
                      : 'bg-white/5 text-white/20 cursor-not-allowed'
                  }`}
                >
                  <Send size={22} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
                  className={`p-4 rounded-3xl transition-all ${
                    isRecordingVoice
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-white/5 text-white/40 hover:text-white hover:bg-white/10'
                  }`}
                  title={isRecordingVoice ? 'Kaydı Durdur' : 'Sesli Mesaj'}
                >
                  <Mic size={22} />
                </motion.button>
              </div>
            </form>
          </>
        )}
      </div>

      {/* Image Viewer Modal */}
      <ImageViewer
        imageUrl={viewingImage?.url || ''}
        fileName={viewingImage?.name}
        isOpen={!!viewingImage}
        onClose={() => setViewingImage(null)}
      />
    </div>
  );
};