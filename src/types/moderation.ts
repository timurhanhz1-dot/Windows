// AI-Powered Moderation Types - Better than Discord!

export interface ModerationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  
  // Rule Type
  type: 'spam' | 'toxicity' | 'nsfw' | 'scam' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Detection
  keywords?: string[];
  patterns?: string[];
  aiEnabled: boolean;
  confidenceThreshold: number; // 0-100
  
  // Action
  action: ModerationAction;
  autoExecute: boolean;
  notifyModerators: boolean;
  
  // Exemptions
  exemptRoles: string[];
  exemptUsers: string[];
  exemptChannels: string[];
  
  // Metadata
  created_at: number;
  created_by: string;
  updated_at?: number;
}

export interface ModerationAction {
  type: 'warn' | 'mute' | 'kick' | 'ban' | 'delete' | 'quarantine';
  duration?: number; // seconds, for temporary actions
  reason: string;
  deleteMessages?: boolean;
  notifyUser?: boolean;
  appealable?: boolean;
}

export interface ModerationCase {
  id: string;
  userId: string;
  username: string;
  
  // Violation
  ruleId: string;
  ruleName: string;
  violationType: string;
  content: string;
  channelId: string;
  messageId?: string;
  
  // AI Analysis
  aiConfidence: number;
  aiReasoning: string;
  toxicityScore?: number;
  spamScore?: number;
  nsfwScore?: number;
  
  // Action Taken
  action: ModerationAction;
  executedAt: number;
  executedBy: 'ai' | string; // 'ai' or moderator userId
  
  // Status
  status: 'pending' | 'approved' | 'rejected' | 'appealed' | 'resolved';
  reviewedBy?: string;
  reviewedAt?: number;
  reviewNotes?: string;
  
  // Appeal
  appeal?: ModerationAppeal;
  
  // Metadata
  created_at: number;
}

export interface ModerationAppeal {
  id: string;
  caseId: string;
  userId: string;
  
  // Appeal Content
  reason: string;
  evidence?: string[];
  
  // Status
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: number;
  reviewNotes?: string;
  
  // Metadata
  created_at: number;
}

export interface UserModerationHistory {
  userId: string;
  username: string;
  
  // Statistics
  totalViolations: number;
  warningCount: number;
  muteCount: number;
  kickCount: number;
  banCount: number;
  
  // Recent Cases
  recentCases: ModerationCase[];
  
  // Risk Assessment
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  trustScore: number; // 0-100
  
  // Patterns
  commonViolations: string[];
  violationTrend: 'improving' | 'stable' | 'worsening';
  
  // Last Action
  lastViolation?: number;
  lastAction?: ModerationAction;
}

export interface ModerationStats {
  // Time Period
  period: 'today' | 'week' | 'month' | 'all';
  startDate: number;
  endDate: number;
  
  // Cases
  totalCases: number;
  pendingCases: number;
  resolvedCases: number;
  appealedCases: number;
  
  // Actions
  actionBreakdown: Record<string, number>;
  autoActions: number;
  manualActions: number;
  
  // Violations
  violationBreakdown: Record<string, number>;
  topViolations: { type: string; count: number }[];
  
  // AI Performance
  aiAccuracy: number;
  falsePositives: number;
  falseNegatives: number;
  averageConfidence: number;
  
  // Users
  uniqueViolators: number;
  repeatOffenders: number;
  bannedUsers: number;
  
  // Trends
  casesOverTime: { date: string; count: number }[];
  violationTrends: { type: string; trend: number }[];
}

export interface AutoModConfig {
  enabled: boolean;
  
  // Spam Detection
  spamDetection: {
    enabled: boolean;
    maxMessagesPerMinute: number;
    maxDuplicateMessages: number;
    maxMentionsPerMessage: number;
    maxLinksPerMessage: number;
    maxEmojisPerMessage: number;
    maxCapsPercentage: number;
  };
  
  // Toxicity Detection
  toxicityDetection: {
    enabled: boolean;
    threshold: number; // 0-100
    categories: string[]; // hate, harassment, violence, etc.
    autoDelete: boolean;
    autoMute: boolean;
  };
  
  // NSFW Detection
  nsfwDetection: {
    enabled: boolean;
    threshold: number;
    scanImages: boolean;
    scanLinks: boolean;
    autoDelete: boolean;
  };
  
  // Scam Detection
  scamDetection: {
    enabled: boolean;
    phishingLinks: boolean;
    suspiciousPatterns: boolean;
    autoDelete: boolean;
    autoWarn: boolean;
  };
  
  // Raid Protection
  raidProtection: {
    enabled: boolean;
    maxJoinsPerMinute: number;
    accountAgeMinimum: number; // days
    autoLockdown: boolean;
  };
}

export interface ModerationAlert {
  id: string;
  type: 'raid' | 'mass_violation' | 'high_risk_user' | 'appeal' | 'custom';
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Content
  title: string;
  message: string;
  details?: Record<string, any>;
  
  // Related
  caseIds?: string[];
  userIds?: string[];
  channelIds?: string[];
  
  // Status
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  resolved: boolean;
  
  // Metadata
  created_at: number;
}

export interface ModeratorActivity {
  moderatorId: string;
  moderatorName: string;
  
  // Actions
  totalActions: number;
  actionsToday: number;
  actionsThisWeek: number;
  
  // Breakdown
  actionBreakdown: Record<string, number>;
  
  // Performance
  averageResponseTime: number; // seconds
  casesReviewed: number;
  appealsHandled: number;
  
  // Activity
  lastActive: number;
  activeHours: number[];
}

export interface ContentFilter {
  id: string;
  name: string;
  type: 'word' | 'phrase' | 'regex' | 'domain';
  pattern: string;
  
  // Settings
  enabled: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  
  // Action
  action: 'delete' | 'flag' | 'replace';
  replacement?: string;
  
  // Scope
  channels: string[]; // empty = all channels
  exemptRoles: string[];
  
  // Metadata
  created_at: number;
  created_by: string;
}

export interface QuarantineZone {
  id: string;
  name: string;
  description: string;
  
  // Users
  quarantinedUsers: string[];
  
  // Restrictions
  canReadOnly: boolean;
  canSendMessages: boolean;
  canReact: boolean;
  canJoinVoice: boolean;
  
  // Auto-release
  autoRelease: boolean;
  releaseAfter: number; // seconds
  
  // Metadata
  created_at: number;
}
