/**
 * Room Security Service
 * Password protection, host controls, participant management, access validation
 * Requirements: 1.4, 9.1, 9.4
 */

import { VideoRoom, VideoParticipant } from '../types/videoConference';

export interface HostAction {
  type: 'mute' | 'remove' | 'promote' | 'lock' | 'unlock';
  targetUserId?: string;
  performedBy: string;
  timestamp: number;
}

export interface RoomAccessResult {
  granted: boolean;
  reason?: string;
}

export interface SecurityAuditEntry {
  action: string;
  userId: string;
  targetUserId?: string;
  roomId: string;
  timestamp: number;
  success: boolean;
}

export class RoomSecurityService {
  private auditLog: SecurityAuditEntry[] = [];
  private lockedRooms = new Set<string>();
  private mutedParticipants = new Map<string, Set<string>>(); // roomId → Set<userId>
  private eventListeners = new Map<string, Function[]>();

  // ── Access validation ────────────────────────────────────────────────────

  validateAccess(room: VideoRoom, userId: string, password?: string): RoomAccessResult {
    // Room locked by host
    if (this.lockedRooms.has(room.id)) {
      return { granted: false, reason: 'Room is locked by the host' };
    }

    // Capacity check
    if (room.participants.length >= room.maxParticipants) {
      return { granted: false, reason: 'Room is at maximum capacity' };
    }

    // Password check
    if (room.isPrivate) {
      if (!password) {
        return { granted: false, reason: 'Password required' };
      }
      if (!this.verifyPassword(room.password ?? '', password)) {
        this.audit({ action: 'access_denied_wrong_password', userId, roomId: room.id, success: false });
        return { granted: false, reason: 'Incorrect password' };
      }
    }

    this.audit({ action: 'access_granted', userId, roomId: room.id, success: true });
    return { granted: true };
  }

  // ── Host controls ────────────────────────────────────────────────────────

  isHost(room: VideoRoom, userId: string): boolean {
    return room.hostId === userId;
  }

  lockRoom(room: VideoRoom, requesterId: string): boolean {
    if (!this.isHost(room, requesterId)) return false;
    this.lockedRooms.add(room.id);
    this.audit({ action: 'room_locked', userId: requesterId, roomId: room.id, success: true });
    this.emit('roomLocked', { roomId: room.id, by: requesterId });
    return true;
  }

  unlockRoom(room: VideoRoom, requesterId: string): boolean {
    if (!this.isHost(room, requesterId)) return false;
    this.lockedRooms.delete(room.id);
    this.audit({ action: 'room_unlocked', userId: requesterId, roomId: room.id, success: true });
    this.emit('roomUnlocked', { roomId: room.id, by: requesterId });
    return true;
  }

  muteParticipant(room: VideoRoom, targetUserId: string, requesterId: string): boolean {
    if (!this.isHost(room, requesterId)) return false;
    if (!this.mutedParticipants.has(room.id)) {
      this.mutedParticipants.set(room.id, new Set());
    }
    this.mutedParticipants.get(room.id)!.add(targetUserId);
    this.audit({ action: 'participant_muted', userId: requesterId, targetUserId, roomId: room.id, success: true });
    this.emit('participantMuted', { roomId: room.id, userId: targetUserId, by: requesterId });
    return true;
  }

  removeParticipant(room: VideoRoom, targetUserId: string, requesterId: string): boolean {
    if (!this.isHost(room, requesterId)) return false;
    this.audit({ action: 'participant_removed', userId: requesterId, targetUserId, roomId: room.id, success: true });
    this.emit('participantRemoved', { roomId: room.id, userId: targetUserId, by: requesterId });
    return true;
  }

  isParticipantMuted(roomId: string, userId: string): boolean {
    return this.mutedParticipants.get(roomId)?.has(userId) ?? false;
  }

  isRoomLocked(roomId: string): boolean {
    return this.lockedRooms.has(roomId);
  }

  // ── Audit log ────────────────────────────────────────────────────────────

  getAuditLog(roomId?: string): SecurityAuditEntry[] {
    if (!roomId) return [...this.auditLog];
    return this.auditLog.filter(e => e.roomId === roomId);
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  cleanupRoom(roomId: string): void {
    this.lockedRooms.delete(roomId);
    this.mutedParticipants.delete(roomId);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  /**
   * Simple constant-time string comparison to avoid timing attacks.
   * In production this should use a proper hashing mechanism.
   */
  private verifyPassword(stored: string, provided: string): boolean {
    if (stored.length !== provided.length) return false;
    let diff = 0;
    for (let i = 0; i < stored.length; i++) {
      diff |= stored.charCodeAt(i) ^ provided.charCodeAt(i);
    }
    return diff === 0;
  }

  private audit(entry: Omit<SecurityAuditEntry, 'timestamp'>): void {
    this.auditLog.push({ ...entry, timestamp: Date.now() });
    // Keep log bounded
    if (this.auditLog.length > 500) this.auditLog.shift();
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

export const roomSecurityService = new RoomSecurityService();
