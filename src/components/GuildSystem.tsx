import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Hash, Settings, Users, LogOut, Crown, Shield, Copy,
  Check, ChevronRight, Search, Globe, Lock, Trash2, UserMinus, X, Smile, Edit3, Reply
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  createGuild, joinGuildByCode, leaveGuild,
  listenUserGuilds, listenAllGuilds, listenGuildMembers,
  setMemberRole, kickMember, deleteGuild,
  addGuildChannel, removeGuildChannel, listenGuildChannels,
  banMember, unbanMember, setSlowmode, listenAuditLog, checkGuildRateLimit, isGuildBanned
} from '../services/guildService';
import { listenMessages, sendMessage, editMessage, deleteMessage, addReaction } from '../services/firebaseService';
import { EmojiPicker } from './EmojiPicker';

const GUILD_EMOJIS = ['🌿','🔥','⚡','🌊','🏔️','🌙','☀️','🎮','🎵','💻','🎨','📚'];
const GUILD_COLORS = ['#10b981','#3b82f6','#8b5cf6','#ef4444','#f97316','#eab308','#06b6d4','#ec4899'];

export const GuildSystem = ({ theme, userId, username, onGuildOpen }: { theme: any, userId: string, username: string, onGuildOpen?: (guildId: string) => void }) => {
  const { t } = useTranslation();
  const [view, setView] = useState<'list' | 'create' | 'join' | 'guild' | 'discover'>('list');
  const [userGuilds, setUserGuilds] = useState<any[]>([]);
  const [allGuilds, setAllGuilds] = useState<any[]>([]);
  const [activeGuild, setActiveGuild] = useState<any>(null);
  const [activeChannel, setActiveChannel] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'channels' | 'members' | 'settings'>('channels');
  const [showEmojiInput, setShowEmojiInput] = useState(false);
  const [guildChannels, setGuildChannels] = useState<{ id: string; name: string }[]>([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [showAddChannel, setShowAddChannel] = useState(false);
  // @mention
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMention, setShowMention] = useState(false);
  const inputRef = useState<HTMLInputElement | null>(null);

  // Message actions
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [reactionPickerMsgId, setReactionPickerMsgId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; senderName: string } | null>(null);

  // Security / moderation
  const [slowmodeCooldown, setSlowmodeCooldown] = useState(0); // kalan saniye
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [sendError, setSendError] = useState('');

  const QUICK_REACTIONS = ['👍','❤️','😂','😮','😢','🔥'];

  // Create form
  const [gName, setGName] = useState('');
  const [gEmoji, setGEmoji] = useState('🌿');
  const [gColor, setGColor] = useState('#10b981');
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = listenUserGuilds(userId, setUserGuilds);
    return unsub;
  }, [userId]);

  useEffect(() => {
    if (view === 'discover') {
      const unsub = listenAllGuilds(setAllGuilds);
      return unsub;
    }
  }, [view]);

  useEffect(() => {
    if (!activeGuild || !activeChannel) return;
    const unsub = listenMessages(activeChannel, setMessages as any);
    return unsub;
  }, [activeGuild, activeChannel]);

  useEffect(() => {
    if (!activeGuild) return;
    const unsub = listenGuildMembers(activeGuild.id, setMembers);
    return unsub;
  }, [activeGuild]);

  useEffect(() => {
    if (!activeGuild) return;
    const unsub = listenGuildChannels(activeGuild.id, setGuildChannels);
    return unsub;
  }, [activeGuild]);

  useEffect(() => {
    if (!activeGuild || !showAuditLog) return;
    const unsub = listenAuditLog(activeGuild.id, setAuditLogs);
    return unsub;
  }, [activeGuild, showAuditLog]);

  const handleCreate = async () => {
    if (!gName.trim()) return;
    setLoading(true);
    try {
      const { inviteCode: code } = await createGuild(gName, gEmoji, gColor, userId, username);
      setInviteCode(code);
      setView('list');
      setGName(''); setGEmoji('🌿'); setGColor('#10b981');
    } finally { setLoading(false); }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setLoading(true); setJoinError('');
    try {
      await joinGuildByCode(joinCode, userId);
      setJoinCode(''); setView('list');
    } catch (e: any) {
      setJoinError(e.message);
    } finally { setLoading(false); }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeChannel) return;
    setSendError('');

    // Mesaj uzunluk kontrolü
    if (input.trim().length > 2000) {
      setSendError('Mesaj en fazla 2000 karakter olabilir');
      return;
    }

    // Rate limit kontrolü
    if (!checkGuildRateLimit(activeChannel)) {
      setSendError('Çok hızlı mesaj gönderiyorsunuz, lütfen bekleyin');
      return;
    }

    // Slowmode kontrolü
    if (slowmodeCooldown > 0) {
      setSendError(`Slowmode: ${slowmodeCooldown} saniye bekleyin`);
      return;
    }

    await sendMessage(activeChannel, userId, username, input.trim(), {
      replyToId: replyTo?.id || undefined,
    });
    setInput('');
    setReplyTo(null);

    // Slowmode uygula
    const slowSec = activeGuild?.slowmode_seconds || 0;
    if (slowSec > 0) {
      setSlowmodeCooldown(slowSec);
      const interval = setInterval(() => {
        setSlowmodeCooldown(prev => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const handleEditSave = async (msgId: string) => {
    if (!editingContent.trim() || !activeChannel) return;
    await editMessage(activeChannel, msgId, editingContent.trim());
    setEditingId(null);
    setEditingContent('');
  };

  const handleAddChannel = async () => {
    if (!newChannelName.trim() || !activeGuild) return;
    if (guildChannels.length >= 5) return;
    await addGuildChannel(activeGuild.id, newChannelName.trim());
    setNewChannelName('');
    setShowAddChannel(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);
    const atIdx = val.lastIndexOf('@');
    if (atIdx !== -1 && atIdx === val.length - 1) {
      setMentionQuery('');
      setShowMention(true);
    } else if (atIdx !== -1 && val.slice(atIdx + 1).match(/^\w*$/)) {
      setMentionQuery(val.slice(atIdx + 1));
      setShowMention(true);
    } else {
      setShowMention(false);
    }
  };

  const handleMentionSelect = (memberUid: string) => {
    const atIdx = input.lastIndexOf('@');
    setInput(input.slice(0, atIdx) + '@' + memberUid + ' ');
    setShowMention(false);
  };

  const copyInvite = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openGuild = (guild: any) => {
    setActiveGuild(guild);
    const channelId = `guild_${guild.id}_genel`;
    setActiveChannel(channelId);
    setView('guild');
    setTab('channels');
    onGuildOpen?.(guild.id);
  };

  // ── LIST VIEW ──
  if (view === 'list') return (
    <div className="flex-1 flex flex-col bg-[#0B0E11] overflow-hidden">
      <header className="h-14 border-b border-white/5 flex items-center px-6 justify-between">
        <h3 className="font-bold text-white">{t('guild.myServers')}</h3>
        <div className="flex gap-2">
          <button onClick={() => setView('join')} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-white/60 rounded-xl text-xs font-bold hover:bg-white/10 transition-all">
            <Hash size={12} /> {t('guild.join')}
          </button>
          <button onClick={() => setView('create')} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all">
            <Plus size={12} /> {t('guild.create')}
          </button>
          <button onClick={() => setView('discover')} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-white/60 rounded-xl text-xs font-bold hover:bg-white/10 transition-all">
            <Globe size={12} /> {t('guild.discover')}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {userGuilds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 rounded-[40px] bg-white/5 border border-white/10 flex items-center justify-center text-5xl mb-6">🏰</div>
            <h3 className="text-xl font-black text-white mb-2">{t('guild.noServers')}</h3>
            <p className="text-white/40 text-sm max-w-xs">{t('guild.noServersDesc')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {userGuilds.map(guild => (
              <motion.div key={guild.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => openGuild(guild)}
                className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/10 hover:border-white/20 transition-all group">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg" style={{ background: guild.color || '#10b981' }}>
                  {guild.emoji || '🌿'}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white">{guild.name}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-white/30">{guild.member_count || 1} {t('guild.members')}</span>
                    {guild.owner_id === userId && <span className="text-[10px] text-yellow-400 font-bold flex items-center gap-1"><Crown size={10} /> {t('guild.owner')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={e => { e.stopPropagation(); copyInvite(guild.invite_code); }}
                    className="p-2 bg-white/5 rounded-xl text-white/40 hover:text-white transition-all" title={t('guild.copyInvite')}>
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                  <ChevronRight size={16} className="text-white/20" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── CREATE VIEW ──
  if (view === 'create') return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0B0E11] p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <button onClick={() => setView('list')} className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-all">
          ← {t('common.back')}
        </button>
        <h2 className="text-3xl font-black text-white mb-2">{t('guild.createTitle')}</h2>
        <p className="text-white/40 text-sm mb-8">{t('guild.createDesc')}</p>

        <div className="space-y-6">
          {/* Preview */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-[30px] flex items-center justify-center text-4xl shadow-2xl transition-all" style={{ background: gColor }}>
              {gEmoji}
            </div>
          </div>

          {/* Emoji */}
          <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">{t('guild.emoji')}</label>
            <div className="flex flex-wrap gap-2">
              {GUILD_EMOJIS.map(e => (
                <button key={e} onClick={() => setGEmoji(e)}
                  className={`w-10 h-10 rounded-xl text-xl transition-all ${gEmoji === e ? 'bg-white/20 ring-2 ring-white/40' : 'bg-white/5 hover:bg-white/10'}`}>{e}</button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">{t('guild.color')}</label>
            <div className="flex gap-2">
              {GUILD_COLORS.map(c => (
                <button key={c} onClick={() => setGColor(c)}
                  className={`w-8 h-8 rounded-xl transition-all ${gColor === c ? 'ring-2 ring-white scale-110' : ''}`} style={{ background: c }} />
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-bold text-white/40 uppercase tracking-widest block mb-2">{t('guild.serverName')}</label>
            <input value={gName} onChange={e => setGName(e.target.value)}
              placeholder={t('guild.serverNamePlaceholder')}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-emerald-500/50 transition-all" />
          </div>

          <button onClick={handleCreate} disabled={!gName.trim() || loading}
            className={`w-full py-4 rounded-2xl font-black text-sm transition-all ${gName.trim() ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600' : 'bg-white/5 text-white/20'}`}>
            {loading ? t('guild.creating') : t('guild.createButton')}
          </button>
        </div>
      </motion.div>
    </div>
  );

  // ── JOIN VIEW ──
  if (view === 'join') return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0B0E11] p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <button onClick={() => setView('list')} className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-all">← {t('common.back')}</button>
        <h2 className="text-3xl font-black text-white mb-2">{t('guild.joinTitle')}</h2>
        <p className="text-white/40 text-sm mb-8">{t('guild.joinDesc')}</p>
        <div className="space-y-4">
          <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
            placeholder={t('guild.inviteCodePlaceholder')}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-blue-500/50 transition-all"
            maxLength={6} />
          {joinError && <p className="text-red-400 text-sm text-center">{joinError}</p>}
          <button onClick={handleJoin} disabled={joinCode.length !== 6 || loading}
            className={`w-full py-4 rounded-2xl font-black text-sm transition-all ${joinCode.length === 6 ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white/5 text-white/20'}`}>
            {loading ? t('guild.joining') : t('guild.joinButton')}
          </button>
        </div>
      </motion.div>
    </div>
  );

  // ── DISCOVER VIEW ──
  if (view === 'discover') return (
    <div className="flex-1 flex flex-col bg-[#0B0E11]">
      <header className="h-14 border-b border-white/5 flex items-center px-6 gap-4">
        <button onClick={() => setView('list')} className="text-white/40 hover:text-white transition-all">←</button>
        <Globe size={18} className="text-blue-400" />
        <h3 className="font-bold text-white">{t('guild.discoverTitle')}</h3>
      </header>
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-4">
          {allGuilds.map(guild => {
            const isMember = userGuilds.some(g => g.id === guild.id);
            return (
              <motion.div key={guild.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-5 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: guild.color }}>
                    {guild.emoji || '🌿'}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{guild.name}</h4>
                    <p className="text-xs text-white/30">{guild.member_count || 1} {t('guild.members')}</p>
                  </div>
                </div>
                {isMember ? (
                  <button onClick={() => openGuild(guild)}
                    className="w-full py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold">
                    {t('common.open')}
                  </button>
                ) : (
                  <button onClick={async () => { await joinGuildByCode(guild.invite_code, userId); }}
                    className="w-full py-2 bg-white/5 border border-white/10 text-white/60 rounded-xl text-xs font-bold hover:bg-white/10 transition-all">
                    {t('guild.join')}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── GUILD CHAT VIEW ──
  if (view === 'guild' && activeGuild) {
    const channelList = guildChannels.length > 0 ? guildChannels : [
      { id: `guild_${activeGuild.id}_genel`, name: 'genel' },
      { id: `guild_${activeGuild.id}_duyurular`, name: 'duyurular' },
    ];
    const isOwner = activeGuild.owner_id === userId;
    const defaultChannelIds = [`guild_${activeGuild.id}_genel`, `guild_${activeGuild.id}_duyurular`];
    const filteredMembers = members.filter(m =>
      m.uid.toLowerCase().includes(mentionQuery.toLowerCase())
    );

    return (
      <div className="flex-1 flex overflow-hidden bg-[#0B0E11]">
        {/* Guild sidebar */}
        <aside className="w-56 border-r border-white/5 flex flex-col">
          <div className="p-4 border-b border-white/5">
            <button onClick={() => setView('list')} className="text-white/30 hover:text-white text-xs mb-3 transition-all">← {t('guild.servers')}</button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: activeGuild.color }}>
                {activeGuild.emoji}
              </div>
              <div>
                <h4 className="font-bold text-white text-sm leading-tight">{activeGuild.name}</h4>
                <p className="text-[10px] text-white/30">{activeGuild.member_count || 1} {t('guild.members')}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/5">
            {(['channels', 'members', 'settings'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-widest transition-all ${tab === t ? 'text-white border-b-2 border-emerald-500' : 'text-white/30 hover:text-white'}`}>
                {t === 'channels' ? '# ' : t === 'members' ? '👥' : '⚙️'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {tab === 'channels' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{t('guild.channels')}</p>
                  {isOwner && guildChannels.length < 5 && (
                    <button onClick={() => setShowAddChannel(v => !v)} className="text-white/30 hover:text-emerald-400 transition-all">
                      <Plus size={12} />
                    </button>
                  )}
                </div>
                {showAddChannel && isOwner && (
                  <div className="px-2 pb-2 flex gap-1">
                    <input
                      value={newChannelName}
                      onChange={e => setNewChannelName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddChannel()}
                      placeholder="kanal-adı"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                    />
                    <button onClick={handleAddChannel} className="text-emerald-400 hover:text-emerald-300 px-1">
                      <Check size={12} />
                    </button>
                  </div>
                )}
                {channelList.map(ch => (
                  <div key={ch.id} className={`flex items-center group rounded-xl transition-all ${activeChannel === ch.id ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                    <button onClick={() => setActiveChannel(ch.id)}
                      className={`flex-1 flex items-center gap-2 px-3 py-2 text-sm transition-all ${activeChannel === ch.id ? 'text-white' : 'text-white/40 hover:text-white'}`}>
                      <Hash size={14} />#{ch.name}
                    </button>
                    {isOwner && !defaultChannelIds.includes(ch.id) && (
                      <button onClick={() => removeGuildChannel(ch.id)}
                        className="opacity-0 group-hover:opacity-100 pr-2 text-red-400/60 hover:text-red-400 transition-all">
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === 'members' && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 py-2">{members.length} {t('guild.members')}</p>
                {members.map(m => (
                  <div key={m.uid} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 group">
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-white/40">
                      {m.uid.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="flex-1 text-sm text-white/60 truncate">{m.uid}</span>
                    {m.role === 'owner' && <Crown size={12} className="text-yellow-400" />}
                    {m.role === 'admin' && <Shield size={12} className="text-blue-400" />}
                    {isOwner && m.uid !== userId && (
                      <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
                        <button onClick={() => kickMember(activeGuild.id, m.uid, userId)} className="text-orange-400 hover:text-orange-300 transition-all" title="At">
                          <UserMinus size={12} />
                        </button>
                        <button onClick={() => banMember(activeGuild.id, m.uid, userId)} className="text-red-400 hover:text-red-300 transition-all" title="Banla">
                          <X size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {tab === 'settings' && (
              <div className="p-3 space-y-3">
                <div className="p-3 bg-white/5 rounded-xl">
                  <p className="text-xs text-white/40 mb-1">{t('guild.inviteCode')}</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-emerald-400 flex-1">{activeGuild.invite_code}</code>
                    <button onClick={() => copyInvite(activeGuild.invite_code)} className="text-white/40 hover:text-white transition-all">
                      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                {/* Slowmode */}
                {isOwner && (
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-white/40 mb-2">Slowmode</p>
                    <div className="flex gap-1 flex-wrap">
                      {[0, 5, 10, 30, 60, 300].map(sec => (
                        <button key={sec} onClick={() => setSlowmode(activeGuild.id, sec, userId)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${activeGuild.slowmode_seconds === sec ? 'bg-emerald-500 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}>
                          {sec === 0 ? 'Kapalı' : sec < 60 ? `${sec}s` : `${sec / 60}dk`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit Log */}
                {isOwner && (
                  <div className="p-3 bg-white/5 rounded-xl">
                    <button onClick={() => setShowAuditLog(v => !v)} className="flex items-center justify-between w-full text-xs text-white/40 hover:text-white transition-all">
                      <span>Denetim Günlüğü</span>
                      <Shield size={12} />
                    </button>
                    {showAuditLog && (
                      <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                        {auditLogs.length === 0 ? (
                          <p className="text-[10px] text-white/20">Henüz kayıt yok</p>
                        ) : auditLogs.map(log => (
                          <div key={log.id} className="text-[10px] text-white/40 flex justify-between">
                            <span className="text-emerald-400/70">{log.action}</span>
                            <span>{new Date(log.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button onClick={() => leaveGuild(activeGuild.id, userId).then(() => setView('list'))}
                  className="w-full py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
                  <LogOut size={12} /> {t('guild.leaveServer')}
                </button>
                {isOwner && (
                  <button onClick={() => deleteGuild(activeGuild.id, userId).then(() => setView('list'))}
                    className="w-full py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
                    <Trash2 size={12} /> {t('guild.deleteServer')}
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Chat */}
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-white/5 flex items-center px-6 gap-3">
            <Hash size={18} className="text-white/40" />
            <span className="font-bold text-white">{channelList.find(c => c.id === activeChannel)?.name || 'genel'}</span>
          </header>

          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {messages.map((msg: any) => {
              const isMine = msg.sender_id === userId;
              const isEditing = editingId === msg.id;
              const replyMsg = msg.reply_to_id ? messages.find((m: any) => m.id === msg.reply_to_id) : null;
              const reactions = msg.reactions || {};

              return (
                <div key={msg.id}
                  className={`flex gap-3 ${isMine ? 'flex-row-reverse' : ''}`}
                  onMouseEnter={() => setHoveredMsgId(msg.id)}
                  onMouseLeave={() => { setHoveredMsgId(null); setReactionPickerMsgId(null); }}>

                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/40 shrink-0 self-start mt-5">
                    {(msg.sender_name || msg.sender_id || '?').substring(0, 2).toUpperCase()}
                  </div>

                  <div className={`flex flex-col gap-1 max-w-[65%] ${isMine ? 'items-end' : 'items-start'}`}>
                    {/* Sender name */}
                    <span className="text-[10px] text-white/30 px-1">{msg.sender_name || msg.sender_id}</span>

                    {/* Reply preview */}
                    {replyMsg && (
                      <div className="text-[10px] text-white/30 px-3 py-1 bg-white/5 border-l-2 border-white/20 rounded-lg truncate max-w-full">
                        ↩ {replyMsg.sender_name}: {replyMsg.content}
                      </div>
                    )}

                    {/* Bubble + action bar */}
                    <div className={`relative flex flex-col gap-1`}>
                      {/* Message bubble */}
                      {isEditing ? (
                        <div className="flex gap-2 items-center">
                          <input
                            autoFocus
                            value={editingContent}
                            onChange={e => setEditingContent(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleEditSave(msg.id);
                              if (e.key === 'Escape') { setEditingId(null); setEditingContent(''); }
                            }}
                            className="bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 min-w-[200px]"
                          />
                          <button onClick={() => handleEditSave(msg.id)} className="text-emerald-400 hover:text-emerald-300 text-xs">✓</button>
                          <button onClick={() => { setEditingId(null); setEditingContent(''); }} className="text-white/30 hover:text-white text-xs">✕</button>
                        </div>
                      ) : (
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-sm ${isMine ? 'text-white rounded-tr-sm' : 'bg-white/5 border border-white/10 text-white/80 rounded-tl-sm'}`}
                          style={isMine ? { background: activeGuild.color } : {}}>
                          {msg.content}
                          {msg.is_edited && <span className="text-[10px] opacity-40 ml-2">(düzenlendi)</span>}
                        </div>
                      )}

                      {/* Reactions */}
                      {Object.keys(reactions).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {Object.entries(reactions).map(([emoji, users]: any) => (
                            <button key={emoji} onClick={() => addReaction(activeChannel, msg.id, emoji, userId)}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-all ${(users as string[]).includes(userId) ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}>
                              {emoji} <span>{(users as string[]).length}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Hover action bar — DM ile aynı stil, bubble'ın yanında üst hizasında */}
                      <AnimatePresence>
                        {hoveredMsgId === msg.id && !isEditing && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`absolute top-0 flex items-center gap-1 bg-[#1a1d21] border border-white/10 rounded-xl p-1 shadow-lg z-10 ${isMine ? 'right-full mr-2' : 'left-full ml-2'}`}>
                            <div className="relative">
                              <button onClick={() => setReactionPickerMsgId(reactionPickerMsgId === msg.id ? null : msg.id)}
                                className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                                <Smile size={14} />
                              </button>
                              <AnimatePresence>
                                {reactionPickerMsgId === msg.id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setReactionPickerMsgId(null)} />
                                    <motion.div
                                      initial={{ opacity: 0, y: 5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: 5 }}
                                      className="absolute bottom-8 left-0 flex gap-1 bg-[#1a1d21] border border-white/10 rounded-xl p-2 shadow-xl z-20">
                                      {QUICK_REACTIONS.map(emoji => (
                                        <button key={emoji} onClick={() => { addReaction(activeChannel, msg.id, emoji, userId); setReactionPickerMsgId(null); }}
                                          className="text-lg hover:scale-125 transition-transform">{emoji}</button>
                                      ))}
                                    </motion.div>
                                  </>
                                )}
                              </AnimatePresence>
                            </div>
                            <button onClick={() => setReplyTo({ id: msg.id, content: msg.content, senderName: msg.sender_name })}
                              className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                              <Reply size={14} />
                            </button>
                            {isMine && (
                              <>
                                <button onClick={() => { setEditingId(msg.id); setEditingContent(msg.content); }}
                                  className="p-1.5 text-white/40 hover:text-blue-400 hover:bg-white/10 rounded-lg transition-all">
                                  <Edit3 size={14} />
                                </button>
                                <button onClick={() => deleteMessage(activeChannel, msg.id)}
                                  className="p-1.5 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                            {isOwner && !isMine && (
                              <button onClick={() => deleteMessage(activeChannel, msg.id)}
                                className="p-1.5 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSend} className="p-4 border-t border-white/5">
            {sendError && (
              <div className="mb-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 flex items-center justify-between">
                <span>{sendError}</span>
                <button type="button" onClick={() => setSendError('')}><X size={11} /></button>
              </div>
            )}
            {slowmodeCooldown > 0 && (
              <div className="mb-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-400">
                ⏱ Slowmode: {slowmodeCooldown}s bekleyin
              </div>
            )}
            {replyTo && (
              <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 text-xs text-white/50">
                <span className="text-white/30">↩ {replyTo.senderName}:</span>
                <span className="flex-1 truncate">{replyTo.content}</span>
                <button type="button" onClick={() => setReplyTo(null)} className="text-white/30 hover:text-white"><X size={12} /></button>
              </div>
            )}
            <div className="flex gap-3 items-center relative">
              {showMention && filteredMembers.length > 0 && (
                <div className="absolute bottom-full left-0 mb-2 w-56 bg-[#1a1d21] border border-white/10 rounded-xl overflow-hidden shadow-xl z-50">
                  {filteredMembers.map(m => (
                    <button key={m.uid} type="button" onClick={() => handleMentionSelect(m.uid)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition-all text-left">
                      <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/40">
                        {m.uid.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm text-white/70 truncate">{m.uid}</span>
                    </button>
                  ))}
                </div>
              )}
              <input value={input} onChange={handleInputChange}
                placeholder={`#${channelList.find(c => c.id === activeChannel)?.name || 'genel'} ${t('guild.channelPlaceholder')}`}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/30 transition-all" />
              {/* Emoji picker */}
              <div className="relative">
                <button type="button" onClick={() => setShowEmojiInput(v => !v)}
                  className={`p-3 rounded-2xl transition-all ${showEmojiInput ? 'text-emerald-400 bg-emerald-500/10' : 'bg-white/5 border border-white/10 text-white/40 hover:text-emerald-400'}`}>
                  <Smile size={18} />
                </button>
                <AnimatePresence>
                  {showEmojiInput && (
                    <EmojiPicker
                      onSelect={(emoji) => {
                        setInput(prev => prev + emoji);
                        setShowEmojiInput(false);
                      }}
                      onClose={() => setShowEmojiInput(false)}
                    />
                  )}
                </AnimatePresence>
              </div>
              <button type="submit" disabled={!input.trim()}
                className={`px-5 py-3 rounded-2xl font-bold text-sm transition-all ${input.trim() ? 'text-white' : 'bg-white/5 text-white/20'}`}
                style={input.trim() ? { background: activeGuild.color } : {}}>
                {t('common.send')}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return null;
};
