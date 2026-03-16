/**
 * VoiceRooms — Sesli Odalar
 * Nature.co özgün tasarım · Games sayfasıyla tutarlı estetik
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic, MicOff, PhoneOff, Volume2, VolumeX, Users, Plus,
  Lock, Unlock, Crown, X, Check, Headphones
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { ref, onValue, set, remove, off, push, get, update } from 'firebase/database';

const ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:openrelay.metered.ca:80' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
};
const MAX = 10;

interface Room { id: string; name: string; ownerId: string; ownerName: string; isPrivate: boolean; password?: string; createdAt: number; participantCount: number; }
interface Participant { uid: string; username: string; joinedAt: number; muted: boolean; }
interface PeerState { pc: RTCPeerConnection; audio: HTMLAudioElement; }

function SoundWave({ active, color = '#10B981', bars = 5 }: { active: boolean; color?: string; bars?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 20 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div key={i} style={{ width: 3, background: color, borderRadius: 2 }}
          animate={active ? { height: [4, 14 + i * 2, 6, 18 - i, 4], opacity: [0.5, 1, 0.7, 1, 0.5] } : { height: 4, opacity: 0.3 }}
          transition={{ duration: 0.8 + i * 0.15, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }} />
      ))}
    </div>
  );
}

function Avatar({ name, size = 52, isMe = false, muted = false }: { name: string; size?: number; isMe?: boolean; muted?: boolean }) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ width: size, height: size, borderRadius: size * 0.28, background: isMe ? 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(5,150,105,0.2))' : 'rgba(255,255,255,0.06)', border: `2px solid ${isMe ? '#10B981' : muted ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.3, fontWeight: 900, color: isMe ? '#10B981' : '#fff', letterSpacing: '-0.02em', boxShadow: isMe ? '0 0 20px rgba(16,185,129,0.2)' : 'none', flexShrink: 0 }}>
        {(name || '?').substring(0, 2).toUpperCase()}
      </div>
      {muted && (
        <div style={{ position: 'absolute', bottom: -3, right: -3, width: 18, height: 18, borderRadius: '50%', background: '#EF4444', border: '2px solid #0B0E11', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MicOff size={9} color="#fff" />
        </div>
      )}
    </div>
  );
}

export function ActiveRoom({ roomId, roomName, userId, username, onLeave, onMinimize }: {
  roomId: string; roomName: string; userId: string; username: string; onLeave: () => void; onMinimize?: () => void;
}) {
  const { t } = useTranslation();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [duration, setDuration] = useState(0);
  const [connStates, setConnStates] = useState<Record<string, string>>({});
  const localStream = useRef<MediaStream | null>(null);
  const peers = useRef<Record<string, PeerState>>({});
  const timer = useRef<any>(null);
  const mounted = useRef(true);

  const cleanup = useCallback(async () => {
    mounted.current = false;
    clearInterval(timer.current);
    localStream.current?.getTracks().forEach(t => t.stop());
    Object.values(peers.current).forEach(({ pc, audio }) => { pc.close(); audio.srcObject = null; });
    peers.current = {};
    await remove(ref(db, `voice_rooms/${roomId}/participants/${userId}`));
    await remove(ref(db, `voice_signals/${roomId}/${userId}`));
  }, [roomId, userId]);

  const connectToPeer = useCallback(async (targetUid: string, initiator: boolean) => {
    if (peers.current[targetUid] || !mounted.current) return;
    const pc = new RTCPeerConnection(ICE);
    const audio = new Audio(); audio.autoplay = true;
    peers.current[targetUid] = { pc, audio };
    localStream.current?.getTracks().forEach(t => pc.addTrack(t, localStream.current!));
    pc.ontrack = e => { audio.srcObject = e.streams[0]; audio.play().catch(() => {}); };
    pc.onicecandidate = e => {
      if (e.candidate) push(ref(db, `voice_signals/${roomId}/${targetUid}/${userId}/ice`), JSON.stringify(e.candidate));
    };
    pc.onconnectionstatechange = () => setConnStates(p => ({ ...p, [targetUid]: pc.connectionState }));
    if (initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await set(ref(db, `voice_signals/${roomId}/${targetUid}/${userId}/offer`), JSON.stringify(offer));
    }
  }, [roomId, userId]);

  const handleSignal = useCallback(async (fromUid: string, signal: any) => {
    if (!peers.current[fromUid]) await connectToPeer(fromUid, false);
    const peer = peers.current[fromUid]; if (!peer) return;
    const { pc } = peer;
    if (signal.offer && pc.signalingState === 'stable') {
      try {
        await pc.setRemoteDescription(JSON.parse(signal.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await set(ref(db, `voice_signals/${roomId}/${fromUid}/${userId}/answer`), JSON.stringify(answer));
      } catch {}
    }
    if (signal.answer && pc.signalingState === 'have-local-offer') {
      try { await pc.setRemoteDescription(JSON.parse(signal.answer)); } catch {}
    }
    if (signal.ice) {
      for (const raw of Object.values(signal.ice as Record<string, string>)) {
        try { await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(raw))); } catch {}
      }
    }
  }, [roomId, userId, connectToPeer]);

  useEffect(() => {
    mounted.current = true;
    const join = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (!mounted.current) { stream.getTracks().forEach(t => t.stop()); return; }
        localStream.current = stream;
      } catch { onLeave(); return; }
      await set(ref(db, `voice_rooms/${roomId}/participants/${userId}`), { uid: userId, username, joinedAt: Date.now(), muted: false });
      timer.current = setInterval(() => setDuration(d => d + 1), 1000);
      onValue(ref(db, `voice_rooms/${roomId}/participants`), async snap => {
        if (!mounted.current) return;
        const data: Record<string, Participant> = snap.val() || {};
        const list = Object.values(data).sort((a, b) => a.joinedAt - b.joinedAt);
        setParticipants(list);

        const myEntry = data[userId];
        const myJoinedAt = myEntry?.joinedAt || Date.now();
        for (const p of list) {
          if (p.uid !== userId && !peers.current[p.uid]) {
            // Sonra giren initiator olur (daha büyük joinedAt)
            const iInitiate = myJoinedAt > p.joinedAt;
            await connectToPeer(p.uid, iInitiate);
          }
        }
        const uids = list.map(p => p.uid);
        for (const uid of Object.keys(peers.current)) {
          if (!uids.includes(uid)) { peers.current[uid].pc.close(); peers.current[uid].audio.srcObject = null; delete peers.current[uid]; }
        }
      });
      onValue(ref(db, `voice_signals/${roomId}/${userId}`), async snap => {
        if (!mounted.current) return;
        const signals = snap.val() || {};
        for (const [fromUid, signal] of Object.entries(signals)) {
          if (signal) await handleSignal(fromUid, signal as any);
        }
      });
    };
    join();
    return () => { cleanup(); off(ref(db, `voice_rooms/${roomId}/participants`)); off(ref(db, `voice_signals/${roomId}/${userId}`)); };
  }, []);

  const toggleMute = () => {
    const m = !isMuted; setIsMuted(m);
    localStream.current?.getAudioTracks().forEach(t => { t.enabled = !m; });
    update(ref(db, `voice_rooms/${roomId}/participants/${userId}`), { muted: m });
  };
  const toggleDeafen = () => {
    const d = !isDeafened; setIsDeafened(d);
    Object.values(peers.current).forEach(({ audio }) => { audio.muted = d; });
    setIsDeafened(d);
  };
  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', background: '#0B0E11', backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
            <span style={{ fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '0.15em', color: '#fff', fontSize: 13 }}>{roomName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={10} /> {participants.length}/{MAX} {t('voice.people')}</span>
            <span>·</span>
            <span style={{ fontWeight: 700 }}>{fmt(duration)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {onMinimize && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onMinimize}
              style={{ width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              ⌄
            </motion.button>
          )}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleDeafen}
            style={{ width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer', background: isDeafened ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)', color: isDeafened ? '#EF4444' : 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isDeafened ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={toggleMute}
            style={{ width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer', background: isMuted ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.12)', color: isMuted ? '#EF4444' : '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isMuted ? 'none' : '0 0 12px rgba(16,185,129,0.15)' }}>
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={async () => { await cleanup(); onLeave(); }}
            style={{ width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'rgba(239,68,68,0.12)', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PhoneOff size={16} />
          </motion.button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 12, width: '100%', maxWidth: 640 }}>
          <AnimatePresence>
            {participants.map((p, i) => {
              const isMe = p.uid === userId;
              const connected = isMe || connStates[p.uid] === 'connected';
              return (
                <motion.div key={p.uid} initial={{ opacity: 0, scale: 0.85, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ delay: i * 0.04 }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '22px 10px 16px', background: isMe ? 'linear-gradient(160deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))' : 'rgba(255,255,255,0.02)', borderRadius: 20, border: `1px solid ${isMe ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.06)'}`, boxShadow: isMe ? '0 4px 24px rgba(16,185,129,0.08)' : 'none', position: 'relative', overflow: 'hidden' }}>
                  {isMe && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.4), transparent)' }} />}
                  <Avatar name={p.username} size={52} isMe={isMe} muted={p.muted} />
                  <div style={{ textAlign: 'center', width: '100%' }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: isMe ? '#10B981' : '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{isMe ? t('voice.you') : p.username}</div>
                    <div style={{ marginTop: 6, display: 'flex', justifyContent: 'center' }}>
                      {p.muted
                        ? <span style={{ fontSize: 10, color: '#EF4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}><MicOff size={9} /> {t('voice.muted')}</span>
                        : connected ? <SoundWave active={!p.muted} color={isMe ? '#10B981' : 'rgba(255,255,255,0.4)'} bars={4} />
                        : <span style={{ fontSize: 10, color: '#F59E0B' }}>{t('voice.connecting')}</span>}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {Array.from({ length: Math.min(3, MAX - participants.length) }).map((_, i) => (
            <div key={"e"+i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '22px 10px 16px', background: 'rgba(255,255,255,0.01)', borderRadius: 20, border: '1px dashed rgba(255,255,255,0.05)' }}>
              <div style={{ width: 52, height: 52, borderRadius: 15, background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={18} color="rgba(255,255,255,0.08)" /></div>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.1)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>boş</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: isMuted ? '#EF4444' : '#10B981', boxShadow: `0 0 6px ${isMuted ? '#EF4444' : '#10B981'}` }} />
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{isMuted ? t('voice.micOff') : isDeafened ? t('voice.deafened') : t('voice.live')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function VoiceRooms({ userId, username, theme, activeVoiceRoom, onJoinRoom, onLeaveRoom }: { userId: string; username: string; theme: any; activeVoiceRoom?: { id: string; name: string } | null; onJoinRoom?: (id: string, name: string) => void; onLeaveRoom?: () => void; }) {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoomName, setActiveRoomName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPrivate, setNewRoomPrivate] = useState(false);
  const [newRoomPass, setNewRoomPass] = useState('');
  const [joinPassRoomId, setJoinPassRoomId] = useState<string | null>(null);
  const [joinPassInput, setJoinPassInput] = useState('');
  const [joinPassError, setJoinPassError] = useState('');
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const r = ref(db, 'voice_rooms');
    onValue(r, snap => {
      const data = snap.val() || {};
      const list: Room[] = [];
      const c: Record<string, number> = {};
      Object.entries(data).forEach(([id, v]: any) => {
        if (!v.name) return;
        const pCount = Object.keys(v.participants || {}).length;
        c[id] = pCount;
        list.push({ id, name: v.name, ownerId: v.ownerId, ownerName: v.ownerName, isPrivate: v.isPrivate || false, password: v.password, createdAt: v.createdAt, participantCount: pCount });
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      setRooms(list); setCounts(c);
    });
    return () => off(r);
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const snap = await get(ref(db, 'voice_rooms'));
      const data = snap.val() || {};
      const now = Date.now();
      for (const [id, v] of Object.entries(data) as any) {
        if (!v.name) continue;
        if (Object.keys(v.participants || {}).length === 0 && v.ownerId === userId && now - v.createdAt > 5 * 60 * 1000) await remove(ref(db, `voice_rooms/${id}`));
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [userId]);

  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    const newRef = push(ref(db, 'voice_rooms'));
    await set(newRef, { name: newRoomName.trim(), ownerId: userId, ownerName: username, isPrivate: newRoomPrivate, password: newRoomPrivate ? newRoomPass : null, createdAt: Date.now() });
    setNewRoomName(''); setNewRoomPass(''); setNewRoomPrivate(false); setShowCreate(false);
    setActiveRoomId(newRef.key!); setActiveRoomName(newRoomName.trim());
    onJoinRoom?.(newRef.key!, newRoomName.trim());
  };

  const joinRoom = (room: Room) => {
    if ((counts[room.id] || 0) >= MAX) return;
    if (room.isPrivate) { setJoinPassRoomId(room.id); setJoinPassInput(''); setJoinPassError(''); return; }
    setActiveRoomId(room.id); setActiveRoomName(room.name);
    onJoinRoom?.(room.id, room.name);
  };

  const joinWithPassword = () => {
    const room = rooms.find(r => r.id === joinPassRoomId);
    if (!room || joinPassInput !== room.password) { setJoinPassError('Yanlış şifre'); return; }
    if ((counts[room.id] || 0) >= MAX) return;
    setActiveRoomId(room.id); setActiveRoomName(room.name); setJoinPassRoomId(null);
    onJoinRoom?.(room.id, room.name);
  };

  if (activeRoomId && onJoinRoom) return null; // Global panel gösteriyor
  if (activeRoomId) return <ActiveRoom roomId={activeRoomId} roomName={activeRoomName} userId={userId} username={username} onLeave={() => { setActiveRoomId(null); onLeaveRoom?.(); }} />;

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', background: '#0B0E11', backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '50vh', background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(16,185,129,0.07) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ padding: '28px 28px 20px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 20, marginBottom: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: '#10B981', textTransform: 'uppercase' as const, letterSpacing: '0.15em' }}>{rooms.length} {t('voice.roomsActive')}</span>
            </div>
            <h1 style={{ fontWeight: 900, color: '#fff', fontSize: 32, lineHeight: 1, margin: 0, letterSpacing: '-0.03em' }}>
              {t('voice.title')}<br /><span style={{ color: '#10B981' }}>{t('voice.titleAccent')}</span>
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 8, fontWeight: 500 }}>{t('voice.subtitle', { max: MAX })}</p>
          </div>
          <motion.div animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 72, height: 72, borderRadius: 24, background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.08))', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(16,185,129,0.1)', flexShrink: 0 }}>
            <Headphones size={32} color="#10B981" strokeWidth={1.5} />
          </motion.div>
        </div>

        <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={() => setShowCreate(true)}
          style={{ marginTop: 20, width: '100%', padding: '14px 0', background: '#10B981', border: 'none', borderRadius: 16, color: '#000', fontSize: 13, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 20px rgba(16,185,129,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
          <Plus size={16} strokeWidth={3} /> {t('voice.createRoom')}
        </motion.button>
      </div>

      <div style={{ flex: 1, padding: '4px 28px 28px', position: 'relative', zIndex: 1, overflowY: 'auto' }}>
        {rooms.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ textAlign: 'center', paddingTop: 48 }}>
            <motion.div animate={{ scale: [1, 1.05, 1], rotate: [0, 2, -2, 0] }} transition={{ duration: 4, repeat: Infinity }} style={{ fontSize: 52, marginBottom: 16 }}>🎙️</motion.div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>{t('voice.noRooms')}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>{t('voice.noRoomsDesc')}</div>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rooms.map((room, i) => {
              const count = counts[room.id] || 0;
              const isFull = count >= MAX;
              const fillPct = (count / MAX) * 100;
              const fillColor = fillPct >= 90 ? '#EF4444' : fillPct >= 60 ? '#F59E0B' : '#10B981';
              const isOwner = room.ownerId === userId;
              return (
                <motion.div key={room.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  whileHover={isFull ? {} : { y: -2 }}
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden' }}>
                  {/* Doluluk şeridi */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.04)' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${fillPct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
                      style={{ height: '100%', background: fillColor, boxShadow: `0 0 8px ${fillColor}80` }} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: room.isPrivate ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${room.isPrivate ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {room.isPrivate ? <Lock size={16} color="#F59E0B" /> : <Headphones size={16} color="#10B981" />}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', marginBottom: 2 }}>{room.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                          <Crown size={9} color="#F59E0B" /><span>{room.ownerName}</span>
                        </div>
                      </div>
                    </div>
                    {isOwner && (
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => remove(ref(db, `voice_rooms/${room.id}`))}
                        style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(239,68,68,0.6)', flexShrink: 0 }}>
                        <X size={12} />
                      </motion.button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: count > 0 ? `${fillColor}18` : 'rgba(255,255,255,0.04)', borderRadius: 20, border: `1px solid ${count > 0 ? fillColor+'30' : 'rgba(255,255,255,0.06)'}` }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: count > 0 ? fillColor : 'rgba(255,255,255,0.2)', boxShadow: count > 0 ? `0 0 5px ${fillColor}` : 'none' }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: count > 0 ? fillColor : 'rgba(255,255,255,0.3)' }}>{count}/{MAX}</span>
                      </div>
                      {isFull && <span style={{ fontSize: 10, fontWeight: 800, color: '#EF4444', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{t('voice.full')}</span>}
                    </div>
                    {count > 0 && <SoundWave active={true} color={fillColor} bars={6} />}
                  </div>

                  <motion.button whileHover={isFull ? {} : { scale: 1.01 }} whileTap={isFull ? {} : { scale: 0.98 }} onClick={() => joinRoom(room)} disabled={isFull}
                    style={{ width: '100%', padding: '11px 0', background: isFull ? 'rgba(255,255,255,0.03)' : room.isPrivate ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${isFull ? 'rgba(255,255,255,0.05)' : room.isPrivate ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}`, borderRadius: 12, color: isFull ? 'rgba(255,255,255,0.2)' : room.isPrivate ? '#F59E0B' : '#10B981', fontWeight: 800, fontSize: 13, cursor: isFull ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, letterSpacing: '0.05em', textTransform: 'uppercase' as const, boxShadow: isFull ? 'none' : `0 0 16px ${room.isPrivate ? 'rgba(245,158,11,0.08)' : 'rgba(16,185,129,0.08)'}` }}>
                    {room.isPrivate ? <Lock size={13} /> : <Mic size={13} />}
                    {isFull ? t('voice.roomFull') : room.isPrivate ? t('voice.joinWithPassword') : t('voice.joinRoom')}
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Oda Oluştur Modal */}
      <AnimatePresence>
        {showCreate && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowCreate(false)}>
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 500, background: '#111418', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px 24px 0 0', padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                  <div style={{ fontWeight: 900, color: '#fff', fontSize: 20, letterSpacing: '-0.02em' }}>{t('voice.newRoom')}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{t('voice.maxPeople', { max: MAX })}</div>
                </div>
                <button onClick={() => setShowCreate(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input value={newRoomName} onChange={e => setNewRoomName(e.target.value)} placeholder={t('voice.roomNamePlaceholder')} maxLength={40} onKeyDown={e => e.key === 'Enter' && createRoom()} autoFocus
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '13px 16px', color: '#fff', fontSize: 15, fontWeight: 600, outline: 'none', letterSpacing: '-0.01em' }} />
                <motion.div whileTap={{ scale: 0.99 }} onClick={() => setNewRoomPrivate(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: `1px solid ${newRoomPrivate ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}`, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: newRoomPrivate ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {newRoomPrivate ? <Lock size={14} color="#F59E0B" /> : <Unlock size={14} color="rgba(255,255,255,0.3)" />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: newRoomPrivate ? '#F59E0B' : 'rgba(255,255,255,0.6)' }}>{newRoomPrivate ? t('voice.privateRoom') : t('voice.publicRoom')}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{newRoomPrivate ? t('voice.privateRoomDesc') : t('voice.publicRoomDesc')}</div>
                    </div>
                  </div>
                  <div style={{ width: 44, height: 24, borderRadius: 12, background: newRoomPrivate ? '#F59E0B' : 'rgba(255,255,255,0.08)', position: 'relative', flexShrink: 0 }}>
                    <motion.div animate={{ left: newRoomPrivate ? 22 : 4 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      style={{ position: 'absolute', top: 4, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                  </div>
                </motion.div>
                <AnimatePresence>
                  {newRoomPrivate && (
                    <motion.input initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      value={newRoomPass} onChange={e => setNewRoomPass(e.target.value)} placeholder={t('voice.roomPasswordPlaceholder')} type="password"
                      style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '13px 16px', color: '#fff', fontSize: 14, outline: 'none' }} />
                  )}
                </AnimatePresence>
                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '13px 0', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: 'none', borderRadius: 12, fontSize: 12, fontWeight: 800, cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>{t('common.cancel')}</button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={createRoom} disabled={!newRoomName.trim() || (newRoomPrivate && !newRoomPass.trim())}
                    style={{ flex: 2, padding: '13px 0', background: newRoomName.trim() ? '#10B981' : 'rgba(16,185,129,0.2)', color: newRoomName.trim() ? '#000' : 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 12, fontSize: 12, fontWeight: 900, cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' as const, boxShadow: newRoomName.trim() ? '0 4px 16px rgba(16,185,129,0.3)' : 'none' }}>{t('voice.createButton')}</motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Şifre Modal */}
      <AnimatePresence>
        {joinPassRoomId && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ width: '100%', maxWidth: 360, background: '#111418', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 24, padding: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock size={18} color="#F59E0B" />
                </div>
                <div>
                  <div style={{ fontWeight: 900, color: '#fff', fontSize: 16, letterSpacing: '-0.01em' }}>{t('voice.privateRoomTitle')}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{rooms.find(r => r.id === joinPassRoomId)?.name}</div>
                </div>
              </div>
              <input value={joinPassInput} onChange={e => setJoinPassInput(e.target.value)} type="password" placeholder={t('voice.enterPassword')} autoFocus
                onKeyDown={e => e.key === 'Enter' && joinWithPassword()}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${joinPassError ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 12, padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none', marginBottom: 8, boxSizing: 'border-box' as const }} />
              <AnimatePresence>
                {joinPassError && (
                  <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    style={{ fontSize: 12, color: '#EF4444', marginBottom: 10, fontWeight: 600 }}>{joinPassError}</motion.p>
                )}
              </AnimatePresence>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setJoinPassRoomId(null)} style={{ flex: 1, padding: '11px 0', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{t('common.cancel')}</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={joinWithPassword}
                  style={{ flex: 2, padding: '11px 0', background: '#F59E0B', color: '#000', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textTransform: 'uppercase' as const, letterSpacing: '0.08em', boxShadow: '0 4px 16px rgba(245,158,11,0.25)' }}>
                  <Check size={13} strokeWidth={3} /> {t('guild.join')}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
