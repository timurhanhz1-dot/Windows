/**
 * Screen Share Controls Component
 * Screen sharing UI controls ve conflict handling
 * Requirements: 5.3, 5.5, 10.3
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  Monitor, MonitorOff, MonitorSpeaker, Square, StopCircle,
  AlertTriangle, Users, Clock, Settings, ChevronDown,
  Maximize2, Minimize2, Volume2, VolumeX, Info
} from 'lucide-react';
import { ScreenShareManager } from '../services/screenShareManager';
import { ScreenShareState, VideoQualitySettings } from '../types/videoConference';

interface ScreenShareControlsProps {
  isScreenSharing: boolean;
  onStartScreenShare: () => Promise<void>;
  onStopScreenShare: () => Promise<void>;
  conflictUser?: { userId: string; username: string } | null;
  onResolveConflict?: (action: 'takeover' | 'cancel') => void;
  disabled?: boolean;
  participantCount?: number;
  roomDuration?: number;
}

interface ScreenShareConflictModalProps {
  conflictUser: { userId: string; username: string };
  onResolve: (action: 'takeover' | 'cancel') => void;
  onClose: () => void;
}

// Screen Share Conflict Modal
function ScreenShareConflictModal({ conflictUser, onResolve, onClose }: ScreenShareConflictModalProps) {
  const { t } = useTranslation();
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(8px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24
    }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        style={{
          background: '#1F2937',
          borderRadius: 20,
          padding: 28,
          maxWidth: 420,
          width: '100%',
          border: '1px solid rgba(245,158,11,0.2)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'rgba(245,158,11,0.15)',
            border: '1px solid rgba(245,158,11,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={24} color="#F59E0B" />
          </div>
          <div>
            <h3 style={{
              fontSize: 18,
              fontWeight: 800,
              color: '#fff',
              margin: 0,
              marginBottom: 4
            }}>
              {t('mediaControls.screenShareConflict')}
            </h3>
            <p style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.6)',
              margin: 0
            }}>
              {t('mediaControls.screenShareConflictDesc')}
            </p>
          </div>
        </div>

        <div style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8
          }}>
            <Users size={16} color="#F59E0B" />
            <span style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#F59E0B'
            }}>
              {conflictUser.username}
            </span>
            <span style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)'
            }}>
              {t('mediaControls.currentlySharing')}
            </span>
          </div>
          <p style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.6)',
            margin: 0,
            lineHeight: 1.4
          }}>
            {t('mediaControls.conflictNote')}
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: 12
        }}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onResolve('cancel')}
            style={{
              flex: 1,
              padding: '12px 0',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.7)',
              border: 'none',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.05em'
            }}
          >
            {t('mediaControls.cancel')}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onResolve('takeover')}
            style={{
              flex: 2,
              padding: '12px 0',
              background: '#F59E0B',
              color: '#000',
              border: 'none',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 900,
              cursor: 'pointer',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.05em',
              boxShadow: '0 4px 16px rgba(245,158,11,0.3)'
            }}
          >
            {t('mediaControls.takeover')}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// Screen Share Status Indicator
function ScreenShareStatusIndicator({ 
  isActive, 
  duration, 
  quality 
}: { 
  isActive: boolean; 
  duration: number;
  quality?: VideoQualitySettings;
}) {
  const { t } = useTranslation();
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      style={{
        position: 'absolute',
        top: -50,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(16,185,129,0.9)',
        borderRadius: 20,
        padding: '8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 12,
        fontWeight: 700,
        color: '#000',
        boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
        zIndex: 100
      }}
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#000'
        }}
      />
      <span>{t('mediaControls.screenSharing')}</span>
      <span>•</span>
      <span>{formatDuration(Math.floor(duration / 1000))}</span>
      {quality && (
        <>
          <span>•</span>
          <span>{quality.resolution}</span>
        </>
      )}
    </motion.div>
  );
}

// Main Screen Share Controls Component
export function ScreenShareControls({
  isScreenSharing,
  onStartScreenShare,
  onStopScreenShare,
  conflictUser,
  onResolveConflict,
  disabled = false,
  participantCount = 1,
  roomDuration = 0
}: ScreenShareControlsProps) {
  const { t } = useTranslation();
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [screenShareState, setScreenShareState] = useState<ScreenShareState>({
    isActive: false,
    quality: { resolution: '1080p', frameRate: 30, bitrate: 2000 }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const screenShareManager = useRef<ScreenShareManager | null>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  // Initialize screen share manager
  useEffect(() => {
    screenShareManager.current = new ScreenShareManager();
    
    // Setup event listeners
    const manager = screenShareManager.current;
    
    manager.on('screenShareStarted', (data: any) => {
      setScreenShareState(prev => ({
        ...prev,
        isActive: true,
        startTime: data.startTime
      }));
      setError(null);
    });
    
    manager.on('screenShareStopped', () => {
      setScreenShareState(prev => ({
        ...prev,
        isActive: false,
        startTime: undefined
      }));
    });
    
    manager.on('error', (error: any) => {
      setError(error.message);
      setIsLoading(false);
    });

    return () => {
      manager.cleanup();
    };
  }, []);

  // Handle conflict modal
  useEffect(() => {
    if (conflictUser && !showConflictModal) {
      setShowConflictModal(true);
    }
  }, [conflictUser, showConflictModal]);

  // Close advanced options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (controlsRef.current && !controlsRef.current.contains(event.target as Node)) {
        setShowAdvancedOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartScreenShare = async () => {
    if (disabled || isLoading) return;
    
    // Check for conflicts
    if (conflictUser) {
      setShowConflictModal(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onStartScreenShare();
    } catch (err: any) {
      setError(err.message || 'Ekran paylaşımı başlatılamadı');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopScreenShare = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      await onStopScreenShare();
    } catch (err: any) {
      setError(err.message || 'Ekran paylaşımı durdurulamadı');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConflictResolve = (action: 'takeover' | 'cancel') => {
    setShowConflictModal(false);
    
    if (action === 'takeover') {
      onResolveConflict?.(action);
      // After resolving conflict, start screen share
      setTimeout(() => {
        handleStartScreenShare();
      }, 500);
    } else {
      onResolveConflict?.(action);
    }
  };

  const handleQualityChange = (quality: Partial<VideoQualitySettings>) => {
    if (screenShareManager.current) {
      screenShareManager.current.setQuality(quality);
      setScreenShareState(prev => ({
        ...prev,
        quality: { ...prev.quality, ...quality }
      }));
    }
  };

  const getDuration = () => {
    if (!screenShareState.startTime) return 0;
    return Date.now() - screenShareState.startTime;
  };

  return (
    <div ref={controlsRef} style={{ position: 'relative' }}>
      {/* Screen Share Status Indicator */}
      <AnimatePresence>
        {isScreenSharing && (
          <ScreenShareStatusIndicator
            isActive={isScreenSharing}
            duration={getDuration()}
            quality={screenShareState.quality}
          />
        )}
      </AnimatePresence>

      {/* Advanced Options Panel */}
      <AnimatePresence>
        {showAdvancedOptions && (
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
              minWidth: 280,
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              zIndex: 100
            }}
          >
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.6)',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <Settings size={14} />
              {t('mediaControls.screenSettings')}
            </div>

            {/* Quality Settings */}
            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.5)',
                marginBottom: 6
              }}>
                {t('mediaControls.quality')}
              </div>
              <div style={{
                display: 'flex',
                gap: 6
              }}>
                {['480p', '720p', '1080p'].map((resolution) => (
                  <motion.button
                    key={resolution}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleQualityChange({ resolution: resolution as any })}
                    style={{
                      padding: '6px 12px',
                      background: screenShareState.quality.resolution === resolution 
                        ? 'rgba(16,185,129,0.2)' 
                        : 'rgba(255,255,255,0.05)',
                      border: screenShareState.quality.resolution === resolution
                        ? '1px solid rgba(16,185,129,0.4)'
                        : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: screenShareState.quality.resolution === resolution ? '#10B981' : '#fff',
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {resolution}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Frame Rate Settings */}
            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.5)',
                marginBottom: 6
              }}>
                {t('mediaControls.fps')}
              </div>
              <div style={{
                display: 'flex',
                gap: 6
              }}>
                {[15, 30, 60].map((frameRate) => (
                  <motion.button
                    key={frameRate}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleQualityChange({ frameRate })}
                    style={{
                      padding: '6px 12px',
                      background: screenShareState.quality.frameRate === frameRate 
                        ? 'rgba(16,185,129,0.2)' 
                        : 'rgba(255,255,255,0.05)',
                      border: screenShareState.quality.frameRate === frameRate
                        ? '1px solid rgba(16,185,129,0.4)'
                        : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      color: screenShareState.quality.frameRate === frameRate ? '#10B981' : '#fff',
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {frameRate}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Browser Support Info */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 8,
              fontSize: 10,
              color: 'rgba(255,255,255,0.6)'
            }}>
              <Info size={12} color="#3B82F6" />
              <span>
                {ScreenShareManager.isSupported() 
                  ? t('mediaControls.supported')
                  : t('mediaControls.notSupported')
                }
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Control Button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <motion.button
          whileHover={disabled ? {} : { scale: 1.05 }}
          whileTap={disabled ? {} : { scale: 0.95 }}
          onClick={isScreenSharing ? handleStopScreenShare : handleStartScreenShare}
          disabled={disabled || isLoading}
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            background: disabled 
              ? 'rgba(107,114,128,0.3)'
              : isScreenSharing 
                ? 'rgba(239,68,68,0.15)' 
                : 'rgba(16,185,129,0.15)',
            color: disabled 
              ? '#6B7280'
              : isScreenSharing ? '#EF4444' : '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isScreenSharing && !disabled
              ? '0 0 12px rgba(239,68,68,0.3)' 
              : !disabled && !isScreenSharing
                ? '0 0 12px rgba(16,185,129,0.2)'
                : 'none',
            transition: 'all 0.2s ease',
            opacity: disabled ? 0.5 : 1,
            position: 'relative'
          }}
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{
                width: 20,
                height: 20,
                border: '2px solid transparent',
                borderTop: `2px solid ${disabled ? '#6B7280' : isScreenSharing ? '#EF4444' : '#10B981'}`,
                borderRadius: '50%'
              }}
            />
          ) : isScreenSharing ? (
            <StopCircle size={20} />
          ) : (
            <Monitor size={20} />
          )}
        </motion.button>

        {/* Advanced Options Toggle */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: showAdvancedOptions 
              ? 'rgba(16,185,129,0.15)' 
              : 'rgba(255,255,255,0.05)',
            color: showAdvancedOptions ? '#10B981' : 'rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
        >
          <ChevronDown size={14} style={{
            transform: showAdvancedOptions ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }} />
        </motion.button>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: 8,
              padding: '8px 12px',
              background: 'rgba(239,68,68,0.9)',
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              color: '#fff',
              whiteSpace: 'nowrap',
              maxWidth: 200,
              textAlign: 'center',
              zIndex: 100
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conflict Modal */}
      <AnimatePresence>
        {showConflictModal && conflictUser && (
          <ScreenShareConflictModal
            conflictUser={conflictUser}
            onResolve={handleConflictResolve}
            onClose={() => setShowConflictModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ScreenShareControls;