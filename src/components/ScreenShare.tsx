import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Monitor, MonitorOff, X, Maximize2, Minimize2 } from 'lucide-react';

interface ScreenShareProps {
  onStop: () => void;
  theme: any;
}

export function useScreenShare() {
  const [isSharing, setIsSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startScreenShare = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: true,
      });
      setStream(mediaStream);
      setIsSharing(true);

      mediaStream.getVideoTracks()[0].addEventListener('ended', () => {
        setIsSharing(false);
        setStream(null);
      });

      return mediaStream;
    } catch (err) {
      console.error('Screen share error:', err);
      return null;
    }
  };

  const stopScreenShare = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsSharing(false);
  };

  return { isSharing, stream, startScreenShare, stopScreenShare };
}

export const ScreenShareView: React.FC<ScreenShareProps & { stream: MediaStream | null }> = ({ stream, onStop, theme }) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  if (!stream) return null;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        position: 'relative', background: '#000', borderRadius: 16,
        overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
      
      {/* Controls overlay */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
        padding: '24px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8, padding: '4px 10px',
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }} />
          <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 600 }}>{t('mediaControls.screenShareActive')}</span>
        </div>
        
        <button onClick={toggleFullscreen} style={{
          background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8,
          width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.7)',
        }}>
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>

        <button onClick={onStop} style={{
          background: '#ef4444', border: 'none', borderRadius: 8,
          padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          color: 'white', fontSize: 12, fontWeight: 600,
        }}>
          <MonitorOff size={14} /> {t('mediaControls.stopSharing')}
        </button>
      </div>
    </motion.div>
  );
};

export default ScreenShareView;
