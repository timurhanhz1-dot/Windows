// Channel Types - Discord-like advanced features

export interface ChannelPermission {
  userId: string;
  canRead: boolean;
  canWrite: boolean;
  canManage: boolean;
  canDelete: boolean;
  canInvite: boolean;
}

export interface ChannelCategory {
  id: string;
  name: string;
  description?: string;
  position: number;
  collapsed: boolean;
  permissions: ChannelPermission[];
  created_at: number;
  created_by: string;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'text' | 'voice' | 'announcement' | 'stage';
  categoryId?: string; // Parent category
  position: number;
  
  // Permissions
  permissions: ChannelPermission[];
  isPrivate: boolean;
  allowedRoles: string[];
  
  // Settings
  slowMode?: number; // Seconds between messages
  nsfw: boolean;
  archived: boolean;
  locked: boolean;
  
  // Statistics
  messageCount: number;
  memberCount: number;
  lastActivity: number;
  
  // Metadata
  created_at: number;
  created_by: string;
  updated_at?: number;
  
  // Template
  isTemplate: boolean;
  templateId?: string;
  
  // Voice specific
  userLimit?: number; // Max users in voice channel
  bitrate?: number; // Voice quality
  region?: string; // Voice server region
}

export interface ChannelTemplate {
  id: string;
  name: string;
  description: string;
  icon?: string;
  
  // Template structure
  categories: Omit<ChannelCategory, 'id' | 'created_at' | 'created_by'>[];
  channels: Omit<Channel, 'id' | 'created_at' | 'created_by'>[];
  
  // Metadata
  usageCount: number;
  rating: number;
  tags: string[];
  created_at: number;
  created_by: string;
}

export interface ChannelStats {
  channelId: string;
  
  // Activity
  totalMessages: number;
  messagesLast24h: number;
  messagesLast7d: number;
  messagesLast30d: number;
  
  // Users
  uniqueUsers: number;
  activeUsers: number;
  peakConcurrentUsers: number;
  
  // Engagement
  averageMessageLength: number;
  averageResponseTime: number;
  mostActiveHours: number[];
  mostActiveUsers: { userId: string; messageCount: number }[];
  
  // Content
  mediaCount: number;
  linkCount: number;
  emojiCount: number;
  
  // Moderation
  deletedMessages: number;
  warnedUsers: number;
  bannedUsers: number;
}

export interface VoiceChannelState {
  channelId: string;
  participants: VoiceParticipant[];
  isRecording: boolean;
  recordingStartTime?: number;
  screenSharing: string[]; // User IDs sharing screen
}

export interface VoiceParticipant {
  userId: string;
  username: string;
  avatar?: string;
  
  // Audio state
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  volume: number;
  
  // Video state
  hasVideo: boolean;
  isScreenSharing: boolean;
  
  // Connection
  joinedAt: number;
  connectionQuality: 'excellent' | 'good' | 'poor';
  latency: number;
}

export interface SlowModeConfig {
  enabled: boolean;
  interval: number; // Seconds
  exemptRoles: string[];
  exemptUsers: string[];
}

export interface ChannelWebhook {
  id: string;
  channelId: string;
  name: string;
  avatar?: string;
  url: string;
  token: string;
  created_at: number;
  created_by: string;
}
