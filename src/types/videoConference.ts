/**
 * Video Conference Types
 * Extends existing VoiceRoom functionality with video capabilities
 * Requirements: 1.1, 6.1, 6.4
 */

// ============================================================================
// CORE VIDEO CONFERENCE TYPES
// ============================================================================

export interface VideoParticipant {
  // Basic Info
  userId: string;
  username: string;
  avatar?: string;
  joinedAt: number;
  
  // Media States
  isCameraOn: boolean;
  isMicOn: boolean;
  isScreenSharing: boolean;
  
  // Connection Info
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number; // milliseconds
  
  // Video Stream Info
  videoStream?: MediaStream;
  videoElement?: HTMLVideoElement;
  
  // AI Features
  transcriptionEnabled: boolean;
  isSpeaking: boolean;
  speakingStartTime?: number;
}

export interface VideoRoom {
  // Basic Info
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  
  // Room Settings
  maxParticipants: number;
  isPrivate: boolean;
  password?: string;
  
  // Video Settings
  videoEnabled: boolean;
  screenShareEnabled: boolean;
  recordingEnabled: boolean;
  
  // AI Features
  aiModerationEnabled: boolean;
  transcriptionEnabled: boolean;
  
  // State
  participants: VideoParticipant[];
  activeScreenShare?: string; // userId of screen sharer
  isRecording: boolean;
  recordingUrl?: string;
  
  // Timestamps
  createdAt: number;
  lastActivity: number;
}

export interface GridLayout {
  columns: number;
  rows: number;
  cellAspectRatio: number;
  
  // Layout configurations
  participantCount: number;
  screenShareActive: boolean;
  
  // Responsive breakpoints
  mobileLayout: LayoutConfig;
  tabletLayout: LayoutConfig;
  desktopLayout: LayoutConfig;
}

export interface LayoutConfig {
  maxColumns: number;
  minCellWidth: number;
  minCellHeight: number;
  gap: number;
}

// ============================================================================
// WEBRTC TYPES
// ============================================================================

export interface PeerConnectionState {
  connection: RTCPeerConnection;
  localStream?: MediaStream;
  remoteStream?: MediaStream;
  isInitiator: boolean;
  connectionState: RTCPeerConnectionState;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'participant-joined' | 'participant-left';
  fromUserId: string;
  toUserId?: string;
  data: any;
  timestamp: number;
}

export interface MediaPermissions {
  camera: boolean;
  microphone: boolean;
  screen: boolean;
}

export interface ConnectionQualityMetrics {
  latency: number;
  packetLoss: number;
  bandwidth: number;
  resolution: string;
  frameRate: number;
}

// ============================================================================
// MEDIA CONTROL TYPES
// ============================================================================

export interface MediaControlState {
  isCameraOn: boolean;
  isMicOn: boolean;
  isScreenSharing: boolean;
  permissions: MediaPermissions;
  availableDevices: MediaDeviceInfo[];
  selectedDevices: {
    camera?: string;
    microphone?: string;
    speaker?: string;
  };
}

export interface VideoQualitySettings {
  resolution: '480p' | '720p' | '1080p';
  frameRate: 15 | 30 | 60;
  bitrate: number; // kbps
}

// ============================================================================
// SCREEN SHARE TYPES
// ============================================================================

export interface ScreenShareState {
  isActive: boolean;
  userId?: string;
  startTime?: number;
  quality: VideoQualitySettings;
}

export interface ScreenCaptureOptions {
  video: {
    cursor: 'always' | 'motion' | 'never';
    displaySurface?: 'application' | 'browser' | 'monitor' | 'window';
  };
  audio: boolean;
}

// ============================================================================
// AI TRANSCRIPTION TYPES
// ============================================================================

export interface VideoTranscription {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  text: string;
  language: string;
  confidence: number;
  timestamp: number;
  duration: number;
}

export interface TranscriptionSettings {
  enabled: boolean;
  language: string;
  minConfidence: number;
  realTimeDisplay: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface VideoConferenceError {
  type: 'permission-denied' | 'connection-failed' | 'room-full' | 'screen-share-conflict' | 'network-error';
  message: string;
  code?: string;
  details?: any;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface VideoRoomEvent {
  type: 'participant-joined' | 'participant-left' | 'media-changed' | 'screen-share-started' | 'screen-share-stopped' | 'recording-started' | 'recording-stopped';
  roomId: string;
  userId?: string;
  data?: any;
  timestamp: number;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface VideoConferenceConfig {
  // WebRTC Configuration
  iceServers: RTCIceServer[];
  
  // Quality Settings
  defaultVideoQuality: VideoQualitySettings;
  adaptiveQuality: boolean;
  
  // Limits
  maxParticipants: number;
  maxScreenSharers: number;
  
  // Features
  enableAI: boolean;
  enableRecording: boolean;
  enableScreenShare: boolean;
  
  // UI Settings
  defaultGridLayout: Partial<GridLayout>;
  minCellSize: { width: number; height: number };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type VideoRoomStatus = 'initializing' | 'connecting' | 'connected' | 'disconnected' | 'error';

export type MediaDeviceType = 'camera' | 'microphone' | 'speaker';

export type GridLayoutMode = 'auto' | 'gallery' | 'speaker' | 'screen-share';

// ============================================================================
// CONSTANTS
// ============================================================================

export const VIDEO_CONFERENCE_CONSTANTS = {
  MAX_PARTICIPANTS: 10,
  MIN_CELL_WIDTH: 160,
  MIN_CELL_HEIGHT: 90,
  DEFAULT_ASPECT_RATIO: 16 / 9,
  CONNECTION_TIMEOUT: 30000, // 30 seconds
  RECONNECTION_ATTEMPTS: 3,
  QUALITY_CHECK_INTERVAL: 5000, // 5 seconds
  TRANSCRIPTION_MIN_CONFIDENCE: 0.7,
} as const;

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:openrelay.metered.ca:80' },
  { 
    urls: 'turn:openrelay.metered.ca:80', 
    username: 'openrelayproject', 
    credential: 'openrelayproject' 
  },
  { 
    urls: 'turn:openrelay.metered.ca:443', 
    username: 'openrelayproject', 
    credential: 'openrelayproject' 
  },
];