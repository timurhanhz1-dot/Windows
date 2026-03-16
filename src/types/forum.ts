// Advanced Forum Types - Better than Reddit!

export interface Community {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  banner?: string;
  
  // Settings
  type: 'public' | 'private' | 'restricted';
  nsfw: boolean;
  
  // Members
  memberCount: number;
  onlineCount: number;
  
  // Rules
  rules: CommunityRule[];
  
  // Flairs
  postFlairs: Flair[];
  userFlairs: Flair[];
  
  // Moderation
  moderators: string[];
  
  // Stats
  totalPosts: number;
  totalComments: number;
  
  // AI Features
  aiModeration: boolean;
  aiContentDiscovery: boolean;
  aiSummaries: boolean;
  
  // Metadata
  created_at: number;
  created_by: string;
}

export interface Post {
  id: string;
  communityId: string;
  communityName: string;
  
  // Author
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  
  // Content
  title: string;
  content: string;
  type: 'text' | 'link' | 'image' | 'video' | 'poll';
  
  // Media
  mediaUrl?: string;
  thumbnailUrl?: string;
  
  // Link
  linkUrl?: string;
  linkDomain?: string;
  
  // Poll
  poll?: Poll;
  
  // Flair
  flair?: Flair;
  
  // Voting
  upvotes: number;
  downvotes: number;
  score: number; // upvotes - downvotes
  upvoteRatio: number; // percentage
  
  // Engagement
  commentCount: number;
  viewCount: number;
  shareCount: number;
  awardCount: number;
  
  // Awards
  awards: Award[];
  
  // Status
  pinned: boolean;
  locked: boolean;
  archived: boolean;
  removed: boolean;
  spam: boolean;
  
  // AI Analysis
  aiQualityScore?: number;
  aiTopicTags?: string[];
  aiSentiment?: 'positive' | 'neutral' | 'negative';
  aiSummary?: string;
  
  // Crosspost
  crosspostedFrom?: string;
  crosspostCount: number;
  
  // Metadata
  created_at: number;
  edited_at?: number;
  updated_at: number;
}

export interface Comment {
  id: string;
  postId: string;
  
  // Author
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  
  // Content
  content: string;
  
  // Hierarchy
  parentId?: string; // null for top-level comments
  depth: number;
  childCount: number;
  
  // Voting
  upvotes: number;
  downvotes: number;
  score: number;
  
  // Awards
  awards: Award[];
  
  // Status
  edited: boolean;
  deleted: boolean;
  removed: boolean;
  
  // AI Analysis
  aiQualityScore?: number;
  aiSentiment?: 'positive' | 'neutral' | 'negative';
  
  // Metadata
  created_at: number;
  edited_at?: number;
}

export interface Vote {
  id: string;
  userId: string;
  targetId: string; // post or comment ID
  targetType: 'post' | 'comment';
  
  // Vote
  type: 'upvote' | 'downvote';
  weight: number; // user reputation affects weight
  
  // Metadata
  created_at: number;
}

export interface Award {
  id: string;
  name: string;
  description: string;
  icon: string;
  
  // Cost
  coins: number;
  
  // Benefits
  givesCoins?: number;
  givesPremium?: number; // days
  
  // Stats
  givenCount: number;
  
  // Metadata
  created_at: number;
}

export interface AwardGiven {
  id: string;
  awardId: string;
  awardName: string;
  awardIcon: string;
  
  // Target
  targetId: string;
  targetType: 'post' | 'comment';
  
  // Giver
  giverId: string;
  giverName: string;
  anonymous: boolean;
  
  // Message
  message?: string;
  
  // Metadata
  created_at: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  
  // Settings
  allowMultipleChoices: boolean;
  votingLength: number; // hours
  
  // Status
  totalVotes: number;
  closed: boolean;
  closedAt?: number;
  
  // Metadata
  created_at: number;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
  voters: string[];
}

export interface Flair {
  id: string;
  text: string;
  backgroundColor?: string;
  textColor?: string;
  icon?: string;
  
  // Settings
  modOnly: boolean;
  
  // Metadata
  created_at: number;
}

export interface CommunityRule {
  id: string;
  title: string;
  description: string;
  order: number;
  
  // Enforcement
  reportReason: boolean;
  
  // Metadata
  created_at: number;
}

export interface UserReputation {
  userId: string;
  username: string;
  
  // Karma
  postKarma: number;
  commentKarma: number;
  awardKarma: number;
  totalKarma: number;
  
  // Activity
  postsCreated: number;
  commentsCreated: number;
  awardsGiven: number;
  awardsReceived: number;
  
  // Quality
  averagePostScore: number;
  averageCommentScore: number;
  qualityScore: number; // AI-calculated
  
  // Badges
  badges: Badge[];
  
  // Moderation
  warnings: number;
  bans: number;
  
  // Metadata
  accountAge: number;
  lastActive: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  
  // Requirements
  requirement?: string;
  
  // Metadata
  earnedAt: number;
}

export interface Feed {
  id: string;
  name: string;
  type: 'home' | 'popular' | 'all' | 'community' | 'custom';
  
  // Filters
  communities?: string[];
  excludeCommunities?: string[];
  minScore?: number;
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  
  // Sorting
  sortBy: 'hot' | 'new' | 'top' | 'rising' | 'controversial' | 'best';
  
  // AI Personalization
  aiPersonalized: boolean;
  userInterests?: string[];
  
  // Metadata
  created_at: number;
}

export interface ContentDiscovery {
  userId: string;
  
  // Interests
  interests: string[];
  followedCommunities: string[];
  
  // Behavior
  viewedPosts: string[];
  upvotedPosts: string[];
  commentedPosts: string[];
  
  // AI Recommendations
  recommendedCommunities: RecommendedCommunity[];
  recommendedPosts: RecommendedPost[];
  
  // Trends
  trendingTopics: TrendingTopic[];
  
  // Metadata
  updated_at: number;
}

export interface RecommendedCommunity {
  community: Community;
  score: number;
  reason: string;
  aiGenerated: boolean;
}

export interface RecommendedPost {
  post: Post;
  score: number;
  reason: string;
  aiGenerated: boolean;
}

export interface TrendingTopic {
  topic: string;
  score: number;
  postCount: number;
  growthRate: number;
  relatedCommunities: string[];
  
  // Metadata
  detectedAt: number;
}

export interface Report {
  id: string;
  targetId: string;
  targetType: 'post' | 'comment' | 'user';
  
  // Reporter
  reporterId: string;
  reporterName: string;
  
  // Report
  reason: string;
  customReason?: string;
  
  // Status
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  reviewedBy?: string;
  reviewedAt?: number;
  action?: string;
  
  // AI Analysis
  aiSeverity?: number;
  aiRecommendation?: string;
  
  // Metadata
  created_at: number;
}

export interface Crosspost {
  id: string;
  originalPostId: string;
  newPostId: string;
  
  // Communities
  fromCommunity: string;
  toCommunity: string;
  
  // Author
  crossposterId: string;
  crossposterName: string;
  
  // Metadata
  created_at: number;
}

export interface SavedPost {
  userId: string;
  postId: string;
  
  // Organization
  category?: string;
  tags?: string[];
  notes?: string;
  
  // Metadata
  saved_at: number;
}

export interface PostAnalytics {
  postId: string;
  
  // Engagement
  views: number;
  uniqueViews: number;
  upvotes: number;
  downvotes: number;
  comments: number;
  shares: number;
  awards: number;
  saves: number;
  
  // Timeline
  viewsOverTime: { hour: number; count: number }[];
  votesOverTime: { hour: number; upvotes: number; downvotes: number }[];
  
  // Demographics
  viewersByCountry: Record<string, number>;
  viewersByDevice: Record<string, number>;
  
  // Engagement Rate
  engagementRate: number;
  commentRate: number;
  shareRate: number;
  
  // AI Insights
  aiInsights: string[];
  predictedViralScore: number;
  
  // Metadata
  updated_at: number;
}

export interface CommunityAnalytics {
  communityId: string;
  
  // Growth
  memberCount: number;
  memberGrowth: number;
  newMembersToday: number;
  newMembersWeek: number;
  
  // Activity
  postsToday: number;
  postsWeek: number;
  commentsToday: number;
  commentsWeek: number;
  
  // Engagement
  averagePostScore: number;
  averageCommentCount: number;
  activeUserRate: number;
  
  // Top Content
  topPosts: Post[];
  topContributors: { userId: string; score: number }[];
  
  // Trends
  trendingTopics: string[];
  growthTrend: 'increasing' | 'stable' | 'decreasing';
  
  // AI Insights
  communityHealth: number; // 0-100
  aiInsights: string[];
  
  // Metadata
  updated_at: number;
}
