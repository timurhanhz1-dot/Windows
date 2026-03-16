/**
 * Connection Quality Monitor
 * Latency measurement, bandwidth estimation, health indicators
 * Requirements: 6.5, 8.4, 8.5
 */

import { ConnectionQualityMetrics } from '../types/videoConference';

export type ConnectionHealth = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

export interface ConnectionHealthReport {
  userId: string;
  health: ConnectionHealth;
  metrics: ConnectionQualityMetrics;
  timestamp: number;
  issues: string[];
}

export interface BandwidthEstimate {
  downloadKbps: number;
  uploadKbps: number;
  timestamp: number;
}

// Thresholds for health classification
const HEALTH_THRESHOLDS = {
  excellent: { latency: 50, packetLoss: 0.005, frameRate: 25 },
  good:      { latency: 150, packetLoss: 0.02,  frameRate: 20 },
  fair:      { latency: 300, packetLoss: 0.05,  frameRate: 15 },
  poor:      { latency: 500, packetLoss: 0.10,  frameRate: 10 },
  // anything worse → critical
};

export class ConnectionQualityMonitor {
  private connections = new Map<string, RTCPeerConnection>();
  private reports = new Map<string, ConnectionHealthReport[]>();
  private monitorInterval: ReturnType<typeof setInterval> | null = null;
  private eventListeners = new Map<string, Function[]>();
  private readonly maxReportHistory = 20;

  addConnection(userId: string, connection: RTCPeerConnection): void {
    this.connections.set(userId, connection);
    this.reports.set(userId, []);
  }

  removeConnection(userId: string): void {
    this.connections.delete(userId);
    this.reports.delete(userId);
  }

  startMonitoring(intervalMs = 5000): void {
    if (this.monitorInterval) return;
    this.monitorInterval = setInterval(() => this.runCheck(), intervalMs);
  }

  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  /** Run a single check cycle for all tracked connections */
  async runCheck(): Promise<Map<string, ConnectionHealthReport>> {
    const results = new Map<string, ConnectionHealthReport>();
    for (const [userId, connection] of this.connections) {
      try {
        const metrics = await this.collectMetrics(connection);
        const report = this.buildReport(userId, metrics);
        this.storeReport(userId, report);
        results.set(userId, report);
        this.emit('healthReport', report);
        if (report.health === 'poor' || report.health === 'critical') {
          this.emit('connectionDegraded', report);
        }
      } catch {
        // connection may have closed
      }
    }
    return results;
  }

  /** Get the latest report for a user */
  getLatestReport(userId: string): ConnectionHealthReport | null {
    const history = this.reports.get(userId);
    return history && history.length > 0 ? history[history.length - 1] : null;
  }

  /** Get report history for a user */
  getReportHistory(userId: string): ConnectionHealthReport[] {
    return this.reports.get(userId) ?? [];
  }

  /** Estimate bandwidth from outbound-rtp stats */
  async estimateBandwidth(connection: RTCPeerConnection): Promise<BandwidthEstimate> {
    const stats = await connection.getStats();
    let downloadKbps = 0;
    let uploadKbps = 0;

    stats.forEach(report => {
      if (report.type === 'inbound-rtp') {
        downloadKbps += ((report.bytesReceived ?? 0) * 8) / 1000;
      }
      if (report.type === 'outbound-rtp') {
        uploadKbps += ((report.bytesSent ?? 0) * 8) / 1000;
      }
    });

    return { downloadKbps, uploadKbps, timestamp: Date.now() };
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async collectMetrics(connection: RTCPeerConnection): Promise<ConnectionQualityMetrics> {
    const stats = await connection.getStats();
    let latency = 0;
    let packetLoss = 0;
    let bandwidth = 0;
    let resolution = '';
    let frameRate = 0;

    stats.forEach(report => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        latency = (report.currentRoundTripTime ?? 0) * 1000;
      }
      if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
        packetLoss = report.packetsLost ?? 0;
        frameRate = report.framesPerSecond ?? 0;
        if (report.frameWidth && report.frameHeight) {
          resolution = `${report.frameWidth}x${report.frameHeight}`;
        }
      }
      if (report.type === 'outbound-rtp') {
        bandwidth = report.bytesSent ?? 0;
      }
    });

    return { latency, packetLoss, bandwidth, resolution, frameRate };
  }

  private buildReport(userId: string, metrics: ConnectionQualityMetrics): ConnectionHealthReport {
    const health = this.classifyHealth(metrics);
    const issues = this.detectIssues(metrics);
    return { userId, health, metrics, timestamp: Date.now(), issues };
  }

  private classifyHealth(m: ConnectionQualityMetrics): ConnectionHealth {
    if (
      m.latency <= HEALTH_THRESHOLDS.excellent.latency &&
      m.packetLoss <= HEALTH_THRESHOLDS.excellent.packetLoss &&
      (m.frameRate === 0 || m.frameRate >= HEALTH_THRESHOLDS.excellent.frameRate)
    ) return 'excellent';

    if (
      m.latency <= HEALTH_THRESHOLDS.good.latency &&
      m.packetLoss <= HEALTH_THRESHOLDS.good.packetLoss &&
      (m.frameRate === 0 || m.frameRate >= HEALTH_THRESHOLDS.good.frameRate)
    ) return 'good';

    if (
      m.latency <= HEALTH_THRESHOLDS.fair.latency &&
      m.packetLoss <= HEALTH_THRESHOLDS.fair.packetLoss &&
      (m.frameRate === 0 || m.frameRate >= HEALTH_THRESHOLDS.fair.frameRate)
    ) return 'fair';

    if (
      m.latency <= HEALTH_THRESHOLDS.poor.latency &&
      m.packetLoss <= HEALTH_THRESHOLDS.poor.packetLoss &&
      (m.frameRate === 0 || m.frameRate >= HEALTH_THRESHOLDS.poor.frameRate)
    ) return 'poor';

    return 'critical';
  }

  private detectIssues(m: ConnectionQualityMetrics): string[] {
    const issues: string[] = [];
    if (m.latency > HEALTH_THRESHOLDS.fair.latency) issues.push('High latency');
    if (m.packetLoss > HEALTH_THRESHOLDS.fair.packetLoss) issues.push('Packet loss detected');
    if (m.frameRate > 0 && m.frameRate < HEALTH_THRESHOLDS.fair.frameRate) issues.push('Low frame rate');
    return issues;
  }

  private storeReport(userId: string, report: ConnectionHealthReport): void {
    const history = this.reports.get(userId) ?? [];
    history.push(report);
    if (history.length > this.maxReportHistory) history.shift();
    this.reports.set(userId, history);
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
    this.connections.clear();
    this.reports.clear();
    this.eventListeners.clear();
  }
}
