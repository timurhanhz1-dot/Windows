import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Hash, Search, Volume2, VolumeX, Bell, Users, BarChart2,
  Send, Paperclip, Smile, Mic, Camera, MoreVertical, Edit3,
  Trash2, Pin, Reply, Check, X, Download, Image as ImageIcon, BarChart2 as PollIcon, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { checkRateLimit, sanitizeText } from '../services/securityService';
import { LinkPreview } from './LinkPreview';
import { NatureBotMascot } from './NatureBotMascot';
import { UserProfileCard } from './UserProfileCard';
import ChannelAiSummaryCard from "./ChannelAiSummaryCard";
import NatureBotAssistantPanel from "./NatureBotAssistantPanel";
import { EmojiPicker } from './EmojiPicker';
import { TypingIndicator, setTyping, clearTyping } from './TypingIndicator';
import { ThreadView } from './ThreadView';
import { PollCreator } from './PollSystem';
import { MiniProfileCard } from './MiniProfileCard';

const EMOJIS = ['👍','❤️','😂','😮','😢','🔥','🎉','👀','✅','💯'];

const MENTION_COLOR = '#10b981';

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

function renderContent(content: string, allUsers: any[], userId: string) {
  if (!content) return null;
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const name = part.slice(1);
      const found = allUsers.find(u => u.username.toLowerCase() === name.toLowerCase());
      return (
        <span key={i} style={{ color: MENTION_COLOR, fontWeight: 700, background: `${MENTION_COLOR}22`, borderRadius: 4, padding: '0 4px' }}>
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

interface ChatAreaProps {
  theme: any;
  activeChannel: string;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isMuted: boolean;
  setIsMuted: (m: boolean) => void;
  polls: any[];
  votePoll: (id: string, idx: number) => void;
  filteredMessages: any[];
  userId: string;
  currentUser: any;
  input: string;
  setInput: (i: string) => void;
  handleSendMessage: (e: React.FormEvent) => void;
  isLoading: boolean;
  chatEndRef: React.RefObject<HTMLDivElement>;
  onImageUpload: () => void;
  onVoiceRecord: () => void;
  onFileUpload: (file: File) => void;
  allUsers: any[];
  onReact: (msgId: string, emoji: string) => void;
  onPin: (msgId: string, pinned: boolean) => void;
  onEdit: (msgId: string, content: string) => void;
  onDelete: (msgId: string) => void;
  onStartDM?: (targetId: string) => void;
  onCreatePoll?: (question: string, options: string[]) => void;
  onClosePoll?: (pollId: string) => void;
  onDeletePoll?: (pollId: string) => void;
  isCompact?: boolean;
  fontSize?: number;
  aiHistory?: { role: 'user' | 'assistant'; content: string; created_at: number }[];
  onQuickPrompt?: (prompt: string) => void;
  onClearAiHistory?: () => void;
  quickPrompts?: string[];
  isChannelLocked?: boolean;
  isAdmin?: boolean;
}

export const ChatArea = ({
  theme, activeChannel, searchQuery, setSearchQuery, isMuted, setIsMuted,
  polls, votePoll, filteredMessages, userId, currentUser, input, setInput,
  handleSendMessage, isLoading, chatEndRef, onFileUpload,
  allUsers, onReact, onPin, onEdit, onDelete, onStartDM,
  onCreatePoll, isCompact = false, fontSize = 14,
  aiHistory = [], onQuickPrompt, onClearAiHistory, quickPrompts = [],
  onClosePoll, onDeletePoll,
  isChannelLocked = false, isAdmin = false
}: ChatAreaProps) => {
  const displayName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [profileCardId, setProfileCardId] = useState<string | null>(null);
  const [miniCardId, setMiniCardId] = useState<string | null>(null);
  const miniCardTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [emojiPickerFor, setEmojiPickerFor] = useState<string | null>(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [replyTo, setReplyTo] = useState<any | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<any[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [showEmojiInput, setShowEmojiInput] = useState(false);
  const [threadView, setThreadView] = useState<{ id: string; content: string; userName: string; timestamp: string } | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pinned messages
  const pinnedMessages = filteredMessages.filter(m => m.is_pinned);

  // Mention autocomplete + typing indicator
  useEffect(() => {
    const match = input.match(/@(\w*)$/);
    if (match) {
      const query = match[1].toLowerCase();
      const suggestions = allUsers.filter(u => u.username.toLowerCase().startsWith(query) && u.id !== userId).slice(0, 5);
      setMentionSuggestions(suggestions);
      setShowMentions(suggestions.length > 0);
    } else {
      setShowMentions(false);
    }
  }, [input, allUsers]);

  useEffect(() => {
    if (input.trim()) {
      setTyping(activeChannel, userId, displayName);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => clearTyping(activeChannel, userId), 3000);
    } else {
      clearTyping(activeChannel, userId);
    }
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [input, activeChannel, userId, displayName]);

  const handleMentionSelect = (username: string) => {
    const newInput = input.replace(/@\w*$/, `@${username} `);
    setInput(newInput);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const handleEditSave = (msgId: string) => {
    if (editValue.trim()) onEdit(msgId, editValue.trim());
    setEditingId(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileUpload(file);
    e.target.value = '';
  };

  // Group messages by day
  const grouped: { date: string; messages: any[] }[] = [];
  filteredMessages.forEach((msg, i) => {
    if (i === 0 || !isSameDay(msg.timestamp, filteredMessages[i - 1].timestamp)) {
      grouped.push({ date: msg.timestamp, messages: [msg] });
    } else {
      grouped[grouped.length - 1].messages.push(msg);
    }
  });

  return (
    <div className="flex flex-col h-full" style={{ background: '#0B0E11', backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)' }}>
      {/* Header - Modern */}
      <header className={`relative z-50 h-16 border-b border-white/5 flex items-center px-6 justify-between ${theme.glass ? 'backdrop-blur-xl' : ''}`}
        style={{ backgroundColor: theme.channelSidebar }}>
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20"
          >
            <Hash size={20} className="text-white" />
          </motion.div>
          <div className="flex flex-col">
            <h3 className="font-black text-white text-lg tracking-tight">{activeChannel}</h3>
            {pinnedMessages.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1.5 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full w-fit"
              >
                <Pin size={10} className="text-yellow-400" />
                <span className="text-[10px] font-bold text-yellow-400">{pinnedMessages.length} sabitlenmiş</span>
              </motion.div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-white/40">
          <div className="flex items-center gap-3">
            {activeChannel !== 'NatureBot' && (
              <ChannelAiSummaryCard messages={filteredMessages || []} />
            )}
            {activeChannel === 'NatureBot' && (
              <NatureBotAssistantPanel
                onPick={(prompt) => {
                  setInput(prompt);
                  onQuickPrompt?.(prompt);
                  requestAnimationFrame(() => inputRef.current?.focus());
                }}
                onClear={onClearAiHistory}
              />
            )}
            <div className="relative group">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Mesajlarda ara..."
                className="bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 w-48 transition-all"
              />
            </div>
          </div>
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMuted(!isMuted)} 
            className="p-2 rounded-xl hover:bg-white/5 hover:text-white transition-all"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </motion.button>
        </div>
      </header>

      {/* Pinned bar */}
      <AnimatePresence>
        {pinnedMessages.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-b border-yellow-500/20 bg-yellow-500/5 px-6 py-2">
            <div className="flex items-center gap-2 text-xs text-yellow-400/80">
              <Pin size={12} />
              <span className="font-bold">Sabitlenmiş:</span>
              <span className="truncate text-white/60">{pinnedMessages[pinnedMessages.length - 1]?.content}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-4 custom-scrollbar space-y-1 scroll-touch"
        style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Polls */}
        {polls.map(poll => (
          <div key={poll.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl mb-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <BarChart2 size={16} className="text-emerald-400" />
                <span className="font-bold text-sm text-white">{poll.question}</span>
                {poll.closed && <span className="text-xs bg-white/10 text-white/40 px-2 py-0.5 rounded-full">Sonlandı</span>}
              </div>
              {poll.creator_id === userId && (
                <div className="flex items-center gap-1">
                  {!poll.closed && (
                    <button onClick={() => onClosePoll?.(poll.id)}
                      className="text-xs px-2 py-1 rounded-lg bg-white/5 text-white/40 hover:bg-amber-500/20 hover:text-amber-400 transition-all"
                      title="Anketi sonlandır">
                      Sonlandır
                    </button>
                  )}
                  <button onClick={() => onDeletePoll?.(poll.id)}
                    className="p-1.5 rounded-lg text-white/30 hover:bg-red-500/20 hover:text-red-400 transition-all"
                    title="Anketi sil">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {(poll.options || []).map((opt: string, idx: number) => {
                const votes = poll.votes || {};
                const count = Object.values(votes).filter((v: any) => v === idx).length;
                const total = Object.keys(votes).length || 1;
                const pct = Math.round((count / total) * 100);
                const myVote = votes[userId];
                return (
                  <button key={idx} onClick={() => !poll.closed && votePoll(poll.id, idx)}
                    disabled={poll.closed}
                    className={`w-full relative p-2.5 rounded-xl border text-left overflow-hidden transition-all ${poll.closed ? 'cursor-default opacity-80' : ''} ${myVote === idx ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                    <div className="absolute inset-y-0 left-0 bg-emerald-500/10 transition-all" style={{ width: `${pct}%` }} />
                    <div className="relative flex justify-between">
                      <span className="text-sm text-white/80">{opt}</span>
                      <span className="text-xs text-white/30">{pct}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* NatureBot boş ekran */}
        {activeChannel === 'NatureBot' && filteredMessages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col items-center justify-center h-full gap-6 py-16 select-none"
          >
            <NatureBotMascot size={180} isFloating={true} />
            <div className="text-center space-y-2 max-w-sm">
              <motion.h2
                className="text-2xl font-black text-white tracking-tight"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Merhaba, Ben NatureBot 🌿
              </motion.h2>
              <p className="text-white/40 text-sm leading-relaxed">
                Doğanın bilgeliği ve teknolojinin gücüyle sana yardım etmek için buradayım.
                Sormak istediğin her şeyi sorabilirsin, Tohum.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {(quickPrompts.length ? quickPrompts : ['Bana bir şey anlat 🌱', 'Doğa hakkında soru sor 🍃', 'Yardımcı ol 🤖']).map(s => (
                  <motion.button
                    key={s}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    onClick={() => {
                      setInput(s);
                      onQuickPrompt?.(s);
                      requestAnimationFrame(() => inputRef.current?.focus());
                    }}
                    className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400 font-medium"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Date-grouped messages */}
        {grouped.map(group => (
          <div key={group.date}>
            {/* Day divider */}
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

                  {/* Avatar - Modern */}
                  <div className="relative">
                    <motion.div 
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.95 }}
                      className="w-10 h-10 rounded-xl shrink-0 overflow-hidden bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border-2 border-white/10 flex items-center justify-center text-xs font-black text-white cursor-pointer hover:border-emerald-500/50 transition-all shadow-lg"
                      onClick={() => { setMiniCardId(null); setProfileCardId(msg.sender_id); }}
                      onMouseEnter={() => { if (miniCardTimer.current) clearTimeout(miniCardTimer.current); setMiniCardId(msg.sender_id); }}
                      onMouseLeave={() => { miniCardTimer.current = setTimeout(() => setMiniCardId(null), 300); }}
                    >
                      {msg.sender_avatar ? <img src={msg.sender_avatar} className="w-full h-full object-cover" alt="" /> : (msg.sender_name || msg.sender_id || '??').substring(0, 2).toUpperCase()}
                    </motion.div>
                    {/* Mini biyografi kartı */}
                    <AnimatePresence>
                      {miniCardId === msg.sender_id && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className={`absolute z-50 w-56 bg-[#1a1d21] border border-white/10 rounded-2xl shadow-2xl p-3 ${isOwn ? 'right-12 top-0' : 'left-12 top-0'}`}
                          onMouseEnter={() => { if (miniCardTimer.current) clearTimeout(miniCardTimer.current); }}
                          onMouseLeave={() => { miniCardTimer.current = setTimeout(() => setMiniCardId(null), 200); }}
                        >
                          <MiniProfileCard senderId={msg.sender_id} senderName={msg.sender_name} senderAvatar={msg.sender_avatar} allUsers={allUsers} isOwn={isOwn} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : ''}`}>
                    {/* Name + time */}
                    <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <span className="text-xs font-bold text-white/60 cursor-pointer hover:text-white transition-all"
                        onClick={() => { const u = allUsers.find(u => u.username === (msg.sender_name || msg.sender_id)); if (u) navigate(`/profile/${u.id}`); }}>
                        {msg.sender_name || msg.sender_id}
                      </span>
                      <span className="text-[10px] text-white/20">{formatTime(msg.timestamp)}</span>
                      {msg.is_edited && <span className="text-[9px] text-white/20 italic">(düzenlendi)</span>}
                      {msg.is_pinned && <Pin size={10} className="text-yellow-400" />}
                    </div>

                    {/* Reply preview */}
                    {msg.reply_to_id && (
                      <div className={`text-[11px] text-white/30 border-l-2 border-white/20 pl-2 mb-1 italic truncate max-w-xs ${isOwn ? 'text-right border-l-0 border-r-2 pr-2' : ''}`}>
                        Yanıtlandı
                      </div>
                    )}

                    {/* Message bubble - Modern */}
                    {isEditing ? (
                      <div className="flex gap-2 items-center">
                        <input value={editValue} onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleEditSave(msg.id); if (e.key === 'Escape') setEditingId(null); }}
                          className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 min-w-48"
                          autoFocus />
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => handleEditSave(msg.id)} className="p-2 bg-emerald-500 rounded-xl text-white shadow-lg shadow-emerald-500/30"><Check size={14} /></motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => setEditingId(null)} className="p-2 bg-white/10 rounded-xl text-white/60"><X size={14} /></motion.button>
                      </div>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg ${isOwn ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-tr-md' : 'bg-white/5 text-white/90 border border-white/10 rounded-tl-md backdrop-blur-sm'}`}
                      >
                        {msg.type === 'image' && msg.file_url ? (
                          <motion.img whileHover={{ scale: 1.02 }} src={msg.file_url} alt={msg.file_name} className="max-w-xs rounded-xl cursor-pointer shadow-xl" onClick={() => window.open(msg.file_url, '_blank')} />
                        ) : msg.type === 'file' && msg.file_url ? (
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-300 hover:text-blue-200">
                            <Download size={14} />{msg.file_name || 'Dosya'}
                          </a>
                        ) : (
                          <span>{renderContent(msg.content, allUsers, userId)}</span>
                        )}
                      </motion.div>
                    )}

                    {/* Link Preview */}
                    {msg.type === 'text' && msg.content && <LinkPreview content={msg.content} />}

                    {/* Reactions - Modern */}
                    {reactionEntries.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`flex flex-wrap gap-1.5 mt-2 ${isOwn ? 'justify-end' : ''}`}
                      >
                        {reactionEntries.map(([emoji, users]) => (
                          <motion.button 
                            key={emoji} 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onReact(msg.id, emoji)}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all shadow-sm ${users.includes(userId) ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-emerald-500/20' : 'bg-white/5 border-white/10 text-white/60 hover:border-white/30 hover:bg-white/10'}`}
                          >
                            <span className="text-sm">{emoji}</span>
                            <span className="font-bold">{users.length}</span>
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </div>

                  {/* Action toolbar - Modern */}
                  <AnimatePresence>
                    {hoveredMsg === msg.id && !isEditing && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: -5 }} 
                        animate={{ opacity: 1, scale: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.9, y: -5 }}
                        className={`absolute -top-3 flex items-center gap-0.5 bg-gradient-to-r from-[#1a1d21] to-[#1f2227] border border-white/10 rounded-xl p-1 shadow-2xl z-10 ${isOwn ? 'right-12' : 'left-12'}`}
                      >
                        {/* Emoji */}
                        <div className="relative">
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setEmojiPickerFor(emojiPickerFor === msg.id ? null : msg.id)}
                            className="p-2 text-white/40 hover:text-yellow-400 hover:bg-white/10 rounded-lg transition-all"
                          >
                            <Smile size={14} />
                          </motion.button>
                          <AnimatePresence>
                            {emojiPickerFor === msg.id && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setEmojiPickerFor(null)} />
                                <motion.div 
                                  initial={{ opacity: 0, y: 5, scale: 0.9 }} 
                                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                                  exit={{ opacity: 0, y: 5, scale: 0.9 }}
                                  className="absolute bottom-10 left-0 flex gap-1 bg-gradient-to-br from-[#1a1d21] to-[#1f2227] border border-white/10 rounded-xl p-2 shadow-2xl z-20"
                                >
                                  {EMOJIS.map(emoji => (
                                    <motion.button 
                                      key={emoji} 
                                      whileHover={{ scale: 1.3 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => { onReact(msg.id, emoji); setEmojiPickerFor(null); }}
                                      className="text-lg hover:bg-white/10 rounded-lg p-1 transition-all"
                                    >
                                      {emoji}
                                    </motion.button>
                                  ))}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => setReplyTo(msg)} className="p-2 text-white/40 hover:text-blue-400 hover:bg-white/10 rounded-lg transition-all"><Reply size={14} /></motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => setThreadView({ id: msg.id, content: msg.content, userName: msg.sender_name || 'User', timestamp: msg.timestamp })} className="p-2 text-white/40 hover:text-purple-400 hover:bg-white/10 rounded-lg transition-all"><MessageSquare size={14} /></motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => onPin(msg.id, !msg.is_pinned)} className="p-2 text-white/40 hover:text-yellow-400 hover:bg-white/10 rounded-lg transition-all"><Pin size={14} /></motion.button>
                        {isOwn && <>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => { setEditingId(msg.id); setEditValue(msg.content); }}
                            className="p-2 text-white/40 hover:text-emerald-400 hover:bg-white/10 rounded-lg transition-all"><Edit3 size={14} /></motion.button>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} onClick={() => onDelete(msg.id)}
                            className="p-2 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all"><Trash2 size={14} /></motion.button>
                        </>}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs font-black text-emerald-500">NB</div>
            <div className="px-4 py-3 bg-white/5 rounded-2xl rounded-tl-sm border border-white/10">
              <div className="flex gap-1">
                {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Reply bar */}
      <AnimatePresence>
        {replyTo && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="mx-6 px-4 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Reply size={14} className="text-emerald-400" />
              <span className="text-xs text-white/40">{replyTo.sender_name}'e yanıt:</span>
              <span className="text-xs text-white/60 truncate max-w-48">{replyTo.content}</span>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-white/30 hover:text-white"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input - Modern */}
      <footer className="p-4 pt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        {/* Mention suggestions */}
        <AnimatePresence>
          {showMentions && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 5 }}
              className="mb-2 bg-gradient-to-br from-[#1a1d21] to-[#1f2227] border border-white/10 rounded-xl overflow-hidden shadow-2xl"
            >
              {mentionSuggestions.map(user => (
                <motion.button 
                  key={user.id} 
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                  onClick={() => handleMentionSelect(user.username)}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-all text-left"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-white/10 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                    {user.username.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm text-white/90 font-medium">@{user.username}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSendMessage}
          className={`relative flex items-center gap-2 p-2 rounded-2xl border border-white/10 transition-all focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:shadow-lg focus-within:shadow-emerald-500/10 ${theme.glass ? 'backdrop-blur-xl bg-white/5' : 'bg-white/5'} ${isChannelLocked && !isAdmin ? 'opacity-60 pointer-events-none' : ''}`}
          style={{ pointerEvents: 'auto', userSelect: 'text' }}>
          {isChannelLocked && !isAdmin && (
            <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 backdrop-blur-sm z-10">
              <span className="flex items-center gap-2 text-sm text-yellow-400 font-semibold">
                🔒 Bu kanal kilitli — mesaj gönderilemiyor
              </span>
            </div>
          )}
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.95 }}
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className="p-2.5 text-white/30 hover:text-emerald-500 hover:bg-white/5 rounded-xl transition-all"
          >
            <Paperclip size={18} />
          </motion.button>
          {onCreatePoll && activeChannel !== 'NatureBot' && (
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              type="button" 
              onClick={() => setShowPollModal(true)} 
              className="p-2.5 text-white/30 hover:text-emerald-500 hover:bg-white/5 rounded-xl transition-all" 
              title="Anket oluştur"
            >
              <PollIcon size={18} />
            </motion.button>
          )}
          <input 
            ref={inputRef} 
            type="text" 
            value={input} 
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder={activeChannel === 'NatureBot' ? 'NatureBot ile konuş... Hafıza destekli AI sohbet aktif.' : `#${activeChannel} ${t('chat.sendMessage')}`}
            className="flex-1 bg-transparent border-none py-2.5 px-2 text-sm text-white placeholder:text-white/30 focus:outline-none" 
            style={{ WebkitUserSelect: 'text', userSelect: 'text' }}
          />
          {/* Emoji picker butonu */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => setShowEmojiInput(v => !v)}
              className={`p-2.5 rounded-xl transition-all ${showEmojiInput ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/30 hover:text-emerald-500 hover:bg-white/5'}`}
            >
              <Smile size={18} />
            </motion.button>
            <AnimatePresence>
              {showEmojiInput && (
                <EmojiPicker
                  onSelect={(emoji) => {
                    setInput(prev => prev + emoji);
                    setShowEmojiInput(false);
                    inputRef.current?.focus();
                  }}
                  onClose={() => setShowEmojiInput(false)}
                />
              )}
            </AnimatePresence>
          </div>
          <motion.button 
            whileHover={{ scale: input.trim() && !isLoading ? 1.05 : 1 }}
            whileTap={{ scale: input.trim() && !isLoading ? 0.95 : 1 }}
            type="submit" 
            disabled={!input.trim() || isLoading}
            className={`p-2.5 rounded-xl transition-all ${input.trim() && !isLoading ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-white/5 text-white/20'}`}
          >
            <Send size={18} />
          </motion.button>
        </form>
      </footer>

      {/* User Profile Card */}
      {profileCardId && (
        <UserProfileCard
          userId={userId}
          targetId={profileCardId}
          allUsers={allUsers}
          onClose={() => setProfileCardId(null)}
          onDM={(id) => { onStartDM?.(id); setProfileCardId(null); }}
        />
      )}

      {/* Poll Modal */}
      {showPollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowPollModal(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-[#111418] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Anket Oluştur</h3>
              <button onClick={() => setShowPollModal(false)} className="p-1.5 rounded-lg text-white/30 hover:text-white"><X size={15} /></button>
            </div>
            <div className="space-y-3">
              <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                placeholder="Anket sorusu..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50" />
              <p className="text-white/30 text-xs font-bold uppercase">Seçenekler</p>
              {pollOptions.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <input value={opt} onChange={e => { const o = [...pollOptions]; o[i] = e.target.value; setPollOptions(o); }}
                    placeholder={`Seçenek ${i + 1}`}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50" />
                  {pollOptions.length > 2 && (
                    <button onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                      className="p-2 text-white/30 hover:text-red-400"><X size={14} /></button>
                  )}
                </div>
              ))}
              {pollOptions.length < 6 && (
                <button onClick={() => setPollOptions([...pollOptions, ''])}
                  className="text-emerald-400 text-sm hover:text-emerald-300 flex items-center gap-1">
                  + Seçenek Ekle
                </button>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowPollModal(false)}
                  className="flex-1 py-2.5 bg-white/5 text-white/60 rounded-xl text-sm">İptal</button>
                <button onClick={async () => {
                  const opts = pollOptions.filter(o => o.trim());
                  if (!pollQuestion.trim() || opts.length < 2) return;
                  try { await onCreatePoll?.(pollQuestion.trim(), opts); } catch {}
                  setPollQuestion(''); setPollOptions(['', '']); setShowPollModal(false);
                }} className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600">
                  Anketi Yayınla
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Typing Indicator */}
      <TypingIndicator channelId={activeChannel} userId={userId} displayName={displayName} />

      {/* Emoji Picker */}
      <AnimatePresence>
        {emojiPickerFor && (
          <div style={{ position: 'absolute', bottom: 60, right: 16, zIndex: 100 }}>
            <EmojiPicker
              onSelect={emoji => {
                onReact?.(emojiPickerFor!, emoji);
                setEmojiPickerFor(null);
              }}
              onClose={() => setEmojiPickerFor(null)}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Thread View */}
      <AnimatePresence>
        {threadView && (
          <ThreadView
            channelId={activeChannel}
            parentMessage={threadView}
            userId={userId}
            displayName={displayName}
            theme={theme}
            onClose={() => setThreadView(null)}
          />
        )}
      </AnimatePresence>

      {/* Poll Creator Modal */}
      <AnimatePresence>
        {showPollModal && (
          <PollCreator
            onCreatePoll={(question, options) => {
              onCreatePoll?.(question, options);
              setShowPollModal(false);
            }}
            onClose={() => setShowPollModal(false)}
            theme={theme}
          />
        )}
      </AnimatePresence>
    </div>
  );
};