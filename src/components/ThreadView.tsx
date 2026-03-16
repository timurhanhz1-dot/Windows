import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { X, Send, Reply, MessageSquare } from 'lucide-react';
import { db, auth } from '../firebase';
import { ref, push, set, onValue, serverTimestamp } from 'firebase/database';

interface ThreadMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
}

interface ThreadViewProps {
  channelId: string;
  parentMessage: { id: string; content: string; userName: string; timestamp: string };
  userId: string;
  displayName: string;
  theme: any;
  onClose: () => void;
}

export const ThreadView: React.FC<ThreadViewProps> = ({ channelId, parentMessage, userId, displayName, theme, onClose }) => {
  const { t } = useTranslation();
  const [replies, setReplies] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const threadRef = ref(db, `threads/${channelId}/${parentMessage.id}`);
    const unsub = onValue(threadRef, snap => {
      const data = snap.val();
      if (!data) { setReplies([]); return; }
      const arr = Object.entries(data).map(([id, val]: any) => ({ id, ...val }));
      arr.sort((a: any, b: any) => a.timestamp - b.timestamp);
      setReplies(arr);
    });
    return () => unsub();
  }, [channelId, parentMessage.id]);

  useEffect(() => {
    if (replies.length > 0) {
      requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
  }, [replies.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const threadRef = ref(db, `threads/${channelId}/${parentMessage.id}`);
    const newRef = push(threadRef);
    await set(newRef, {
      userId,
      userName: displayName,
      content: input.trim(),
      timestamp: Date.now(),
    });
    setInput('');
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      style={{
        position: 'absolute', top: 0, right: 0, bottom: 0, width: 380, maxWidth: '100%',
        background: '#15171e', borderLeft: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', zIndex: 50,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={16} color="#10b981" />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{t('thread.title')}</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{replies.length} {t('thread.replies')}</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}>
          <X size={18} />
        </button>
      </div>

      {/* Parent message */}
      <div style={{
        padding: 16, borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: 'white', fontWeight: 700,
          }}>
            {parentMessage.userName[0]?.toUpperCase()}
          </div>
          <span style={{ color: '#10b981', fontWeight: 700, fontSize: 13 }}>{parentMessage.userName}</span>
          <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>
            {new Date(parentMessage.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.5 }}>
          {parentMessage.content}
        </div>
      </div>

      {/* Replies */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {replies.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Reply size={24} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>{t('thread.noReplies')}</div>
            <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12, marginTop: 4 }}>{t('thread.firstReply')}</div>
          </div>
        )}
        {replies.map(reply => (
          <div key={reply.id} style={{ padding: '8px 16px', display: 'flex', gap: 10 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: reply.userId === userId ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'linear-gradient(135deg, #6b7280, #4b5563)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: 'white', fontWeight: 700,
            }}>
              {reply.userName[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ color: reply.userId === userId ? '#3b82f6' : 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: 13 }}>
                  {reply.userName}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10 }}>
                  {new Date(reply.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.5, marginTop: 2 }}>
                {reply.content}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{
        padding: 12, borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', gap: 8,
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t('thread.replyPlaceholder')}
          style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12, padding: '10px 14px', color: 'white', fontSize: 13, outline: 'none',
          }}
        />
        <button type="submit" disabled={!input.trim()} style={{
          background: input.trim() ? '#10b981' : 'rgba(255,255,255,0.05)',
          border: 'none', borderRadius: 12, width: 40, height: 40, cursor: input.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: input.trim() ? 'white' : 'rgba(255,255,255,0.2)', transition: 'all 0.15s',
        }}>
          <Send size={16} />
        </button>
      </form>
    </motion.div>
  );
};

export default ThreadView;
