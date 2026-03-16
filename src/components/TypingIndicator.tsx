import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { db } from '../firebase';
import { ref, set, onValue, remove, serverTimestamp, onDisconnect } from 'firebase/database';

interface TypingIndicatorProps {
  channelId: string;
  userId: string;
  displayName: string;
}

export function setTyping(channelId: string, userId: string, displayName: string) {
  const typingRef = ref(db, `typing/${channelId}/${userId}`);
  set(typingRef, { name: displayName, timestamp: Date.now() });
  onDisconnect(typingRef).remove();
  setTimeout(() => remove(typingRef), 5000);
}

export function clearTyping(channelId: string, userId: string) {
  remove(ref(db, `typing/${channelId}/${userId}`));
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ channelId, userId }) => {
  const [typingUsers, setTypingUsers] = useState<{ name: string; timestamp: number }[]>([]);

  useEffect(() => {
    if (!channelId) return;
    const typingRef = ref(db, `typing/${channelId}`);
    const unsub = onValue(typingRef, snap => {
      const data = snap.val();
      if (!data) { setTypingUsers([]); return; }
      const now = Date.now();
      const users = Object.entries(data)
        .filter(([id]) => id !== userId)
        .filter(([, val]: any) => now - val.timestamp < 6000)
        .map(([, val]: any) => val);
      setTypingUsers(users);
    });
    return () => unsub();
  }, [channelId, userId]);

  if (typingUsers.length === 0) return null;

  const names = typingUsers.map(u => u.name);
  let text = '';
  if (names.length === 1) text = `${names[0]} yazıyor`;
  else if (names.length === 2) text = `${names[0]} ve ${names[1]} yazıyor`;
  else text = `${names.length} kişi yazıyor`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 16px', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}
    >
      <div style={{ display: 'flex', gap: 3 }}>
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981' }}
          />
        ))}
      </div>
      <span>{text}...</span>
    </motion.div>
  );
};

export default TypingIndicator;
