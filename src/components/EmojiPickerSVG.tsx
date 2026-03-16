import React from 'react';
import { motion } from 'motion/react';

const EMOJI_CATEGORIES = {
  'Yüzler': ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','🥸','😎','🤓','🧐'],
  'Kalpler': ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟'],
  'Jestler': ['👍','👎','👊','✊','🤛','🤜','🤞','✌️','🤟','🤘','👌','🤌','🤏','👈','👉','👆','👇','☝️','✋','🤚','🖐️','🖖','👋','🤙','💪','🦾','🖕','✍️','🙏','🦶','🦵'],
  'Doğa': ['🌿','🍃','🌱','🌲','🌳','🌴','🌵','🌾','🌺','🌻','🌼','🌷','🌹','🥀','🌸','💐','🍄','🌰','🐚','🪨','🌍','🌎','🌏','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','⭐','🌟','✨','⚡','🔥','💧','🌊'],
  'Nesneler': ['💻','📱','⌨️','🖥️','🖨️','🖱️','🖲️','💾','💿','📀','📷','📸','📹','🎥','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','🪔','🧯','🛢️','💸','💵','💴','💶','💷','💰','💳'],
};

interface EmojiPickerSVGProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export const EmojiPickerSVG: React.FC<EmojiPickerSVGProps> = ({ onSelect, onClose }) => {
  const [activeCategory, setActiveCategory] = React.useState('Yüzler');
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="absolute bottom-full right-0 mb-2 w-80 bg-[#1a1d24] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50"
    >
      {/* Header */}
      <div className="p-3 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-blue-500/10">
        <h3 className="text-sm font-bold text-white">Emoji Seç</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
          ✕
        </button>
      </div>

      {/* Categories */}
      <div className="flex gap-1 p-2 border-b border-white/5 bg-black/20 overflow-x-auto">
        {Object.keys(EMOJI_CATEGORIES).map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === category
                ? 'bg-emerald-500 text-white'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Emoji Grid */}
      <div className="p-3 h-64 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_CATEGORIES[activeCategory as keyof typeof EMOJI_CATEGORIES].map((emoji, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                onSelect(emoji);
                onClose();
              }}
              className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-white/10 rounded-lg transition-colors"
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
