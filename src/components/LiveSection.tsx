import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Play, Volume2, VolumeX, Maximize2, Share2, Users, Sparkles, Send,
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff,
  Eye, Radio, Heart, Settings2, Leaf, AlertTriangle, X, BarChart3
} from 'lucide-react';
import { db, auth } from '../firebase';
import { ref, onValue, push, get, set, remove, onDisconnect, update, serverTimestamp } from 'firebase/database';
import { useTvChannels } from './ChannelSidebar';
import Hls from 'hls.js';
import HLSPlayer from './HLSPlayer';
import WebRTCPlayer from './WebRTCPlayer';
import StreamChat from './StreamChat';
import StreamList from './StreamList';
import StreamSetupWizard from './StreamSetupWizard';
import {
  LiveStreamingService,
  type StreamMetadata,
} from '../services/liveStreamingService';
import { advancedStreamingService } from '../services/advancedStreamingService';
import { aiModerationService } from '../services/aiModerationService';
import StreamingDashboard from './StreamingDashboard';

// ─────────────────────────────────────────────
// 📺 NATURE.CO TV SAYFASI
// ─────────────────────────────────────────────
const LiveSection = ({ theme, tvChannel }: { theme: any; tvChannel: string }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [viewerCount, setViewerCount] = useState(1240);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const user = auth.currentUser;
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Misafir';
  const tvChannels = useTvChannels();

  const ch = tvChannels.find(c => c.id === tvChannel) || tvChannels[0];

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
  }, [messages.length]);

  useEffect(() => {
    const msgRef = ref(db, `tv_chat/${tvChannel}`);
    const unsub = onValue(msgRef, snap => {
      const data = snap.val();
      if (!data) {
        setMessages([
          { id: '__bot1', user: 'NatureBot', isBot: true, text: 'Canlı yayına hoş geldiniz! Doğanın sesini dinleyin.' },
        ]);
        return;
      }
      const list = Object.entries(data)
        .map(([id, v]: any) => ({ id, ...v }))
        .sort((a, b) => (a.ts || 0) - (b.ts || 0))
        .slice(-80);
      setMessages([
        { id: '__bot1', user: 'NatureBot', isBot: true, text: 'Canlı yayına hoş geldiniz! Doğanın sesini dinleyin.' },
        ...list,
      ]);
    });

    if (user) {
      const viewRef = ref(db, `tv_viewers/${tvChannel}/${user.uid}`);
      set(viewRef, true);
      onDisconnect(viewRef).remove();
    }
    const viewsRef = ref(db, `tv_viewers/${tvChannel}`);
    const unsub2 = onValue(viewsRef, snap => {
      setViewerCount(1200 + (snap.size || 0));
    });

    return () => { unsub(); unsub2(); };
  }, [tvChannel]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    push(ref(db, `tv_chat/${tvChannel}`), {
      user: displayName,
      text: input.trim(),
      ts: Date.now(),
    });
    setInput('');
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0B0E11]">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 border-b border-white/5 flex items-center px-6 justify-between bg-black/20 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#ef4444"><path d="M21 6H3v12h18V6z"/><path d="M1 8h2v8H1zm20 0h2v8h-2z" fill="#ef4444"/></svg>
              </div>
              <span className="text-sm font-black text-white uppercase tracking-widest">
                Nature.co Canlı TV
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Canlı</span>
            </div>
            <span className="text-sm text-white/60 font-semibold">{ch.emoji} {ch.name}</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/40">
            <Users size={14} />
            <span className="text-xs font-bold">{viewerCount.toLocaleString('tr-TR')} İzleyici</span>
          </div>
        </div>

        <div className="flex-1 relative bg-black overflow-hidden flex flex-col">
          <iframe
            key={tvChannel}
            src={ch.embedUrl
              ? ch.embedUrl.includes('?') ? `${ch.embedUrl}&autoplay=1&mute=0&rel=0&modestbranding=1` : `${ch.embedUrl}?autoplay=1&mute=0&rel=0&modestbranding=1`
              : `https://www.youtube.com/embed/live_stream?channel=${ch.youtubeChannelId}&autoplay=1&mute=0&rel=0&modestbranding=1`}
            className="w-full flex-1 border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            title={`${ch.name} Canlı`}
          />
        </div>
      </div>

      <div className="w-72 border-l border-white/5 flex flex-col bg-black/20 flex-shrink-0">
        <div className="h-14 border-b border-white/5 flex items-center px-5">
          <span className="text-xs font-black text-white uppercase tracking-widest">Canlı Sohbet</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.map(msg => (
            <div key={msg.id} className="group">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`text-[10px] font-black uppercase tracking-widest ${msg.isBot ? 'text-emerald-400' : 'text-blue-400'}`}>
                  {msg.user}
                </span>
                {msg.isBot && <Sparkles size={9} className="text-emerald-400" />}
              </div>
              <p className="text-sm text-white/80 leading-relaxed">{msg.text}</p>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="p-3 border-t border-white/5 bg-black/20">
          <form onSubmit={handleSend} className="relative">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Sohbete katıl..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500/40 transition-all pr-10"
            />
            <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/20 hover:text-emerald-400 transition-all">
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// 🔊 Ses seviyesi göstergesi
// ─────────────────────────────────────────────
const AudioMeter = ({ stream }: { stream: MediaStream | null }) => {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!stream) { setLevel(0); return; }
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf: number;
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      setLevel(Math.min(100, avg * 2));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ctx.close(); };
  }, [stream]);
  const bars = 20;
  return (
    <div className="flex items-end gap-0.5 h-5">
      {Array.from({ length: bars }).map((_, i) => {
        const threshold = (i / bars) * 100;
        const active = level > threshold;
        const color = i < bars * 0.6 ? 'bg-emerald-500' : i < bars * 0.85 ? 'bg-yellow-500' : 'bg-red-500';
        return <div key={i} className={`w-1 rounded-full transition-all ${active ? color : 'bg-white/10'}`} style={{ height: `${30 + (i / bars) * 70}%` }} />;
      })}
    </div>
  );
};

// ─────────────────────────────────────────────
// ⏱️ Yayın süresi sayacı
// ─────────────────────────────────────────────
const StreamTimer = ({ startTime }: { startTime: number }) => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(i);
  }, [startTime]);
  const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
  const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
  const s = (elapsed % 60).toString().padStart(2, '0');
  return <span className="font-mono text-xs font-bold text-red-400">{h !== '00' ? `${h}:` : ''}{m}:{s}</span>;
};

// ─────────────────────────────────────────────
// 🎥 GENEL SOHBET ODASI — SRS Media Server Tabanlı
// ─────────────────────────────────────────────

const liveService = new LiveStreamingService();

// ─────────────────────────────────────────────
// 📦 Sürüklenebilir PiP Kamera Kutucuğu
// ─────────────────────────────────────────────
const DraggablePiP = ({ pipCamRef }: { pipCamRef: React.RefObject<HTMLVideoElement> }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, initX: 0, initY: 0 });

  // Başlangıç pozisyonu: sağ alt
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent || !containerRef.current) return;
    const pw = parent.clientWidth;
    const ph = parent.clientHeight;
    const w = containerRef.current.offsetWidth;
    const h = containerRef.current.offsetHeight;
    posRef.current = { x: pw - w - 16, y: ph - h - 80 };
    containerRef.current.style.transform = `translate(${posRef.current.x}px, ${posRef.current.y}px)`;
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initX: posRef.current.x,
      initY: posRef.current.y,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging || !containerRef.current) return;
    const parent = containerRef.current.parentElement;
    if (!parent) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const pw = parent.clientWidth;
    const ph = parent.clientHeight;
    const w = containerRef.current.offsetWidth;
    const h = containerRef.current.offsetHeight;
    const x = Math.max(0, Math.min(pw - w, dragRef.current.initX + dx));
    const y = Math.max(0, Math.min(ph - h, dragRef.current.initY + dy));
    posRef.current = { x, y };
    containerRef.current.style.transform = `translate(${x}px, ${y}px)`;
  };

  const onPointerUp = () => { dragRef.current.dragging = false; };

  return (
    <div
      ref={containerRef}
      className="absolute top-0 left-0 w-40 h-28 rounded-xl overflow-hidden border-2 border-white/30 shadow-2xl bg-black cursor-grab active:cursor-grabbing select-none"
      style={{ touchAction: 'none', zIndex: 10 }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <video ref={pipCamRef} autoPlay muted playsInline className="w-full h-full object-cover pointer-events-none" />
      <div className="absolute bottom-1 left-1 flex items-center gap-1 px-1.5 py-0.5 bg-black/60 rounded-md pointer-events-none">
        <Video size={9} className="text-white/70" />
        <span className="text-[9px] text-white/70">Kamera</span>
      </div>
      {/* Sürükleme göstergesi */}
      <div className="absolute top-1 right-1 pointer-events-none">
        <div className="w-4 h-4 flex flex-col items-center justify-center gap-0.5 opacity-50">
          <div className="w-3 h-0.5 bg-white rounded" />
          <div className="w-3 h-0.5 bg-white rounded" />
          <div className="w-3 h-0.5 bg-white rounded" />
        </div>
      </div>
    </div>
  );
};

const LiveChatPage = ({
  theme, userId, username, isVerified
}: {
  theme: any; userId: string; username: string; isVerified: boolean;
}) => {
  // Yayın durumu
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStartTime, setStreamStartTime] = useState(0);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [setupStep, setSetupStep] = useState<'idle' | 'setup' | 'live'>('idle');

  // İzleyici
  const [selectedStream, setSelectedStream] = useState<StreamMetadata | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamEnded, setStreamEnded] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [chatOverlay, setChatOverlay] = useState(false);

  // Advanced streaming features
  const [showStreamDashboard, setShowStreamDashboard] = useState(false);
  const [streamAnalytics, setStreamAnalytics] = useState<any>(null);
  const [autoHighlights, setAutoHighlights] = useState<any[]>([]);

  // Canlı kontroller
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [pipCamStream, setPipCamStream] = useState<MediaStream | null>(null); // PiP kamera stream
  const [streamMode, setStreamMode] = useState<string>('browser_camera');
  const [deviceWarning, setDeviceWarning] = useState<string | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const pipCamRef = useRef<HTMLVideoElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Yayıncı: local stream'i video elementine bağla
  useEffect(() => {
    if (videoRef.current && localStream && setupStep === 'live') {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, setupStep]);

  // PiP kamera stream'ini video elementine bağla
  useEffect(() => {
    if (pipCamRef.current && pipCamStream) {
      pipCamRef.current.srcObject = pipCamStream;
    }
  }, [pipCamStream]);

  // İzleyici presence tracking (Gereksinim 7.1, 7.2, 7.4)
  useEffect(() => {
    if (!selectedStream || isStreaming) return;
    const streamId = selectedStream.uid;

    // Yayıncının kendi kaydını yazma (Gereksinim 7.4)
    if (streamId === userId) return;

    const viewerRef = ref(db, `stream_viewers/${streamId}/${userId}`);
    set(viewerRef, true);
    onDisconnect(viewerRef).remove();

    const unsub = onValue(ref(db, `stream_viewers/${streamId}`), snap => {
      setViewerCount(snap.val() ? Object.keys(snap.val()).length : 0);
    });

    return () => {
      unsub();
      remove(viewerRef);
    };
  }, [selectedStream?.uid, isStreaming, userId]);

  // Yayıncı kendi izleyici sayısını dinle
  useEffect(() => {
    if (!isStreaming || !userId) return;
    const unsub = onValue(ref(db, `stream_viewers/${userId}`), snap => {
      setViewerCount(snap.val() ? Object.keys(snap.val()).length : 0);
    });
    return () => unsub();
  }, [isStreaming, userId]);

  // Seçili yayın silinince "Yayın sona erdi" göster (Gereksinim 11.5)
  useEffect(() => {
    if (!selectedStream) return;
    const streamRef = ref(db, `live_streams/${selectedStream.uid}`);
    const unsub = onValue(streamRef, snap => {
      if (!snap.exists()) {
        setStreamEnded(true);
        setTimeout(() => {
          setSelectedStream(null);
          setStreamEnded(false);
        }, 3000);
      }
    });
    return () => unsub();
  }, [selectedStream?.uid]);

  // Load analytics every 5 seconds when streaming
  useEffect(() => {
    if (!isStreaming || !userId) return;
    const interval = setInterval(() => {
      const analytics = advancedStreamingService.getStreamAnalytics(userId);
      setStreamAnalytics(analytics);
    }, 5000);
    return () => clearInterval(interval);
  }, [isStreaming, userId]);

  // Wizard'dan yayın başlat
  const handleWizardStart = useCallback(async (config: any, stream: MediaStream | null) => {
    // Create stream with advanced service
    advancedStreamingService.createStream(
      userId, username, config.title || 'Yayın', config.category || 'Genel',
      { autoHighlights: true, autoTranscription: true, autoModeration: true }
    );
    advancedStreamingService.startStream(userId);

    if (config.mode === 'obs') {
      await liveService.startOBSStream(userId, {
        username,
        title: config.title,
        category: config.category,
        quality: config.quality,
      });
      setIsStreaming(true);
      setStreamStartTime(Date.now());
      setSetupStep('live');
      return;
    }

    // Ekran + Kamera modu
    if (config.mode === 'browser_screen_cam') {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: config.cameraId ? { deviceId: { exact: config.cameraId } } : true,
          audio: config.micId ? { deviceId: { exact: config.micId } } : true,
        });

        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrack.onended = () => stopScreenShare();

        // WHIP'e ekran video + mikrofon audio gönder
        const mixedStream = new MediaStream([
          screenTrack,
          ...camStream.getAudioTracks(),
        ]);

        liveService.setActiveStream(mixedStream);
        await liveService.startBrowserStream(userId, {
          username,
          title: config.title,
          category: config.category,
          mode: config.mode,
          quality: config.quality,
        });

        // Ana video = ekran, PiP = kamera
        setLocalStream(mixedStream);
        setPipCamStream(new MediaStream(camStream.getVideoTracks()));
        setIsScreenSharing(true);
        setStreamMode('browser_screen_cam');
        setIsStreaming(true);
        setStreamStartTime(Date.now());
        setSetupStep('live');
        return;
      } catch {
        setDeviceWarning('Ekran + Kamera başlatılamadı.');
        return;
      }
    }

    // Tarayıcı kamera/ekran modu
    let mediaStream = stream;
    if (!mediaStream) {
      const constraints: MediaStreamConstraints = {
        video: config.cameraId ? { deviceId: { exact: config.cameraId } } : true,
        audio: config.micId ? { deviceId: { exact: config.micId } } : true,
      };
      mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    }

    liveService.setActiveStream(mediaStream);
    await liveService.startBrowserStream(userId, {
      username,
      title: config.title,
      category: config.category,
      mode: config.mode,
      quality: config.quality,
    });

    setLocalStream(mediaStream);
    setStreamMode(config.mode);
    setIsStreaming(true);
    setStreamStartTime(Date.now());
    setSetupStep('live');
  }, [userId, username]);

  // Yayını bitir (Gereksinim 11.1, 11.2, 11.3)
  const handleStopStream = useCallback(async () => {
    // End stream with advanced service and generate highlights
    advancedStreamingService.endStream(userId);
    advancedStreamingService.generateAutoHighlights(userId)
      .then(highlights => setAutoHighlights(highlights))
      .catch(e => console.error('generateAutoHighlights failed:', e));

    await liveService.stopStream(userId);
    localStream?.getTracks().forEach(t => t.stop());
    pipCamStream?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    setLocalStream(null);
    setPipCamStream(null);
    setIsScreenSharing(false);
    setStreamMode('browser_camera');
    setIsStreaming(false);
    setSetupStep('idle');
  }, [userId, localStream, pipCamStream]);

  const toggleMic = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = !micOn; });
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = !camOn; });
    setCamOn(!camOn);
  };

  const stopScreenShare = useCallback(async () => {
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current = null;
    pipCamStream?.getTracks().forEach(t => t.stop());
    setPipCamStream(null);
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const camTrack = camStream.getVideoTracks()[0];
      const sender = liveService.getVideoSender?.();
      if (sender) await sender.replaceTrack(camTrack);
      if (localStream) {
        localStream.getVideoTracks().forEach(t => { localStream.removeTrack(t); t.stop(); });
        localStream.addTrack(camTrack);
        if (videoRef.current) videoRef.current.srcObject = localStream;
      }
      setCamOn(true);
    } catch {
      setDeviceWarning('Kameraya geri dönülemedi.');
    }
    setIsScreenSharing(false);
    setStreamMode('browser_camera');
  }, [localStream, pipCamStream]);

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        // Kullanıcı tarayıcıdan durdurursa otomatik kameraya dön
        screenTrack.onended = () => stopScreenShare();

        const sender = liveService.getVideoSender?.();
        if (sender) await sender.replaceTrack(screenTrack);
        if (localStream) {
          localStream.getVideoTracks().forEach(t => { localStream.removeTrack(t); t.stop(); });
          localStream.addTrack(screenTrack);
          if (videoRef.current) videoRef.current.srcObject = localStream;
        }
        setIsScreenSharing(true);
        setCamOn(true);
      } catch {
        setDeviceWarning('Ekran paylaşımı başlatılamadı.');
      }
    }
  };

  // ── RENDER ────────────────────────────────────

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0B0E11]" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)' }}>
      {/* ── Ana Alan ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="h-14 border-b border-white/5 flex items-center px-5 justify-between bg-black/30 backdrop-blur-md flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center">
              <Video size={13} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-tight">Genel Sohbet Odası</h3>
              <p className="text-[10px] text-white/30">Canlı yayın platformu</p>
            </div>
            {isStreaming && (
              <div className="flex items-center gap-2 ml-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-500/20 border border-red-500/30 rounded-full">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-red-400">CANLI</span>
                </div>
                <StreamTimer startTime={streamStartTime} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <>
                <button
                  onClick={() => setShowStreamDashboard(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${showStreamDashboard ? 'bg-blue-500/30 border border-blue-500/50 text-blue-300' : 'bg-white/5 border border-white/10 text-white/50 hover:text-white'}`}
                  title="Stream Dashboard"
                >
                  <BarChart3 size={12} /> Dashboard
                </button>
                <button onClick={handleStopStream} className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold rounded-xl hover:bg-red-500/30 transition-all">
                  <PhoneOff size={13} /> Yayını Bitir
                </button>
              </>
            ) : (
              <button onClick={() => setSetupStep('setup')} className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold rounded-xl hover:bg-purple-500/30 transition-all">
                <Radio size={13} /> Yayın Başlat
              </button>
            )}
          </div>
        </div>

        {/* ── SETUP WIZARD ── */}
        {setupStep === 'setup' && (
          <StreamSetupWizard
            userId={userId}
            username={username}
            onStart={handleWizardStart}
            onCancel={() => setSetupStep('idle')}
            theme={theme}
          />
        )}

        {/* ── CANLI YAYIN SAHNESI (Yayıncı) ── */}
        {setupStep === 'live' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 relative bg-black overflow-hidden">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />

              {/* PiP Kamera Kutucuğu — sürüklenebilir */}
              {pipCamStream && (
                <DraggablePiP pipCamRef={pipCamRef} />
              )}

              {/* StreamingDashboard overlay */}
              {showStreamDashboard && (
                <div className="absolute top-4 right-4 w-80 z-30">
                  <StreamingDashboard
                    streamId={userId}
                    isLive={true}
                    onClose={() => setShowStreamDashboard(false)}
                  />
                </div>
              )}

              {deviceWarning && (
                <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-4 py-2 bg-yellow-500/90 backdrop-blur-sm">
                  <AlertTriangle size={14} className="text-yellow-900 flex-shrink-0" />
                  <span className="text-xs font-bold text-yellow-900 flex-1">{deviceWarning}</span>
                  <button onClick={() => setDeviceWarning(null)} className="text-yellow-900/70 hover:text-yellow-900"><X size={13} /></button>
                </div>
              )}

              {/* HUD */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 rounded-full shadow-lg shadow-red-500/30">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-[11px] font-black text-white tracking-wide">CANLI</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black/60 backdrop-blur-sm rounded-full">
                  <Eye size={11} className="text-white/70" />
                  <span className="text-[11px] text-white font-bold">{viewerCount}</span>
                </div>
                <div className="px-2.5 py-1.5 bg-black/60 backdrop-blur-sm rounded-full">
                  <StreamTimer startTime={streamStartTime} />
                </div>
              </div>

              {/* Ses göstergesi */}
              <div className="absolute bottom-20 left-4">
                {micOn ? <AudioMeter stream={localStream} /> : (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 border border-red-500/30 rounded-full">
                    <MicOff size={11} className="text-red-400" />
                    <span className="text-[10px] text-red-400">Mikrofon kapalı</span>
                  </div>
                )}
              </div>

              {/* Kontroller */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <button onClick={toggleMic} className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all ${micOn ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-red-500/20 border-red-500/30 text-red-400'}`}>
                  {micOn ? <Mic size={16} /> : <MicOff size={16} />}
                </button>
                <button onClick={toggleCam} className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all ${camOn ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-red-500/20 border-red-500/30 text-red-400'}`}>
                  {camOn ? <Video size={16} /> : <VideoOff size={16} />}
                </button>
                <button onClick={toggleScreenShare} className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all ${isScreenSharing ? 'bg-blue-500/30 border-blue-500/50 text-blue-300' : 'bg-white/10 border-white/20 text-white hover:bg-white/20'}`} title={isScreenSharing ? 'Ekran paylaşımını durdur' : 'Ekran paylaş'}>
                  {isScreenSharing ? <MonitorOff size={16} /> : <Monitor size={16} />}
                </button>
                <button onClick={handleStopStream} className="w-11 h-11 rounded-full bg-red-500 border border-red-400 text-white flex items-center justify-center hover:bg-red-400 transition-all">
                  <PhoneOff size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── İZLEYİCİ GÖRÜNÜMÜ ── */}
        {setupStep === 'idle' && (
          <div className="flex-1 flex overflow-hidden">
            {/* Auto Highlights after stream ends */}
            {autoHighlights.length > 0 && (
              <div className="absolute top-16 left-4 right-4 z-20 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl backdrop-blur-sm">
                <div className="text-sm font-bold text-purple-300 mb-2 flex items-center gap-2">
                  <BarChart3 size={14} /> 🎬 AI Otomatik Öne Çıkanlar
                </div>
                <div className="flex gap-3 overflow-x-auto">
                  {autoHighlights.map(h => (
                    <div key={h.id} className="flex-shrink-0 p-3 bg-white/5 rounded-lg min-w-32">
                      <div className="text-xs text-white font-bold">{h.title}</div>
                      <div className="text-[10px] text-white/40">{h.duration}sn · Skor: {h.aiScore}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Yayın listesi */}
            <div className="w-64 border-r border-white/5 overflow-y-auto flex-shrink-0">
              <div className="h-10 border-b border-white/5 flex items-center px-4">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Aktif Yayınlar</span>
              </div>
              <StreamList
                currentUserId={userId}
                selectedStreamId={selectedStream?.uid || null}
                onSelectStream={s => { setSelectedStream(s); setStreamEnded(false); }}
                theme={theme}
              />
            </div>

            {/* Video alanı */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedStream ? (
                <>
                  {/* Yayın başlığı */}
                  <div className="h-10 border-b border-white/5 flex items-center px-4 gap-3 flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs font-bold text-white truncate">{selectedStream.title}</span>
                    <span className="text-[10px] text-white/30">{selectedStream.username}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <div className="flex items-center gap-1 text-white/40">
                        <Eye size={11} />
                        <span className="text-[10px]">{viewerCount}</span>
                      </div>
                      {/* Chat overlay toggle */}
                      <button
                        onClick={() => { setTheaterMode(true); setChatOverlay(true); }}
                        title="Tam ekran + Chat"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all text-[10px]"
                      >
                        <Maximize2 size={11} />
                        <span>Tam Ekran</span>
                      </button>
                    </div>
                  </div>

                  {/* Video Player */}
                  <div className="flex-1 relative">
                    {streamEnded ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                        <Radio size={32} className="text-white/20 mb-3" />
                        <p className="text-sm text-white/50">Yayın sona erdi</p>
                      </div>
                    ) : selectedStream.mode === 'obs' ? (
                      <HLSPlayer
                        hlsUrl={selectedStream.hlsUrl}
                        className="absolute inset-0 w-full h-full"
                        onEnded={() => setStreamEnded(true)}
                      />
                    ) : (
                      <WebRTCPlayer
                        streamKey={selectedStream.uid}
                        className="absolute inset-0 w-full h-full"
                        onEnded={() => setStreamEnded(true)}
                      />
                    )}
                  </div>

                  {/* Theater Mode Overlay — portal ile body'e render et */}
                  {theaterMode && createPortal(
                    <div className="fixed inset-0 bg-black flex" style={{ zIndex: 99999 }}>
                      {/* Video */}
                      <div className={`relative flex-1 transition-all ${chatOverlay ? 'mr-80' : ''}`}>
                        {streamEnded ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                            <Radio size={32} className="text-white/20 mb-3" />
                            <p className="text-sm text-white/50">Yayın sona erdi</p>
                          </div>
                        ) : selectedStream.mode === 'obs' ? (
                          <HLSPlayer
                            hlsUrl={selectedStream.hlsUrl}
                            className="absolute inset-0 w-full h-full"
                            onEnded={() => setStreamEnded(true)}
                          />
                        ) : (
                          <WebRTCPlayer
                            streamKey={selectedStream.uid}
                            className="absolute inset-0 w-full h-full"
                            onEnded={() => setStreamEnded(true)}
                          />
                        )}

                        {/* Kontrol bar — sağ üst köşe, her zaman görünür */}
                        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs font-bold text-white truncate max-w-[200px]">{selectedStream.title}</span>
                            <span className="text-[10px] text-white/40">{selectedStream.username}</span>
                          </div>
                          <div className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white/50">
                            <Eye size={11} />
                            <span className="text-[10px]">{viewerCount}</span>
                          </div>
                          <button
                            onClick={() => setChatOverlay(v => !v)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all text-xs font-bold backdrop-blur-sm"
                          >
                            <Send size={12} />
                            <span>{chatOverlay ? 'Chat Gizle' : 'Chat Göster'}</span>
                          </button>
                          <button
                            onClick={() => { setTheaterMode(false); setChatOverlay(false); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white transition-all text-xs font-bold"
                          >
                            <X size={12} />
                            <span>Çık</span>
                          </button>
                        </div>
                      </div>

                      {/* Chat panel — sağda sabit */}
                      {chatOverlay && (
                        <div className="absolute right-0 top-0 bottom-0 w-80 bg-[#0B0E11]/95 border-l border-white/10 flex flex-col">
                          <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 flex-shrink-0">
                            <span className="text-xs font-black text-white uppercase tracking-widest">Sohbet</span>
                            <button onClick={() => setChatOverlay(false)} className="text-white/30 hover:text-white transition-all">
                              <X size={14} />
                            </button>
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <StreamChat
                              streamId={selectedStream.uid}
                              isStreamer={false}
                              theme={theme}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  , document.body)}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-20 h-20 rounded-3xl bg-white/3 border border-white/8 flex items-center justify-center mb-4">
                    <Radio size={32} className="text-white/20" />
                  </div>
                  <p className="text-sm font-bold text-white/40 mb-1">Yayın seç</p>
                  <p className="text-xs text-white/20">Sol panelden bir yayın seç veya kendi yayınını başlat</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Sohbet Paneli ── */}
      <div className="w-72 border-l border-white/5 flex-shrink-0">
        <StreamChat
          streamId={isStreaming ? userId : (selectedStream?.uid || '')}
          isStreamer={isStreaming}
          theme={theme}
        />
      </div>
    </div>
  );
};

export { LiveSection, LiveChatPage };
export default LiveSection;

// ─────────────────────────────────────────────
// 🔀 Wrapper — type prop'una göre TV veya Chat
// ─────────────────────────────────────────────
interface LiveSectionWrapperProps {
  theme: any;
  type: 'tv' | 'chat';
  tvChannel?: string;
  userId?: string;
  username?: string;
  isVerified?: boolean;
}

export const LiveSectionWrapper: React.FC<LiveSectionWrapperProps> = ({
  theme, type, tvChannel = 'nature', userId = '', username = 'Misafir', isVerified = false,
}) => {
  if (type === 'tv') {
    return <LiveSection theme={theme} tvChannel={tvChannel} />;
  }
  return <LiveChatPage theme={theme} userId={userId} username={username} isVerified={isVerified} />;
};
