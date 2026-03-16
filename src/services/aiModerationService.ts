// AI-Powered Moderation Service - Better than Discord!
import { 
  ModerationRule, 
  ModerationCase, 
  ModerationAction,
  UserModerationHistory,
  ModerationStats,
  AutoModConfig,
  ModerationAlert,
  ContentFilter
} from '../types/moderation';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

class AIModerationService {
  private rules: Map<string, ModerationRule> = new Map();
  private cases: Map<string, ModerationCase> = new Map();
  private userHistories: Map<string, UserModerationHistory> = new Map();
  private filters: Map<string, ContentFilter> = new Map();
  
  // Initialize default rules
  constructor() {
    this.initializeDefaultRules();
    this.initializeDefaultFilters();
  }

  // ==================== AI CONTENT ANALYSIS ====================
  
  async analyzeContent(content: string, userId: string, channelId: string): Promise<{
    isViolation: boolean;
    violationType?: string;
    confidence: number;
    reasoning: string;
    scores: {
      toxicity: number;
      spam: number;
      nsfw: number;
      scam: number;
    };
    suggestedAction?: ModerationAction;
  }> {
    try {
      // Quick filter check first
      const filterResult = this.checkFilters(content);
      if (filterResult.blocked) {
        return {
          isViolation: true,
          violationType: 'filtered_content',
          confidence: 100,
          reasoning: `Content matched filter: ${filterResult.filterName}`,
          scores: { toxicity: 0, spam: 0, nsfw: 0, scam: 0 },
          suggestedAction: {
            type: 'delete',
            reason: 'Filtered content',
            deleteMessages: true
          }
        };
      }

      // AI Analysis
      const prompt = `Analyze this message for moderation. Respond in JSON format:
{
  "isViolation": boolean,
  "violationType": "spam" | "toxicity" | "nsfw" | "scam" | "none",
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "scores": {
    "toxicity": 0-100,
    "spam": 0-100,
    "nsfw": 0-100,
    "scam": 0-100
  },
  "suggestedAction": "none" | "warn" | "mute" | "delete" | "ban"
}

Message: "${content}"

Consider:
- Toxicity: hate speech, harassment, threats
- Spam: repetitive, excessive caps/emojis, mass mentions
- NSFW: explicit content, inappropriate material
- Scam: phishing, suspicious links, fraud attempts`;

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error('AI analysis failed');
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      // Map suggested action
      let suggestedAction: ModerationAction | undefined;
      if (result.suggestedAction !== 'none') {
        suggestedAction = {
          type: result.suggestedAction,
          reason: result.reasoning,
          deleteMessages: result.suggestedAction === 'delete' || result.suggestedAction === 'ban',
          notifyUser: true,
          appealable: result.suggestedAction !== 'delete'
        };
      }

      return {
        isViolation: result.isViolation,
        violationType: result.violationType,
        confidence: result.confidence,
        reasoning: result.reasoning,
        scores: result.scores,
        suggestedAction
      };

    } catch (error) {
      console.error('AI moderation analysis failed:', error);
      // Fallback to basic checks
      return this.basicContentAnalysis(content);
    }
  }

  // ==================== BASIC CONTENT ANALYSIS ====================
  
  private basicContentAnalysis(content: string): any {
    const scores = {
      toxicity: this.calculateToxicityScore(content),
      spam: this.calculateSpamScore(content),
      nsfw: this.calculateNSFWScore(content),
      scam: this.calculateScamScore(content)
    };

    const maxScore = Math.max(...Object.values(scores));
    const violationType = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] || 'none';

    return {
      isViolation: maxScore > 70,
      violationType: maxScore > 70 ? violationType : undefined,
      confidence: maxScore,
      reasoning: `Basic analysis detected potential ${violationType}`,
      scores,
      suggestedAction: maxScore > 70 ? {
        type: maxScore > 90 ? 'delete' : 'warn',
        reason: `Potential ${violationType} detected`,
        deleteMessages: maxScore > 90
      } : undefined
    };
  }

  private calculateToxicityScore(content: string): number {
    const toxicWords = ['hate', 'kill', 'die', 'stupid', 'idiot', 'dumb'];
    const lowerContent = content.toLowerCase();
    let score = 0;
    
    toxicWords.forEach(word => {
      if (lowerContent.includes(word)) score += 20;
    });
    
    // Check for excessive caps
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.7) score += 15;
    
    return Math.min(score, 100);
  }

  private calculateSpamScore(content: string): number {
    let score = 0;
    
    // Repetitive characters
    if (/(.)\1{4,}/.test(content)) score += 30;
    
    // Excessive emojis
    const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length;
    if (emojiCount > 10) score += 25;
    
    // Excessive mentions
    const mentionCount = (content.match(/@/g) || []).length;
    if (mentionCount > 5) score += 30;
    
    // All caps
    if (content === content.toUpperCase() && content.length > 10) score += 20;
    
    return Math.min(score, 100);
  }

  private calculateNSFWScore(content: string): number {
    const nsfwWords = ['nsfw', 'porn', 'xxx', 'sex'];
    const lowerContent = content.toLowerCase();
    let score = 0;
    
    nsfwWords.forEach(word => {
      if (lowerContent.includes(word)) score += 30;
    });
    
    return Math.min(score, 100);
  }

  private calculateScamScore(content: string): number {
    let score = 0;
    
    // Suspicious links
    if (/bit\.ly|tinyurl|suspicious-link/.test(content)) score += 40;
    
    // Scam keywords
    const scamWords = ['free', 'win', 'prize', 'click here', 'limited time'];
    const lowerContent = content.toLowerCase();
    scamWords.forEach(word => {
      if (lowerContent.includes(word)) score += 15;
    });
    
    return Math.min(score, 100);
  }

  // ==================== FILTER MANAGEMENT ====================
  
  private checkFilters(content: string): { blocked: boolean; filterName?: string } {
    for (const [id, filter] of this.filters) {
      if (!filter.enabled) continue;
      
      const testContent = filter.caseSensitive ? content : content.toLowerCase();
      const testPattern = filter.caseSensitive ? filter.pattern : filter.pattern.toLowerCase();
      
      let matches = false;
      
      if (filter.type === 'word' || filter.type === 'phrase') {
        if (filter.wholeWord) {
          const regex = new RegExp(`\\b${testPattern}\\b`, 'g');
          matches = regex.test(testContent);
        } else {
          matches = testContent.includes(testPattern);
        }
      } else if (filter.type === 'regex') {
        try {
          const regex = new RegExp(filter.pattern, filter.caseSensitive ? 'g' : 'gi');
          matches = regex.test(content);
        } catch (e) {
          console.error('Invalid regex pattern:', filter.pattern);
        }
      } else if (filter.type === 'domain') {
        matches = content.includes(testPattern);
      }
      
      if (matches) {
        return { blocked: true, filterName: filter.name };
      }
    }
    
    return { blocked: false };
  }

  addFilter(filter: ContentFilter): void {
    this.filters.set(filter.id, filter);
  }

  removeFilter(filterId: string): void {
    this.filters.delete(filterId);
  }

  getFilters(): ContentFilter[] {
    return Array.from(this.filters.values());
  }

  // ==================== CASE MANAGEMENT ====================
  
  async createCase(
    userId: string,
    username: string,
    content: string,
    channelId: string,
    ruleId: string,
    analysis: any,
    messageId?: string
  ): Promise<ModerationCase> {
    const caseId = `case_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const rule = this.rules.get(ruleId);
    
    const moderationCase: ModerationCase = {
      id: caseId,
      userId,
      username,
      ruleId,
      ruleName: rule?.name || 'Unknown Rule',
      violationType: analysis.violationType,
      content,
      channelId,
      messageId,
      aiConfidence: analysis.confidence,
      aiReasoning: analysis.reasoning,
      toxicityScore: analysis.scores.toxicity,
      spamScore: analysis.scores.spam,
      nsfwScore: analysis.scores.nsfw,
      action: analysis.suggestedAction || {
        type: 'warn',
        reason: 'Content violation',
        notifyUser: true
      },
      executedAt: Date.now(),
      executedBy: 'ai',
      status: rule?.autoExecute ? 'approved' : 'pending',
      created_at: Date.now()
    };
    
    this.cases.set(caseId, moderationCase);
    this.updateUserHistory(userId, username, moderationCase);
    
    return moderationCase;
  }

  getCase(caseId: string): ModerationCase | undefined {
    return this.cases.get(caseId);
  }

  getCases(filter?: { status?: string; userId?: string }): ModerationCase[] {
    let cases = Array.from(this.cases.values());
    
    if (filter?.status) {
      cases = cases.filter(c => c.status === filter.status);
    }
    
    if (filter?.userId) {
      cases = cases.filter(c => c.userId === filter.userId);
    }
    
    return cases.sort((a, b) => b.created_at - a.created_at);
  }

  approveCase(caseId: string, moderatorId: string, notes?: string): void {
    const moderationCase = this.cases.get(caseId);
    if (moderationCase) {
      moderationCase.status = 'approved';
      moderationCase.reviewedBy = moderatorId;
      moderationCase.reviewedAt = Date.now();
      moderationCase.reviewNotes = notes;
    }
  }

  rejectCase(caseId: string, moderatorId: string, notes?: string): void {
    const moderationCase = this.cases.get(caseId);
    if (moderationCase) {
      moderationCase.status = 'rejected';
      moderationCase.reviewedBy = moderatorId;
      moderationCase.reviewedAt = Date.now();
      moderationCase.reviewNotes = notes;
    }
  }

  // ==================== USER HISTORY ====================
  
  private updateUserHistory(userId: string, username: string, moderationCase: ModerationCase): void {
    let history = this.userHistories.get(userId);
    
    if (!history) {
      history = {
        userId,
        username,
        totalViolations: 0,
        warningCount: 0,
        muteCount: 0,
        kickCount: 0,
        banCount: 0,
        recentCases: [],
        riskLevel: 'low',
        riskScore: 0,
        trustScore: 100,
        commonViolations: [],
        violationTrend: 'stable'
      };
    }
    
    history.totalViolations++;
    history.recentCases.unshift(moderationCase);
    history.recentCases = history.recentCases.slice(0, 10);
    
    // Update action counts
    switch (moderationCase.action.type) {
      case 'warn': history.warningCount++; break;
      case 'mute': history.muteCount++; break;
      case 'kick': history.kickCount++; break;
      case 'ban': history.banCount++; break;
    }
    
    // Calculate risk score
    history.riskScore = Math.min(
      (history.warningCount * 10) +
      (history.muteCount * 20) +
      (history.kickCount * 40) +
      (history.banCount * 100),
      100
    );
    
    history.trustScore = Math.max(100 - history.riskScore, 0);
    
    // Determine risk level
    if (history.riskScore < 30) history.riskLevel = 'low';
    else if (history.riskScore < 60) history.riskLevel = 'medium';
    else if (history.riskScore < 85) history.riskLevel = 'high';
    else history.riskLevel = 'critical';
    
    history.lastViolation = Date.now();
    history.lastAction = moderationCase.action;
    
    this.userHistories.set(userId, history);
  }

  getUserHistory(userId: string): UserModerationHistory | undefined {
    return this.userHistories.get(userId);
  }

  // ==================== STATISTICS ====================
  
  getStats(period: 'today' | 'week' | 'month' | 'all' = 'all'): ModerationStats {
    const now = Date.now();
    const periodStart = this.getPeriodStart(period, now);
    
    const cases = Array.from(this.cases.values())
      .filter(c => c.created_at >= periodStart);
    
    const actionBreakdown: Record<string, number> = {};
    const violationBreakdown: Record<string, number> = {};
    
    cases.forEach(c => {
      actionBreakdown[c.action.type] = (actionBreakdown[c.action.type] || 0) + 1;
      violationBreakdown[c.violationType] = (violationBreakdown[c.violationType] || 0) + 1;
    });
    
    return {
      period,
      startDate: periodStart,
      endDate: now,
      totalCases: cases.length,
      pendingCases: cases.filter(c => c.status === 'pending').length,
      resolvedCases: cases.filter(c => c.status === 'approved' || c.status === 'rejected').length,
      appealedCases: cases.filter(c => c.status === 'appealed').length,
      actionBreakdown,
      autoActions: cases.filter(c => c.executedBy === 'ai').length,
      manualActions: cases.filter(c => c.executedBy !== 'ai').length,
      violationBreakdown,
      topViolations: Object.entries(violationBreakdown)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      aiAccuracy: this.calculateAIAccuracy(cases),
      falsePositives: cases.filter(c => c.status === 'rejected').length,
      falseNegatives: 0, // Would need manual tracking
      averageConfidence: cases.reduce((sum, c) => sum + c.aiConfidence, 0) / cases.length || 0,
      uniqueViolators: new Set(cases.map(c => c.userId)).size,
      repeatOffenders: Array.from(this.userHistories.values()).filter(h => h.totalViolations > 3).length,
      bannedUsers: Array.from(this.userHistories.values()).filter(h => h.banCount > 0).length,
      casesOverTime: this.getCasesOverTime(cases),
      violationTrends: []
    };
  }

  private getPeriodStart(period: string, now: number): number {
    switch (period) {
      case 'today': return now - 24 * 60 * 60 * 1000;
      case 'week': return now - 7 * 24 * 60 * 60 * 1000;
      case 'month': return now - 30 * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  }

  private calculateAIAccuracy(cases: ModerationCase[]): number {
    const reviewed = cases.filter(c => c.status === 'approved' || c.status === 'rejected');
    if (reviewed.length === 0) return 0;
    
    const correct = reviewed.filter(c => c.status === 'approved').length;
    return (correct / reviewed.length) * 100;
  }

  private getCasesOverTime(cases: ModerationCase[]): { date: string; count: number }[] {
    const grouped: Record<string, number> = {};
    
    cases.forEach(c => {
      const date = new Date(c.created_at).toISOString().split('T')[0];
      grouped[date] = (grouped[date] || 0) + 1;
    });
    
    return Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // ==================== RULE MANAGEMENT ====================
  
  private initializeDefaultRules(): void {
    const defaultRules: ModerationRule[] = [
      {
        id: 'spam_detection',
        name: 'Spam Tespiti',
        description: 'Otomatik spam mesaj tespiti',
        enabled: true,
        type: 'spam',
        severity: 'medium',
        aiEnabled: true,
        confidenceThreshold: 70,
        action: { type: 'delete', reason: 'Spam tespit edildi', deleteMessages: true },
        autoExecute: true,
        notifyModerators: false,
        exemptRoles: [],
        exemptUsers: [],
        exemptChannels: [],
        created_at: Date.now(),
        created_by: 'system'
      },
      {
        id: 'toxicity_detection',
        name: 'Toksik İçerik Tespiti',
        description: 'Hakaret ve nefret söylemi tespiti',
        enabled: true,
        type: 'toxicity',
        severity: 'high',
        aiEnabled: true,
        confidenceThreshold: 80,
        action: { type: 'warn', reason: 'Toksik içerik', notifyUser: true },
        autoExecute: true,
        notifyModerators: true,
        exemptRoles: [],
        exemptUsers: [],
        exemptChannels: [],
        created_at: Date.now(),
        created_by: 'system'
      }
    ];
    
    defaultRules.forEach(rule => this.rules.set(rule.id, rule));
  }

  private initializeDefaultFilters(): void {
    const defaultFilters: ContentFilter[] = [
      {
        id: 'filter_1',
        name: 'Yasaklı Kelimeler',
        type: 'word',
        pattern: 'badword',
        enabled: true,
        caseSensitive: false,
        wholeWord: true,
        action: 'delete',
        channels: [],
        exemptRoles: [],
        created_at: Date.now(),
        created_by: 'system'
      }
    ];
    
    defaultFilters.forEach(filter => this.filters.set(filter.id, filter));
  }

  getRules(): ModerationRule[] {
    return Array.from(this.rules.values());
  }

  addRule(rule: ModerationRule): void {
    this.rules.set(rule.id, rule);
  }

  updateRule(ruleId: string, updates: Partial<ModerationRule>): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.rules.set(ruleId, { ...rule, ...updates, updated_at: Date.now() });
    }
  }

  deleteRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }
}

export const aiModerationService = new AIModerationService();
