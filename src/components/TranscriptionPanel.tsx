/**
 * TranscriptionPanel Component
 * Real-time transcription display with speaker identification
 * Requirements: 7.2, 7.3, 7.4
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare, Download, Settings, X, Volume2, VolumeX,
  User, Clock, FileText, Copy, Trash2, Eye, EyeOff
} from 'lucide-react';
import { VideoTranscription, TranscriptionSettings } from '../types/videoConference';
import { AITranscriptionService } from '../services/aiTranscriptionService';

interface TranscriptionPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  transcriptionService: AITranscriptionService;
  roomId: string;
  userId: string;
  username: string;
  participants: Array<{ userId: string; username: string; isSpeaking: boolean }>;
}

interface TranscriptionMessage extends VideoTranscription {
  isCurrentUser: boolean;
}

export function TranscriptionPanel({
  isVisible,
  onToggle,
  transcriptionService,
  roomId,
  userId,
  username,
  participants
}: TranscriptionPanelProps) {
  const { t } = useTranslation();
  const [transcriptions, setTranscriptions] = useState<TranscriptionMessage[]>([]);
  const [settings, setSettings] = useState<TranscriptionSettings>({
    enabled: false,
    language: 'tr',
    minConfidence: 0.7,
    realTimeDisplay: true
  });
  const [isActive, setIsActive] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const transcriptRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);

  // ============================================================================
  // INITIALIZATION & CLEANUP
  // ============================================================================

  useEffect(() => {
    // Load initial settings
    const initialSettings = transcriptionService.getSettings();
    setSettings(initialSettings);
    setIsActive(transcriptionService.isTranscriptionActive());

    // Setup event listeners
    const handleTranscription = (event: any) => {
      if (event.type === 'text' && event.transcription) {
        const transcription: TranscriptionMessage = {
          ...event.transcription,
          roomId,
          userId: currentSpeaker || userId,
          username: getParticipantName(currentSpeaker || userId),
          isCurrentUser: (currentSpeaker || userId) === userId
        };
        
        setTranscriptions(prev => [...prev, transcription]);
        
        // Auto-scroll to bottom if enabled
        if (autoScrollRef.current) {
          setTimeout(() => {
            transcriptRef.current?.scrollTo({
              top: transcriptRef.current.scrollHeight,
              behavior: 'smooth'
            });
          }, 100);
        }
      } else if (event.type === 'started') {
        setIsActive(true);
      } else if (event.type === 'stopped') {
        setIsActive(false);
      }
    };

    const handleSpeakerChange = (event: any) => {
      if (event.isActive) {
        setCurrentSpeaker(event.userId);
      } else if (currentSpeaker === event.userId) {
        setCurrentSpeaker(null);
      }
    };

    const handleConsentRequest = (event: any) => {
      if (event.required) {
        setShowConsentModal(true);
      }
    };

    const handleError = (event: any) => {
      console.error('Transcription error:', event);
      // Could show error toast here
    };

    transcriptionService.on('transcription', handleTranscription);
    transcriptionService.on('speaker-change', handleSpeakerChange);
    transcriptionService.on('consent', handleConsentRequest);
    transcriptionService.on('error', handleError);

    return () => {
      transcriptionService.off('transcription', handleTranscription);
      transcriptionService.off('speaker-change', handleSpeakerChange);
      transcriptionService.off('consent', handleConsentRequest);
      transcriptionService.off('error', handleError);
    };
  }, [transcriptionService, roomId, userId, currentSpeaker]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getParticipantName = useCallback((participantId: string): string => {
    const participant = participants.find(p => p.userId === participantId);
    return participant?.username || t('transcription.unknownUser');
  }, [participants]);

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.9) return '#10B981'; // Green
    if (confidence >= 0.7) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  // ============================================================================
  // TRANSCRIPTION CONTROL
  // ============================================================================

  const handleStartTranscription = async () => {
    if (!consentGiven) {
      setShowConsentModal(true);
      return;
    }

    try {
      // Get user's audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await transcriptionService.startTranscription(roomId, userId, stream, true);
      
      // Update settings
      const newSettings = { ...settings, enabled: true };
      setSettings(newSettings);
      transcriptionService.updateSettings(newSettings);
      
    } catch (error) {
      console.error('Failed to start transcription:', error);
    }
  };

  const handleStopTranscription = async () => {
    await transcriptionService.stopTranscription();
    
    const newSettings = { ...settings, enabled: false };
    setSettings(newSettings);
    transcriptionService.updateSettings(newSettings);
  };

  const handleConsentAccept = () => {
    setConsentGiven(true);
    setShowConsentModal(false);
    handleStartTranscription();
  };

  const handleConsentDecline = () => {
    setShowConsentModal(false);
  };

  // ============================================================================
  // SETTINGS MANAGEMENT
  // ============================================================================

  const handleSettingsUpdate = (newSettings: Partial<TranscriptionSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    transcriptionService.updateSettings(updatedSettings);
  };

  // ============================================================================
  // EXPORT FUNCTIONALITY
  // ============================================================================

  const handleExport = async (format: 'txt' | 'json' | 'srt') => {
    setIsExporting(true);
    
    try {
      const content = await transcriptionService.exportTranscript(format);
      
      // Create and download file
      const blob = new Blob([content], { 
        type: format === 'json' ? 'application/json' : 'text/plain' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcript_${roomId}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyTranscript = async () => {
    try {
      const content = await transcriptionService.exportTranscript('txt');
      await navigator.clipboard.writeText(content);
      // Could show success toast here
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleClearTranscript = () => {
    setTranscriptions([]);
    transcriptionService.clearTranscriptionHistory();
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!isVisible) {
    return (
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggle}
        style={{
          position: 'fixed',
          bottom: 120,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: isActive ? '#10B981' : 'rgba(255,255,255,0.1)',
          border: `2px solid ${isActive ? '#10B981' : 'rgba(255,255,255,0.2)'}`,
          color: isActive ? '#000' : '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isActive ? '0 0 20px rgba(16,185,129,0.4)' : '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 1000
        }}
      >
        <MessageSquare size={24} />
      </motion.button>
    );
  }

  return (
    <>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 400,
          height: '100vh',
          background: '#0B0E11',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRight: 'none',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <MessageSquare size={18} color={isActive ? '#10B981' : 'rgba(255,255,255,0.6)'} />
            </div>
            <div>
              <div style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#fff',
                marginBottom: 2
              }}>
                {t('transcription.title')}
              </div>
              <div style={{
                fontSize: 12,
                color: isActive ? '#10B981' : 'rgba(255,255,255,0.4)',
                fontWeight: 600
              }}>
                {isActive ? t('transcription.active') : t('transcription.inactive')}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSettings(!showSettings)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: showSettings ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: showSettings ? '#10B981' : 'rgba(255,255,255,0.6)'
              }}
            >
              <Settings size={16} />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggle}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.6)'
              }}
            >
              <X size={16} />
            </motion.button>
          </div>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.02)'
              }}
            >
              <div style={{ padding: '16px 24px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16
                }}>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#fff'
                  }}>
                    {t('transcription.confidenceThreshold')}
                  </span>
                  <span style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.6)'
                  }}>
                    {Math.round(settings.minConfidence * 100)}%
                  </span>
                </div>
                
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.05"
                  value={settings.minConfidence}
                  onChange={(e) => handleSettingsUpdate({ minConfidence: parseFloat(e.target.value) })}
                  style={{
                    width: '100%',
                    marginBottom: 16
                  }}
                />
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#fff'
                  }}>
                    {t('transcription.realTimeDisplay')}
                  </span>
                  
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSettingsUpdate({ realTimeDisplay: !settings.realTimeDisplay })}
                    style={{
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      background: settings.realTimeDisplay ? '#10B981' : 'rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                  >
                    <motion.div
                      animate={{ left: settings.realTimeDisplay ? 22 : 4 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                      style={{
                        position: 'absolute',
                        top: 4,
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        background: '#fff'
                      }}
                    />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Control Buttons */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          gap: 8
        }}>
          {!isActive ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartTranscription}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: '#10B981',
                color: '#000',
                border: 'none',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <Volume2 size={16} />
              {t('transcription.start')}
            </motion.button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStopTranscription}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'rgba(239,68,68,0.15)',
                color: '#EF4444',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <VolumeX size={16} />
              {t('transcription.stop')}
            </motion.button>
          )}
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleExport('txt')}
            disabled={transcriptions.length === 0 || isExporting}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: transcriptions.length > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${transcriptions.length > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)'}`,
              cursor: transcriptions.length > 0 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: transcriptions.length > 0 ? '#10B981' : 'rgba(255,255,255,0.3)'
            }}
          >
            <Download size={16} />
          </motion.button>
        </div>

        {/* Transcript Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Current Speaker Indicator */}
          {currentSpeaker && (
            <div style={{
              padding: '12px 24px',
              background: 'rgba(16,185,129,0.05)',
              borderBottom: '1px solid rgba(16,185,129,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#10B981',
                animation: 'pulse 1.5s infinite'
              }} />
              <span style={{
                fontSize: 12,
                color: '#10B981',
                fontWeight: 600
              }}>
                {getParticipantName(currentSpeaker)} {t('transcription.speaking')}
              </span>
            </div>
          )}
          
          {/* Transcript Messages */}
          <div
            ref={transcriptRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px 0'
            }}
          >
            {transcriptions.length === 0 ? (
              <div style={{
                padding: '40px 24px',
                textAlign: 'center',
                color: 'rgba(255,255,255,0.4)'
              }}>
                <MessageSquare size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  {t('transcription.noTranscription')}
                </div>
                <div style={{ fontSize: 12 }}>
                  {t('transcription.noTranscriptionDesc')}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {transcriptions.map((transcription) => (
                  <motion.div
                    key={transcription.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      padding: '12px 24px',
                      background: transcription.isCurrentUser ? 
                        'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                      borderLeft: `3px solid ${transcription.isCurrentUser ? '#10B981' : 'rgba(255,255,255,0.1)'}`
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 6
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        <User size={12} color="rgba(255,255,255,0.6)" />
                        <span style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: transcription.isCurrentUser ? '#10B981' : '#fff'
                        }}>
                          {transcription.username}
                        </span>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: getConfidenceColor(transcription.confidence)
                          }}
                          title={`Güven: ${Math.round(transcription.confidence * 100)}%`}
                        />
                        <span style={{
                          fontSize: 10,
                          color: 'rgba(255,255,255,0.4)'
                        }}>
                          {formatTime(transcription.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{
                      fontSize: 14,
                      color: 'rgba(255,255,255,0.9)',
                      lineHeight: 1.4
                    }}>
                      {transcription.text}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          {transcriptions.length > 0 && (
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              gap: 8
            }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCopyTranscript}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <Copy size={14} />
                {t('transcription.copy')}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleClearTranscript}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 10,
                  color: '#EF4444',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <Trash2 size={14} />
                {t('transcription.clear')}
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Consent Modal */}
      <AnimatePresence>
        {showConsentModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 2000,
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
                width: '100%',
                maxWidth: 480,
                background: '#111418',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 24,
                padding: 32
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 24
              }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MessageSquare size={24} color="#10B981" />
                </div>
                <div>
                  <div style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: '#fff',
                    marginBottom: 4
                  }}>
                    {t('transcription.consentTitle')}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.6)'
                  }}>
                    {t('transcription.consentSubtitle')}
                  </div>
                </div>
              </div>
              
              <div style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.8)',
                lineHeight: 1.6,
                marginBottom: 24
              }}>
                {t('transcription.consentDesc')}
              </div>
              
              <div style={{
                display: 'flex',
                gap: 12
              }}>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConsentDecline}
                  style={{
                    flex: 1,
                    padding: '14px 20px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {t('transcription.consentDecline')}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleConsentAccept}
                  style={{
                    flex: 2,
                    padding: '14px 20px',
                    background: '#10B981',
                    color: '#000',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {t('transcription.consentAccept')}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

export default TranscriptionPanel;