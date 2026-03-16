import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { X, MessageSquare, UserPlus, UserX, Shield, Flag, Star, Zap, Award, ExternalLink } from 'lucide-react';
import { db } from '../firebase';
import { ref, get, push, update, set, remove } from 'firebase/database';
import { getEarnedBadges, getLevel } from '../services/securityService';

interface Props {
  userId: string;        // kart açan kişi
  targetId: string;      // profili görüntülenen
  allUsers: any[];
  onClose: () => void;
  onDM: (id: string) => void;
}

export const UserProfileCard = ({ userId, targetId, allUsers, onClose, onDM }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [target, setTarget] = useState<any>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    get(ref(db, `users/${targetId}`)).then(snap => { if (snap.exists()) setTarget(snap.val()); });
    get(ref(db, `users/${userId}/friends/${targetId}`)).then(s => setIsFriend(s.exists()));
    get(ref(db, `users/${userId}/blocked/${targetId}`)).then(s => setIsBlocked(s.exists()));
  }, [targetId, userId]);

  const sendRequest = async () => {
    await push(ref(db, `friend_requests/${targetId}`), { from: userId, timestamp: new Date().toISOString() });
    await push(ref(db, `notifications/${targetId}`), {
      type: 'friend_request', from_id: userId,
      content: `${allUsers.find(u => u.id === userId)?.username || 'Biri'} sana arkadaşlık isteği gönderdi`,
      read: false, timestamp: new Date().toISOString()
    });
    alert(t('userCard.requestSent'));
  };

  const block = async () => {
    await set(ref(db, `users/${userId}/blocked/${targetId}`), true);
    await remove(ref(db, `users/${userId}/friends/${targetId}`));
    await remove(ref(db, `users/${targetId}/friends/${userId}`));
    setIsBlocked(true); setIsFriend(false);
  };

  const report = async () => {
    await push(ref(db, 'logs'), {
      action: 'USER_REPORT', detail: `${allUsers.find(u => u.id === userId)?.username} → ${target?.username}`,
      timestamp: new Date().toISOString(), admin: 'system'
    });
    alert(t('userCard.reportSent'));
  };

  if (!target) return null;

  const badges = getEarnedBadges(target.message_count || 0);
  const level = getLevel(target.xp || 0);
  const xpProgress = ((target.xp || 0) % (level * level * 100)) / (level * level * 100) * 100;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="w-80 bg-[#111418] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {/* Banner */}
          <div className="h-20 bg-gradient-to-r from-emerald-900/60 to-teal-900/60 relative">
            <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-full bg-black/30 text-white/60 hover:text-white">
              <X size={14} />
            </button>
          </div>
          {/* Avatar */}
          <div className="px-5 pb-5">
            <div className="flex items-end justify-between -mt-10 mb-3">
              <div
                className="w-16 h-16 rounded-2xl border-4 border-[#111418] bg-white/10 flex items-center justify-center text-xl font-black text-white/60 overflow-hidden cursor-pointer hover:ring-2 hover:ring-emerald-500/50 transition-all"
                onClick={() => { navigate(`/profile/${targetId}`); onClose(); }}
                title="Profili Gör"
              >
                {target.avatar ? <img src={target.avatar} className="w-full h-full object-cover" /> : target.username?.substring(0, 2).toUpperCase()}
              </div>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => { navigate(`/profile/${targetId}`); onClose(); }}
                  className="p-2 rounded-lg bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all"
                  title="Profili Gör"
                >
                  <ExternalLink size={15} />
                </button>
                {!isBlocked && targetId !== userId && (
                  <>
                    <button onClick={() => { onDM(targetId); onClose(); }} className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" title="Mesaj">
                      <MessageSquare size={15} />
                    </button>
                    {!isFriend && (
                      <button onClick={sendRequest} className="p-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20" title="Arkadaş ekle">
                        <UserPlus size={15} />
                      </button>
                    )}
                    <button onClick={block} className="p-2 rounded-lg bg-white/5 text-white/30 hover:text-orange-400" title="Engelle">
                      <Shield size={15} />
                    </button>
                    <button onClick={report} className="p-2 rounded-lg bg-white/5 text-white/30 hover:text-red-400" title="Şikayet">
                      <Flag size={15} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <h3
                className="text-white font-bold text-lg cursor-pointer hover:text-emerald-400 transition-colors"
                onClick={() => { navigate(`/profile/${targetId}`); onClose(); }}
              >{target.username}</h3>
                {target.is_admin && <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded font-bold">ADMIN</span>}
                {isFriend && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">{t('userCard.friend')}</span>}
              </div>
              <p className="text-white/40 text-xs mt-0.5">{target.status === 'online' ? `🟢 ${t('userCard.online')}` : `⚫ ${t('userCard.offline')}`}</p>
              {target.bio && <p className="text-white/60 text-sm mt-2">{target.bio}</p>}
              {target.status_message && <p className="text-white/40 text-xs italic mt-1">"{target.status_message}"</p>}
            </div>
            {/* XP Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-white/40 mb-1">
                <span>{t('userCard.level')} {level}</span>
                <span>{target.xp || 0} XP</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${xpProgress}%` }} />
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-white/5 rounded-xl p-2 text-center">
                <p className="text-white font-bold text-lg">{target.message_count || 0}</p>
                <p className="text-white/30 text-xs">{t('userCard.messages')}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-2 text-center">
                <p className="text-white font-bold text-lg">{level}</p>
                <p className="text-white/30 text-xs">{t('userCard.level')}</p>
              </div>
            </div>
            {/* Badges */}
            {badges.length > 0 && (
              <div>
                <p className="text-white/30 text-xs mb-2">Rozetler</p>
                <div className="flex flex-wrap gap-1">
                  {badges.map(b => (
                    <span key={b.id} className="text-sm px-2 py-1 bg-white/5 rounded-lg border border-white/10" title={b.label}>
                      {b.icon} <span className="text-white/50 text-[10px]">{b.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
