import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Trophy, Star, Zap, Shield, Crown, Heart, MessageSquare, Users, Flame, Award, Target, Sparkles } from 'lucide-react';
import { db } from '../firebase';
import { ref, onValue, set, increment, update } from 'firebase/database';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  condition: string;
}

export const BADGES: Badge[] = [
  { id: 'newcomer', name: '🌱 Yeni Üye', description: 'Nature.co\'ya katıldın', icon: '🌱', color: '#10b981', rarity: 'common', xpReward: 50, condition: 'Kayıt ol' },
  { id: 'first_message', name: '💬 İlk Mesaj', description: 'İlk mesajını gönderdin', icon: '💬', color: '#3b82f6', rarity: 'common', xpReward: 25, condition: '1 mesaj gönder' },
  { id: 'chatterbox', name: '🗣️ Geveze', description: '100 mesaj gönderdin', icon: '🗣️', color: '#8b5cf6', rarity: 'rare', xpReward: 100, condition: '100 mesaj gönder' },
  { id: 'storyteller', name: '📖 Hikayeci', description: '500 mesaj gönderdin', icon: '📖', color: '#ec4899', rarity: 'epic', xpReward: 250, condition: '500 mesaj gönder' },
  { id: 'legend', name: '👑 Efsane', description: '2000 mesaj gönderdin', icon: '👑', color: '#f59e0b', rarity: 'legendary', xpReward: 500, condition: '2000 mesaj gönder' },
  { id: 'social', name: '🤝 Sosyal', description: '5 arkadaş edin', icon: '🤝', color: '#06b6d4', rarity: 'common', xpReward: 50, condition: '5 arkadaş edin' },
  { id: 'popular', name: '⭐ Popüler', description: '20 arkadaş edin', icon: '⭐', color: '#eab308', rarity: 'rare', xpReward: 150, condition: '20 arkadaş edin' },
  { id: 'influencer', name: '🌟 Influencer', description: '50 arkadaş edin', icon: '🌟', color: '#f97316', rarity: 'epic', xpReward: 300, condition: '50 arkadaş edin' },
  { id: 'guild_creator', name: '🏰 Guild Kurucusu', description: 'Bir guild oluşturdun', icon: '🏰', color: '#6366f1', rarity: 'rare', xpReward: 100, condition: 'Guild oluştur' },
  { id: 'forum_poster', name: '📝 Forum Yazarı', description: 'Forumda 10 gönderi', icon: '📝', color: '#14b8a6', rarity: 'common', xpReward: 75, condition: '10 forum gönderisi' },
  { id: 'night_owl', name: '🦉 Gece Kuşu', description: 'Gece 2-5 arası aktif', icon: '🦉', color: '#7c3aed', rarity: 'rare', xpReward: 50, condition: 'Gece 2-5 aktif ol' },
  { id: 'early_bird', name: '🐦 Erken Kuş', description: 'Sabah 5-7 arası aktif', icon: '🐦', color: '#f43f5e', rarity: 'rare', xpReward: 50, condition: 'Sabah 5-7 aktif ol' },
  { id: 'streak_7', name: '🔥 7 Gün Serisi', description: '7 gün üst üste giriş', icon: '🔥', color: '#ef4444', rarity: 'rare', xpReward: 100, condition: '7 gün üst üste giriş' },
  { id: 'streak_30', name: '💎 30 Gün Serisi', description: '30 gün üst üste giriş', icon: '💎', color: '#a855f7', rarity: 'legendary', xpReward: 500, condition: '30 gün üst üste giriş' },
  { id: 'helper', name: '🤗 Yardımsever', description: '10 mesaja yanıt verdin', icon: '🤗', color: '#10b981', rarity: 'common', xpReward: 50, condition: '10 yanıt ver' },
  { id: 'ai_explorer', name: '🤖 AI Kaşifi', description: 'NatureBot ile 50 sohbet', icon: '🤖', color: '#6366f1', rarity: 'rare', xpReward: 100, condition: 'NatureBot ile 50 sohbet' },
];

const RARITY_COLORS: Record<string, string> = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

const RARITY_LABELS: Record<string, string> = {
  common: 'Yaygın',
  rare: 'Nadir',
  epic: 'Epik',
  legendary: 'Efsanevi',
};

const LEVELS = [
  { level: 1, xpRequired: 0, title: 'Fidan' },
  { level: 2, xpRequired: 100, title: 'Filiz' },
  { level: 3, xpRequired: 250, title: 'Yaprak' },
  { level: 4, xpRequired: 500, title: 'Dal' },
  { level: 5, xpRequired: 1000, title: 'Ağaç' },
  { level: 6, xpRequired: 2000, title: 'Orman' },
  { level: 7, xpRequired: 3500, title: 'Ekosistem' },
  { level: 8, xpRequired: 5000, title: 'Doğa Koruyucu' },
  { level: 9, xpRequired: 7500, title: 'Doğa Elçisi' },
  { level: 10, xpRequired: 10000, title: 'Doğa Efsanesi' },
];

export function getLevel(xp: number) {
  let current = LEVELS[0];
  let next = LEVELS[1];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      current = LEVELS[i];
      next = LEVELS[i + 1] || LEVELS[i];
      break;
    }
  }
  const progress = next.xpRequired > current.xpRequired
    ? (xp - current.xpRequired) / (next.xpRequired - current.xpRequired)
    : 1;
  return { ...current, xp, nextLevel: next, progress };
}

export async function awardBadge(userId: string, badgeId: string) {
  const badge = BADGES.find(b => b.id === badgeId);
  if (!badge) return;
  
  const badgeRef = ref(db, `users/${userId}/badges/${badgeId}`);
  const xpRef = ref(db, `users/${userId}/xp`);
  
  await set(badgeRef, { awardedAt: Date.now() });
  await update(ref(db, `users/${userId}`), { xp: increment(badge.xpReward) });
}

export async function addXP(userId: string, amount: number) {
  await update(ref(db, `users/${userId}`), { xp: increment(amount) });
}

interface BadgeDisplayProps {
  userId: string;
  theme: any;
  compact?: boolean;
}

export const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ userId, theme, compact = false }) => {
  const { t } = useTranslation();
  const [userBadges, setUserBadges] = useState<Record<string, any>>({});
  const [xp, setXp] = useState(0);
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  useEffect(() => {
    if (!userId) return;
    const badgeRef = ref(db, `users/${userId}/badges`);
    const xpRef = ref(db, `users/${userId}/xp`);
    
    const unsub1 = onValue(badgeRef, snap => setUserBadges(snap.val() || {}));
    const unsub2 = onValue(xpRef, snap => setXp(snap.val() || 0));
    
    return () => { unsub1(); unsub2(); };
  }, [userId]);

  const level = getLevel(xp);
  const earnedBadges = BADGES.filter(b => userBadges[b.id]);
  const lockedBadges = BADGES.filter(b => !userBadges[b.id]);

  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: 8, padding: '2px 8px', fontSize: 11, fontWeight: 700, color: 'white' }}>
          Lv.{level.level}
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {earnedBadges.slice(0, 5).map(b => (
            <span key={b.id} style={{ fontSize: 14 }} title={b.name}>{b.icon}</span>
          ))}
          {earnedBadges.length > 5 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>+{earnedBadges.length - 5}</span>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {/* Level Card */}
      <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(59,130,246,0.1))', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ color: '#10b981', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Seviye {level.level}</div>
            <div style={{ color: 'white', fontSize: 20, fontWeight: 800 }}>{level.title}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{xp} / {level.nextLevel.xpRequired} XP</div>
          </div>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3 }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${level.progress * 100}%` }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #10b981, #3b82f6)', borderRadius: 3 }}
          />
        </div>
      </div>

      {/* Earned Badges */}
      <h3 style={{ color: 'white', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>
        {t('badge.earnedBadges')} ({earnedBadges.length}/{BADGES.length})
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
        {earnedBadges.map(badge => (
          <motion.button
            key={badge.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedBadge(badge)}
            style={{ background: `${badge.color}15`, border: `1px solid ${badge.color}40`, borderRadius: 12, padding: 12, cursor: 'pointer', textAlign: 'center', color: 'white' }}
          >
            <div style={{ fontSize: 28 }}>{badge.icon}</div>
            <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{badge.name.split(' ').slice(1).join(' ')}</div>
          </motion.button>
        ))}
      </div>

      {/* Locked Badges */}
      {lockedBadges.length > 0 && (
        <>
          <h3 style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>{t('badge.lockedBadges')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {lockedBadges.map(badge => (
              <motion.button
                key={badge.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedBadge(badge)}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 12, cursor: 'pointer', textAlign: 'center', color: 'white', opacity: 0.4 }}
              >
                <div style={{ fontSize: 28, filter: 'grayscale(1)' }}>{badge.icon}</div>
                <div style={{ fontSize: 10, marginTop: 4 }}>???</div>
              </motion.button>
            ))}
          </div>
        </>
      )}

      {/* Badge Detail Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSelectedBadge(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          >
            <motion.div
              initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#1a1d29', borderRadius: 20, padding: 32, maxWidth: 320, width: '100%', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div style={{ fontSize: 56, marginBottom: 16, filter: userBadges[selectedBadge.id] ? 'none' : 'grayscale(1)' }}>{selectedBadge.icon}</div>
              <div style={{ color: 'white', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{selectedBadge.name}</div>
              <div style={{ color: RARITY_COLORS[selectedBadge.rarity], fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                {t(`badge.rarity${selectedBadge.rarity.charAt(0).toUpperCase() + selectedBadge.rarity.slice(1)}`)}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginBottom: 16 }}>{selectedBadge.description}</div>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12 }}>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{t('badge.howToEarn')}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, marginTop: 4 }}>{selectedBadge.condition}</div>
                <div style={{ color: '#10b981', fontSize: 12, marginTop: 8 }}>+{selectedBadge.xpReward} XP</div>
              </div>
              {userBadges[selectedBadge.id] && (
                <div style={{ color: '#10b981', fontSize: 12, marginTop: 12, fontWeight: 600 }}>
                  ✅ {t('badge.earned')}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BadgeDisplay;
