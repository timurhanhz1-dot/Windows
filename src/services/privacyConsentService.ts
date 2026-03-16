/**
 * Privacy Controls & Consent Management
 * Media permission explanations, AI transcription consent, data minimization
 * Requirements: 9.2, 9.3, 9.5
 */

export type ConsentType = 'transcription' | 'recording' | 'analytics';

export interface ConsentRecord {
  userId: string;
  roomId: string;
  type: ConsentType;
  granted: boolean;
  timestamp: number;
  expiresAt?: number;
}

export interface MediaPermissionExplanation {
  device: 'camera' | 'microphone' | 'screen';
  purpose: string;
  dataRetention: string;
  canRevoke: boolean;
}

const PERMISSION_EXPLANATIONS: Record<string, MediaPermissionExplanation> = {
  camera: {
    device: 'camera',
    purpose: 'Your camera video is streamed directly to other participants via peer-to-peer connection. It is not stored on our servers.',
    dataRetention: 'Not stored. Stream ends when you leave the room.',
    canRevoke: true,
  },
  microphone: {
    device: 'microphone',
    purpose: 'Your microphone audio is streamed directly to other participants. If AI transcription is enabled and you consent, audio is processed for real-time transcription.',
    dataRetention: 'Audio stream: not stored. Transcripts: stored for the session duration only unless exported.',
    canRevoke: true,
  },
  screen: {
    device: 'screen',
    purpose: 'Your screen content is shared with other participants in the room via peer-to-peer connection.',
    dataRetention: 'Not stored. Stream ends when you stop sharing.',
    canRevoke: true,
  },
};

export class PrivacyConsentService {
  private consentRecords = new Map<string, ConsentRecord>(); // key: `${userId}:${roomId}:${type}`
  private eventListeners = new Map<string, Function[]>();

  // ── Consent management ───────────────────────────────────────────────────

  recordConsent(
    userId: string,
    roomId: string,
    type: ConsentType,
    granted: boolean
  ): ConsentRecord {
    const record: ConsentRecord = {
      userId,
      roomId,
      type,
      granted,
      timestamp: Date.now(),
    };
    this.consentRecords.set(this.key(userId, roomId, type), record);
    this.emit('consentUpdated', record);
    return record;
  }

  hasConsent(userId: string, roomId: string, type: ConsentType): boolean {
    const record = this.consentRecords.get(this.key(userId, roomId, type));
    if (!record) return false;
    if (record.expiresAt && Date.now() > record.expiresAt) return false;
    return record.granted;
  }

  revokeConsent(userId: string, roomId: string, type: ConsentType): void {
    const key = this.key(userId, roomId, type);
    const existing = this.consentRecords.get(key);
    if (existing) {
      const updated = { ...existing, granted: false, timestamp: Date.now() };
      this.consentRecords.set(key, updated);
      this.emit('consentRevoked', updated);
    }
  }

  getConsentStatus(userId: string, roomId: string): Record<ConsentType, boolean> {
    return {
      transcription: this.hasConsent(userId, roomId, 'transcription'),
      recording: this.hasConsent(userId, roomId, 'recording'),
      analytics: this.hasConsent(userId, roomId, 'analytics'),
    };
  }

  // ── Permission explanations ──────────────────────────────────────────────

  getPermissionExplanation(device: 'camera' | 'microphone' | 'screen'): MediaPermissionExplanation {
    return PERMISSION_EXPLANATIONS[device];
  }

  getAllPermissionExplanations(): MediaPermissionExplanation[] {
    return Object.values(PERMISSION_EXPLANATIONS);
  }

  // ── Data minimization ────────────────────────────────────────────────────

  /**
   * Returns only the fields of a participant that are safe to share
   * with other participants (data minimization principle).
   */
  minimizeParticipantData<T extends { userId: string; username: string; avatar?: string; isCameraOn: boolean; isMicOn: boolean; isScreenSharing: boolean; connectionQuality: string }>(
    participant: T
  ): Pick<T, 'userId' | 'username' | 'avatar' | 'isCameraOn' | 'isMicOn' | 'isScreenSharing' | 'connectionQuality'> {
    return {
      userId: participant.userId,
      username: participant.username,
      avatar: participant.avatar,
      isCameraOn: participant.isCameraOn,
      isMicOn: participant.isMicOn,
      isScreenSharing: participant.isScreenSharing,
      connectionQuality: participant.connectionQuality,
    };
  }

  /** Clean up all consent records for a room when it ends */
  cleanupRoom(roomId: string): void {
    for (const [key] of this.consentRecords) {
      if (key.includes(`:${roomId}:`)) {
        this.consentRecords.delete(key);
      }
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private key(userId: string, roomId: string, type: ConsentType): string {
    return `${userId}:${roomId}:${type}`;
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
}

export const privacyConsentService = new PrivacyConsentService();
