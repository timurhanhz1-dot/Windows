/**
 * VideoGrid - Gelişmiş Video Grid Layout Sistemi
 * Responsive tasarım, ekran paylaşımı optimizasyonu ve dinamik layout hesaplaması
 * Requirements: 3.1, 3.2, 3.3, 3.5
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  VideoParticipant, 
  GridLayout, 
  LayoutConfig,
  VIDEO_CONFERENCE_CONSTANTS 
} from '../types/videoConference';

interface VideoGridProps {
  participants: VideoParticipant[];
  localUserId: string;
  screenShareActive?: boolean;
  screenShareUserId?: string;
  containerWidth?: number;
  containerHeight?: number;
  onParticipantClick?: (participant: VideoParticipant) => void;
}

interface GridDimensions {
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
}

// Responsive breakpoints
const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440
} as const;

// Layout configurations for different screen sizes
const LAYOUT_CONFIGS: Record<string, LayoutConfig> = {
  mobile: {
    maxColumns: 2,
    minCellWidth: 80,
    minCellHeight: 60,
    gap: 6
  },
  tablet: {
    maxColumns: 3,
    minCellWidth: 120,
    minCellHeight: 90,
    gap: 8
  },
  desktop: {
    maxColumns: 4,
    minCellWidth: 160,
    minCellHeight: 120,
    gap: 12
  }
} as const;

// Helper functions defined outside component to avoid TDZ issues
function calculateScreenShareLayout(
  participantCount: number,
  width: number,
  height: number,
  config: LayoutConfig
): GridDimensions {
  const thumbnailAreaWidth = width * 0.3;
  const thumbnailAreaHeight = height;
  const thumbnailCount = participantCount - 1;

  if (thumbnailCount === 0) {
    return {
      columns: 1,
      rows: 1,
      cellWidth: width - config.gap * 2,
      cellHeight: height - config.gap * 2,
      gap: config.gap
    };
  }

  const thumbnailCols = Math.min(2, Math.ceil(Math.sqrt(thumbnailCount)));
  const thumbnailRows = Math.ceil(thumbnailCount / thumbnailCols);

  const thumbnailCellWidth = Math.max(
    config.minCellWidth * 0.8,
    (thumbnailAreaWidth - config.gap * (thumbnailCols + 1)) / thumbnailCols
  );

  const thumbnailCellHeight = Math.max(
    config.minCellHeight * 0.8,
    (thumbnailAreaHeight - config.gap * (thumbnailRows + 1)) / thumbnailRows
  );

  return {
    columns: thumbnailCols,
    rows: thumbnailRows,
    cellWidth: thumbnailCellWidth,
    cellHeight: thumbnailCellHeight,
    gap: config.gap
  };
}

function calculateNormalLayout(
  participantCount: number,
  width: number,
  height: number,
  config: LayoutConfig
): GridDimensions {
  const availableWidth = width - config.gap * 2;
  const availableHeight = height - config.gap * 2;

  let bestLayout: GridDimensions = {
    columns: 1,
    rows: 1,
    cellWidth: config.minCellWidth,
    cellHeight: config.minCellHeight,
    gap: config.gap
  };

  let bestScore = 0;

  for (let cols = 1; cols <= Math.min(participantCount, config.maxColumns); cols++) {
    const rows = Math.ceil(participantCount / cols);
    const cellWidth = Math.floor((availableWidth - (cols - 1) * config.gap) / cols);
    const cellHeight = Math.floor((availableHeight - (rows - 1) * config.gap) / rows);

    if (cellWidth < config.minCellWidth * 0.5 || cellHeight < config.minCellHeight * 0.5) continue;

    const aspectRatio = cellWidth / cellHeight;
    const targetAspectRatio = VIDEO_CONFERENCE_CONSTANTS.DEFAULT_ASPECT_RATIO;
    const aspectScore = 1 - Math.abs(aspectRatio - targetAspectRatio) / targetAspectRatio;
    const areaScore = (cellWidth * cellHeight * participantCount) / (availableWidth * availableHeight);
    const totalScore = aspectScore * 0.7 + areaScore * 0.3;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestLayout = { columns: cols, rows, cellWidth, cellHeight, gap: config.gap };
    }
  }

  return bestLayout;
}

export function VideoGrid({
  participants,
  localUserId,
  screenShareActive = false,
  screenShareUserId,
  containerWidth = 1200,
  containerHeight = 800,
  onParticipantClick
}: VideoGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<GridDimensions>({
    columns: 1,
    rows: 1,
    cellWidth: 300,
    cellHeight: 225,
    gap: 16
  });

  // Ekran boyutuna göre layout config'i belirle
  const layoutConfig = useMemo((): LayoutConfig => {
    if (containerWidth <= BREAKPOINTS.mobile) return LAYOUT_CONFIGS.mobile;
    if (containerWidth <= BREAKPOINTS.tablet) return LAYOUT_CONFIGS.tablet;
    return LAYOUT_CONFIGS.desktop;
  }, [containerWidth]);

  // Optimal grid layout hesapla
  const calculateGridLayout = useMemo((): GridDimensions => {
    const participantCount = participants.length;
    if (participantCount === 0) {
      return {
        columns: 1,
        rows: 1,
        cellWidth: layoutConfig.minCellWidth,
        cellHeight: layoutConfig.minCellHeight,
        gap: layoutConfig.gap
      };
    }
    if (screenShareActive && screenShareUserId) {
      return calculateScreenShareLayout(participantCount, containerWidth, containerHeight, layoutConfig);
    }
    return calculateNormalLayout(participantCount, containerWidth, containerHeight, layoutConfig);
  }, [participants.length, containerWidth, containerHeight, layoutConfig, screenShareActive, screenShareUserId]);

  // Container boyutları değiştiğinde layout'u güncelle
  useEffect(() => {
    const newDimensions = calculateGridLayout;
    setDimensions(newDimensions);
  }, [calculateGridLayout]);

  // Resize observer ile container boyutlarını takip et
  useEffect(() => {
    if (!gridRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Container boyutları değiştiğinde yeniden hesapla
        // Bu useEffect'in dependency'leri otomatik olarak tetikleyecek
      }
    });

    resizeObserver.observe(gridRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Katılımcıları düzenle (ekran paylaşan önce)
  const sortedParticipants = useMemo(() => {
    const sorted = [...participants];
    
    // Ekran paylaşan varsa onu başa al
    if (screenShareUserId) {
      sorted.sort((a, b) => {
        if (a.userId === screenShareUserId) return -1;
        if (b.userId === screenShareUserId) return 1;
        // Local user'ı ikinci sıraya al
        if (a.userId === localUserId) return -1;
        if (b.userId === localUserId) return 1;
        return 0;
      });
    } else {
      // Normal sıralama: local user önce, sonra join sırasına göre
      sorted.sort((a, b) => {
        if (a.userId === localUserId) return -1;
        if (b.userId === localUserId) return 1;
        return a.joinedAt - b.joinedAt;
      });
    }

    return sorted;
  }, [participants, screenShareUserId, localUserId]);

  return (
    <div 
      ref={gridRef}
      className="video-grid-container"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: dimensions.gap,
        boxSizing: 'border-box'
      }}
    >
      {screenShareActive && screenShareUserId ? (
        <ScreenShareLayout
          participants={sortedParticipants}
          localUserId={localUserId}
          screenShareUserId={screenShareUserId}
          dimensions={dimensions}
          onParticipantClick={onParticipantClick}
        />
      ) : (
        <NormalGridLayout
          participants={sortedParticipants}
          localUserId={localUserId}
          dimensions={dimensions}
          onParticipantClick={onParticipantClick}
        />
      )}
    </div>
  );
}
// Normal Grid Layout Bileşeni
function NormalGridLayout({
  participants,
  localUserId,
  dimensions,
  onParticipantClick
}: {
  participants: VideoParticipant[];
  localUserId: string;
  dimensions: GridDimensions;
  onParticipantClick?: (participant: VideoParticipant) => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${dimensions.columns}, 1fr)`,
        gridTemplateRows: `repeat(${dimensions.rows}, 1fr)`,
        gap: dimensions.gap,
        width: '100%',
        height: '100%',
        maxWidth: dimensions.columns * dimensions.cellWidth + (dimensions.columns - 1) * dimensions.gap,
        maxHeight: dimensions.rows * dimensions.cellHeight + (dimensions.rows - 1) * dimensions.gap
      }}
    >
      <AnimatePresence mode="popLayout">
        {participants.map((participant, index) => (
          <motion.div
            key={participant.userId}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              delay: index * 0.05
            }}
            style={{
              width: '100%',
              height: '100%',
              minWidth: dimensions.cellWidth,
              minHeight: dimensions.cellHeight
            }}
          >
            <ParticipantVideoCell
              participant={participant}
              isLocal={participant.userId === localUserId}
              onClick={() => onParticipantClick?.(participant)}
              priority={index === 0 ? 'high' : 'normal'}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// Ekran Paylaşımı Layout Bileşeni
function ScreenShareLayout({
  participants,
  localUserId,
  screenShareUserId,
  dimensions,
  onParticipantClick
}: {
  participants: VideoParticipant[];
  localUserId: string;
  screenShareUserId: string;
  dimensions: GridDimensions;
  onParticipantClick?: (participant: VideoParticipant) => void;
}) {
  const screenShareParticipant = participants.find(p => p.userId === screenShareUserId);
  const otherParticipants = participants.filter(p => p.userId !== screenShareUserId);

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        gap: dimensions.gap
      }}
    >
      {/* Ana ekran paylaşımı alanı */}
      <div
        style={{
          flex: '1 1 65%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 16,
          overflow: 'hidden'
        }}
      >
        {screenShareParticipant && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ width: '100%', height: '100%' }}
          >
            <ParticipantVideoCell
              participant={screenShareParticipant}
              isLocal={screenShareParticipant.userId === localUserId}
              onClick={() => onParticipantClick?.(screenShareParticipant)}
              priority="high"
              isScreenShare={true}
            />
          </motion.div>
        )}
      </div>

      {/* Thumbnail alanı */}
      <div
        style={{
          flex: '0 0 35%',
          display: 'flex',
          flexDirection: 'column',
          gap: dimensions.gap,
          maxWidth: 280
        }}
      >
        <AnimatePresence>
          {otherParticipants.map((participant, index) => (
            <motion.div
              key={participant.userId}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ delay: index * 0.1 }}
              style={{
                flex: '1 1 auto',
                minHeight: 100,
                maxHeight: 150,
                borderRadius: 12,
                overflow: 'hidden'
              }}
            >
              <ParticipantVideoCell
                participant={participant}
                isLocal={participant.userId === localUserId}
                onClick={() => onParticipantClick?.(participant)}
                priority="normal"
                compact={true}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Bireysel Katılımcı Video Hücresi
function ParticipantVideoCell({
  participant,
  isLocal,
  onClick,
  priority = 'normal',
  isScreenShare = false,
  compact = false
}: {
  participant: VideoParticipant;
  isLocal: boolean;
  onClick?: () => void;
  priority?: 'high' | 'normal';
  isScreenShare?: boolean;
  compact?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Video stream'i video element'e bağla
  useEffect(() => {
    if (videoRef.current && participant.videoStream) {
      videoRef.current.srcObject = participant.videoStream;
      videoRef.current.onloadedmetadata = () => {
        setIsVideoLoaded(true);
      };
    }
  }, [participant.videoStream]);

  const getConnectionColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return '#10B981';
      case 'good': return '#F59E0B';
      case 'fair': return '#EF4444';
      case 'poor': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getBorderColor = () => {
    if (isLocal) return '#10B981';
    if (participant.isSpeaking) return '#F59E0B';
    return 'rgba(255,255,255,0.1)';
  };

  return (
    <motion.div
      whileHover={{ scale: compact ? 1.02 : 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#1F2937',
        borderRadius: compact ? 12 : 16,
        overflow: 'hidden',
        border: `2px solid ${getBorderColor()}`,
        boxShadow: isLocal 
          ? '0 0 20px rgba(16,185,129,0.3)' 
          : participant.isSpeaking 
            ? '0 0 15px rgba(245,158,11,0.3)'
            : 'none',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease'
      }}
    >
      {/* Video Element */}
      {participant.videoStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // Local video'yu mute et (echo önleme)
          style={{
            width: '100%',
            height: '100%',
            objectFit: isScreenShare ? 'contain' : 'cover',
            background: '#000'
          }}
        />
      ) : (
        // Avatar görünümü (kamera kapalı)
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #374151, #1F2937)',
          color: '#fff'
        }}>
          <div style={{
            width: compact ? 40 : 80,
            height: compact ? 40 : 80,
            borderRadius: '50%',
            background: isLocal ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: compact ? 14 : 24,
            fontWeight: 900,
            color: isLocal ? '#10B981' : '#fff'
          }}>
            {(participant.username ?? '??').substring(0, 2).toUpperCase()}
          </div>
        </div>
      )}

      {/* Video yükleme göstergesi */}
      {participant.isCameraOn && participant.videoStream && !isVideoLoaded && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.7)',
          color: '#fff',
          fontSize: compact ? 10 : 12
        }}>
          Video yükleniyor...
        </div>
      )}

      {/* Overlay bilgileri */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
        padding: compact ? '8px 8px 6px' : '16px 12px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 4 : 6 }}>
          <span style={{
            fontSize: compact ? 10 : 12,
            fontWeight: 700,
            color: '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            maxWidth: compact ? 80 : 120,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {isLocal ? 'Sen' : participant.username}
          </span>
          
          {/* Bağlantı kalitesi göstergesi */}
          <div style={{
            width: compact ? 4 : 6,
            height: compact ? 4 : 6,
            borderRadius: '50%',
            background: getConnectionColor(participant.connectionQuality),
            boxShadow: `0 0 4px ${getConnectionColor(participant.connectionQuality)}`
          }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 2 : 4 }}>
          {/* Mikrofon durumu */}
          {!participant.isMicOn && (
            <div style={{
              width: compact ? 16 : 20,
              height: compact ? 16 : 20,
              borderRadius: '50%',
              background: 'rgba(239,68,68,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: compact ? 8 : 10, color: '#fff' }}>🔇</span>
            </div>
          )}
          
          {/* Kamera durumu */}
          {!participant.isCameraOn && (
            <div style={{
              width: compact ? 16 : 20,
              height: compact ? 16 : 20,
              borderRadius: '50%',
              background: 'rgba(107,114,128,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: compact ? 8 : 10, color: '#fff' }}>📹</span>
            </div>
          )}

          {/* Ekran paylaşımı göstergesi */}
          {participant.isScreenSharing && (
            <div style={{
              width: compact ? 16 : 20,
              height: compact ? 16 : 20,
              borderRadius: '50%',
              background: 'rgba(16,185,129,0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: compact ? 8 : 10, color: '#fff' }}>🖥️</span>
            </div>
          )}
        </div>
      </div>

      {/* Konuşma göstergesi */}
      {participant.isSpeaking && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          padding: '4px 8px',
          background: 'rgba(245,158,11,0.9)',
          borderRadius: 12,
          fontSize: compact ? 8 : 10,
          fontWeight: 700,
          color: '#000',
          textTransform: 'uppercase'
        }}>
          Konuşuyor
        </div>
      )}

      {/* Local user göstergesi */}
      {isLocal && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          padding: '4px 8px',
          background: 'rgba(16,185,129,0.9)',
          borderRadius: 12,
          fontSize: compact ? 8 : 10,
          fontWeight: 700,
          color: '#000',
          textTransform: 'uppercase'
        }}>
          Sen
        </div>
      )}
    </motion.div>
  );
}

export default VideoGrid;