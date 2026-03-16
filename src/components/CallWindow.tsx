import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db } from '../firebase';
import { ref, set, onValue, remove, off } from 'firebase/database';

interface CallProps {
  userId: string;
  username: string;
  targetUserId: string;
  targetUsername: string;
  mode: 'voice' | 'video';
  isIncoming?: boolean;
  onEnd: () => void;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ]
};

export const CallWindow = ({ userId, username, targetUserId, targetUsername, mode, isIncoming = false, onEnd }: CallProps) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'calling' | 'ringing' | 'connected' | 'ended'>(isIncoming ? 'ringing' : 'calling');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callId = [userId, targetUserId].sort().join('_');
  const callRef = ref(db, `calls/${callId}`);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    initCall();
    return cleanup;
  }, []);

  useEffect(() => {
    if (status === 'connected') {
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [status]);

  const initCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === 'video'
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      pc.ontrack = e => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
        setStatus('connected');
      };

      pc.onicecandidate = e => {
        if (e.candidate) {
          set(ref(db, `calls/${callId}/ice_${userId}_${Date.now()}`), JSON.stringify(e.candidate));
        }
      };

      if (!isIncoming) {
        // Caller: create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await set(callRef, {
          caller: userId,
          callerName: username,
          callee: targetUserId,
          calleeName: targetUsername,
          mode,
          offer: JSON.stringify(offer),
          status: 'calling',
          timestamp: Date.now()
        });
      }

      // Listen for signaling
      onValue(callRef, async snap => {
        const data = snap.val();
        if (!data || !pc) return;

        // Answer received (for caller)
        if (!isIncoming && data.answer && pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(JSON.parse(data.answer));
          setStatus('connected');
        }

        // Offer received (for callee - after accepting)
        if (isIncoming && data.offer && pc.signalingState === 'stable' && !pc.remoteDescription) {
          await pc.setRemoteDescription(JSON.parse(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await set(ref(db, `calls/${callId}/answer`), JSON.stringify(answer));
          setStatus('connected');
        }

        // ICE candidates
        Object.entries(data).forEach(async ([key, val]: any) => {
          if (key.startsWith('ice_') && !key.includes(userId)) {
            try {
              await pc.addIceCandidate(JSON.parse(val));
            } catch {}
          }
        });

        if (data.status === 'ended') { endCall(false); }
      });

    } catch (e) {
      console.error('Call error:', e);
      setStatus('ended');
      onEnd();
    }
  };

  const endCall = async (notify = true) => {
    clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    off(callRef);
    if (notify) await set(ref(db, `calls/${callId}/status`), 'ended');
    setTimeout(() => remove(callRef), 2000);
    setStatus('ended');
    onEnd();
  };

  const cleanup = () => {
    clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    off(callRef);
  };

  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = isMuted; setIsMuted(!isMuted); }
  };

  const toggleVideo = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = isVideoOff; setIsVideoOff(!isVideoOff); }
  };

  const formatDuration = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`fixed z-50 bg-[#0d1117] border border-white/10 rounded-3xl shadow-2xl overflow-hidden ${isFullscreen ? 'inset-4' : 'bottom-6 right-6 w-80'}`}
    >
      {/* Video area */}
      {mode === 'video' && (
        <div className="relative bg-black aspect-video">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-3 right-3 w-24 rounded-xl border border-white/20 object-cover aspect-video" />
          {status !== 'connected' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-2xl font-black text-white mb-3 mx-auto">
                  {targetUsername.substring(0, 2).toUpperCase()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Voice only */}
      {mode === 'voice' && (
        <div className="p-8 flex flex-col items-center bg-gradient-to-b from-emerald-900/30 to-transparent">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-3xl font-black text-white mb-4 shadow-2xl shadow-emerald-500/30">
            {targetUsername.substring(0, 2).toUpperCase()}
          </div>
          <audio ref={remoteVideoRef as any} autoPlay />
          <audio ref={localVideoRef as any} autoPlay muted />
        </div>
      )}

      {/* Info */}
      <div className="px-5 py-3 text-center">
        <h3 className="font-bold text-white">{targetUsername}</h3>
        <p className="text-sm text-white/40">
          {status === 'calling' ? t('call.calling', 'Calling...') : status === 'ringing' ? t('call.ringing', 'Ringing...') : status === 'connected' ? formatDuration(duration) : t('call.disconnected', 'Disconnected')}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 p-5 pt-0">
        <button onClick={toggleMute} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>
        {mode === 'video' && (
          <button onClick={toggleVideo} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
            {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
          </button>
        )}
        <button onClick={() => endCall()} className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-all shadow-lg shadow-red-500/30">
          <PhoneOff size={22} className="text-white" />
        </button>
        <button onClick={() => setIsFullscreen(!isFullscreen)} className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all">
          <Maximize2 size={16} />
        </button>
      </div>
    </motion.div>
  );
};

// ── Gelen Çağrı Bildirimi ─────────────────────────────────────────────────────
export const IncomingCallNotification = ({ call, onAccept, onReject }: {
  call: any, onAccept: () => void, onReject: () => void
}) => (
  <motion.div
    initial={{ opacity: 0, y: -80 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -80 }}
    className="fixed top-4 right-4 z-50 w-72 bg-[#1a1d21] border border-white/10 rounded-2xl p-4 shadow-2xl"
  >
    <div className="flex items-center gap-3 mb-4">
      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg font-black text-emerald-400">
        {(call.callerName || '?').substring(0, 2).toUpperCase()}
      </div>
      <div>
        <p className="font-bold text-white text-sm">{call.callerName}</p>
        <p className="text-xs text-white/40 flex items-center gap-1">
          {call.mode === 'video' ? <><Video size={10} /> Görüntülü arama</> : <><Phone size={10} /> Sesli arama</>}
        </p>
      </div>
      <div className="ml-auto">
        <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
      </div>
    </div>
    <div className="flex gap-2">
      <button onClick={onReject} className="flex-1 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2">
        <PhoneOff size={14} /> Reddet
      </button>
      <button onClick={onAccept} className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20">
        <Phone size={14} /> Kabul
      </button>
    </div>
  </motion.div>
);

// ── Çağrı Manager (App.tsx'e eklenecek) ──────────────────────────────────────
export const useCallManager = (userId: string, username: string) => {
  const [activeCall, setActiveCall] = useState<any>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);

  useEffect(() => {
    if (!userId) return;
    const r = ref(db, `calls`);
    onValue(r, snap => {
      const data = snap.val() || {};
      Object.entries(data).forEach(([, call]: any) => {
        if (call.callee === userId && call.status === 'calling' && !activeCall) {
          setIncomingCall(call);
        }
      });
    });
    return () => off(r);
  }, [userId]);

  const startCall = (targetUserId: string, targetUsername: string, mode: 'voice' | 'video') => {
    setActiveCall({ targetUserId, targetUsername, mode, isIncoming: false });
  };

  const acceptCall = () => {
    if (!incomingCall) return;
    setActiveCall({ targetUserId: incomingCall.caller, targetUsername: incomingCall.callerName, mode: incomingCall.mode, isIncoming: true });
    setIncomingCall(null);
  };

  const rejectCall = async () => {
    if (!incomingCall) return;
    const callId = [userId, incomingCall.caller].sort().join('_');
    await set(ref(db, `calls/${callId}/status`), 'ended');
    setIncomingCall(null);
  };

  const endCall = () => setActiveCall(null);

  return { activeCall, incomingCall, startCall, acceptCall, rejectCall, endCall };
};
