import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2 } from 'lucide-react';
import { db } from '../firebase';
import { ref, onValue, off, set, remove } from 'firebase/database';

// Statik sticker paketi — harici API yok, güvenlik riski yok
const STICKER_CATEGORIES = [
  {
    id: 'nature',
    label: '🌿 Doğa',
    stickers: ['🌿', '🍃', '🌱', '🌲', '🌳', '🌴', '🌵', '🌾', '🍀', '🌺', '🌸', '🌼', '🌻', '🌹', '🌷', '🍁', '🍂', '🍄', '🌊', '🏔️', '🌋', '🏕️', '🌅', '🌄', '🌈', '⛅', '🌙', '⭐', '🌟', '☀️'],
  },
  {
    id: 'animals',
    label: '🦋 Hayvanlar',
    stickers: ['🦋', '🐝', '🐞', '🦎', '🐢', '🦜', '🦚', '🦩', '🦢', '🦅', '🦉', '🐦', '🐧', '🐸', '🐠', '🐬', '🐳', '🦭', '🦊', '🐺', '🦝', '🐻', '🐼', '🦁', '🐯', '🦌', '🐘', '🦒', '🦓', '🐆'],
  },
  {
    id: 'reactions',
    label: '😄 Tepkiler',
    stickers: ['😄', '😂', '🤣', '😍', '🥰', '😎', '🤩', '🥳', '😇', '🤗', '🤔', '😮', '😱', '😭', '😤', '🤯', '🥺', '😴', '🤤', '😋', '🤭', '🫡', '🫶', '👏', '🙌', '🤝', '✌️', '🤞', '👍', '❤️'],
  },
  {
    id: 'activities',
    label: '⚡ Aktivite',
    stickers: ['⚡', '🔥', '💧', '🌊', '🏄', '🧗', '🏕️', '🚵', '🤸', '🧘', '🌿', '♻️', '🌍', '💚', '🌱', '🌻', '🍃', '🌬️', '❄️', '🌤️', '⛺', '🏞️', '🛶', '🧭', '🔭', '🌌', '🪐', '🌠', '🎆', '🎇'],
  },
  {
    id: 'food',
    label: '🍎 Yiyecek',
    stickers: ['🍎', '🍊', '🍋', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🥦', '🥕', '🌽', '🍄', '🥜', '🌰', '🍞', '🧀', '🥚', '🍯', '🫖', '🍵', '🧃', '🥤', '🍵', '🌿'],
  },
];

const MY_STICKERS_ID = 'my';
const MAX_CUSTOM = 30;

interface StickerPickerProps {
  onSelect: (sticker: string) => void;
  onClose: () => void;
  userId?: string;
}

export const StickerPicker = ({ onSelect, onClose, userId }: StickerPickerProps) => {
  const [activeCategory, setActiveCategory] = useState(MY_STICKERS_ID);
  const [customStickers, setCustomStickers] = useState<string[]>([]);
  const [addInput, setAddInput] = useState('');
  const [addError, setAddError] = useState('');
  const [deleteMode, setDeleteMode] = useState(false);

  // Firebase'den kişisel sticker'ları dinle
  useEffect(() => {
    if (!userId) return;
    const r = ref(db, `users/${userId}/custom_stickers`);
    const unsub = onValue(r, snap => {
      const data = snap.val();
      if (!data) { setCustomStickers([]); return; }
      // Object veya array olabilir, her ikisini de handle et
      const list: string[] = Array.isArray(data)
        ? data.filter(Boolean)
        : Object.values(data).filter(Boolean) as string[];
      setCustomStickers(list);
    });
    return () => off(r);
  }, [userId]);

  const handleAdd = async () => {
    const trimmed = addInput.trim();
    if (!trimmed || !userId) return;

    // Emoji validation — tek bir emoji karakteri olmalı
    const emojiRegex = /^\p{Emoji}$/u;
    if (!emojiRegex.test(trimmed)) {
      setAddError('Sadece tek bir emoji ekleyebilirsin');
      return;
    }
    if (customStickers.includes(trimmed)) {
      setAddError('Bu sticker zaten ekli');
      return;
    }
    if (customStickers.length >= MAX_CUSTOM) {
      setAddError(`En fazla ${MAX_CUSTOM} sticker ekleyebilirsin`);
      return;
    }

    const updated = [...customStickers, trimmed];
    await set(ref(db, `users/${userId}/custom_stickers`), updated);
    setAddInput('');
    setAddError('');
  };

  const handleDelete = async (sticker: string) => {
    if (!userId) return;
    const updated = customStickers.filter(s => s !== sticker);
    await set(ref(db, `users/${userId}/custom_stickers`), updated.length ? updated : null);
  };

  const allCategories = [
    { id: MY_STICKERS_ID, label: '⭐ Benimkiler' },
    ...STICKER_CATEGORIES,
  ];

  const currentStickers = activeCategory === MY_STICKERS_ID
    ? customStickers
    : STICKER_CATEGORIES.find(c => c.id === activeCategory)?.stickers ?? [];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="absolute bottom-full mb-2 right-0 w-72 bg-[#1a1d29] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <span className="text-sm font-bold text-white">Sticker</span>
          <div className="flex items-center gap-1">
            {activeCategory === MY_STICKERS_ID && userId && customStickers.length > 0 && (
              <button
                onClick={() => setDeleteMode(d => !d)}
                className={`p-1.5 rounded-lg text-xs transition-colors ${deleteMode ? 'text-red-400 bg-red-500/10' : 'text-white/30 hover:text-white/60'}`}
                title="Düzenle"
              >
                <Trash2 size={13} />
              </button>
            )}
            <button onClick={onClose} className="p-1 text-white/40 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 px-3 py-2 border-b border-white/5 overflow-x-auto scrollbar-hide">
          {allCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setActiveCategory(cat.id); setDeleteMode(false); }}
              className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeCategory === cat.id
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-white/40 hover:text-white hover:bg-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sticker grid */}
        <div className="p-3 grid grid-cols-6 gap-1 max-h-44 overflow-y-auto custom-scrollbar">
          {currentStickers.length === 0 && activeCategory === MY_STICKERS_ID ? (
            <div className="col-span-6 py-6 text-center text-white/30 text-xs">
              Henüz sticker eklemedin.<br />Aşağıdan emoji ekle 👇
            </div>
          ) : (
            currentStickers.map((sticker, i) => (
              <div key={i} className="relative">
                <motion.button
                  whileHover={{ scale: deleteMode ? 1 : 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    if (deleteMode) return;
                    onSelect(sticker);
                    onClose();
                  }}
                  className={`w-10 h-10 flex items-center justify-center text-2xl rounded-xl transition-colors ${
                    deleteMode ? 'opacity-50 cursor-default' : 'hover:bg-white/10'
                  }`}
                >
                  {sticker}
                </motion.button>
                {deleteMode && (
                  <button
                    onClick={() => handleDelete(sticker)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    <X size={9} className="text-white" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add custom sticker — sadece "Benimkiler" sekmesinde */}
        {activeCategory === MY_STICKERS_ID && userId && (
          <div className="px-3 pb-3 border-t border-white/5 pt-2">
            <div className="flex gap-2 items-center">
              <input
                value={addInput}
                onChange={e => { setAddInput(e.target.value); setAddError(''); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                placeholder="Emoji yapıştır..."
                maxLength={8}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/40 text-center"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAdd}
                disabled={!addInput.trim()}
                className="p-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-500/30 transition-all disabled:opacity-40"
              >
                <Plus size={16} />
              </motion.button>
            </div>
            {addError && (
              <p className="text-[10px] text-red-400 mt-1 px-1">{addError}</p>
            )}
            <p className="text-[10px] text-white/20 mt-1 px-1">
              {customStickers.length}/{MAX_CUSTOM} sticker
            </p>
          </div>
        )}
      </motion.div>
    </>
  );
};
