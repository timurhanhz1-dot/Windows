import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { ref, get } from 'firebase/database';

interface Props {
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  allUsers: any[];
  isOwn?: boolean;
}

export function MiniProfileCard({ senderId, senderName, senderAvatar, allUsers, isOwn }: Props) {
  const { t } = useTranslation();
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (!senderId) return;
    get(ref(db, `users/${senderId}`)).then(snap => {
      if (snap.exists()) setUserData(snap.val());
    }).catch(() => {});
  }, [senderId]);

  const user = userData || allUsers.find(u => u.id === senderId);
  if (!user) return <div className="text-white/40 text-xs p-1">{t('common.loading')}</div>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
          {(senderAvatar || user.avatar)
            ? <img src={senderAvatar || user.avatar} className="w-full h-full object-cover" alt="" />
            : (senderName || '?').substring(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <p className="text-white text-sm font-bold truncate">{user.username || senderName}</p>
            {user.is_verified && <span className="text-[9px] text-cyan-400 font-bold">✓</span>}
            {user.is_admin && <span className="text-[9px] px-1 bg-yellow-500/20 text-yellow-400 rounded font-bold">ADMİN</span>}
          </div>
          <p className="text-[10px] text-white/40">
            {user.status === 'online' ? `🟢 ${t('common.online')}` : `⚫ ${t('common.offline')}`}
          </p>
        </div>
      </div>
      {user.bio && (
        <p className="text-[11px] text-white/60 leading-relaxed line-clamp-2">{user.bio}</p>
      )}
      {user.status_message && (
        <p className="text-[10px] text-white/40 italic">"{user.status_message}"</p>
      )}
      <div className="flex gap-2 text-[10px] text-white/30 border-t border-white/5 pt-2">
        <span>{user.message_count || 0} {t('chat.messageCount', { count: user.message_count || 0 })}</span>
        <span>·</span>
        <span>{t('profile.level', 'Level')} {Math.floor(Math.sqrt((user.xp || 0) / 100)) + 1}</span>
        {user.eco_points > 0 && <><span>·</span><span>{user.eco_points} 🌿</span></>}
      </div>
    </div>
  );
}
