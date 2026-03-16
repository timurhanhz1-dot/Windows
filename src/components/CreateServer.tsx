import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CreateServerProps {
  theme: any;
  onServerCreated: () => void;
}

export const CreateServer = ({ theme, onServerCreated }: CreateServerProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0B0E11] p-12 text-center">
      <div className="w-24 h-24 bg-emerald-500/10 rounded-[40px] flex items-center justify-center mb-8 border border-emerald-500/20">
        <Plus size={48} className="text-emerald-500" />
      </div>
      <h2 className="text-4xl font-black text-white mb-4">{t('server.createTitle', 'Yeni Bir Dünya Kur')}</h2>
      <p className="text-white/40 mb-12 max-w-sm">{t('server.createDesc', 'Kendi topluluğunu oluştur, arkadaşlarını davet et ve ekosistemi birlikte büyütün.')}</p>
      
      <div className="w-full max-w-md space-y-6">
        <div className="text-left">
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-2 ml-2">{t('server.nameLabel', 'Sunucu Adı')}</label>
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder={t('server.namePlaceholder', 'örn: Doğa Dostları')}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-emerald-500/50 transition-all" 
          />
        </div>
        <button 
          onClick={onServerCreated} 
          disabled={!name.trim()}
          className={`w-full py-4 rounded-2xl font-black text-sm transition-all ${name.trim() ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-[1.02]' : 'bg-white/5 text-white/10'}`}
        >
          {t('server.createButton', 'SUNUCUYU OLUŞTUR')}
        </button>
      </div>
    </div>
  );
};
