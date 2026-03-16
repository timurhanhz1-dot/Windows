// Advanced Voice Room Types - Better than Discord!

export interface VoiceRoom {
  id: string;
  name: string;
  description?: string;
  channelId: string;
  
  // Settings
  maxParticipants: number;
  bitrate: number; // kbps
  region: 'auto' | 'us-east' | 'us-west' | 'europe' | 'asia';
  
  // Features
  noiseSuppressionEnabled: boolean;
  echoCancellationEnabled: boolean;
  autoGainControlEnabled: boolean;
  
  // Recording
  isRecording: boolean;
  recordingStartTime?: number;
  recordingUrl?: string;
  
  // Participants
  participants: VoiceParticipant[];
  hostId: string;
  moderatorIds: string[];
  
  // Status
  isActive: boolean;
  created_at: number;
  created_by: string;
}

export interface VoiceParticipant {
  userId: string;
  username: string;
  avatar?: string;
  
  // Audio State
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  volume: number; // 0-100
  audioLevel: number; // Current audio level 0-100
  
  // Video State
  hasVideo: boolean;
  videoEnabled: boolean;
  videoQuality: 'low' | 'medium' | 'high';
  
  // Screen Share
  isScreenSharing: boolean;
  screenShareQuality: 'low' | 'medium' | 'high';
  
  // Connection
  joinedAt: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
  latency: number; // ms
  packetLoss: number; // percentage
  
  // Permissions
  canSpeak: boolean;
  canShareScreen: boolean;
  canRecord: boolean;
  
  // AI Features
  transcriptionEnabled: boolean;
  translationEnabled: boolean;
  targetLanguage?: string;
}

export interface VoiceSettings {
  // Input
  inputDeviceId: string;
  inputVolume: number;
  inputSensitivity: number;
  
  // Output
  outputDeviceId: string;
  outputVolume: number;
  
  // Processing
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  
  // Effects
  voiceEffects: VoiceEffect[];
  
  // AI Features
  autoTranscription: boolean;
  autoTranslation: boolean;
  preferredLanguage: string;
}

export interface VoiceEffect {
  id: string;
  name: string;
  type: 'pitch' | 'reverb' | 'echo' | 'robot' | 'chipmunk' | 'deep' | 'custom';
  enabled: boolean;
  parameters: Record<string, number>;
}

export interface VoiceRecording {
  id: string;
  roomId: string;
  
  // Recording Info
  startTime: number;
  endTime?: number;
  duration: number; // seconds
  fileSize: number; // bytes
  fileUrl: string;
  
  // Participants
  participants: string[]; // User IDs
  
  // Transcription
  transcriptionUrl?: string;
  transcriptionLanguage?: string;
  
  // Metadata
  created_at: number;
  created_by: string;
}

export interface VoiceTranscription {
  id: string;
  roomId: string;
  userId: string;
  username: string;
  
  // Content
  text: string;
  language: string;
  confidence: number;
  
  // Timing
  timestamp: number;
  duration: number;
  
  // Translation
  translations?: Record<string, string>; // language -> text
}

export interface VoiceAnalytics {
  roomId: string;
  
  // Usage
  totalSessions: number;
  totalDuration: number; // seconds
  averageDuration: number;
  
  // Participants
  uniqueParticipants: number;
  averageParticipants: number;
  peakParticipants: number;
  
  // Quality
  averageLatency: number;
  averagePacketLoss: number;
  connectionIssues: number;
  
  // Features
  screenShareCount: number;
  recordingCount: number;
  transcriptionCount: number;
  
  // Engagement
  mostActiveUsers: { userId: string; duration: number }[];
  mostActiveHours: number[];
}

export interface SoundEffect {
  id: string;
  name: string;
  category: 'meme' | 'music' | 'ambient' | 'notification' | 'custom';
  url: string;
  duration: number;
  volume: number;
  icon?: string;
}

export interface VoiceCommand {
  command: string;
  action: 'mute' | 'unmute' | 'deafen' | 'undeafen' | 'disconnect' | 'record' | 'effect';
  parameters?: Record<string, any>;
}
