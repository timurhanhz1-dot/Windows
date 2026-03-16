// Advanced Direct Messaging Types - Better than Discord!

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  
  // Content
  content: string;
  type: 'text' | 'voice' | 'image' | 'file' | 'video' | 'gif' | 'sticker';
  
  // Media
  mediaUrl?: string;
  mediaType?: string;
  mediaSize?: number;
  mediaDuration?: number; // for voice/video
  
  // Rich Content
  embeds?: MessageEmbed[];
  attachments?: MessageAttachment[];
  
  // Reactions
  reactions?: Record<string, string[]>; // emoji -> userIds
  
  // Status
  edited: boolean;
  editedAt?: number;
  deleted: boolean;
  deletedAt?: number;
  
  // Read Status
  readBy: string[];
  deliveredTo: string[];
  
  // Reply
  replyTo?: string; // message ID
  
  // Scheduled
  scheduled: boolean;
  scheduledFor?: number;
  
  // Translation
  translations?: Record<string, string>; // language -> translated text
  originalLanguage?: string;
  
  // Metadata
  timestamp: number;
  created_at: number;
}

export interface Conversation {
  id: string;
  type: 'dm' | 'group';
  
  // Participants
  participants: ConversationParticipant[];
  creatorId: string;
  
  // Group Info (for group DMs)
  name?: string;
  description?: string;
  icon?: string;
  
  // Settings
  settings: ConversationSettings;
  
  // Last Message
  lastMessage?: DirectMessage;
  lastActivity: number;
  
  // Unread
  unreadCount: Record<string, number>; // userId -> count
  
  // Pinned Messages
  pinnedMessages: string[];
  
  // Status
  archived: boolean;
  muted: boolean;
  
  // Metadata
  created_at: number;
  updated_at: number;
}

export interface ConversationParticipant {
  userId: string;
  username: string;
  avatar?: string;
  
  // Role (for group DMs)
  role: 'owner' | 'admin' | 'member';
  
  // Permissions
  canSendMessages: boolean;
  canAddMembers: boolean;
  canRemoveMembers: boolean;
  canManageSettings: boolean;
  
  // Status
  joinedAt: number;
  lastRead: number;
  typing: boolean;
  online: boolean;
  
  // Nickname (for group DMs)
  nickname?: string;
}

export interface ConversationSettings {
  // Notifications
  notifications: boolean;
  mentionNotifications: boolean;
  soundEnabled: boolean;
  
  // Privacy
  readReceipts: boolean;
  typingIndicators: boolean;
  
  // Features
  allowVoiceMessages: boolean;
  allowFileSharing: boolean;
  allowGifs: boolean;
  allowStickers: boolean;
  
  // Auto Features
  autoTranslate: boolean;
  targetLanguage?: string;
  autoDeleteAfter?: number; // seconds
  
  // Limits
  maxFileSize: number; // bytes
  maxParticipants: number;
}

export interface MessageEmbed {
  type: 'link' | 'image' | 'video' | 'rich';
  title?: string;
  description?: string;
  url?: string;
  imageUrl?: string;
  videoUrl?: string;
  color?: string;
  author?: {
    name: string;
    url?: string;
    iconUrl?: string;
  };
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
  footer?: {
    text: string;
    iconUrl?: string;
  };
  timestamp?: number;
}

export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  
  // Media specific
  width?: number;
  height?: number;
  duration?: number;
  
  // Upload status
  uploading: boolean;
  uploadProgress?: number;
  
  // Metadata
  uploaded_at: number;
}

export interface VoiceMessage {
  id: string;
  messageId: string;
  
  // Audio
  audioUrl: string;
  duration: number;
  waveform: number[]; // Audio waveform data
  
  // Transcription
  transcription?: string;
  transcriptionLanguage?: string;
  transcriptionConfidence?: number;
  
  // Status
  played: boolean;
  playedAt?: number;
  
  // Metadata
  created_at: number;
}

export interface ScheduledMessage {
  id: string;
  conversationId: string;
  senderId: string;
  
  // Content
  content: string;
  type: DirectMessage['type'];
  attachments?: MessageAttachment[];
  
  // Schedule
  scheduledFor: number;
  timezone: string;
  
  // Status
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  sentAt?: number;
  error?: string;
  
  // Metadata
  created_at: number;
}

export interface MessageDraft {
  conversationId: string;
  content: string;
  attachments: MessageAttachment[];
  replyTo?: string;
  updated_at: number;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  username: string;
  startedAt: number;
}

export interface MessageReaction {
  messageId: string;
  emoji: string;
  userId: string;
  username: string;
  timestamp: number;
}

export interface ConversationInvite {
  id: string;
  conversationId: string;
  inviterId: string;
  inviterName: string;
  
  // Invite Details
  code: string;
  maxUses?: number;
  usesCount: number;
  expiresAt?: number;
  
  // Status
  active: boolean;
  
  // Metadata
  created_at: number;
}

export interface FileTransfer {
  id: string;
  messageId: string;
  conversationId: string;
  
  // File Info
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  
  // Transfer Status
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  progress: number;
  
  // Sender/Receiver
  senderId: string;
  receiverId?: string;
  
  // Download
  downloadCount: number;
  expiresAt?: number;
  
  // Metadata
  created_at: number;
}

export interface SmartReply {
  id: string;
  messageId: string;
  
  // Suggestions
  suggestions: string[];
  confidence: number;
  
  // Context
  conversationContext: string;
  userPreferences: Record<string, any>;
  
  // Metadata
  generated_at: number;
}

export interface MessageSearch {
  query: string;
  conversationId?: string;
  senderId?: string;
  dateFrom?: number;
  dateTo?: number;
  hasAttachments?: boolean;
  messageType?: DirectMessage['type'];
}

export interface MessageSearchResult {
  message: DirectMessage;
  conversation: Conversation;
  highlights: string[];
  relevanceScore: number;
}

export interface ConversationAnalytics {
  conversationId: string;
  
  // Activity
  totalMessages: number;
  messagesLast24h: number;
  messagesLast7d: number;
  
  // Participants
  activeParticipants: number;
  messagesByUser: Record<string, number>;
  
  // Content
  mediaCount: number;
  voiceMessageCount: number;
  fileCount: number;
  
  // Engagement
  averageResponseTime: number;
  mostActiveHours: number[];
  
  // Trends
  activityTrend: 'increasing' | 'stable' | 'decreasing';
}
