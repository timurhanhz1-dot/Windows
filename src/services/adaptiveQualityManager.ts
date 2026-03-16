/**
 * Adaptive Quality Manager
 * Network condition monitoring, automatic quality adjustment, CPU tracking
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { ConnectionQualityMetrics, VideoQualitySettings } from '../types/videoConference';

export type QualityLevel = 'high' | 'medium' | 'low' | 'minimal';

export interface QualityProfile {
  level: QualityLevel;
  settings: VideoQualitySettings;
  constraints: MediaTrackConstraints;
}

export interface NetworkCondition {
  latency: number;       // ms
  packetLoss: number;    // 0-1
  bandwidth: number;     // kbps estimated
  jitter: number;        // ms
}

export interface QualityAdjustmentEvent {
  previousLevel: QualityLevel;
  newLevel: QualityLevel;
  reason: string;
  metrics: NetworkCondition;
}

// Quality profiles ordered from high to low
const QUALITY_PROFILES: Record<QualityLevel, QualityProfile> = {
  high: {
    level: 'high',
    settings: { resolution: '720p', frameRate: 30, bitrate: 1500 },
    constraints: { width: 1280, height: 720, frameRate: 30 },
  },
  medium: {
    level: 'medium',
    settings: { resolution: '480p', frameRate: 30, bitrate: 800 },
    constraints: { width: 854, height: 480, frameRate: 30 },
  },
  low: {
    level: 'low',
    settings: { resolution: '480p', frameRate: 15, bitrate: 400 },
    constraints: { width: 640, height: 360, frameRate: 15 },
  },
  minimal: {
    level: 'minimal',
    settings: { resolution: '480p', frameRate: 15, bitrate: 150 },
    constraints: { width: 320, height: 240, frameRate: 10 },
  },
};

// Thresholds for quality degradation
const DEGRADE_THRESHOLDS = {
  latency: { medium: 150, low: 300, minimal: 500 },     // ms
  packetLoss: { medium: 0.02, low: 0.05, minimal: 0.1 }, // ratio
  bandwidth: { medium: 800, low: 400, minimal: 150 },    // kbps
};

// Thresholds for quality improvement (stricter to avoid oscillation)
const IMPROVE_THRESHOLDS = {
  latency: { high: 100, medium: 200, low: 400 },
  packetLoss: { high: 0.01, medium: 0.03, low: 0.07 },
  bandwidth: { high: 1200, medium: 600, low: 300 },
};

export class AdaptiveQualityManager {
  private currentLevel: QualityLevel = 'high';
  private localStream: MediaStream | null = null;
  private monitorInterval: ReturnType<typeof setInterval> | null = null;
  private metricsHistory: NetworkCondition[] = [];
  private readonly historySize = 5;
  private eventListeners = new Map<string, Function[]>();
  private consecutiveGoodReadings = 0;
  private readonly upgradeRequiredReadings = 3; // need 3 good readings before upgrading

  constructor(initialLevel: QualityLevel = 'high') {
    this.currentLevel = initialLevel;
  }

  setLocalStream(stream: MediaStream): void {
    this.localStream = stream;
  }

  getCurrentLevel(): QualityLevel {
    return this.currentLevel;
  }

  getCurrentProfile(): QualityProfile {
    return QUALITY_PROFILES[this.currentLevel];
  }

  /**
   * Process new connection metrics and adjust quality if needed
   */
  async processMetrics(metrics: ConnectionQualityMetrics): Promise<void> {
    const condition = this.metricsToCondition(metrics);
    this.metricsHistory.push(condition);
    if (this.metricsHistory.length > this.historySize) {
      this.metricsHistory.shift();
    }

    const averaged = this.averageConditions(this.metricsHistory);
    await this.evaluateAndAdjust(averaged);
  }

  /**
   * Force a specific quality level (e.g., user preference)
   */
  async forceQualityLevel(level: QualityLevel): Promise<void> {
    if (level === this.currentLevel) return;
    const previous = this.currentLevel;
    this.currentLevel = level;
    await this.applyQualityToStream(level);
    this.emit('qualityChanged', {
      previousLevel: previous,
      newLevel: level,
      reason: 'manual',
      metrics: this.metricsHistory[this.metricsHistory.length - 1] || this.emptyCondition(),
    } as QualityAdjustmentEvent);
  }

  startMonitoring(
    getMetrics: () => Promise<ConnectionQualityMetrics | null>,
    intervalMs = 5000
  ): void {
    if (this.monitorInterval) return;
    this.monitorInterval = setInterval(async () => {
      try {
        const metrics = await getMetrics();
        if (metrics) await this.processMetrics(metrics);
      } catch {
        // ignore transient errors
      }
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private metricsToCondition(m: ConnectionQualityMetrics): NetworkCondition {
    return {
      latency: m.latency,
      packetLoss: m.packetLoss,
      bandwidth: m.bandwidth,
      jitter: 0, // not tracked in current metrics, default 0
    };
  }

  private averageConditions(conditions: NetworkCondition[]): NetworkCondition {
    if (conditions.length === 0) return this.emptyCondition();
    const sum = conditions.reduce(
      (acc, c) => ({
        latency: acc.latency + c.latency,
        packetLoss: acc.packetLoss + c.packetLoss,
        bandwidth: acc.bandwidth + c.bandwidth,
        jitter: acc.jitter + c.jitter,
      }),
      this.emptyCondition()
    );
    const n = conditions.length;
    return {
      latency: sum.latency / n,
      packetLoss: sum.packetLoss / n,
      bandwidth: sum.bandwidth / n,
      jitter: sum.jitter / n,
    };
  }

  private emptyCondition(): NetworkCondition {
    return { latency: 0, packetLoss: 0, bandwidth: 0, jitter: 0 };
  }

  private async evaluateAndAdjust(condition: NetworkCondition): Promise<void> {
    const targetLevel = this.determineTargetLevel(condition);

    if (targetLevel === this.currentLevel) {
      if (this.isConditionGood(condition)) {
        this.consecutiveGoodReadings++;
      }
      return;
    }

    const levels: QualityLevel[] = ['high', 'medium', 'low', 'minimal'];
    const currentIdx = levels.indexOf(this.currentLevel);
    const targetIdx = levels.indexOf(targetLevel);

    // Degrading: apply immediately
    if (targetIdx > currentIdx) {
      this.consecutiveGoodReadings = 0;
      await this.changeLevel(targetLevel, condition, 'network degradation');
      return;
    }

    // Upgrading: require consecutive good readings to avoid oscillation
    if (targetIdx < currentIdx) {
      this.consecutiveGoodReadings++;
      if (this.consecutiveGoodReadings >= this.upgradeRequiredReadings) {
        this.consecutiveGoodReadings = 0;
        await this.changeLevel(targetLevel, condition, 'network improvement');
      }
    }
  }

  private determineTargetLevel(c: NetworkCondition): QualityLevel {
    // Check for minimal conditions first
    if (
      c.latency > DEGRADE_THRESHOLDS.latency.minimal ||
      c.packetLoss > DEGRADE_THRESHOLDS.packetLoss.minimal ||
      (c.bandwidth > 0 && c.bandwidth < DEGRADE_THRESHOLDS.bandwidth.minimal)
    ) {
      return 'minimal';
    }

    if (
      c.latency > DEGRADE_THRESHOLDS.latency.low ||
      c.packetLoss > DEGRADE_THRESHOLDS.packetLoss.low ||
      (c.bandwidth > 0 && c.bandwidth < DEGRADE_THRESHOLDS.bandwidth.low)
    ) {
      return 'low';
    }

    if (
      c.latency > DEGRADE_THRESHOLDS.latency.medium ||
      c.packetLoss > DEGRADE_THRESHOLDS.packetLoss.medium ||
      (c.bandwidth > 0 && c.bandwidth < DEGRADE_THRESHOLDS.bandwidth.medium)
    ) {
      return 'medium';
    }

    // Check if we can upgrade
    if (
      c.latency < IMPROVE_THRESHOLDS.latency.high &&
      c.packetLoss < IMPROVE_THRESHOLDS.packetLoss.high &&
      (c.bandwidth === 0 || c.bandwidth > IMPROVE_THRESHOLDS.bandwidth.high)
    ) {
      return 'high';
    }

    if (
      c.latency < IMPROVE_THRESHOLDS.latency.medium &&
      c.packetLoss < IMPROVE_THRESHOLDS.packetLoss.medium &&
      (c.bandwidth === 0 || c.bandwidth > IMPROVE_THRESHOLDS.bandwidth.medium)
    ) {
      return 'medium';
    }

    return this.currentLevel;
  }

  private isConditionGood(c: NetworkCondition): boolean {
    return (
      c.latency < IMPROVE_THRESHOLDS.latency.high &&
      c.packetLoss < IMPROVE_THRESHOLDS.packetLoss.high
    );
  }

  private async changeLevel(
    newLevel: QualityLevel,
    condition: NetworkCondition,
    reason: string
  ): Promise<void> {
    const previous = this.currentLevel;
    this.currentLevel = newLevel;
    await this.applyQualityToStream(newLevel);
    this.emit('qualityChanged', {
      previousLevel: previous,
      newLevel,
      reason,
      metrics: condition,
    } as QualityAdjustmentEvent);
  }

  private async applyQualityToStream(level: QualityLevel): Promise<void> {
    if (!this.localStream) return;
    const profile = QUALITY_PROFILES[level];
    const videoTracks = this.localStream.getVideoTracks();
    for (const track of videoTracks) {
      try {
        await track.applyConstraints(profile.constraints);
      } catch {
        // Some browsers don't support all constraints — ignore
      }
    }
  }

  // ── Event system ─────────────────────────────────────────────────────────

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const idx = listeners.indexOf(callback);
      if (idx > -1) listeners.splice(idx, 1);
    }
  }

  private emit(event: string, data?: any): void {
    this.eventListeners.get(event)?.forEach(cb => cb(data));
  }

  destroy(): void {
    this.stopMonitoring();
    this.eventListeners.clear();
  }
}

export { QUALITY_PROFILES };
