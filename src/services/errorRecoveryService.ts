/**
 * Error Recovery Service
 * Network failure recovery, media device errors, room conflict management
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { VideoConferenceError } from '../types/videoConference';

export type RecoveryStrategy = 'retry' | 'fallback' | 'notify' | 'abort';

export interface RecoveryAttempt {
  errorType: VideoConferenceError['type'];
  attemptNumber: number;
  maxAttempts: number;
  strategy: RecoveryStrategy;
  timestamp: number;
}

export interface RecoveryResult {
  success: boolean;
  attempts: number;
  finalError?: string;
}

const MAX_RETRY_ATTEMPTS: Record<VideoConferenceError['type'], number> = {
  'connection-failed': 3,
  'network-error': 3,
  'permission-denied': 1,   // no point retrying permission errors
  'room-full': 1,
  'screen-share-conflict': 2,
};

const RETRY_DELAYS_MS = [1000, 3000, 7000]; // exponential-ish backoff

export class ErrorRecoveryService {
  private activeRecoveries = new Map<string, RecoveryAttempt>();
  private eventListeners = new Map<string, Function[]>();

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Attempt to recover from a video conference error.
   * Returns a RecoveryResult after all attempts are exhausted or success.
   */
  async recover(
    error: VideoConferenceError,
    recoveryFn: () => Promise<void>,
    context: string = 'unknown'
  ): Promise<RecoveryResult> {
    const maxAttempts = MAX_RETRY_ATTEMPTS[error.type] ?? 1;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const recoveryAttempt: RecoveryAttempt = {
        errorType: error.type,
        attemptNumber: attempt,
        maxAttempts,
        strategy: this.chooseStrategy(error.type, attempt),
        timestamp: Date.now(),
      };

      this.activeRecoveries.set(context, recoveryAttempt);
      this.emit('recoveryAttempt', { context, ...recoveryAttempt });

      try {
        if (attempt > 1) {
          await this.delay(RETRY_DELAYS_MS[attempt - 2] ?? 7000);
        }
        await recoveryFn();
        this.activeRecoveries.delete(context);
        this.emit('recoverySuccess', { context, attempts: attempt });
        return { success: true, attempts: attempt };
      } catch (err: any) {
        lastError = err?.message ?? String(err);
        this.emit('recoveryFailed', { context, attempt, error: lastError });
      }
    }

    this.activeRecoveries.delete(context);
    this.emit('recoveryAborted', { context, error: lastError });
    return { success: false, attempts: maxAttempts, finalError: lastError };
  }

  /**
   * Handle a media device error and return a user-friendly message + fallback action.
   */
  handleMediaError(error: any): { message: string; canFallback: boolean; fallbackAction?: string } {
    const name: string = error?.name ?? '';
    const message: string = error?.message ?? '';

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return {
        message: 'Camera/microphone access was denied. Please allow access in your browser settings.',
        canFallback: true,
        fallbackAction: 'join_audio_only',
      };
    }

    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return {
        message: 'No camera or microphone found. Please connect a device and try again.',
        canFallback: true,
        fallbackAction: 'join_without_media',
      };
    }

    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return {
        message: 'Your camera or microphone is already in use by another application.',
        canFallback: true,
        fallbackAction: 'join_audio_only',
      };
    }

    if (name === 'OverconstrainedError') {
      return {
        message: 'The requested video quality is not supported by your device. Trying lower quality.',
        canFallback: true,
        fallbackAction: 'lower_quality',
      };
    }

    return {
      message: `Media error: ${message || 'Unknown error'}. Please refresh and try again.`,
      canFallback: false,
    };
  }

  /**
   * Handle a room-level error and return a user-friendly message.
   */
  handleRoomError(error: VideoConferenceError): { message: string; recoverable: boolean } {
    switch (error.type) {
      case 'room-full':
        return { message: 'This room is full. Please try again later or create a new room.', recoverable: false };
      case 'permission-denied':
        return { message: 'You do not have permission to join this room.', recoverable: false };
      case 'connection-failed':
        return { message: 'Connection failed. Attempting to reconnect...', recoverable: true };
      case 'network-error':
        return { message: 'Network error detected. Checking connection...', recoverable: true };
      case 'screen-share-conflict':
        return { message: 'Someone is already sharing their screen. Only one person can share at a time.', recoverable: false };
      default:
        return { message: error.message, recoverable: false };
    }
  }

  isRecovering(context: string): boolean {
    return this.activeRecoveries.has(context);
  }

  getActiveRecovery(context: string): RecoveryAttempt | undefined {
    return this.activeRecoveries.get(context);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private chooseStrategy(type: VideoConferenceError['type'], attempt: number): RecoveryStrategy {
    if (type === 'permission-denied' || type === 'room-full') return 'notify';
    if (attempt < (MAX_RETRY_ATTEMPTS[type] ?? 1)) return 'retry';
    return 'abort';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    this.activeRecoveries.clear();
    this.eventListeners.clear();
  }
}

export const errorRecoveryService = new ErrorRecoveryService();
