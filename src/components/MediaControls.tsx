/**
 * MediaControls - Gelişmiş Media Kontrol Sistemi
 * Kamera, mikrofon, ekran paylaşımı ve cihaz yönetimi
 * Requirements: 4.1, 4.2, 4.4, 4.5
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  Video, VideoOff, Mic, MicOff, Monitor, MonitorOff, PhoneOff,
  Settings, Volume2, VolumeX, Camera, CameraOff, ChevronUp,
  Wifi, WifiOff, AlertTriangle, CheckCircle, MessageSquare
} from 'lucide-react';
import { MediaControlState, MediaDeviceType } from '../types/videoConference';

interface MediaControlsProps {
  mediaState: MediaControlState;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onToggleScreenShare: () => void;
  onToggleTranscription?: () => void;
  onLeaveRoom: () => void;
  onDeviceChange?: (deviceType: MediaDeviceType, deviceId: string) => void;
  connectionQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  isRecording?: boolean;
  isTranscriptionActive?: boolean;
  participantCount?: number;
  roomDuration?: number;
}

interface DeviceMenuProps {
  devices: MediaDeviceInfo[];
  selectedDeviceId?: string;
  onDeviceSelect: (deviceId: string) => void;
  deviceType: MediaDeviceType;
}

// Cihaz Seçim Menüsü
function DeviceMenu({ devices, selectedDeviceId, onDeviceSelect, deviceType }: DeviceMenuProps) {
  const { t } = useTranslation();

  const getDeviceIcon = () => {
    switch (deviceType) {
      case 'camera': return <Camera size={14} />;
      case 'microphone': return <Mic size={14} />;
      case 'speaker': return <Volume2 size={14} />;
      default: return null;
    }
  };

  const getDeviceLabel = () => {
    switch (deviceType) {
      case 'camera': return t('mediaControls.camera');
      case 'microphone': return t('mediaControls.microphone');
      case 'speaker': return t('mediaControls.speaker');
      default: return t('mediaControls.device');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: 8,
        background: '#1F2937',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: 8,
        minWidth: 200,
        maxWidth: 280,
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        zIndex: 1000
      }}
    >
      <div style={{
        fontSize: 12,
        fontWeight: 600,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }}>
        {getDeviceIcon()}
        {getDeviceLabel()} {t('mediaControls.selectDevice')}
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {devices.length === 0 ? (
          <div style={{
            padding: '8px 12px',
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            textAlign: 'center'
          }}>
            {t('mediaControls.noDevice')}
          </div>
        ) : (
          devices.map((device) => (
            <motion.button
              key={device.deviceId}
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onDeviceSelect(device.deviceId)}
              style={{
                padding: '8px 12px',
                background: device.deviceId === selectedDeviceId 
                  ? 'rgba(16,185,129,0.15)' 
                  : 'transparent',
                border: device.deviceId === selectedDeviceId
                  ? '1px solid rgba(16,185,129,0.3)'
                  : '1px solid transparent',
                borderRadius: 8,
                color: device.deviceId === selectedDeviceId ? '#10B981' : '#fff',
                fontSize: 11,
                fontWeight: device.deviceId === selectedDeviceId ? 600 : 400,
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: 180
              }}>
                {device.label || `${getDeviceLabel()} ${device.deviceId.slice(-4)}`}
              </span>
              {device.deviceId === selectedDeviceId && (
                <CheckCircle size={12} color="#10B981" />
              )}
            </motion.button>
          ))
        )}
      </div>
    </motion.div>
  );
}

// Ana Media Controls Bileşeni
export function MediaControls({
  mediaState,
  onToggleCamera,
  onToggleMic,
  onToggleScreenShare,
  onToggleTranscription,
  onLeaveRoom,
  onDeviceChange,
  connectionQuality = 'good',
  isRecording = false,
  isTranscriptionActive = false,
  participantCount = 1,
  roomDuration = 0
}: MediaControlsProps) {
  const { t } = useTranslation();
  const [showDeviceMenu, setShowDeviceMenu] = useState<MediaDeviceType | null>(null);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const controlsRef = useRef<HTMLDivElement>(null);

  // Dışarı tıklandığında menüyü kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (controlsRef.current && !controlsRef.current.contains(event.target as Node)) {
        setShowDeviceMenu(null);
        setShowAdvancedControls(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getConnectionIcon = () => {
    switch (connectionQuality) {
      case 'excellent': return <Wifi size={14} color="#10B981" />;
      case 'good': return <Wifi size={14} color="#F59E0B" />;
      case 'fair': return <WifiOff size={14} color="#EF4444" />;
      case 'poor': return <AlertTriangle size={14} color="#EF4444" />;
      default: return <Wifi size={14} color="#6B7280" />;
    }
  };

  const getConnectionText = () => {
    switch (connectionQuality) {
      case 'excellent': return t('mediaControls.connectionExcellent');
      case 'good': return t('mediaControls.connectionGood');
      case 'fair': return t('mediaControls.connectionFair');
      case 'poor': return t('mediaControls.connectionPoor');
      default: return t('mediaControls.connectionUnknown');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeviceSelect = (deviceType: MediaDeviceType, deviceId: string) => {
    onDeviceChange?.(deviceType, deviceId);
    setShowDeviceMenu(null);
  };

  return (
    <div ref={controlsRef} style={{ position: 'relative' }}>
      {/* Gelişmiş Kontroller (Üst Panel) */}
      <AnimatePresence>
        {showAdvancedControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 16,
              background: 'rgba(0,0,0,0.9)',
              backdropFilter: 'blur(10px)',
              borderRadius: 16,
              padding: '16px 20px',
              border: '1px solid rgba(255,255,255,0.1)',
              minWidth: 320,
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
            }}
          >
            {/* Oda Bilgileri */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              paddingBottom: 12,
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: isRecording ? '#EF4444' : '#10B981',
                  boxShadow: `0 0 8px ${isRecording ? '#EF4444' : '#10B981'}`
                }} />
                <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>
                  {participantCount} {t('mediaControls.participants')} • {formatDuration(roomDuration)}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {getConnectionIcon()}
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                  {getConnectionText()}
                </span>
              </div>
            </div>

            {/* Cihaz Kontrolleri */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8
            }}>
              {/* Kamera Cihazları */}
              <div style={{ position: 'relative' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDeviceMenu(showDeviceMenu === 'camera' ? null : 'camera')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <Camera size={12} />
                  {t('mediaControls.camera')}
                  <ChevronUp size={10} style={{
                    transform: showDeviceMenu === 'camera' ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }} />
                </motion.button>

                <AnimatePresence>
                  {showDeviceMenu === 'camera' && (
                    <DeviceMenu
                      devices={mediaState.availableDevices.filter(d => d.kind === 'videoinput')}
                      selectedDeviceId={mediaState.selectedDevices.camera}
                      onDeviceSelect={(deviceId) => handleDeviceSelect('camera', deviceId)}
                      deviceType="camera"
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Mikrofon Cihazları */}
              <div style={{ position: 'relative' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDeviceMenu(showDeviceMenu === 'microphone' ? null : 'microphone')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <Mic size={12} />
                  {t('mediaControls.microphone')}
                  <ChevronUp size={10} style={{
                    transform: showDeviceMenu === 'microphone' ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }} />
                </motion.button>

                <AnimatePresence>
                  {showDeviceMenu === 'microphone' && (
                    <DeviceMenu
                      devices={mediaState.availableDevices.filter(d => d.kind === 'audioinput')}
                      selectedDeviceId={mediaState.selectedDevices.microphone}
                      onDeviceSelect={(deviceId) => handleDeviceSelect('microphone', deviceId)}
                      deviceType="microphone"
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Hoparlör Cihazları */}
              <div style={{ position: 'relative' }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDeviceMenu(showDeviceMenu === 'speaker' ? null : 'speaker')}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8,
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <Volume2 size={12} />
                  {t('mediaControls.speaker')}
                  <ChevronUp size={10} style={{
                    transform: showDeviceMenu === 'speaker' ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }} />
                </motion.button>

                <AnimatePresence>
                  {showDeviceMenu === 'speaker' && (
                    <DeviceMenu
                      devices={mediaState.availableDevices.filter(d => d.kind === 'audiooutput')}
                      selectedDeviceId={mediaState.selectedDevices.speaker}
                      onDeviceSelect={(deviceId) => handleDeviceSelect('speaker', deviceId)}
                      deviceType="speaker"
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* İzin Durumları */}
            <div style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: mediaState.permissions.camera ? '#10B981' : '#EF4444'
                }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{t('mediaControls.permCamera')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: mediaState.permissions.microphone ? '#10B981' : '#EF4444'
                }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{t('mediaControls.permMicrophone')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: mediaState.permissions.screen ? '#10B981' : '#6B7280'
                }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{t('mediaControls.permScreen')}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Ana Kontrol Paneli */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: '16px 24px',
        background: 'rgba(0,0,0,0.8)',
        borderRadius: 20,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
      }}>
        {/* Kamera Toggle */}
        <div style={{ position: 'relative' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleCamera}
            disabled={!mediaState.permissions.camera}
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              border: 'none',
              cursor: mediaState.permissions.camera ? 'pointer' : 'not-allowed',
              background: !mediaState.permissions.camera
                ? 'rgba(107,114,128,0.3)'
                : mediaState.isCameraOn 
                  ? 'rgba(16,185,129,0.15)' 
                  : 'rgba(239,68,68,0.15)',
              color: !mediaState.permissions.camera
                ? '#6B7280'
                : mediaState.isCameraOn ? '#10B981' : '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: mediaState.isCameraOn && mediaState.permissions.camera
                ? '0 0 12px rgba(16,185,129,0.2)' 
                : 'none',
              transition: 'all 0.2s ease',
              opacity: mediaState.permissions.camera ? 1 : 0.5
            }}
          >
            {mediaState.isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
          </motion.button>

          {/* Kamera durumu göstergesi */}
          <div style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: !mediaState.permissions.camera
              ? '#6B7280'
              : mediaState.isCameraOn ? '#10B981' : '#EF4444',
            border: '2px solid rgba(0,0,0,0.8)',
            boxShadow: `0 0 4px ${!mediaState.permissions.camera ? '#6B7280' : mediaState.isCameraOn ? '#10B981' : '#EF4444'}`
          }} />
        </div>

        {/* Mikrofon Toggle */}
        <div style={{ position: 'relative' }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleMic}
            disabled={!mediaState.permissions.microphone}
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              border: 'none',
              cursor: mediaState.permissions.microphone ? 'pointer' : 'not-allowed',
              background: !mediaState.permissions.microphone
                ? 'rgba(107,114,128,0.3)'
                : mediaState.isMicOn 
                  ? 'rgba(16,185,129,0.15)' 
                  : 'rgba(239,68,68,0.15)',
              color: !mediaState.permissions.microphone
                ? '#6B7280'
                : mediaState.isMicOn ? '#10B981' : '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: mediaState.isMicOn && mediaState.permissions.microphone
                ? '0 0 12px rgba(16,185,129,0.2)' 
                : 'none',
              transition: 'all 0.2s ease',
              opacity: mediaState.permissions.microphone ? 1 : 0.5
            }}
          >
            {mediaState.isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
          </motion.button>

          {/* Mikrofon durumu göstergesi */}
          <div style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: !mediaState.permissions.microphone
              ? '#6B7280'
              : mediaState.isMicOn ? '#10B981' : '#EF4444',
            border: '2px solid rgba(0,0,0,0.8)',
            boxShadow: `0 0 4px ${!mediaState.permissions.microphone ? '#6B7280' : mediaState.isMicOn ? '#10B981' : '#EF4444'}`
          }} />
        </div>

        {/* Ekran Paylaşımı Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleScreenShare}
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            background: mediaState.isScreenSharing 
              ? 'rgba(16,185,129,0.15)' 
              : 'rgba(255,255,255,0.05)',
            color: mediaState.isScreenSharing ? '#10B981' : 'rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: mediaState.isScreenSharing 
              ? '0 0 12px rgba(16,185,129,0.2)' 
              : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          {mediaState.isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
        </motion.button>

        {/* AI Transkripsiyon Toggle */}
        {onToggleTranscription && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleTranscription}
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              background: isTranscriptionActive 
                ? 'rgba(16,185,129,0.15)' 
                : 'rgba(255,255,255,0.05)',
              color: isTranscriptionActive ? '#10B981' : 'rgba(255,255,255,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: isTranscriptionActive 
                ? '0 0 12px rgba(16,185,129,0.2)' 
                : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <MessageSquare size={20} />
          </motion.button>
        )}

        {/* Ayarlar Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAdvancedControls(!showAdvancedControls)}
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            background: showAdvancedControls 
              ? 'rgba(16,185,129,0.15)' 
              : 'rgba(255,255,255,0.05)',
            color: showAdvancedControls ? '#10B981' : 'rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
        >
          <Settings size={20} style={{
            transform: showAdvancedControls ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease'
          }} />
        </motion.button>

        {/* Ayırıcı */}
        <div style={{
          width: 1,
          height: 32,
          background: 'rgba(255,255,255,0.1)',
          margin: '0 4px'
        }} />

        {/* Odadan Ayrıl */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onLeaveRoom}
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            border: 'none',
            cursor: 'pointer',
            background: 'rgba(239,68,68,0.15)',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
        >
          <PhoneOff size={20} />
        </motion.button>
      </div>

      {/* Kayıt Göstergesi */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'absolute',
              top: -40,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: 'rgba(239,68,68,0.9)',
              borderRadius: 20,
              fontSize: 11,
              fontWeight: 600,
              color: '#fff'
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#fff'
              }}
            />
            {t('mediaControls.recording')}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MediaControls;