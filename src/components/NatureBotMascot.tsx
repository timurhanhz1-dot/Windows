import { motion } from 'motion/react';

interface NatureBotMascotProps {
  size?: number;
  className?: string;
  isFloating?: boolean;
}

export const NatureBotMascot = ({ size = 100, className = "", isFloating = false }: NatureBotMascotProps) => {
  return (
    <motion.div 
      className={`relative ${className}`}
      animate={isFloating ? {
        y: [0, -15, 0],
        rotate: [0, 2, -2, 0],
      } : {}}
      transition={isFloating ? {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      } : {}}
    >
      <svg width={size} height={size * 1.2} viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Antenna */}
        <line x1="50" y1="30" x2="50" y2="10" stroke="#4CAF50" strokeWidth="2" />
        <motion.circle 
          cx="50" cy="8" r="4" fill="#81C784" 
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        {/* Body (Leaf Shape) */}
        <path 
          d="M50 20C50 20 15 50 15 80C15 100 30 110 50 110C70 110 85 100 85 80C85 50 50 20 50 20Z" 
          fill="#0A1A0A" 
          stroke="#1B3A1B" 
          strokeWidth="3"
        />
        
        {/* Veins */}
        <path d="M50 110V50M50 70L70 60M50 70L30 60M50 90L75 80M50 90L25 80" stroke="#1B3A1B" strokeWidth="1.5" />

        {/* Face Screen */}
        <rect x="30" y="55" width="40" height="30" rx="8" fill="#1B3A1B" stroke="#2D5A27" strokeWidth="1" />
        
        {/* Eyes */}
        <motion.circle 
          cx="40" cy="65" r="4" fill="#00D1FF" 
          animate={{ scaleY: [1, 1, 0.1, 1, 1] }} 
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
          style={{ filter: 'drop-shadow(0 0 4px #00D1FF)' }}
        />
        <motion.circle 
          cx="60" cy="65" r="4" fill="#00D1FF" 
          animate={{ scaleY: [1, 1, 0.1, 1, 1] }} 
          transition={{ duration: 4, repeat: Infinity, times: [0, 0.45, 0.5, 0.55, 1] }}
          style={{ filter: 'drop-shadow(0 0 4px #00D1FF)' }}
        />

        {/* Mouth */}
        <path d="M40 78H60M40 75H60M40 81H60" stroke="#2D5A27" strokeWidth="1" strokeLinecap="round" />

        {/* Arms */}
        <motion.path 
          d="M15 75C10 70 5 75 8 80" stroke="#1B3A1B" strokeWidth="4" strokeLinecap="round"
          animate={{ rotate: [-10, 10, -10] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path 
          d="M85 75C90 70 95 75 92 80" stroke="#1B3A1B" strokeWidth="4" strokeLinecap="round"
          animate={{ rotate: [10, -10, 10] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Legs */}
        <rect x="38" y="110" width="6" height="10" rx="3" fill="#1B3A1B" />
        <rect x="56" y="110" width="6" height="10" rx="3" fill="#1B3A1B" />
      </svg>
    </motion.div>
  );
};
