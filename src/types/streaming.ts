// Advanced Streaming Types - Better than Twitch!

export interface Stream {
  id: string;
  streamerId: string;
  streamerName: string;
  streamerAvatar?: string;
  
  // Stream Info
  title: string;
  description: string;
  category: string;
  tags: string[];
  language: string;
  
  // Stream URLs
  streamUrl: string;
  playbackUrl: string;
  thumbnailUrl?: string;
  
  // Quality Settings
  qualities: StreamQuality[];
  currentQuality: string;
  adaptiveBitrate: boolean;
  
  // Status
  isLive: boolean;
  isPaused: boolean;
  isRecording: boolean;
  
  // Viewers
  viewerCount: number;
  peakViewers: number;
  uniqueViewers: number;
  
  // Engagement
  chatEnabled: boolean;
  chatMode: 'everyone' | 'followers' | 'subscribers';
  slowMode: number; // seconds
  
  // Monetization
  subscriptionTiers: SubscriptionTier[];
  donationsEnabled: boolean;
  cryptoEnabled: boolean;
  
  // AI Features
  autoHighlights: boolean;
  autoTranscription: boolean;
  autoModeration: boolean;
  
  // Schedule
  scheduledStart?: number;
  scheduledEnd?: number;
  
  // Metadata
  startedAt?: number;
  endedAt?: number;
  duration: number;
  created_at: number;
}

export interface StreamQuality {
  id: string;
  label: string;
  width: number;
  height: number;
  bitrate: number; // kbps
  fps: number;
  codec: string;
}

export interface StreamSettings {
  // Video
  resolution: '1080p' | '720p' | '480p' | '360p';
  fps: 30 | 60;
  bitrate: number;
  codec: 'h264' | 'h265' | 'vp9';
  
  // Audio
  audioBitrate: number;
  audioCodec: 'aac' | 'opus';
  audioChannels: 1 | 2;
  
  // Advanced
  keyframeInterval: number;
  bFrames: number;
  preset: 'ultrafast' | 'fast' | 'medium' | 'slow';
  
  // Features
  lowLatency: boolean;
  adaptiveBitrate: boolean;
  autoRecord: boolean;
  
  // Server
  ingestServer: string;
  streamKey: string;
  backupServer?: string;
}

export interface StreamAnalytics {
  streamId: string;
  
  // Viewership
  totalViews: number;
  uniqueViewers: number;
  averageViewers: number;
  peakViewers: number;
  viewersByHour: { hour: number; count: number }[];
  
  // Engagement
  chatMessages: number;
  averageWatchTime: number; // seconds
  newFollowers: number;
  newSubscribers: number;
  
  // Revenue
  donations: number;
  subscriptionRevenue: number;
  adRevenue: number;
  totalRevenue: number;
  
  // Quality
  averageBitrate: number;
  bufferingEvents: number;
  averageLatency: number;
  
  // Geographic
  viewersByCountry: Record<string, number>;
  viewersByCity: Record<string, number>;
  
  // Devices
  viewersByDevice: Record<string, number>;
  viewersByBrowser: Record<string, number>;
  
  // Retention
  retentionCurve: { minute: number; viewers: number }[];
  dropOffPoints: number[];
}

export interface Highlight {
  id: string;
  streamId: string;
  
  // Content
  title: string;
  description?: string;
  thumbnailUrl: string;
  videoUrl: string;
  
  // Timing
  startTime: number; // seconds from stream start
  endTime: number;
  duration: number;
  
  // AI Analysis
  aiGenerated: boolean;
  aiScore: number; // 0-100
  aiReason: string;
  detectedEvents: string[];
  
  // Engagement
  views: number;
  likes: number;
  shares: number;
  
  // Status
  published: boolean;
  
  // Metadata
  created_at: number;
  created_by: string;
}

export interface StreamChat {
  id: string;
  streamId: string;
  userId: string;
  username: string;
  userAvatar?: string;
  
  // Content
  message: string;
  type: 'message' | 'donation' | 'subscription' | 'raid' | 'host';
  
  // Badges
  badges: ChatBadge[];
  
  // Emotes
  emotes: ChatEmote[];
  
  // Moderation
  deleted: boolean;
  deletedBy?: string;
  deletedReason?: string;
  
  // Metadata
  timestamp: number;
}

export interface ChatBadge {
  id: string;
  name: string;
  icon: string;
  color?: string;
  tier?: number;
}

export interface ChatEmote {
  id: string;
  name: string;
  url: string;
  animated: boolean;
  positions: [number, number][]; // [start, end] positions in message
}

export interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  
  // Benefits
  benefits: string[];
  emotes: string[];
  badges: string[];
  
  // Features
  adFree: boolean;
  chatColor: boolean;
  customEmotes: number;
  
  // Stats
  subscriberCount: number;
  
  // Metadata
  created_at: number;
}

export interface Donation {
  id: string;
  streamId: string;
  
  // Donor
  donorId?: string;
  donorName: string;
  anonymous: boolean;
  
  // Amount
  amount: number;
  currency: string;
  cryptoCurrency?: string;
  
  // Message
  message?: string;
  showOnStream: boolean;
  
  // Status
  status: 'pending' | 'completed' | 'refunded';
  
  // Metadata
  timestamp: number;
}

export interface StreamOverlay {
  id: string;
  streamId: string;
  
  // Overlay Info
  name: string;
  type: 'alerts' | 'chat' | 'goals' | 'recent' | 'custom';
  
  // Position
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  // Style
  style: {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    opacity?: number;
    fontFamily?: string;
    fontSize?: number;
    fontColor?: string;
  };
  
  // Settings
  enabled: boolean;
  zIndex: number;
  
  // Animation
  animation?: {
    type: 'slide' | 'fade' | 'bounce' | 'zoom';
    duration: number;
    delay: number;
  };
  
  // Content
  content?: any;
}

export interface StreamAlert {
  id: string;
  streamId: string;
  
  // Alert Type
  type: 'follow' | 'subscription' | 'donation' | 'raid' | 'host' | 'custom';
  
  // Content
  title: string;
  message: string;
  imageUrl?: string;
  soundUrl?: string;
  
  // User
  userId?: string;
  username: string;
  
  // Amount (for donations/subs)
  amount?: number;
  tier?: number;
  
  // Display
  duration: number; // ms
  priority: number;
  
  // Status
  shown: boolean;
  shownAt?: number;
  
  // Metadata
  timestamp: number;
}

export interface Raid {
  id: string;
  fromStreamId: string;
  toStreamId: string;
  
  // Raider
  raiderId: string;
  raiderName: string;
  
  // Viewers
  viewerCount: number;
  viewers: string[];
  
  // Status
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  
  // Metadata
  startedAt: number;
  completedAt?: number;
}

export interface StreamClip {
  id: string;
  streamId: string;
  
  // Content
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  
  // Timing
  startTime: number;
  duration: number;
  
  // Creator
  creatorId: string;
  creatorName: string;
  
  // Engagement
  views: number;
  likes: number;
  shares: number;
  
  // Metadata
  created_at: number;
}

export interface StreamSchedule {
  id: string;
  streamerId: string;
  
  // Schedule
  title: string;
  description?: string;
  category: string;
  
  // Timing
  startTime: number;
  endTime: number;
  timezone: string;
  
  // Recurrence
  recurring: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly';
  recurrenceDays?: number[]; // 0-6 for days of week
  
  // Notifications
  notifyFollowers: boolean;
  notifySubscribers: boolean;
  reminderMinutes: number[];
  
  // Status
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  
  // Metadata
  created_at: number;
}

export interface StreamGoal {
  id: string;
  streamerId: string;
  
  // Goal Info
  title: string;
  description: string;
  type: 'followers' | 'subscribers' | 'donations' | 'custom';
  
  // Progress
  target: number;
  current: number;
  
  // Display
  showOnStream: boolean;
  showProgress: boolean;
  
  // Deadline
  deadline?: number;
  
  // Status
  completed: boolean;
  completedAt?: number;
  
  // Metadata
  created_at: number;
}

export interface ViewerSession {
  id: string;
  streamId: string;
  userId?: string;
  
  // Session Info
  joinedAt: number;
  leftAt?: number;
  duration: number;
  
  // Engagement
  chatMessages: number;
  reactions: number;
  
  // Quality
  averageQuality: string;
  bufferingTime: number;
  
  // Device
  device: string;
  browser: string;
  os: string;
  
  // Location
  country?: string;
  city?: string;
}

export interface StreamModerator {
  userId: string;
  username: string;
  streamerId: string;
  
  // Permissions
  canTimeout: boolean;
  canBan: boolean;
  canDeleteMessages: boolean;
  canManageStream: boolean;
  
  // Activity
  actionsCount: number;
  lastActive: number;
  
  // Metadata
  addedAt: number;
  addedBy: string;
}

export interface ChatCommand {
  id: string;
  streamerId: string;
  
  // Command
  trigger: string;
  response: string;
  
  // Settings
  enabled: boolean;
  cooldown: number; // seconds
  userLevel: 'everyone' | 'followers' | 'subscribers' | 'moderators';
  
  // Usage
  usageCount: number;
  lastUsed?: number;
  
  // Metadata
  created_at: number;
}
