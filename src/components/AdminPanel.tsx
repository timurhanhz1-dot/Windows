import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth } from '../firebase';
import { ref, onValue, update, remove, get, push, set, off } from 'firebase/database';
import { sendPasswordResetEmail } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { DEFAULT_TV_CHANNELS } from './ChannelSidebar';
import {
  Shield, Users, MessageSquare, Settings, Ban, UserX, UserCheck,
  Trash2, RefreshCw, Activity, Save, Bell, Lock, Unlock, Eye,
  Edit3, Search, Download, Plus, VolumeX, Volume2, Hash,
  BarChart2, Palette, FileText, LogOut, ChevronRight, X, Check,
  AlertTriangle, Database, Zap, Filter, Send, BadgeCheck, Tv, Flag, UserPlus, Mail, KeyRound, AtSign
} from 'lucide-react';
import AdminModerationOverviewCard from './AdminModerationOverviewCard';
import AdminAiAnalyticsCard from "./AdminAiAnalyticsCard";
import AdminGrowthRadarCard from "./AdminGrowthRadarCard";
import AdminViralContentCard from "./AdminViralContentCard";
import AdminCommunityBrainCard from "./AdminCommunityBrainCard";
import AdminSecuritySignalsCard from "./AdminSecuritySignalsCard";

const TABS = [
  { id: 'overview',    label: 'Genel Bakış',    icon: BarChart2 },
  { id: 'users',       label: 'Kullanıcılar',   icon: Users },
  { id: 'verify',      label: 'Rozet Talepleri',icon: BadgeCheck },
  { id: 'tv_channels', label: 'TV Kanalları',   icon: Tv },
  { id: 'messages',    label: 'Mesajlar',        icon: MessageSquare },
  { id: 'channels',    label: 'Odalar',          icon: Hash },
  { id: 'forum',       label: 'Forum',           icon: FileText },
  { id: 'announce',    label: 'Duyurular',       icon: Bell },
  { id: 'design',      label: 'Tasarım',         icon: Palette },
  { id: 'settings',    label: 'Ayarlar',         icon: Settings },
  { id: 'security',    label: 'Güvenlik',        icon: Shield },
  { id: 'reports',     label: 'Şikayetler',      icon: Flag },
  { id: 'logs',        label: 'Loglar',          icon: Activity },
  { id: 'create_user',  label: 'Üye Oluştur',     icon: UserPlus },
  { id: 'support',      label: 'Destek Talepleri', icon: Mail },
  { id: 'game_approvals', label: 'Oyun Onayları',  icon: Shield },
];

function addLog(action: string, detail: string) {
  push(ref(db, 'logs'), {
    type: action,
    detail,
    userId: auth.currentUser?.uid || 'unknown',
    timestamp: Date.now(),
    admin: auth.currentUser?.displayName || 'admin'
  });
}

const VerifyRequestCard = ({ req, onApprove, onReject }: { req: any; onApprove: () => void; onReject: (note: string) => void }) => {
  const [rejectNote, setRejectNote] = useState('');
  const [showReject, setShowReject] = useState(false);

  const statusColor = req.status === 'approved' ? 'text-emerald-400' : req.status === 'rejected' ? 'text-red-400' : 'text-yellow-400';
  const statusLabel = req.status === 'approved' ? '✓ Onaylandı' : req.status === 'rejected' ? '✗ Reddedildi' : '⏳ Bekliyor';

  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{req.username}</span>
            <span className={`text-xs font-bold ${statusColor}`}>{statusLabel}</span>
          </div>
          <p className="text-xs text-white/40">{req.email} • {req.requestedAt ? new Date(req.requestedAt).toLocaleString('tr-TR') : ''}</p>
        </div>
        <BadgeCheck size={20} className="text-blue-400 flex-shrink-0" />
      </div>
      <p className="text-sm text-white/70 bg-white/5 rounded-xl px-3 py-2 mb-3">"{req.note}"</p>
      {req.status === 'pending' && (
        <div>
          {!showReject ? (
            <div className="flex gap-2">
              <button
                onClick={onApprove}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-500/30 transition-all"
              >
                <Check size={14} /> Onayla
              </button>
              <button
                onClick={() => setShowReject(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-all"
              >
                <X size={14} /> Reddet
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="Red gerekçesi (opsiyonel)..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-red-500/50"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { onReject(rejectNote); setShowReject(false); }}
                  className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/30 transition-all"
                >
                  Reddi Gönder
                </button>
                <button onClick={() => setShowReject(false)} className="px-4 py-2 text-white/40 hover:text-white text-sm transition-all">İptal</button>
              </div>
            </div>
          )}
        </div>
      )}
      {req.status === 'rejected' && req.adminNote && (
        <p className="text-xs text-red-400/70">Gerekçe: {req.adminNote}</p>
      )}
    </div>
  );
};

export const AdminPanel = ({ theme, siteSettings, updateSiteSettings }: {
  theme: any; siteSettings: any; updateSiteSettings: (s: any) => void;
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<Record<string, any[]>>({});
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [muteMinutes, setMuteMinutes] = useState(10);
  const [announceText, setAnnounceText] = useState('');
  const [announceChannel, setAnnounceChannel] = useState('all');
  const [notifTitle, setNotifTitle] = useState('');
  const [channelNotifChannel, setChannelNotifChannel] = useState('all');
  const [channelNotifTitle, setChannelNotifTitle] = useState('');
  const [channelNotifBody, setChannelNotifBody] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [isAdminVerified, setIsAdminVerified] = useState<boolean | null>(null);
  const [verifyRequests, setVerifyRequests] = useState<any[]>([]);
  const [tvChannels, setTvChannels] = useState<any[]>([]);
  const [tvForm, setTvForm] = useState({ id: '', name: '', emoji: '📺', desc: '', youtubeChannelId: '', color: '#10b981', order: 0 });
  const [tvEditId, setTvEditId] = useState<string | null>(null);
  // Üye oluştur
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newIsVerified, setNewIsVerified] = useState(false);
  const [createUserMsg, setCreateUserMsg] = useState('');
  const [createUserErr, setCreateUserErr] = useState('');
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [tvFormOpen, setTvFormOpen] = useState(false);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [ticketFilter, setTicketFilter] = useState<'all'|'open'|'closed'>('all');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [gameServers, setGameServers] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [newChannelEmoji, setNewChannelEmoji] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [showNewChannelForm, setShowNewChannelForm] = useState(false);
  const [settings, setSettings] = useState({
    site_name: siteSettings.site_name || 'Nature.co',
    welcome_message: siteSettings.welcome_message || '',
    allow_registration: siteSettings.allow_registration !== 'false',
    maintenance_mode: siteSettings.maintenance_mode === 'true',
    message_history_limit: siteSettings.message_history_limit || 100,
    max_users: siteSettings.max_users || 1000,
    min_username_length: siteSettings.min_username_length || 3,
    banned_words: siteSettings.banned_words || '',
    invite_code: siteSettings.invite_code || '',
    ai_api_key: siteSettings.ai_api_key || '',
  });
  const [designSettings, setDesignSettings] = useState({
    primary_color: '#10b981',
    bg_color: '#0B0E11',
    font_size: '14',
    border_radius: '8',
    bg_style: 'dark',
  });
  const [logFilter, setLogFilter] = useState('');

  // ─── ADMIN DOĞRULAMA (3. katman güvenlik) ───────────────────────────────────
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setIsAdminVerified(false); return; }
    get(ref(db, `users/${uid}/is_admin`)).then(snap => {
      setIsAdminVerified(snap.val() === true);
    }).catch(() => setIsAdminVerified(false));
  }, []);

  // ─── DATA LISTENERS ──────────────────────────────────────────────────────────
  useEffect(() => {
    const refs: any[] = [];

    const uRef = ref(db, 'users');
    onValue(uRef, snap => {
      const d = snap.val() || {};
      setUsers(Object.entries(d).map(([id, v]: any) => ({
        id, username: v.username || id, email: v.email || '',
        status: v.status || 'offline', is_admin: v.is_admin || false,
        is_banned: v.is_banned || false, is_muted: v.is_muted || false,
        mute_until: v.mute_until || null,
        created_at: v.created_at || '', message_count: v.message_count || 0,
        xp: v.xp || 0, ip: v.last_ip || '-',
      })));
    });
    refs.push(uRef);

    const cRef = ref(db, 'channels');
    onValue(cRef, snap => {
      const d = snap.val() || {};
      setChannels(Object.entries(d).map(([id, v]: any) => ({
        id, name: v.name || id, type: v.type || 'text',
        is_locked: v.is_locked || false, slow_mode: v.slow_mode || 0,
        description: v.description || '', is_readonly: v.is_readonly || false,
        is_hidden: v.is_hidden || false, emoji: v.emoji || '',
      })));
    });
    refs.push(cRef);

    const mRef = ref(db, 'messages');
    onValue(mRef, snap => {
      const d = snap.val() || {};
      const byChannel: Record<string, any[]> = {};
      Object.entries(d).forEach(([ch, msgs]: any) => {
        byChannel[ch] = Object.entries(msgs || {}).map(([id, v]: any) => ({
          id, channel: ch, sender_name: v.sender_name || v.sender_id,
          content: v.content, timestamp: v.timestamp, is_pinned: v.is_pinned
        })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      });
      setAllMessages(byChannel);
    });
    refs.push(mRef);

    const fRef = ref(db, 'forum');
    onValue(fRef, snap => {
      const d = snap.val() || {};
      setForumPosts(Object.entries(d).map(([id, v]: any) => ({
        id, title: v.title, author: v.author, content: v.content,
        likes: Object.keys(v.likes || {}).length,
        comments: Object.keys(v.comments || {}).length,
        created_at: v.created_at,
      })).sort((a, b) => (b.created_at || 0) - (a.created_at || 0)));
    });
    refs.push(fRef);

    const rRep = ref(db, 'reports');
    onValue(rRep, snap => {
      const d = snap.val() || {};
      const list = Object.entries(d).map(([id, v]: any) => ({ id, ...v }));
      list.sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0));
      setReports(list);
    });
    refs.push(rRep);

    const lRef = ref(db, 'logs');
    onValue(lRef, snap => {
      const d = snap.val() || {};
      setLogs(Object.entries(d).map(([id, v]: any) => ({ id, ...v }))
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 200));
    });
    refs.push(lRef);

    const oRef = ref(db, 'online');
    onValue(oRef, snap => {
      const d = snap.val() || {};
      setOnlineUsers(Object.keys(d).filter(k => d[k] === true));
    });
    refs.push(oRef);

    const vRef = ref(db, 'verification_requests');
    onValue(vRef, snap => {
      const d = snap.val() || {};
      setVerifyRequests(Object.entries(d).map(([id, v]: any) => ({ id, ...v })));
    }, (err) => {
      console.warn('verification_requests root okuma başarısız, alternatif yöntem deneniyor:', err.message);
    });
    refs.push(vRef);

    const tvRef = ref(db, 'tv_channels');
    onValue(tvRef, snap => {
      const d = snap.val();
      if (d) {
        const list = Object.entries(d)
          .map(([id, v]: any) => ({ id, ...v }))
          .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
        setTvChannels(list);
      } else {
        setTvChannels([]);
      }
    });
    refs.push(tvRef);

    const stRef = ref(db, 'support_tickets');
    onValue(stRef, snap => {
      const d = snap.val() || {};
      const list = Object.entries(d).map(([id, v]: any) => ({ id, ...v }))
        .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setSupportTickets(list);
    });
    refs.push(stRef);

    const gsRef = ref(db, 'game_servers');
    onValue(gsRef, snap => {
      const d = snap.val() || {};
      setGameServers(Object.entries(d).map(([id, v]: any) => ({ id, ...v })));
    });
    refs.push(gsRef);

    const tRef = ref(db, 'tournaments');
    onValue(tRef, snap => {
      const d = snap.val() || {};
      setTournaments(Object.entries(d).map(([id, v]: any) => ({ id, ...v })));
    });
    refs.push(tRef);

    return () => refs.forEach(r => off(r));
  }, []);

  // ─── STATS ───────────────────────────────────────────────────────────────────
  const totalMsg = Object.values(allMessages).reduce((s, msgs) => s + msgs.length, 0);
  const bannedCount = users.filter(u => u.is_banned).length;
  const adminCount = users.filter(u => u.is_admin).length;
  const activeChannel = channels.length > 0
    ? [...channels].sort((a, b) => (allMessages[b.id]?.length || 0) - (allMessages[a.id]?.length || 0))[0]
    : null;

  // ─── USER ACTIONS ─────────────────────────────────────────────────────────────
  const banUser = async (u: any) => {
    await update(ref(db, `users/${u.id}`), { is_banned: !u.is_banned });
    addLog(u.is_banned ? 'UNBAN' : 'BAN', `${u.username}`);
  };
  const toggleAdmin = async (u: any) => {
    await update(ref(db, `users/${u.id}`), { is_admin: !u.is_admin });
    addLog(u.is_admin ? 'REMOVE_ADMIN' : 'MAKE_ADMIN', u.username);
  };
  const deleteUser = async (u: any) => {
    if (!confirm(`${u.username} silinsin mi? Bu işlem Firebase Auth'dan da siler.`)) return;
    try {
      const functions = getFunctions();
      const deleteUserFn = httpsCallable(functions, 'deleteUserAccount');
      await deleteUserFn({ uid: u.id });
      addLog('DELETE_USER', u.username);
    } catch (err: any) {
      // Cloud Function başarısız olursa sadece DB'den sil
      await remove(ref(db, `users/${u.id}`));
      addLog('DELETE_USER_DB_ONLY', u.username);
      alert('Auth kaydı silinemedi, sadece veritabanı kaydı silindi: ' + (err.message || err));
    }
  };
  const muteUser = async (u: any) => {
    const until = new Date(Date.now() + muteMinutes * 60000).toISOString();
    await update(ref(db, `users/${u.id}`), { is_muted: true, mute_until: until });
    addLog('MUTE', `${u.username} ${muteMinutes} dakika`);
  };
  const unmuteUser = async (u: any) => {
    await update(ref(db, `users/${u.id}`), { is_muted: false, mute_until: null });
    addLog('UNMUTE', u.username);
  };
  const resetPassword = async (u: any) => {
    if (!u.email) { alert('E-posta adresi yok'); return; }
    await sendPasswordResetEmail(auth, u.email);
    alert(`${u.email} adresine sıfırlama e-postası gönderildi`);
    addLog('RESET_PASSWORD', u.username);
  };
  const forceLogoutAll = async () => {
    if (!confirm('Tüm kullanıcılar çıkış yapacak!')) return;
    await update(ref(db, 'settings'), { force_logout: new Date().toISOString() });
    addLog('FORCE_LOGOUT_ALL', 'Tüm kullanıcılar');
  };
  const cleanInactive = async () => {
    const cutoff = new Date(Date.now() - 30 * 24 * 3600000).toISOString();
    let count = 0;
    for (const u of users) {
      if (!u.is_admin && u.created_at < cutoff && u.message_count === 0) {
        await remove(ref(db, `users/${u.id}`));
        count++;
      }
    }
    alert(`${count} pasif kullanıcı silindi`);
    addLog('CLEAN_INACTIVE', `${count} kullanıcı`);
  };

  // ─── MESSAGE ACTIONS ──────────────────────────────────────────────────────────
  const deleteMessage = async (channel: string, msgId: string) => {
    await remove(ref(db, `messages/${channel}/${msgId}`));
  };
  const clearChannelMessages = async (channelId: string) => {
    if (!confirm(`#${channelId} kanalının tüm mesajları silinsin mi?`)) return;
    await remove(ref(db, `messages/${channelId}`));
    addLog('CLEAR_MESSAGES', channelId);
  };

  // ─── CHANNEL ACTIONS ──────────────────────────────────────────────────────────
  const updateChannel = async (id: string, data: any) => {
    await update(ref(db, `channels/${id}`), data);
  };
  const deleteChannel = async (ch: any) => {
    if (!confirm(`#${ch.name} silinsin mi?`)) return;
    await remove(ref(db, `channels/${ch.id}`));
    await remove(ref(db, `messages/${ch.id}`));
    addLog('DELETE_CHANNEL', ch.name);
  };

  // ─── FORUM ACTIONS ────────────────────────────────────────────────────────────
  const deletePost = async (id: string) => {
    await remove(ref(db, `forum/${id}`));
    addLog('DELETE_FORUM_POST', id);
  };
  const clearForum = async () => {
    if (!confirm('Tüm forum gönderileri silinsin mi?')) return;
    await remove(ref(db, 'forum'));
    addLog('CLEAR_FORUM', 'Tümü');
  };

  // ─── ANNOUNCE ─────────────────────────────────────────────────────────────────
  const sendAnnouncement = async () => {
    if (!announceText.trim()) return;
    const msg = { sender_id: 'system', sender_name: '📢 Sistem', content: announceText, timestamp: new Date().toISOString(), type: 'system' };
    if (announceChannel === 'all') {
      for (const ch of channels) await push(ref(db, `messages/${ch.id}`), msg);
    } else {
      await push(ref(db, `messages/${announceChannel}`), msg);
    }
    setAnnounceText('');
    addLog('ANNOUNCE', `${announceChannel}: ${announceText.slice(0, 50)}`);
  };
  const sendBulkNotif = async () => {
    if (!notifTitle.trim()) return;
    // 1) In-app notification (Firebase RTDB)
    for (const u of users) {
      await push(ref(db, `notifications/${u.id}`), {
        type: 'system', title: notifTitle, content: notifBody,
        read: false, timestamp: new Date().toISOString()
      });
    }
    // 2) FCM push notification — Cloud Function üzerinden gönder
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const sendPush = httpsCallable(functions, 'sendBulkPushNotification');
      await sendPush({ title: notifTitle, body: notifBody });
    } catch {
      // Cloud Function yoksa sessizce geç — in-app bildirim yeterli
    }
    setNotifTitle(''); setNotifBody('');
    addLog('BULK_NOTIF', notifTitle);
  };

  const sendChannelNotif = async () => {
    if (!channelNotifTitle.trim()) return;
    const targetChannels = channelNotifChannel === 'all' ? channels : channels.filter(c => c.id === channelNotifChannel);
    for (const u of users) {
      await push(ref(db, `notifications/${u.id}`), {
        type: 'channel_announce',
        title: channelNotifTitle,
        content: channelNotifBody || channelNotifTitle,
        channel: channelNotifChannel === 'all' ? 'Tüm Kanallar' : targetChannels[0]?.name || channelNotifChannel,
        channelId: channelNotifChannel === 'all' ? null : channelNotifChannel,
        read: false,
        timestamp: new Date().toISOString(),
      });
    }
    setChannelNotifTitle(''); setChannelNotifBody('');
    addLog('CHANNEL_NOTIF', `${channelNotifChannel}: ${channelNotifTitle}`);
  };

  // ─── SETTINGS ─────────────────────────────────────────────────────────────────
  const saveSettings = async () => {
    await update(ref(db, 'settings'), {
      site_name: settings.site_name,
      welcome_message: settings.welcome_message,
      allow_registration: settings.allow_registration ? 'true' : 'false',
      maintenance_mode: settings.maintenance_mode ? 'true' : 'false',
      message_history_limit: settings.message_history_limit,
      max_users: settings.max_users,
      min_username_length: settings.min_username_length,
      banned_words: settings.banned_words,
      invite_code: settings.invite_code,
      ai_api_key: settings.ai_api_key,
    });
    addLog('SAVE_SETTINGS', 'Uygulama ayarları');
  };

  const exportData = async () => {
    const snap = await get(ref(db, '/'));
    const data = snap.val();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'nature_backup.json'; a.click();
    addLog('EXPORT_DATA', 'JSON yedek');
  };

  const exportUserData = async (u: any, format: 'resmi' | 'kvkk' | 'json') => {
      const results = await Promise.allSettled([
        get(ref(db, `users/${u.id}`)),
        get(ref(db, `nature_posts`)),
        get(ref(db, `userGuilds/${u.id}`)),
        get(ref(db, `forum`)),
        get(ref(db, `stories/${u.id}`)),
        get(ref(db, `followers/${u.id}`)),
        get(ref(db, `following/${u.id}`)),
        get(ref(db, `logs`)),
        get(ref(db, `reports`)),
      ]);

      const safeVal = (idx: number) => {
        const r = results[idx];
        return r.status === 'fulfilled' ? (r as PromiseFulfilledResult<any>).value.val() : null;
      };

      const profile = safeVal(0) || {};
      const allPosts = safeVal(1) || {};
      const guildsVal = safeVal(2) || {};
      const allForum = safeVal(3) || {};
      const storiesVal = safeVal(4) || {};
      const followersVal = safeVal(5) || {};
      const followingVal = safeVal(6) || {};
      const allLogs = safeVal(7) || {};
      const allReports = safeVal(8) || {};

      const userPosts = Object.entries(allPosts)
        .filter(([, p]: any) => p.userId === u.id)
        .map(([id, p]: any) => ({ id, content: p.content, timestamp: p.timestamp }));

      const userForum = Object.entries(allForum)
        .filter(([, p]: any) => p.author_id === u.id || p.userId === u.id)
        .map(([id, p]: any) => ({ id, title: p.title, created_at: p.created_at }));

      const userLogs = Object.entries(allLogs)
        .filter(([, l]: any) => l.userId === u.id || (l.detail || '').includes(u.username) || (l.detail || '').includes(u.id))
        .map(([id, l]: any) => ({ id, type: l.type, detail: l.detail, timestamp: l.timestamp, admin: l.admin }))
        .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

      const userReports = Object.entries(allReports)
        .filter(([, r]: any) => r.target_id === u.id || r.reported_user === u.id || r.targetId === u.id)
        .map(([id, r]: any) => ({ id, type: r.type, reason: r.reason, created_at: r.created_at }));

      const guildIds = Object.keys(guildsVal);
      const now = new Date();
      const exportedAt = now.toLocaleString('tr-TR');
      const exportedAtISO = now.toISOString();

      // ── RESMİ RAPOR (Devlet / Savcılık Talebi) ────────────────────────────────
      if (format === 'resmi') {
        const lines = [
          '╔══════════════════════════════════════════════════════════════╗',
          '║          KULLANICI BİLGİ TALEP RAPORU — RESMİ BELGE         ║',
          '╚══════════════════════════════════════════════════════════════╝',
          '',
          `  Platform          : Nature.co`,
          `  Rapor Tarihi      : ${exportedAt}`,
          `  Raporu Hazırlayan : ${auth.currentUser?.uid || '—'}`,
          `  Belge Türü        : Resmi Bilgi Talebi / Adli Kayıt`,
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '  1. KİMLİK BİLGİLERİ',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          `  Kullanıcı ID      : ${u.id}`,
          `  Kullanıcı Adı     : ${profile.username || u.username}`,
          `  E-posta           : ${profile.email || u.email || '—'}`,
          `  Kayıt Tarihi      : ${profile.created_at ? new Date(profile.created_at).toLocaleString('tr-TR') : 'Bilinmiyor'}`,
          `  Son Giriş         : ${profile.last_seen ? new Date(profile.last_seen).toLocaleString('tr-TR') : 'Bilinmiyor'}`,
          `  Hesap Durumu      : ${profile.is_banned ? 'BANLI' : 'Aktif'}`,
          `  Admin Yetkisi     : ${profile.is_admin ? 'Evet' : 'Hayır'}`,
          `  Doğrulanmış Hesap : ${profile.is_verified ? 'Evet' : 'Hayır'}`,
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '  2. TEKNİK / BAĞLANTI BİLGİLERİ',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          `  Son Bilinen IP    : ${profile.last_ip || '—'}`,
          `  Firebase UID      : ${u.id}`,
          `  Platform          : Web / PWA (Nature.co)`,
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '  3. AKTİVİTE ÖZETİ',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          `  Toplam Mesaj      : ${profile.message_count || 0}`,
          `  Gönderi Sayısı    : ${userPosts.length}`,
          `  Forum Gönderisi   : ${userForum.length}`,
          `  Hikaye Sayısı     : ${Object.keys(storiesVal).length}`,
          `  Sunucu Üyeliği    : ${guildIds.length}`,
          `  Takipçi           : ${Object.keys(followersVal).length}`,
          `  Takip Edilen      : ${Object.keys(followingVal).length}`,
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '  4. ADMİN İŞLEM GEÇMİŞİ (LOG KAYITLARI)',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          ...(userLogs.length === 0
            ? ['  Kayıt bulunamadı.']
            : userLogs.map((l: any) =>
                `  [${l.timestamp ? new Date(l.timestamp).toLocaleString('tr-TR') : '—'}] ${l.type} — ${l.detail || '—'} (Admin: ${l.admin || '—'})`
              )
          ),
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '  5. ŞİKAYET / İHLAL KAYITLARI',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          ...(userReports.length === 0
            ? ['  Şikayet kaydı bulunamadı.']
            : userReports.map((r: any) =>
                `  [${r.created_at ? new Date(r.created_at).toLocaleString('tr-TR') : '—'}] Tür: ${r.type || '—'} — Sebep: ${r.reason || '—'}`
              )
          ),
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '  6. İÇERİK KAYITLARI (Son 20 Gönderi)',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          ...(userPosts.length === 0
            ? ['  Gönderi bulunamadı.']
            : userPosts.slice(0, 20).map((p: any) =>
                `  [${p.timestamp ? new Date(p.timestamp).toLocaleString('tr-TR') : '—'}] ${(p.content || '').slice(0, 120)}${(p.content || '').length > 120 ? '...' : ''}`
              )
          ),
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '  7. FORUM KAYITLARI',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          ...(userForum.length === 0
            ? ['  Forum gönderisi bulunamadı.']
            : userForum.map((p: any) =>
                `  [${p.created_at ? new Date(p.created_at).toLocaleString('tr-TR') : '—'}] ${p.title || '—'}`
              )
          ),
          '',
          '╔══════════════════════════════════════════════════════════════╗',
          '║  Bu belge Nature.co platformu tarafından otomatik           ║',
          '║  olarak oluşturulmuştur. Resmi taleplerde kullanılabilir.   ║',
          `║  ${exportedAtISO.slice(0, 19).replace('T', ' ')} UTC                              ║`,
          '╚══════════════════════════════════════════════════════════════╝',
        ];
        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `RESMI_RAPOR_${u.username}_${u.id.slice(0, 8)}_${now.toISOString().slice(0, 10)}.txt`;
        a.click();
        addLog('EXPORT_RESMI_RAPOR', `${u.username} (${u.id})`);
        return;
      }

      // ── KVKK RAPORU (Kullanıcının Kendi Verisi) ────────────────────────────────
      if (format === 'kvkk') {
        const lines = [
          '╔══════════════════════════════════════════════════════════════╗',
          '║        KİŞİSEL VERİ RAPORU — KVKK Madde 11 Kapsamında      ║',
          '╚══════════════════════════════════════════════════════════════╝',
          '',
          `  Platform       : Nature.co`,
          `  Rapor Tarihi   : ${exportedAt}`,
          `  Veri Sahibi    : ${profile.username || u.username}`,
          '',
          '  Bu rapor, 6698 sayılı Kişisel Verilerin Korunması Kanunu',
          '  (KVKK) Madde 11 kapsamında veri sahibinin talebi üzerine',
          '  hazırlanmıştır.',
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '  1. İŞLENEN KİŞİSEL VERİLER',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          `  Kullanıcı Adı    : ${profile.username || u.username}`,
          `  E-posta          : ${profile.email || u.email || '—'}`,
          `  Kayıt Tarihi     : ${profile.created_at ? new Date(profile.created_at).toLocaleString('tr-TR') : 'Bilinmiyor'}`,
          `  Son Aktivite     : ${profile.last_seen ? new Date(profile.last_seen).toLocaleString('tr-TR') : 'Bilinmiyor'}`,
          `  Biyografi        : ${profile.bio || '—'}`,
          `  Profil Fotoğrafı : ${profile.avatar ? 'Mevcut' : 'Yok'}`,
          `  Hesap Durumu     : ${profile.is_banned ? 'Kısıtlı' : 'Aktif'}`,
          `  Doğrulama        : ${profile.is_verified ? 'Doğrulanmış' : 'Doğrulanmamış'}`,
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '  2. OLUŞTURDUĞUNUZ İÇERİKLER',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          `  Toplam Gönderi   : ${userPosts.length}`,
          `  Forum Gönderisi  : ${userForum.length}`,
          `  Hikaye           : ${Object.keys(storiesVal).length}`,
          `  Mesaj Sayısı     : ${profile.message_count || 0}`,
          '',
          '  Gönderileriniz:',
          ...(userPosts.length === 0
            ? ['    Gönderi bulunamadı.']
            : userPosts.map((p: any) =>
                `    • [${p.timestamp ? new Date(p.timestamp).toLocaleDateString('tr-TR') : '—'}] ${(p.content || '').slice(0, 100)}${(p.content || '').length > 100 ? '...' : ''}`
              )
          ),
          '',
          '  Forum Gönderileriniz:',
          ...(userForum.length === 0
            ? ['    Forum gönderisi bulunamadı.']
            : userForum.map((p: any) =>
                `    • [${p.created_at ? new Date(p.created_at).toLocaleDateString('tr-TR') : '—'}] ${p.title || '—'}`
              )
          ),
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '  3. SOSYAL VERİLER',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          `  Takipçi Sayısı   : ${Object.keys(followersVal).length}`,
          `  Takip Edilen     : ${Object.keys(followingVal).length}`,
          `  Sunucu Üyeliği   : ${guildIds.length}`,
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '  4. VERİ İŞLEME AMAÇLARI',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '  • Hesap kimlik doğrulama ve güvenlik',
          '  • Platform hizmetlerinin sunulması',
          '  • İçerik moderasyonu ve topluluk güvenliği',
          '  • Bildirim ve iletişim hizmetleri',
          '',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '  5. HAKLARINIZ (KVKK Madde 11)',
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
          '  • Kişisel verilerinizin işlenip işlenmediğini öğrenme',
          '  • İşlenmişse buna ilişkin bilgi talep etme',
          '  • Verilerin düzeltilmesini isteme',
          '  • Verilerin silinmesini veya yok edilmesini isteme',
          '  • İşlemenin kısıtlanmasını talep etme',
          '  • Veri taşınabilirliği hakkı',
          '  • Otomatik işleme sonuçlarına itiraz etme',
          '',
          '  Talepleriniz için: destek@nature.co',
          '',
          '╔══════════════════════════════════════════════════════════════╗',
          '║  Bu belge KVKK Madde 11 kapsamında hazırlanmıştır.          ║',
          `║  ${exportedAtISO.slice(0, 19).replace('T', ' ')} UTC                              ║`,
          '╚══════════════════════════════════════════════════════════════╝',
        ];
        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `KVKK_RAPORU_${u.username}_${now.toISOString().slice(0, 10)}.txt`;
        a.click();
        addLog('EXPORT_KVKK_RAPORU', `${u.username} (${u.id})`);
        return;
      }

      // ── JSON (Ham Teknik Veri) ─────────────────────────────────────────────────
      const payload = {
        exported_at: exportedAtISO,
        exported_by: auth.currentUser?.uid,
        report_type: 'raw_json',
        user: {
          id: u.id,
          username: profile.username || u.username,
          email: profile.email || u.email,
          created_at: profile.created_at || null,
          last_seen: profile.last_seen || null,
          last_ip: profile.last_ip || null,
          is_admin: profile.is_admin || false,
          is_verified: profile.is_verified || false,
          is_banned: profile.is_banned || false,
          is_muted: profile.is_muted || false,
          mute_until: profile.mute_until || null,
          message_count: profile.message_count || 0,
          xp: profile.xp || 0,
          bio: profile.bio || '',
        },
        activity: {
          posts: userPosts,
          forum_posts: userForum,
          guild_ids: guildIds,
          follower_ids: Object.keys(followersVal),
          following_ids: Object.keys(followingVal),
          story_count: Object.keys(storiesVal).length,
        },
        moderation: {
          logs: userLogs,
          reports: userReports,
        },
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `user_${u.username}_${u.id.slice(0, 8)}.json`;
      a.click();
      addLog('EXPORT_USER_DATA_JSON', `${u.username} (${u.id})`);
    };

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchUser.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const Card = ({ children, className = '' }: any) => (
    <div className={`bg-white/5 border border-white/10 rounded-xl p-4 ${className}`}>{children}</div>
  );

  const StatCard = ({ icon: Icon, label, value, color = 'text-emerald-400' }: any) => (
    <Card>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 ${color}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-white/40 text-xs">{label}</p>
          <p className="text-white font-bold text-xl">{value}</p>
        </div>
      </div>
    </Card>
  );

  const Toggle = ({ value, onChange, label }: any) => (
    <label className="flex items-center gap-3 cursor-pointer">
      <div onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full transition-all relative ${value ? 'bg-emerald-500' : 'bg-white/10'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-5' : 'left-0.5'}`} />
      </div>
      <span className="text-sm text-white/70">{label}</span>
    </label>
  );

  // Yükleniyor
  if (isAdminVerified === null) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-white/30 text-sm animate-pulse">Yetki doğrulanıyor...</div>
    </div>
  );

  // Admin değil — erişim engelle
  if (!isAdminVerified) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🚫</div>
        <p className="text-white/50 text-lg font-bold">Erişim Reddedildi</p>
        <p className="text-white/30 text-sm mt-2">Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
      </div>
    </div>
  );

  const handleCreateUser = async () => {
    if (!newUsername.trim() || !newEmail.trim() || newPassword.length < 6) {
      setCreateUserErr('Kullanıcı adı, e-posta ve en az 6 karakterli şifre gerekli');
      return;
    }
    setCreateUserLoading(true);
    setCreateUserErr('');
    setCreateUserMsg('');
    try {
      // Firebase Admin SDK olmadan kullanıcı oluşturmak için
      // mevcut oturumu bozmadan yeni kullanıcı açamayız.
      // Alternatif: sadece Firebase DB'ye kayıt açıyoruz + şifre sıfırlama maili
      const { createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } = await import('firebase/auth');
      const { getAuth } = await import('firebase/auth');

      // Secondary auth instance ile kullanıcı aç (mevcut session bozulmaz)
      const { initializeApp } = await import('firebase/app');
      const secondApp = initializeApp(
        {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: import.meta.env.VITE_FIREBASE_APP_ID,
        },
        'secondary-' + Date.now()
      );
      const secondAuth = getAuth(secondApp);
      const cred = await createUserWithEmailAndPassword(secondAuth, newEmail.trim(), newPassword);
      await updateProfile(cred.user, { displayName: newUsername.trim() });

      const uid = cred.user.uid;
      await set(ref(db, `users/${uid}`), {
        id: uid,
        username: newUsername.trim(),
        email: newEmail.trim(),
        status: 'offline',
        bio: '',
        avatar: '',
        is_admin: newIsAdmin,
        is_verified: newIsVerified,
        created_at: Date.now(),
      });
      await set(ref(db, `usernames/${newUsername.trim().toLowerCase()}`), uid);
      await set(ref(db, `userEmails/${uid}`), newEmail.trim());

      await secondAuth.signOut();

      addLog('create_user', `Yeni üye: ${newUsername.trim()} (${newEmail.trim()})${newIsAdmin ? ' [ADMİN]' : ''}${newIsVerified ? ' [DOĞRULANMIŞ]' : ''}`);
      setCreateUserMsg(`✅ "${newUsername.trim()}" hesabı başarıyla oluşturuldu!`);
      setNewUsername(''); setNewEmail(''); setNewPassword(''); setNewIsAdmin(false); setNewIsVerified(false);
    } catch (err: any) {
      const msgs: Record<string, string> = {
        'auth/email-already-in-use': 'Bu e-posta zaten kullanımda',
        'auth/invalid-email': 'Geçersiz e-posta adresi',
        'auth/weak-password': 'Şifre çok zayıf (min 6 karakter)',
      };
      setCreateUserErr(msgs[err.code] || err.message || 'Hata oluştu');
    } finally { setCreateUserLoading(false); }
  };

  return (
    <div className="flex h-full bg-[#0B0E11]">
      {/* Sidebar */}
      <div className="w-52 border-r border-white/5 flex flex-col py-4 gap-1 px-2 overflow-y-auto scrollbar-hide">
        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2 mb-2 flex-shrink-0">Admin Paneli</p>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left flex-shrink-0 ${activeTab === t.id ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ─── OVERVIEW ─── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <AdminSecuritySignalsCard />
            <h2 className="text-xl font-bold text-white">Genel Bakış</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Toplam Üye" value={users.length} />
              <StatCard icon={Activity} label="Çevrimiçi" value={onlineUsers.length} color="text-green-400" />
              <StatCard icon={Ban} label="Banlı" value={bannedCount} color="text-red-400" />
              <StatCard icon={Shield} label="Admin" value={adminCount} color="text-yellow-400" />
              <StatCard icon={MessageSquare} label="Toplam Mesaj" value={totalMsg} />
              <StatCard icon={Hash} label="Kanallar" value={channels.length} />
              <StatCard icon={FileText} label="Forum Gönderisi" value={forumPosts.length} />
              <StatCard icon={Database} label="Veri" value={`~${Math.round(totalMsg * 0.5)}KB`} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <AdminGrowthRadarCard />
              <AdminViralContentCard />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <p className="text-white/50 text-xs font-bold uppercase mb-3">En Aktif Kanal</p>
                {activeChannel ? (
                  <div className="flex items-center gap-2">
                    <Hash size={16} className="text-emerald-400" />
                    <span className="text-white font-bold">{activeChannel.name}</span>
                    <span className="text-white/40 text-xs ml-auto">{allMessages[activeChannel.id]?.length || 0} mesaj</span>
                  </div>
                ) : <p className="text-white/30 text-sm">Veri yok</p>}
              </Card>
              <Card>
                <p className="text-white/50 text-xs font-bold uppercase mb-3">Son Kayıt</p>
                {users.slice().sort((a, b) => (b.created_at || 0) - (a.created_at || 0)).slice(0, 3).map(u => (
                  <div key={u.id} className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-[10px] text-white/50">{(u.username || '?').substring(0, 1).toUpperCase()}</div>
                    <span className="text-white/70 text-sm">{u.username || u.id}</span>
                  </div>
                ))}
              </Card>
            </div>

            <div className="flex gap-3">
              <button onClick={forceLogoutAll} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/20">
                <LogOut size={14} /> Tüm Kullanıcıları Çıkart
              </button>
              <button onClick={cleanInactive} className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/20">
                <UserX size={14} /> Pasif Üyeleri Temizle
              </button>
              <button onClick={exportData} className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-sm hover:bg-blue-500/20">
                <Download size={14} /> JSON Yedek Al
              </button>
            </div>

            <AdminCommunityBrainCard />
            <AdminAiAnalyticsCard />
            <AdminModerationOverviewCard />
          </div>
        )}

        {/* ─── ROZET TALEPLERİ ─── */}
        {activeTab === 'verify' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-xl font-bold text-white">Rozet Talepleri</h2>
              {verifyRequests.filter(r => r.status === 'pending').length > 0 && (
                <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full">
                  {verifyRequests.filter(r => r.status === 'pending').length} bekliyor
                </span>
              )}
            </div>
            {verifyRequests.length === 0 ? (
              <div className="text-white/30 text-sm py-8 text-center">Henüz rozet talebi yok.</div>
            ) : (
              verifyRequests
                .sort((a, b) => (a.status === 'pending' ? -1 : 1))
                .map(req => (
                <VerifyRequestCard
                  key={req.id}
                  req={req}
                  onApprove={async () => {
                    await update(ref(db, `users/${req.userId}`), { is_verified: true });
                    await update(ref(db, `verification_requests/${req.userId}`), { status: 'approved', reviewedAt: new Date().toISOString() });
                    addLog('verify_approve', `${req.username} doğrulandı`);
                  }}
                  onReject={async (adminNote: string) => {
                    await update(ref(db, `verification_requests/${req.userId}`), { status: 'rejected', adminNote, reviewedAt: new Date().toISOString() });
                    addLog('verify_reject', `${req.username} reddedildi`);
                  }}
                />
              ))
            )}
          </div>
        )}

        {/* ─── TV KANALLARI ─── */}
        {activeTab === 'tv_channels' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Tv size={20} /> TV Kanalları</h2>
              <button
                onClick={() => { setTvForm({ id: '', name: '', emoji: '📺', desc: '', youtubeChannelId: '', color: '#10b981', order: tvChannels.length }); setTvEditId(null); setTvFormOpen(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-500/30 transition-all"
              >
                <Plus size={14} /> Kanal Ekle
              </button>
            </div>

            {/* Kanal Formu */}
            {tvFormOpen && (() => {
              // YouTube URL'inden Channel ID çıkar
              const parseYoutubeInput = (input: string): { channelId: string; videoId: string; type: 'channel' | 'video' | 'handle' | 'unknown' } => {
                const s = input.trim();
                // Direkt UC... channel ID
                if (/^UC[\w-]{22}$/.test(s)) return { channelId: s, videoId: '', type: 'channel' };
                try {
                  const url = new URL(s.startsWith('http') ? s : 'https://' + s);
                  // youtube.com/channel/UC...
                  const channelMatch = url.pathname.match(/\/channel\/(UC[\w-]{22})/);
                  if (channelMatch) return { channelId: channelMatch[1], videoId: '', type: 'channel' };
                  // youtube.com/watch?v=...  (canlı yayın video ID'si)
                  const videoId = url.searchParams.get('v') || url.pathname.match(/\/(?:embed\/|v\/|shorts\/)([\w-]{11})/)?.[1] || '';
                  if (videoId) return { channelId: '', videoId, type: 'video' };
                  // youtu.be/VIDEO_ID
                  if (url.hostname === 'youtu.be') return { channelId: '', videoId: url.pathname.slice(1), type: 'video' };
                  // youtube.com/@handle veya /c/name
                  const handle = url.pathname.match(/\/@([\w.-]+)/)?.[1] || url.pathname.match(/\/c\/([\w.-]+)/)?.[1] || url.pathname.match(/\/user\/([\w.-]+)/)?.[1];
                  if (handle) return { channelId: handle, videoId: '', type: 'handle' };
                } catch {}
                return { channelId: s, videoId: '', type: 'unknown' };
              };

              const parsed = parseYoutubeInput(tvForm.youtubeChannelId);
              const embedUrl = parsed.type === 'video'
                ? `https://www.youtube.com/embed/${parsed.videoId}?autoplay=1`
                : parsed.channelId
                  ? `https://www.youtube.com/embed/live_stream?channel=${parsed.channelId}&autoplay=1`
                  : '';
              const isValid = tvForm.youtubeChannelId.trim().length > 0;
              const statusColor = !tvForm.youtubeChannelId ? 'text-white/20' : isValid ? 'text-emerald-400' : 'text-yellow-400';
              const statusText = !tvForm.youtubeChannelId ? 'Link veya ID yapıştır' : parsed.type === 'channel' ? '✅ Channel ID algılandı' : parsed.type === 'video' ? '✅ Video ID algılandı (canlı yayın)' : parsed.type === 'handle' ? '⚠️ @kullanıcı adı — Channel ID gerekebilir' : '⚠️ Format tanınamadı, ID olarak kullanılıyor';

              return (
                <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                  <p className="text-sm font-bold text-white">{tvEditId ? '✏️ Kanal Düzenle' : '➕ Yeni Kanal'}</p>

                  {/* ANA: YouTube URL / ID alanı */}
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
                    <label className="text-xs font-bold text-emerald-400 block">🔗 YouTube Linki veya Channel ID *</label>
                    <input
                      value={tvForm.youtubeChannelId}
                      onChange={e => setTvForm(f => ({ ...f, youtubeChannelId: e.target.value.trim() }))}
                      placeholder="youtube.com/channel/UC...  veya  youtube.com/watch?v=...  veya  UC...\ direkt ID"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50"
                    />
                    <p className={`text-[11px] font-bold ${statusColor}`}>{statusText}</p>
                    {embedUrl && (
                      <div className="pt-1">
                        <p className="text-[10px] text-white/25 mb-1">Embed URL:</p>
                        <p className="text-[10px] text-emerald-400/60 font-mono break-all">{embedUrl}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Kanal Adı *</label>
                      <input value={tvForm.name} onChange={e => setTvForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="ör. TRT 1" className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Emoji</label>
                      <input value={tvForm.emoji} onChange={e => setTvForm(f => ({ ...f, emoji: e.target.value }))}
                        placeholder="📺" className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" maxLength={4} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-white/40 mb-1 block">Açıklama</label>
                      <input value={tvForm.desc} onChange={e => setTvForm(f => ({ ...f, desc: e.target.value }))}
                        placeholder="ör. Türkiye'nin ana kanalı" className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Renk</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={tvForm.color} onChange={e => setTvForm(f => ({ ...f, color: e.target.value }))}
                          className="w-10 h-9 rounded-lg cursor-pointer bg-transparent border border-white/10" />
                        <input value={tvForm.color} onChange={e => setTvForm(f => ({ ...f, color: e.target.value }))}
                          className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Sıra</label>
                      <input type="number" value={tvForm.order} onChange={e => setTvForm(f => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                    </div>
                    {!tvEditId && (
                      <div className="col-span-2">
                        <label className="text-xs text-white/40 mb-1 block">Kanal ID <span className="text-white/25">(benzersiz, boşluksuz — boş bırakılırsa otomatik oluşturulur)</span></label>
                        <input value={tvForm.id} onChange={e => setTvForm(f => ({ ...f, id: e.target.value.replace(/\s/g, '').toLowerCase() }))}
                          placeholder="ör. trt1, kanal7 — boş bırak = otomatik" className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500/50" />
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={async () => {
                        if (!tvForm.name || !isValid) return;
                        // Embed URL'i kaydet (video veya channel formatında)
                        const finalChannelId = parsed.type === 'video' ? parsed.videoId : (parsed.channelId || tvForm.youtubeChannelId.trim());
                        const channelKey = tvEditId || tvForm.id || tvForm.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                        const data = {
                          name: tvForm.name, emoji: tvForm.emoji, desc: tvForm.desc,
                          youtubeChannelId: finalChannelId,
                          embedType: parsed.type === 'video' ? 'video' : 'channel',
                          embedUrl,
                          color: tvForm.color, order: tvForm.order
                        };
                        try {
                          await set(ref(db, `tv_channels/${channelKey}`), data);
                          addLog(tvEditId ? 'TV_CHANNEL_EDIT' : 'TV_CHANNEL_ADD', tvForm.name);
                          setTvFormOpen(false); setTvEditId(null);
                        } catch (err: any) {
                          alert('Kayıt hatası: ' + (err.message || 'Bilinmeyen hata'));
                        }
                      }}
                      disabled={!tvForm.name || !isValid}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-500/30 disabled:opacity-40 transition-all"
                    >
                      <Save size={14} /> {tvEditId ? 'Güncelle' : 'Kaydet'}
                    </button>
                    <button onClick={() => { setTvFormOpen(false); setTvEditId(null); }}
                      className="px-4 py-2 text-white/40 hover:text-white text-sm transition-all">
                      İptal
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Kanal Listesi */}
            {tvChannels.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-white/30 text-sm mb-3">Firebase'de kanal yok — varsayılan TRT kanalları gösteriliyor.</p>
                <button
                  onClick={async () => {
                    for (let i = 0; i < DEFAULT_TV_CHANNELS.length; i++) {
                      const ch = DEFAULT_TV_CHANNELS[i];
                      await set(ref(db, `tv_channels/${ch.id}`), { name: ch.name, emoji: ch.emoji, desc: ch.desc, youtubeChannelId: ch.youtubeChannelId, embedUrl: (ch as any).embedUrl || '', embedType: (ch as any).embedType || 'channel', color: ch.color, order: i });
                    }
                    addLog('TV_CHANNELS_INIT', 'Varsayılan TRT kanalları eklendi');
                  }}
                  className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-500/30 transition-all"
                >
                  🌱 Varsayılan Kanalları Yükle
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {tvChannels.map((ch, idx) => (
                  <div key={ch.id} className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-all group">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border border-white/10" style={{ background: ch.color + '20' }}>
                      {ch.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{ch.name}</p>
                        <div className="w-3 h-3 rounded-full border border-white/20" style={{ background: ch.color }} />
                        <span className="text-[10px] text-white/30">#{idx + 1}</span>
                      </div>
                      <p className="text-xs text-white/40 truncate">{ch.desc}</p>
                      <p className="text-[10px] text-white/25 font-mono truncate">ID: {ch.youtubeChannelId}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => { setTvForm({ id: ch.id, name: ch.name, emoji: ch.emoji, desc: ch.desc, youtubeChannelId: ch.youtubeChannelId, color: ch.color, order: ch.order ?? idx }); setTvEditId(ch.id); setTvFormOpen(true); }}
                        className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
                        title="Düzenle"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`"${ch.name}" kanalını silmek istediğine emin misin?`)) return;
                          await remove(ref(db, `tv_channels/${ch.id}`));
                          addLog('TV_CHANNEL_DELETE', ch.name);
                        }}
                        className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all"
                        title="Sil"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl">
              <p className="text-xs text-blue-400/70">
                💡 <strong>Desteklenen formatlar:</strong><br/>
                • <span className="font-mono">youtube.com/channel/UC...</span> — Channel sayfası URL'i<br/>
                • <span className="font-mono">youtube.com/watch?v=...</span> — Canlı yayın video URL'i<br/>
                • <span className="font-mono">youtu.be/VIDEO_ID</span> — Kısa link<br/>
                • <span className="font-mono">UCxxxxxxxxxxxxxxxxxxxxxxxx</span> — Direkt Channel ID<br/>
                Herhangi birini yapıştır, sistem otomatik algılar.
              </p>
            </div>
          </div>
        )}

        {/* ─── USERS ─── */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">Kullanıcılar</h2>
              <span className="text-white/40 text-sm">({filteredUsers.length})</span>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input value={searchUser} onChange={e => setSearchUser(e.target.value)}
                placeholder="Kullanıcı ara..." className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
            </div>

            <div className="space-y-2">
              {filteredUsers.map(u => (
                <Card key={u.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-sm font-bold text-white/50 border border-white/10 shrink-0">
                    {(u.username || u.id || '?').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium text-sm">{u.username}</span>
                      {u.is_admin && <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded">ADMIN</span>}
                      {u.is_banned && <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded">BANLANDI</span>}
                      {u.is_muted && <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] font-bold rounded">SUSTURULDU</span>}
                      <div className={`w-2 h-2 rounded-full ${onlineUsers.includes(u.id) ? 'bg-emerald-400' : 'bg-white/20'}`} />
                    </div>
                    <p className="text-white/30 text-xs truncate">{u.email || 'E-posta yok'} · {u.message_count} mesaj · IP: {u.ip}</p>
                  </div>

                  {/* Mute controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!u.is_muted ? (
                      <div className="flex items-center gap-1">
                        <input type="number" value={muteMinutes} onChange={e => setMuteMinutes(+e.target.value)}
                          className="w-12 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-xs text-white text-center" />
                        <button onClick={() => muteUser(u)} title="Sustur"
                          className="p-1.5 rounded bg-orange-500/10 text-orange-400 hover:bg-orange-500/20">
                          <VolumeX size={13} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => unmuteUser(u)} title="Susturmayı kaldır"
                        className="p-1.5 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20">
                        <Volume2 size={13} />
                      </button>
                    )}
                    <button onClick={() => toggleAdmin(u)} title={u.is_admin ? 'Admin kaldır' : 'Admin yap'}
                      className={`p-1.5 rounded ${u.is_admin ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-white/40'} hover:brightness-125`}>
                      <Shield size={13} />
                    </button>
                    <button onClick={() => banUser(u)} title={u.is_banned ? 'Ban kaldır' : 'Ban'}
                      className={`p-1.5 rounded ${u.is_banned ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-white/40'} hover:brightness-125`}>
                      <Ban size={13} />
                    </button>
                    <button onClick={() => resetPassword(u)} title="Şifre sıfırla"
                      className="p-1.5 rounded bg-white/5 text-white/40 hover:text-blue-400">
                      <RefreshCw size={13} />
                    </button>
                    <button onClick={() => deleteUser(u)} title="Sil"
                      className="p-1.5 rounded bg-white/5 text-white/40 hover:text-red-400">
                      <Trash2 size={13} />
                    </button>
                    <button onClick={() => exportUserData(u, 'resmi')} title="Resmi Rapor (Devlet/Savcılık)"
                      className="p-1.5 rounded bg-white/5 text-white/40 hover:text-red-400">
                      <Shield size={13} />
                    </button>
                    <button onClick={() => exportUserData(u, 'kvkk')} title="KVKK Raporu (Kullanıcı Talebi)"
                      className="p-1.5 rounded bg-white/5 text-white/40 hover:text-emerald-400">
                      <FileText size={13} />
                    </button>
                    <button onClick={() => exportUserData(u, 'json')} title="JSON (Ham Veri)"
                      className="p-1.5 rounded bg-white/5 text-white/40 hover:text-blue-400">
                      <Download size={13} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ─── MESSAGES ─── */}
        {activeTab === 'messages' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Mesaj Yönetimi</h2>
            {channels.map(ch => (
              <Card key={ch.id}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Hash size={14} className="text-white/40" />
                    <span className="text-white font-medium text-sm">{ch.name}</span>
                    <span className="text-white/30 text-xs">({allMessages[ch.id]?.length || 0} mesaj)</span>
                  </div>
                  <button onClick={() => clearChannelMessages(ch.id)}
                    className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/20">
                    <Trash2 size={11} /> Tümünü Sil
                  </button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {(allMessages[ch.id] || []).slice(0, 20).map(m => (
                    <div key={m.id} className="flex items-start gap-2 p-2 rounded hover:bg-white/5 group">
                      <span className="text-emerald-400 text-xs font-bold shrink-0 w-20 truncate">{m.sender_name}</span>
                      <span className="text-white/60 text-xs flex-1 truncate">{m.content}</span>
                      <span className="text-white/20 text-[10px] shrink-0">{m.timestamp ? new Date(m.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      <button onClick={() => deleteMessage(ch.id, m.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-500/10 rounded">
                        <X size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ─── CHANNELS ─── */}
        {activeTab === 'channels' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Oda Yönetimi</h2>
              <button onClick={() => setShowNewChannelForm(v => !v)} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30">
                <Plus size={14} /> Yeni Kanal
              </button>
            </div>
            {showNewChannelForm && (
              <form onSubmit={async e => {
                e.preventDefault();
                const name = newChannelName.trim();
                if (!name) return;
                const id = name.toLowerCase().replace(/\s+/g, '-');
                await set(ref(db, `channels/${id}`), {
                  name, type: 'text', category: 'Sohbet', server_id: 'main', is_locked: false, slow_mode: 0,
                  ...(newChannelEmoji ? { emoji: newChannelEmoji } : {})
                });
                addLog('channel_create', `Kanal oluşturuldu: ${name}`);
                setNewChannelName('');
                setNewChannelEmoji('');
                setShowNewChannelForm(false);
              }} className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl">
                <input
                  value={newChannelEmoji}
                  onChange={e => setNewChannelEmoji(e.target.value)}
                  placeholder="🌿"
                  className="w-12 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-emerald-500/50"
                />
                <input
                  value={newChannelName}
                  onChange={e => setNewChannelName(e.target.value)}
                  placeholder="kanal-adı"
                  autoFocus
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                />
                <button type="submit" className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-400">Oluştur</button>
                <button type="button" onClick={() => setShowNewChannelForm(false)} className="px-3 py-1.5 bg-white/5 text-white/50 rounded-lg text-sm hover:bg-white/10">İptal</button>
              </form>
            )}
            {channels.map(ch => (
              <Card key={ch.id}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                    {ch.emoji ? <span className="text-base leading-none">{ch.emoji}</span> : <Hash size={14} />}
                  </div>
                  <span className="text-white font-medium">{ch.name}</span>
                  <span className="text-white/30 text-xs">{ch.type}</span>
                  <div className="flex gap-1 ml-auto">
                    {ch.is_locked && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">KİLİTLİ</span>}
                    {ch.is_readonly && <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">SALT OKU</span>}
                    {ch.is_hidden && <span className="text-[10px] px-1.5 py-0.5 bg-gray-500/20 text-gray-400 rounded">GİZLİ</span>}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 text-sm mb-3">
                  <div>
                    <p className="text-white/30 text-xs mb-1">Emoji</p>
                    <input defaultValue={ch.emoji || ''} onBlur={e => updateChannel(ch.id, { emoji: e.target.value })}
                      placeholder="🌿"
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
                  </div>
                  <div>
                    <p className="text-white/30 text-xs mb-1">Açıklama</p>
                    <input defaultValue={ch.description} onBlur={e => updateChannel(ch.id, { description: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
                  </div>
                  <div>
                    <p className="text-white/30 text-xs mb-1">Yavaş Mod (sn)</p>
                    <input type="number" defaultValue={ch.slow_mode} onBlur={e => updateChannel(ch.id, { slow_mode: +e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500/50" />
                  </div>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={ch.is_locked} onChange={e => updateChannel(ch.id, { is_locked: e.target.checked })} />
                      <span className="text-xs text-white/50">Kilitli</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={ch.is_readonly} onChange={e => updateChannel(ch.id, { is_readonly: e.target.checked })} />
                      <span className="text-xs text-white/50">Salt Okunur</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={ch.is_hidden} onChange={e => updateChannel(ch.id, { is_hidden: e.target.checked })} />
                      <span className="text-xs text-white/50">Gizli</span>
                    </label>
                  </div>
                </div>
                <button onClick={() => deleteChannel(ch)}
                  className="flex items-center gap-1 px-2 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/20">
                  <Trash2 size={11} /> Kanalı Sil
                </button>
              </Card>
            ))}
          </div>
        )}

        {/* ─── FORUM ─── */}
        {activeTab === 'forum' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Forum Yönetimi</h2>
              <button onClick={clearForum}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/20">
                <Trash2 size={14} /> Tümünü Temizle
              </button>
            </div>
            {forumPosts.map(p => (
              <Card key={p.id} className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm truncate">{p.title}</p>
                  <p className="text-white/40 text-xs">{p.author} · ❤️ {p.likes} · 💬 {p.comments}</p>
                  <p className="text-white/30 text-xs mt-1 truncate">{p.content}</p>
                </div>
                <button onClick={() => deletePost(p.id)}
                  className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 shrink-0">
                  <Trash2 size={13} />
                </button>
              </Card>
            ))}
          </div>
        )}

        {/* ─── ANNOUNCE ─── */}
        {activeTab === 'announce' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Duyurular</h2>
            <Card>
              <p className="text-white font-medium mb-3">Kanal Duyurusu Gönder</p>
              <div className="space-y-3">
                <select value={announceChannel} onChange={e => setAnnounceChannel(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                  <option value="all">Tüm Kanallar</option>
                  {channels.map(ch => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
                </select>
                <textarea value={announceText} onChange={e => setAnnounceText(e.target.value)}
                  placeholder="Duyuru metni..." rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 resize-none" />
                <button onClick={sendAnnouncement}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600">
                  <Send size={14} /> Gönder
                </button>
              </div>
            </Card>
            <Card>
              <p className="text-white font-medium mb-3">Kanal Bildirimi Gönder</p>
              <p className="text-xs text-white/40 mb-3">Seçilen kanala ait bir bildirim tüm kullanıcılara gönderilir (zil ikonu ile görünür)</p>
              <div className="space-y-3">
                <select value={channelNotifChannel} onChange={e => setChannelNotifChannel(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                  <option value="all">Tüm Kanallar</option>
                  {channels.map(ch => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
                </select>
                <input value={channelNotifTitle} onChange={e => setChannelNotifTitle(e.target.value)}
                  placeholder="Bildirim başlığı" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50" />
                <textarea value={channelNotifBody} onChange={e => setChannelNotifBody(e.target.value)}
                  placeholder="Bildirim açıklaması (opsiyonel)..." rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 resize-none" />
                <button onClick={sendChannelNotif}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-bold hover:bg-purple-600">
                  <Bell size={14} /> {users.length} Kullanıcıya Kanal Bildirimi Gönder
                </button>
              </div>
            </Card>
            <Card>
              <p className="text-white font-medium mb-3">Toplu Bildirim Gönder</p>
              <div className="space-y-3">
                <input value={notifTitle} onChange={e => setNotifTitle(e.target.value)}
                  placeholder="Başlık" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50" />
                <textarea value={notifBody} onChange={e => setNotifBody(e.target.value)}
                  placeholder="Mesaj..." rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 resize-none" />
                <button onClick={sendBulkNotif}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600">
                  <Bell size={14} /> {users.length} Kullanıcıya Gönder
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* ─── DESIGN ─── */}
        {activeTab === 'design' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Global Tasarım</h2>
            <Card>
              <p className="text-white/50 text-xs font-bold uppercase mb-4">Renkler</p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'primary_color', label: 'Ana Renk' },
                  { key: 'bg_color', label: 'Arka Plan' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <p className="text-white/40 text-xs mb-1">{label}</p>
                    <div className="flex gap-2">
                      <input type="color" value={(designSettings as any)[key]}
                        onChange={e => setDesignSettings(p => ({ ...p, [key]: e.target.value }))}
                        className="w-10 h-8 rounded cursor-pointer border-0 bg-transparent" />
                      <input value={(designSettings as any)[key]}
                        onChange={e => setDesignSettings(p => ({ ...p, [key]: e.target.value }))}
                        className="flex-1 bg-white/5 border border-white/10 rounded px-2 text-xs text-white focus:outline-none" />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <p className="text-white/50 text-xs font-bold uppercase mb-4">Yazı Tipi & Boyut</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/40 text-xs mb-1">Mesaj Font Boyutu (px)</p>
                  <input type="number" value={designSettings.font_size}
                    onChange={e => setDesignSettings(p => ({ ...p, font_size: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none" />
                </div>
                <div>
                  <p className="text-white/40 text-xs mb-1">Köşe Yuvarlaklığı (px)</p>
                  <input type="number" value={designSettings.border_radius}
                    onChange={e => setDesignSettings(p => ({ ...p, border_radius: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none" />
                </div>
              </div>
            </Card>
            <Card>
              <p className="text-white/50 text-xs font-bold uppercase mb-4">Arka Plan Stili</p>
              <div className="flex gap-2">
                {['dark', 'gradient', 'deep'].map(s => (
                  <button key={s} onClick={() => setDesignSettings(p => ({ ...p, bg_style: s }))}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${designSettings.bg_style === s ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'border-white/10 text-white/40 hover:text-white'}`}>
                    {s === 'dark' ? 'Koyu' : s === 'gradient' ? 'Gradyan' : 'Derin Karanlık'}
                  </button>
                ))}
              </div>
            </Card>
            <button onClick={async () => {
              await update(ref(db, 'settings/design'), designSettings);
              addLog('SAVE_DESIGN', 'Tasarım güncellendi');
            }} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600">
              <Save size={14} /> Tasarımı Kaydet & Uygula
            </button>
          </div>
        )}

        {/* ─── SETTINGS ─── */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Uygulama Ayarları</h2>
            <Card>
              <p className="text-white/50 text-xs font-bold uppercase mb-4">Genel</p>
              <div className="space-y-3">
                <div>
                  <p className="text-white/40 text-xs mb-1">Uygulama Adı</p>
                  <input value={settings.site_name} onChange={e => setSettings(p => ({ ...p, site_name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div>
                  <p className="text-white/40 text-xs mb-1">Hoşgeldin Mesajı</p>
                  <input value={settings.welcome_message} onChange={e => setSettings(p => ({ ...p, welcome_message: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div>
                  <p className="text-white/40 text-xs mb-1">AI API Key (Gemini/OpenRouter)</p>
                  <input value={settings.ai_api_key} onChange={e => setSettings(p => ({ ...p, ai_api_key: e.target.value }))}
                    type="password" className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div>
                  <p className="text-white/40 text-xs mb-1">Davet Kodu</p>
                  <div className="flex gap-2">
                    <input value={settings.invite_code} onChange={e => setSettings(p => ({ ...p, invite_code: e.target.value }))}
                      className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                    <button onClick={() => setSettings(p => ({ ...p, invite_code: Math.random().toString(36).substring(2, 10).toUpperCase() }))}
                      className="px-3 py-2 bg-white/5 border border-white/10 text-white/50 rounded text-sm hover:text-white">
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-white/40 text-xs mb-1">Mesaj Geçmişi Limiti</p>
                  <input type="number" value={settings.message_history_limit} onChange={e => setSettings(p => ({ ...p, message_history_limit: +e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div className="space-y-2 pt-1">
                  <Toggle value={settings.allow_registration} onChange={(v: boolean) => setSettings(p => ({ ...p, allow_registration: v }))} label="Üye Kaydına İzin Ver" />
                  <Toggle value={settings.maintenance_mode} onChange={(v: boolean) => setSettings(p => ({ ...p, maintenance_mode: v }))} label="Bakım Modu" />
                </div>
              </div>
            </Card>
            <div className="flex gap-3">
              <button onClick={saveSettings}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600">
                <Save size={14} /> Ayarları Kaydet
              </button>
              <button onClick={exportData}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white/70 rounded-lg text-sm hover:text-white">
                <Download size={14} /> JSON Yedek Al
              </button>
            </div>
          </div>
        )}

        {/* ─── SECURITY ─── */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Güvenlik</h2>
            <Card>
              <p className="text-white/50 text-xs font-bold uppercase mb-4">Kullanıcı Limitleri</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-white/40 text-xs mb-1">Maks. Kullanıcı</p>
                  <input type="number" value={settings.max_users} onChange={e => setSettings(p => ({ ...p, max_users: +e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div>
                  <p className="text-white/40 text-xs mb-1">Min. Kullanıcı Adı Uzunluğu</p>
                  <input type="number" value={settings.min_username_length} onChange={e => setSettings(p => ({ ...p, min_username_length: +e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50" />
                </div>
              </div>
            </Card>
            <Card>
              <p className="text-white/50 text-xs font-bold uppercase mb-2">Yasaklı Kelimeler</p>
              <p className="text-white/30 text-xs mb-3">Virgülle ayırın: kelime1, kelime2</p>
              <textarea value={settings.banned_words} onChange={e => setSettings(p => ({ ...p, banned_words: e.target.value }))}
                rows={3} className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 resize-none" />
            </Card>
            <div className="flex gap-3">
              <button onClick={saveSettings}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600">
                <Save size={14} /> Kaydet
              </button>
              <button onClick={forceLogoutAll}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/20">
                <LogOut size={14} /> Tüm Kullanıcıları Çıkart
              </button>
              <button onClick={cleanInactive}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-lg text-sm hover:bg-yellow-500/20">
                <UserX size={14} /> Pasif Üyeleri Temizle
              </button>
            </div>
          </div>
        )}

        {/* ─── REPORTS ─── */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Flag size={20} className="text-orange-400" /> Şikayetler
                {reports.length > 0 && <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-bold rounded-full">{reports.length}</span>}
              </h2>
              {reports.length > 0 && (
                <button onClick={async () => { if(confirm('Tüm şikayetler temizlensin mi?')) await remove(ref(db,'reports')); }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/20">
                  <Trash2 size={14} /> Tümünü Temizle
                </button>
              )}
            </div>
            {reports.length === 0 && (
              <Card><p className="text-white/40 text-sm text-center py-6">Henüz şikayet yok 🎉</p></Card>
            )}
            {reports.map((r: any) => (
              <Card key={r.id} className="border-l-2 border-orange-500/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.type === 'post' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                        {r.type === 'post' ? '📝 Gönderi' : '💬 Yorum'}
                      </span>
                      <span className="text-white/30 text-xs">{r.created_at ? new Date(r.created_at).toLocaleString('tr-TR') : ''}</span>
                    </div>
                    <p className="text-white text-sm font-medium truncate">{r.content_preview || '—'}</p>
                    <div className="text-white/40 text-xs mt-1 flex items-center gap-3">
                      <span>👤 Şikayet eden: <span className="text-white/60">{r.reporter_name || r.reporter_id}</span></span>
                      <span>✍️ İçerik sahibi: <span className="text-white/60">{r.target_author || '—'}</span></span>
                    </div>
                    {r.reason && <p className="text-orange-300/70 text-xs mt-1 italic">"{r.reason}"</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {r.post_id && (
                      <button onClick={async () => {
                        if(r.type === 'comment' && r.comment_id) {
                          await remove(ref(db, `forum_comments/${r.post_id}/${r.comment_id}`));
                        } else {
                          await remove(ref(db, `forum/${r.post_id}`));
                        }
                        await remove(ref(db, `reports/${r.id}`));
                        addLog('DELETE_REPORTED', r.content_preview?.substring(0,40) || r.id);
                      }} className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20" title="İçeriği sil">
                        <Trash2 size={13} />
                      </button>
                    )}
                    <button onClick={async () => { await remove(ref(db, `reports/${r.id}`)); }}
                      className="p-1.5 bg-white/5 text-white/40 rounded hover:bg-white/10" title="Şikayeti kapat (içerik kalsın)">
                      <Check size={13} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* ─── LOGS ─── */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Aktivite Logları</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
                  <input value={logFilter} onChange={e => setLogFilter(e.target.value)}
                    placeholder="Filtrele..." className="bg-white/5 border border-white/10 rounded pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none" />
                </div>
                <button onClick={async () => { if (confirm('Loglar temizlensin mi?')) await remove(ref(db, 'logs')); }}
                  className="flex items-center gap-1 px-2 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/20">
                  <Trash2 size={11} /> Temizle
                </button>
              </div>
            </div>
            <div className="space-y-1">
              {logs.filter(l => !logFilter || l.action?.includes(logFilter.toUpperCase()) || l.detail?.includes(logFilter)).map(l => (
                <div key={l.id} className="flex items-center gap-3 px-3 py-2 bg-white/3 border border-white/5 rounded-lg">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 shrink-0">{l.action}</span>
                  <span className="text-white/60 text-xs flex-1 truncate">{l.detail}</span>
                  <span className="text-white/20 text-[10px] shrink-0">{l.admin}</span>
                  <span className="text-white/20 text-[10px] shrink-0">{l.timestamp ? new Date(l.timestamp).toLocaleString('tr-TR') : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}


        {activeTab === 'create_user' && (
          <div className="p-6 max-w-lg mx-auto space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <UserPlus size={20} className="text-emerald-400" />
              </div>
              <div>
                <h2 className="text-white font-black text-lg tracking-tight">Üye Oluştur</h2>
                <p className="text-white/30 text-xs">Yeni bir kullanıcı hesabı manuel oluştur</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Kullanıcı adı */}
              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><AtSign size={11} /> Kullanıcı Adı</label>
                <input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="kullaniciadi"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/40 transition-colors" />
              </div>

              {/* E-posta */}
              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Mail size={11} /> E-posta</label>
                <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="ornek@email.com" type="email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/40 transition-colors" />
              </div>

              {/* Şifre */}
              <div>
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><KeyRound size={11} /> Şifre <span className="text-white/20 normal-case font-normal">(min 6 karakter)</span></label>
                <input value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" type="password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-emerald-500/40 transition-colors" />
              </div>

              {/* Yetkiler */}
              <div className="grid grid-cols-2 gap-3">
                <div onClick={() => setNewIsAdmin(v => !v)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${newIsAdmin ? 'bg-red-500/10 border-red-500/30' : 'bg-white/3 border-white/8 hover:border-white/15'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${newIsAdmin ? 'bg-red-500/20' : 'bg-white/5'}`}>
                    <Shield size={15} className={newIsAdmin ? 'text-red-400' : 'text-white/30'} />
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${newIsAdmin ? 'text-red-400' : 'text-white/50'}`}>Admin</div>
                    <div className="text-[10px] text-white/20">Tam yetki</div>
                  </div>
                  <div className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center ${newIsAdmin ? 'border-red-400 bg-red-400' : 'border-white/20'}`}>
                    {newIsAdmin && <Check size={9} color="#fff" strokeWidth={3} />}
                  </div>
                </div>

                <div onClick={() => setNewIsVerified(v => !v)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${newIsVerified ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/3 border-white/8 hover:border-white/15'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${newIsVerified ? 'bg-blue-500/20' : 'bg-white/5'}`}>
                    <BadgeCheck size={15} className={newIsVerified ? 'text-blue-400' : 'text-white/30'} />
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${newIsVerified ? 'text-blue-400' : 'text-white/50'}`}>Doğrulanmış</div>
                    <div className="text-[10px] text-white/20">Mavi rozet</div>
                  </div>
                  <div className={`ml-auto w-4 h-4 rounded-full border-2 flex items-center justify-center ${newIsVerified ? 'border-blue-400 bg-blue-400' : 'border-white/20'}`}>
                    {newIsVerified && <Check size={9} color="#fff" strokeWidth={3} />}
                  </div>
                </div>
              </div>

              {createUserErr && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <AlertTriangle size={14} className="text-red-400 shrink-0" />
                  <p className="text-red-400 text-sm">{createUserErr}</p>
                </div>
              )}
              {createUserMsg && (
                <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <Check size={14} className="text-emerald-400 shrink-0" />
                  <p className="text-emerald-400 text-sm">{createUserMsg}</p>
                </div>
              )}

              <button onClick={handleCreateUser} disabled={createUserLoading || !newUsername.trim() || !newEmail.trim() || newPassword.length < 6}
                className="w-full py-3.5 bg-emerald-500 text-black font-black text-sm rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 tracking-wider uppercase">
                {createUserLoading ? (
                  <><RefreshCw size={15} className="animate-spin" /> Oluşturuluyor...</>
                ) : (
                  <><UserPlus size={15} strokeWidth={3} /> Hesabı Oluştur</>
                )}
              </button>

              <p className="text-center text-[11px] text-white/20">
                Oluşturulan kullanıcı Firebase Auth + Database'e kaydedilir
              </p>
            </div>
          </div>
        )}

        {/* ─── DESTEK TALEPLERİ ─── */}
        {activeTab === 'support' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Mail size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Destek Talepleri</h2>
                  <p className="text-xs text-white/30">{supportTickets.filter(t => t.status === 'open').length} açık talep</p>
                </div>
              </div>
              <div className="flex gap-2">
                {(['all','open','closed'] as const).map(f => (
                  <button key={f} onClick={() => setTicketFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${ticketFilter === f ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/30 hover:text-white hover:bg-white/5'}`}>
                    {f === 'all' ? 'Tümü' : f === 'open' ? 'Açık' : 'Kapalı'}
                  </button>
                ))}
              </div>
            </div>

            {selectedTicket ? (
              <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <button onClick={() => setSelectedTicket(null)} className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors">
                    <ChevronRight size={14} className="rotate-180" /> Geri
                  </button>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${selectedTicket.status === 'open' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                    {selectedTicket.status === 'open' ? 'Açık' : 'Kapalı'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/3 rounded-xl p-3">
                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Ad Soyad</div>
                    <div className="text-white font-semibold">{selectedTicket.fullName}</div>
                  </div>
                  <div className="bg-white/3 rounded-xl p-3">
                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Kullanıcı Adı</div>
                    <div className="text-white/70">{selectedTicket.username || '—'}</div>
                  </div>
                  <div className="bg-white/3 rounded-xl p-3">
                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">E-posta</div>
                    <a href={`mailto:${selectedTicket.email}`} className="text-emerald-400 hover:underline">{selectedTicket.email}</a>
                  </div>
                  <div className="bg-white/3 rounded-xl p-3">
                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Telefon</div>
                    <div className="text-white/70">{selectedTicket.phone || '—'}</div>
                  </div>
                  <div className="bg-white/3 rounded-xl p-3">
                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Kategori</div>
                    <div className="text-white/70 capitalize">{selectedTicket.category}</div>
                  </div>
                  <div className="bg-white/3 rounded-xl p-3">
                    <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Tarih</div>
                    <div className="text-white/70">{selectedTicket.createdAt ? new Date(selectedTicket.createdAt).toLocaleString('tr-TR') : '—'}</div>
                  </div>
                </div>
                <div className="bg-white/3 rounded-xl p-4">
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Konu</div>
                  <div className="text-white font-semibold mb-3">{selectedTicket.subject}</div>
                  <div className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Mesaj</div>
                  <div className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">{selectedTicket.message}</div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { update(ref(db, `support_tickets/${selectedTicket.id}`), { status: selectedTicket.status === 'open' ? 'closed' : 'open' }); setSelectedTicket((t: any) => ({...t, status: t.status === 'open' ? 'closed' : 'open'})); }}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${selectedTicket.status === 'open' ? 'bg-white/5 hover:bg-white/10 text-white/60' : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400'}`}>
                    {selectedTicket.status === 'open' ? 'Kapat' : 'Yeniden Aç'}
                  </button>
                  <a href={`mailto:${selectedTicket.email}?subject=Re: ${encodeURIComponent(selectedTicket.subject)}`}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 transition-all text-center">
                    E-posta ile Yanıtla
                  </a>
                  <button onClick={() => { if(confirm('Bu talebi silmek istediğinize emin misiniz?')) { remove(ref(db, `support_tickets/${selectedTicket.id}`)); setSelectedTicket(null); } }}
                    className="px-4 py-2.5 rounded-xl text-sm font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {supportTickets.filter(t => ticketFilter === 'all' || t.status === ticketFilter).length === 0 ? (
                  <div className="text-center py-16 text-white/20">
                    <Mail size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Henüz destek talebi yok</p>
                  </div>
                ) : (
                  supportTickets.filter(t => ticketFilter === 'all' || t.status === ticketFilter).map(ticket => (
                    <div key={ticket.id} onClick={() => setSelectedTicket(ticket)}
                      className="flex items-center gap-4 p-4 bg-white/3 border border-white/8 rounded-xl hover:border-emerald-500/20 cursor-pointer transition-all group">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${ticket.status === 'open' ? 'bg-emerald-400' : 'bg-white/20'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-white truncate">{ticket.subject}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-white/30 shrink-0 capitalize">{ticket.category}</span>
                        </div>
                        <div className="text-xs text-white/40 truncate">{ticket.fullName} · {ticket.email}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-white/25">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('tr-TR') : ''}</div>
                        <ChevronRight size={14} className="text-white/20 group-hover:text-emerald-400 transition-colors ml-auto mt-1" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── OYUN ONAYLARI ─── */}
        {activeTab === 'game_approvals' && (
          <div className="space-y-6">
            {/* Sunucu Onayları */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Shield size={16} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Oyun Sunucusu Onayları</h2>
                  <p className="text-xs text-white/30">{gameServers.filter(s => !s.approved).length} bekleyen sunucu</p>
                </div>
              </div>
              {gameServers.length === 0 ? (
                <div className="text-center py-10 text-white/20">
                  <Shield size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Henüz sunucu yok</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {gameServers.map(s => (
                    <div key={s.id} className="flex items-center gap-4 p-4 bg-white/3 border border-white/8 rounded-xl">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${s.approved ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-white">{s.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-white/30">{s.game}</span>
                          {s.approved && <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400">Onaylı</span>}
                          {!s.approved && <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400">Bekliyor</span>}
                        </div>
                        <div className="text-xs text-white/40 font-mono">{s.ip}</div>
                        {s.description && <div className="text-xs text-white/30 mt-0.5 truncate">{s.description}</div>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => update(ref(db, `game_servers/${s.id}`), { approved: !s.approved })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${s.approved ? 'bg-white/5 text-white/40 hover:bg-red-500/10 hover:text-red-400' : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'}`}>
                          {s.approved ? 'Onayı Kaldır' : 'Onayla'}
                        </button>
                        <button
                          onClick={() => { if(confirm('Bu sunucuyu silmek istediğinize emin misiniz?')) remove(ref(db, `game_servers/${s.id}`)); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Turnuva Listesi */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Shield size={16} className="text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Turnuvalar</h2>
                  <p className="text-xs text-white/30">{tournaments.length} turnuva</p>
                </div>
              </div>
              {tournaments.length === 0 ? (
                <div className="text-center py-10 text-white/20">
                  <Shield size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Henüz turnuva yok</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tournaments.map(t => (
                    <div key={t.id} className="flex items-center gap-4 p-4 bg-white/3 border border-white/8 rounded-xl">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-white">{t.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-white/30">{t.game}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md ${t.status === 'upcoming' ? 'bg-blue-500/15 text-blue-400' : t.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                            {t.status === 'upcoming' ? 'Yaklaşan' : t.status === 'active' ? 'Aktif' : 'Bitti'}
                          </span>
                        </div>
                        <div className="text-xs text-white/40">
                          {(t.participants || []).length}/{t.maxTeams} katılımcı
                          {t.date && ` · ${new Date(t.date).toLocaleDateString('tr-TR')}`}
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <select
                          value={t.status || 'upcoming'}
                          onChange={e => update(ref(db, `tournaments/${t.id}`), { status: e.target.value })}
                          className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
                          <option value="upcoming" className="bg-[#111]">Yaklaşan</option>
                          <option value="active" className="bg-[#111]">Aktif</option>
                          <option value="ended" className="bg-[#111]">Bitti</option>
                        </select>
                        <button
                          onClick={() => { if(confirm('Bu turnuvayı silmek istediğinize emin misiniz?')) remove(ref(db, `tournaments/${t.id}`)); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};