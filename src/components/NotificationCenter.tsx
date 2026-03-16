import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, UserPlus, MessageSquare, Gamepad2, X, CheckCheck, Trash2 } from 'lucide-react';
import { listenNotifications, acceptFriendRequest, rejectFriendRequest } from '../services/firebaseService';
import { update, ref, remove } from 'firebase/database';
import { db } from '../firebase';

interface NotificationCenterProps {
  theme: any;
  userId: string;
}

export const NotificationCenter = ({ theme, userId }: NotificationCenterProps) => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!userId) return;
    const unsub = listenNotifications(userId, setNotifications);
    return unsub;
  }, [userId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleOpen = async () => {
    setOpen(true);
    if (unreadCount === 0) return;
    const updates: Record<string, boolean> = {};
    notifications.filter(n => !n.read).forEach(n => {
      updates[`notifications/${userId}/${n.id}/read`] = true;
    });
    if (Object.keys(updates).length > 0) {
      await update(ref(db, '/'), updates).catch(() => {});
    }
  };

  const handleMarkAllRead = async () => {
    const updates: Record<string, boolean> = {};
    notifications.filter(n => !n.read).forEach(n => {
      updates[`notifications/${userId}/${n.id}/read`] = true;
    });
    if (Object.keys(updates).length > 0) {
      await update(ref(db, '/'), updates).catch(() => {});
    }
  };

  const handleClearAll = async () => {
    await remove(ref(db, `notifications/${userId}`)).catch(() => {});
  };

  const handleAcceptFriend = async (notif: any) => {
    await acceptFriendRequest(userId, notif.from_id, notif.id);
  };

  const handleRejectFriend = async (notif: any) => {
    await rejectFriendRequest(userId, notif.from_id, notif.id);
  };

  const icons: Record<string, any> = {
    friend_request: <UserPlus size={16} className="text-blue-400" />,
    friend_accept: <UserPlus size={16} className="text-emerald-400" />,
    mention: <MessageSquare size={16} className="text-emerald-400" />,
    game_invite: <Gamepad2 size={16} className="text-purple-400" />,
    message: <MessageSquare size={16} className="text-white/40" />,
    system: <Bell size={16} className="text-yellow-400" />,
    channel_announce: <Bell size={16} className="text-purple-400" />,
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => open ? setOpen(false) : handleOpen()}
        className="relative p-2 text-white/40 hover:text-white transition-all"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute left-0 top-10 w-80 bg-[#1a1d21] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">{t('settings.notifications')}</h3>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <>
                    {notifications.some(n => !n.read) && (
                      <button onClick={handleMarkAllRead} className="text-white/40 hover:text-emerald-400 transition-all" title="Tümünü okundu işaretle">
                        <CheckCheck size={15} />
                      </button>
                    )}
                    <button onClick={handleClearAll} className="text-white/40 hover:text-red-400 transition-all" title="Tümünü temizle">
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
                <button onClick={() => setOpen(false)} className="text-white/40 hover:text-white">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-white/30 text-sm">
                  <Bell size={32} className="mx-auto mb-2 opacity-20" />
                  Bildirim yok                </div>
              ) : (
                notifications.map(notif => (
                  <div key={notif.id} className={`p-4 border-b border-white/5 flex items-start gap-3 transition-all ${!notif.read ? 'bg-white/[0.04]' : ''}`}>
                    <div className="mt-0.5 flex-shrink-0 relative">
                      {!notif.read && <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-400 rounded-full" />}
                      {icons[notif.type] || <Bell size={16} className="text-white/40" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {notif.title && <p className={`text-xs font-bold mb-0.5 ${notif.read ? 'text-white/40' : 'text-white/70'}`}>{notif.title}</p>}
                      <p className={`text-sm ${notif.read ? 'text-white/50' : 'text-white/90'}`}>{notif.content}</p>
                      {notif.type === 'channel_announce' && notif.channel && (
                        <p className="text-[10px] text-purple-400/70 mt-0.5">📢 #{notif.channel}</p>
                      )}
                      <p className="text-[10px] text-white/30 mt-0.5">{new Date(notif.timestamp).toLocaleString('tr-TR')}</p>
                      {notif.type === 'friend_request' && (
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => handleAcceptFriend(notif)} className="px-3 py-1 bg-emerald-500 text-white text-xs rounded-lg font-bold hover:bg-emerald-600 transition-all">
                            Kabul Et
                          </button>
                          <button onClick={() => handleRejectFriend(notif)} className="px-3 py-1 bg-white/10 text-white/60 text-xs rounded-lg font-bold hover:bg-red-500/20 hover:text-red-400 transition-all">
                            Reddet
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
