import React from 'react';
import { motion } from 'motion/react';
import { Compass, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SearchServerProps {
  theme: any;
  onJoin: () => void;
}

export const SearchServer = ({ theme, onJoin }: SearchServerProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col bg-[#0B0E11] overflow-hidden">
      <header className="h-14 border-b border-white/5 flex items-center px-6 justify-between bg-black/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Compass size={20} className="text-blue-500" />
          <h3 className="font-bold text-white uppercase tracking-widest text-sm">{t('search.discoverServers')}</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={14} />
          <input 
            type="text" 
            placeholder={t('search.communitySearch')} 
            className="bg-white/5 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-blue-500/50 w-64 transition-all" 
          />
        </div>
      </header>

      <div className="flex-1 p-12 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h2 className="text-3xl font-black text-white mb-2">{t('search.popularCommunities')}</h2>
            <p className="text-white/40 text-sm">{t('search.popularCommunitiesDesc')}</p>
          </div>

          <div className="grid grid-cols-3 gap-8">
            {[
              { name: 'Yazılım Dünyası', members: '1.2k', color: 'bg-blue-500' },
              { name: 'Doğa Fotoğrafçılığı', members: '850', color: 'bg-emerald-500' },
              { name: 'Oyun Geliştirme', members: '2.4k', color: 'bg-purple-500' },
              { name: 'Müzik Odası', members: '500', color: 'bg-orange-500' },
              { name: 'Kitap Kulübü', members: '320', color: 'bg-red-500' },
              { name: 'Yapay Zeka Lab', members: '4.1k', color: 'bg-indigo-500' },
            ].map((s, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="p-8 bg-white/5 border border-white/10 rounded-[32px] flex flex-col items-center text-center group hover:border-white/20 transition-all cursor-pointer"
              >
                <div className={`w-20 h-20 ${s.color} rounded-[30px] mb-6 shadow-2xl shadow-black/40 flex items-center justify-center text-white text-2xl font-black group-hover:scale-110 transition-transform`}>
                  {s.name.substr(0, 1)}
                </div>
                <h4 className="text-lg font-bold text-white mb-1">{s.name}</h4>
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mb-6">{s.members} {t('guild.members')}</p>
                <button 
                  onClick={onJoin} 
                  className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-bold transition-all border border-white/10"
                >
                  {t('guild.join').toUpperCase()}
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
