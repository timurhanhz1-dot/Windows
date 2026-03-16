import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Crown, Users, ChevronRight } from 'lucide-react';
import { listenUserGuilds } from '../services/guildService';

interface GuildListCompactProps {
  userId: string;
  onGuildClick: (guild: any) => void;
  theme: any;
}

export const GuildListCompact: React.FC<GuildListCompactProps> = ({ userId, onGuildClick, theme }) => {
  const [userGuilds, setUserGuilds] = useState<any[]>([]);

  useEffect(() => {
    const unsub = listenUserGuilds(userId, (guilds) => {
      setUserGuilds(guilds);
    });
    return unsub;
  }, [userId]);

  if (userGuilds.length === 0) {
    return (
      <div className="px-2 py-1">
        <div className="px-3 py-2 text-[10px] text-white/20 italic">
          Henüz grup yok
        </div>
      </div>
    );
  }

  return (
    <div className="px-2 space-y-1">
      {userGuilds.slice(0, 3).map(guild => (
        <motion.div
          key={guild.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => onGuildClick(guild)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-all hover:bg-white/5 text-white/50 hover:text-white group"
        >
          <div 
            className="w-6 h-6 rounded-lg flex items-center justify-center text-xs shadow-sm flex-shrink-0" 
            style={{ background: guild.color || '#10b981' }}
          >
            {guild.emoji || '🌿'}
          </div>
          <span className="text-xs font-medium flex-1 truncate">{guild.name}</span>
          {guild.owner_id === userId && <Crown size={10} className="text-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
          <ChevronRight size={10} className="text-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.div>
      ))}
      {userGuilds.length > 3 && (
        <div className="px-3 py-1 text-[10px] text-white/20 italic">
          +{userGuilds.length - 3} daha fazla
        </div>
      )}
    </div>
  );
};

export default GuildListCompact;
