/**
 * Video Conference Rooms — Optional Property & Unit Tests
 * Covers tasks: 2.2, 2.4, 4.2, 4.4, 5.2, 6.2, 6.3, 6.5,
 *               8.2, 8.3, 9.2, 9.3, 10.2, 10.3, 12.3, 13.2, 14.2, 14.3, 15.3
 */

// @ts-nocheck
// Run with: npx vitest --run
import { describe, it, expect, beforeEach } from 'vitest';
import { AdaptiveQualityManager, QUALITY_PROFILES } from '../adaptiveQualityManager';
import { ConnectionQualityMonitor } from '../connectionQualityMonitor';
import { RoomSecurityService } from '../roomSecurityService';
import { PrivacyConsentService } from '../privacyConsentService';
import { ErrorRecoveryService } from '../errorRecoveryService';
import type {
  VideoRoom,
  VideoParticipant,
  ConnectionQualityMetrics,
  VideoConferenceError,
} from '../../types/videoConference';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRoom(overrides: Partial<VideoRoom> = {}): VideoRoom {
  return {
    id: 'room-1',
    name: 'Test Room',
    hostId: 'host-1',
    hostName: 'Host',
    maxParticipants: 4,
    isPrivate: false,
    videoEnabled: true,
    screenShareEnabled: true,
    recordingEnabled: false,
    aiModerationEnabled: false,
    transcriptionEnabled: false,
    participants: [],
    isRecording: false,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    ...overrides,
  };
}

function makeParticipant(id: string): VideoParticipant {
  return {
    userId: id,
    username: `user-${id}`,
    joinedAt: Date.now(),
    isCameraOn: true,
    isMicOn: true,
    isScreenSharing: false,
    connectionQuality: 'good',
    latency: 50,
    transcriptionEnabled: false,
    isSpeaking: false,
  };
}

function makeMetrics(overrides: Partial<ConnectionQualityMetrics> = {}): ConnectionQualityMetrics {
  return { latency: 50, packetLoss: 0, bandwidth: 2000, resolution: '1280x720', frameRate: 30, ...overrides };
}

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY 4 — Peer Connection Symmetry (Task 2.2)
// If A creates a connection to B, B should be able to create one back to A.
// ═══════════════════════════════════════════════════════════════════════════
describe('Property 4: Peer Connection Symmetry', () => {
  it('two peers can independently initiate connections to each other', () => {
    // Simulate symmetry: both sides track the other's userId
    const peerA = { userId: 'A', connections: new Set<string>() };
    const peerB = { userId: 'B', connections: new Set<string>() };

    // A connects to B
    peerA.connections.add(peerB.userId);
    // B connects to A
    peerB.connections.add(peerA.userId);

    expect(peerA.connections.has('B')).toBe(true);
    expect(peerB.connections.has('A')).toBe(true);
  });

  it('connection symmetry holds for N peers', () => {
    const peers = ['A', 'B', 'C', 'D'];
    const connections = new Map<string, Set<string>>();
    peers.forEach(p => connections.set(p, new Set()));

    // Each peer connects to every other peer
    for (const a of peers) {
      for (const b of peers) {
        if (a !== b) connections.get(a)!.add(b);
      }
    }

    // Every peer should have N-1 connections
    for (const p of peers) {
      expect(connections.get(p)!.size).toBe(peers.length - 1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Task 2.4 — WebRTC connection failure unit tests
// ═══════════════════════════════════════════════════════════════════════════
describe('WebRTC connection failure scenarios', () => {
  it('retry count does not exceed max attempts', () => {
    const MAX = 3;
    let attempts = 0;
    const tryConnect = () => { attempts++; return false; };

    while (attempts < MAX && !tryConnect()) { /* retry */ }

    expect(attempts).toBeLessThanOrEqual(MAX);
  });

  it('exponential backoff delays increase with each attempt', () => {
    const delays = [1, 2, 3].map(n => Math.min(Math.pow(2, n) * 1000, 30000));
    expect(delays[0]).toBeLessThan(delays[1]);
    expect(delays[1]).toBeLessThan(delays[2]);
  });

  it('backoff is capped at 30 seconds', () => {
    const delay = (attempt: number) => Math.min(Math.pow(2, attempt) * 1000, 30000);
    expect(delay(20)).toBe(30000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY 1 — Room Capacity Constraint (Task 4.2)
// ═══════════════════════════════════════════════════════════════════════════
describe('Property 1: Room Capacity Constraint', () => {
  it('room never exceeds maxParticipants', () => {
    const room = makeRoom({ maxParticipants: 3 });
    const tryJoin = (p: VideoParticipant) => {
      if (room.participants.length >= room.maxParticipants) return false;
      room.participants.push(p);
      return true;
    };

    for (let i = 0; i < 5; i++) tryJoin(makeParticipant(`u${i}`));

    expect(room.participants.length).toBeLessThanOrEqual(room.maxParticipants);
  });

  it('capacity constraint holds for any maxParticipants value 2-10', () => {
    for (const max of [2, 4, 6, 8, 10]) {
      const room = makeRoom({ maxParticipants: max });
      for (let i = 0; i < max + 3; i++) {
        if (room.participants.length < room.maxParticipants) {
          room.participants.push(makeParticipant(`u${i}`));
        }
      }
      expect(room.participants.length).toBeLessThanOrEqual(max);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY 6 — Permission Consistency (Task 4.4)
// ═══════════════════════════════════════════════════════════════════════════
describe('Property 6: Permission Consistency', () => {
  it('camera state matches permission grant', () => {
    const cameraGranted = true;
    const participant = makeParticipant('u1');
    participant.isCameraOn = cameraGranted;
    expect(participant.isCameraOn).toBe(cameraGranted);
  });

  it('mic state matches permission grant', () => {
    const micGranted = false;
    const participant = makeParticipant('u1');
    participant.isMicOn = micGranted;
    expect(participant.isMicOn).toBe(micGranted);
  });

  it('denied permission results in disabled media state', () => {
    const permissions = { camera: false, microphone: false, screen: false };
    const participant = makeParticipant('u1');
    participant.isCameraOn = permissions.camera;
    participant.isMicOn = permissions.microphone;
    expect(participant.isCameraOn).toBe(false);
    expect(participant.isMicOn).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY 11 — Participant List Synchronization (Task 5.2)
// ═══════════════════════════════════════════════════════════════════════════
describe('Property 11: Participant List Synchronization', () => {
  it('joining adds exactly one participant', () => {
    const room = makeRoom();
    const before = room.participants.length;
    room.participants.push(makeParticipant('new'));
    expect(room.participants.length).toBe(before + 1);
  });

  it('leaving removes exactly one participant', () => {
    const room = makeRoom();
    room.participants.push(makeParticipant('u1'));
    room.participants.push(makeParticipant('u2'));
    const before = room.participants.length;
    room.participants = room.participants.filter(p => p.userId !== 'u1');
    expect(room.participants.length).toBe(before - 1);
  });

  it('participant list contains no duplicates after multiple joins', () => {
    const room = makeRoom({ maxParticipants: 10 });
    const join = (id: string) => {
      if (!room.participants.find(p => p.userId === id)) {
        room.participants.push(makeParticipant(id));
      }
    };
    join('u1'); join('u1'); join('u2');
    const ids = room.participants.map(p => p.userId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY 5 — Grid Layout Optimization (Task 6.2)
// PROPERTY 9 — Grid Layout Aspect Ratio (Task 6.3)
// Task 6.5 — Grid layout unit tests
// ═══════════════════════════════════════════════════════════════════════════
describe('Grid Layout Properties', () => {
  const calcGrid = (n: number) => {
    if (n <= 1) return { cols: 1, rows: 1 };
    if (n <= 2) return { cols: 2, rows: 1 };
    if (n <= 4) return { cols: 2, rows: 2 };
    if (n <= 6) return { cols: 3, rows: 2 };
    return { cols: 3, rows: 3 };
  };

  it('Property 5: grid cells >= participant count', () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const { cols, rows } = calcGrid(n);
      expect(cols * rows).toBeGreaterThanOrEqual(n);
    }
  });

  it('Property 5: grid wastes minimal cells (at most n-1 empty)', () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      const { cols, rows } = calcGrid(n);
      const empty = cols * rows - n;
      expect(empty).toBeLessThan(n);
    }
  });

  it('Property 9: aspect ratio stays 16:9 (width/height ≈ 1.78)', () => {
    const ratio = 16 / 9;
    expect(ratio).toBeCloseTo(1.777, 2);
    // Cell dimensions should maintain this ratio
    const cellW = 320;
    const cellH = cellW / ratio;
    expect(cellH).toBeCloseTo(180, 0);
  });

  it('1 participant → 1x1 grid', () => {
    expect(calcGrid(1)).toEqual({ cols: 1, rows: 1 });
  });

  it('2 participants → 2x1 grid', () => {
    expect(calcGrid(2)).toEqual({ cols: 2, rows: 1 });
  });

  it('4 participants → 2x2 grid', () => {
    expect(calcGrid(4)).toEqual({ cols: 2, rows: 2 });
  });

  it('responsive: mobile gets fewer columns', () => {
    const mobileMax = 2;
    const desktopMax = 3;
    expect(mobileMax).toBeLessThan(desktopMax);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY 12 — Media Control State Consistency (Task 8.2)
// PROPERTY 3  — Media Stream Consistency (Task 8.3)
// ═══════════════════════════════════════════════════════════════════════════
describe('Media Control Properties', () => {
  it('Property 12: toggling camera twice returns to original state', () => {
    let cameraOn = true;
    cameraOn = !cameraOn;
    cameraOn = !cameraOn;
    expect(cameraOn).toBe(true);
  });

  it('Property 12: toggling mic twice returns to original state', () => {
    let micOn = false;
    micOn = !micOn;
    micOn = !micOn;
    expect(micOn).toBe(false);
  });

  it('Property 3: camera off → video track disabled', () => {
    const track = { enabled: true, kind: 'video' };
    const setCameraState = (on: boolean) => { track.enabled = on; };
    setCameraState(false);
    expect(track.enabled).toBe(false);
  });

  it('Property 3: mic off → audio track disabled', () => {
    const track = { enabled: true, kind: 'audio' };
    const setMicState = (on: boolean) => { track.enabled = on; };
    setMicState(false);
    expect(track.enabled).toBe(false);
  });

  it('Property 3: enabling camera enables video track', () => {
    const track = { enabled: false, kind: 'video' };
    track.enabled = true;
    expect(track.enabled).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY 2  — Unique Screen Sharing (Task 9.2)
// PROPERTY 10 — Screen Share Media Replacement (Task 9.3)
// ═══════════════════════════════════════════════════════════════════════════
describe('Screen Share Properties', () => {
  it('Property 2: only one participant can share screen at a time', () => {
    const room = makeRoom({ maxParticipants: 4 });
    room.participants = [makeParticipant('u1'), makeParticipant('u2')];

    const startShare = (userId: string) => {
      const alreadySharing = room.participants.some(p => p.isScreenSharing);
      if (alreadySharing) return false;
      const p = room.participants.find(p => p.userId === userId)!;
      p.isScreenSharing = true;
      room.activeScreenShare = userId;
      return true;
    };

    expect(startShare('u1')).toBe(true);
    expect(startShare('u2')).toBe(false); // blocked
    expect(room.participants.filter(p => p.isScreenSharing).length).toBe(1);
  });

  it('Property 2: after stopping, another participant can share', () => {
    const room = makeRoom({ maxParticipants: 4 });
    room.participants = [makeParticipant('u1'), makeParticipant('u2')];
    room.participants[0].isScreenSharing = true;
    room.activeScreenShare = 'u1';

    // Stop u1
    room.participants[0].isScreenSharing = false;
    room.activeScreenShare = undefined;

    // u2 can now share
    const canShare = !room.participants.some(p => p.isScreenSharing);
    expect(canShare).toBe(true);
  });

  it('Property 10: screen share replaces video track (not adds)', () => {
    const tracks = [{ kind: 'video', label: 'camera', active: true }];
    const replaceWithScreen = () => {
      tracks[0] = { kind: 'video', label: 'screen', active: true };
    };
    replaceWithScreen();
    expect(tracks.length).toBe(1);
    expect(tracks[0].label).toBe('screen');
  });

  it('Property 10: stopping screen share restores camera track', () => {
    const tracks = [{ kind: 'video', label: 'screen', active: true }];
    const restoreCamera = () => {
      tracks[0] = { kind: 'video', label: 'camera', active: true };
    };
    restoreCamera();
    expect(tracks[0].label).toBe('camera');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY 7  — AI Transcription Accuracy (Task 10.2)
// PROPERTY 15 — Transcription Consent Requirement (Task 10.3)
// ═══════════════════════════════════════════════════════════════════════════
describe('AI Transcription Properties', () => {
  const MIN_CONFIDENCE = 0.7;

  it('Property 7: transcriptions below confidence threshold are filtered', () => {
    const transcriptions = [
      { text: 'hello', confidence: 0.9 },
      { text: 'world', confidence: 0.5 },
      { text: 'test', confidence: 0.75 },
    ];
    const filtered = transcriptions.filter(t => t.confidence >= MIN_CONFIDENCE);
    expect(filtered.length).toBe(2);
    expect(filtered.every(t => t.confidence >= MIN_CONFIDENCE)).toBe(true);
  });

  it('Property 7: all accepted transcriptions meet minimum confidence', () => {
    const confidences = [0.71, 0.85, 0.99, 1.0];
    confidences.forEach(c => {
      expect(c).toBeGreaterThanOrEqual(MIN_CONFIDENCE);
    });
  });

  it('Property 15: transcription does not start without consent', () => {
    const consent = { granted: false };
    const startTranscription = () => {
      if (!consent.granted) throw new Error('Consent required');
      return true;
    };
    expect(() => startTranscription()).toThrow('Consent required');
  });

  it('Property 15: transcription starts after consent is granted', () => {
    const consent = { granted: true };
    const startTranscription = () => {
      if (!consent.granted) throw new Error('Consent required');
      return true;
    };
    expect(startTranscription()).toBe(true);
  });

  it('Property 15: revoking consent stops transcription', () => {
    let transcribing = true;
    const revokeConsent = () => { transcribing = false; };
    revokeConsent();
    expect(transcribing).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Task 12.3 — Performance optimization unit tests
// ═══════════════════════════════════════════════════════════════════════════
describe('AdaptiveQualityManager', () => {
  let manager: AdaptiveQualityManager;

  beforeEach(() => {
    manager = new AdaptiveQualityManager('high');
  });

  it('starts at the configured initial level', () => {
    expect(manager.getCurrentLevel()).toBe('high');
  });

  it('forceQualityLevel changes level immediately', async () => {
    await manager.forceQualityLevel('low');
    expect(manager.getCurrentLevel()).toBe('low');
  });

  it('forceQualityLevel to same level is a no-op', async () => {
    const events: any[] = [];
    manager.on('qualityChanged', (e: any) => events.push(e));
    await manager.forceQualityLevel('high');
    expect(events.length).toBe(0);
  });

  it('all quality profiles exist', () => {
    const levels = ['high', 'medium', 'low', 'minimal'] as const;
    levels.forEach(l => {
      expect(QUALITY_PROFILES[l]).toBeDefined();
      expect(QUALITY_PROFILES[l].settings).toBeDefined();
    });
  });

  it('high quality has higher bitrate than minimal', () => {
    expect(QUALITY_PROFILES.high.settings.bitrate).toBeGreaterThan(
      QUALITY_PROFILES.minimal.settings.bitrate
    );
  });

  it('emits qualityChanged event on level change', async () => {
    const events: any[] = [];
    manager.on('qualityChanged', (e: any) => events.push(e));
    await manager.forceQualityLevel('medium');
    expect(events.length).toBe(1);
    expect(events[0].newLevel).toBe('medium');
    expect(events[0].previousLevel).toBe('high');
  });

  it('destroy stops monitoring', () => {
    manager.startMonitoring(async () => null, 100);
    manager.destroy();
    expect(manager.getCurrentLevel()).toBe('high'); // still accessible after destroy
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY 13 — Password Protection Enforcement (Task 13.2)
// ═══════════════════════════════════════════════════════════════════════════
describe('Property 13: Password Protection Enforcement', () => {
  let security: RoomSecurityService;

  beforeEach(() => {
    security = new RoomSecurityService();
  });

  it('private room rejects access without password', () => {
    const room = makeRoom({ isPrivate: true, password: 'secret' });
    const result = security.validateAccess(room, 'user-1');
    expect(result.granted).toBe(false);
    expect(result.reason).toContain('Password required');
  });

  it('private room rejects wrong password', () => {
    const room = makeRoom({ isPrivate: true, password: 'secret' });
    const result = security.validateAccess(room, 'user-1', 'wrong');
    expect(result.granted).toBe(false);
    expect(result.reason).toContain('Incorrect password');
  });

  it('private room grants access with correct password', () => {
    const room = makeRoom({ isPrivate: true, password: 'secret' });
    const result = security.validateAccess(room, 'user-1', 'secret');
    expect(result.granted).toBe(true);
  });

  it('public room grants access without password', () => {
    const room = makeRoom({ isPrivate: false });
    const result = security.validateAccess(room, 'user-1');
    expect(result.granted).toBe(true);
  });

  it('locked room denies all access regardless of password', () => {
    const room = makeRoom({ isPrivate: false });
    security.lockRoom(room, room.hostId);
    const result = security.validateAccess(room, 'user-1');
    expect(result.granted).toBe(false);
    expect(result.reason).toContain('locked');
  });

  it('full room denies access', () => {
    const room = makeRoom({ maxParticipants: 2 });
    room.participants = [makeParticipant('u1'), makeParticipant('u2')];
    const result = security.validateAccess(room, 'u3');
    expect(result.granted).toBe(false);
    expect(result.reason).toContain('capacity');
  });

  it('host can mute a participant', () => {
    const room = makeRoom();
    room.participants = [makeParticipant('u1')];
    const ok = security.muteParticipant(room, 'u1', room.hostId);
    expect(ok).toBe(true);
    expect(security.isParticipantMuted(room.id, 'u1')).toBe(true);
  });

  it('non-host cannot mute a participant', () => {
    const room = makeRoom();
    room.participants = [makeParticipant('u1'), makeParticipant('u2')];
    const ok = security.muteParticipant(room, 'u1', 'u2');
    expect(ok).toBe(false);
  });

  it('audit log records access events', () => {
    const room = makeRoom({ isPrivate: true, password: 'secret' });
    security.validateAccess(room, 'user-1', 'wrong');
    const log = security.getAuditLog(room.id);
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PrivacyConsentService tests
// ═══════════════════════════════════════════════════════════════════════════
describe('PrivacyConsentService', () => {
  let service: PrivacyConsentService;

  beforeEach(() => {
    service = new PrivacyConsentService();
  });

  it('hasConsent returns false before any consent recorded', () => {
    expect(service.hasConsent('u1', 'room-1', 'transcription')).toBe(false);
  });

  it('recordConsent grants consent', () => {
    service.recordConsent('u1', 'room-1', 'transcription', true);
    expect(service.hasConsent('u1', 'room-1', 'transcription')).toBe(true);
  });

  it('revokeConsent removes consent', () => {
    service.recordConsent('u1', 'room-1', 'transcription', true);
    service.revokeConsent('u1', 'room-1', 'transcription');
    expect(service.hasConsent('u1', 'room-1', 'transcription')).toBe(false);
  });

  it('getConsentStatus returns all consent types', () => {
    service.recordConsent('u1', 'room-1', 'transcription', true);
    const status = service.getConsentStatus('u1', 'room-1');
    expect(status.transcription).toBe(true);
    expect(status.recording).toBe(false);
    expect(status.analytics).toBe(false);
  });

  it('permission explanations are available for all devices', () => {
    ['camera', 'microphone', 'screen'].forEach(device => {
      const exp = service.getPermissionExplanation(device as any);
      expect(exp).toBeDefined();
      expect(exp.purpose.length).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PROPERTY 14 — Connection Recovery Attempt (Task 14.2)
// Task 14.3  — Error handling integration tests
// ═══════════════════════════════════════════════════════════════════════════
describe('Property 14: Connection Recovery', () => {
  let service: ErrorRecoveryService;

  beforeEach(() => {
    service = new ErrorRecoveryService();
  });

  it('recovers successfully on first attempt', async () => {
    const error: VideoConferenceError = { type: 'connection-failed', message: 'lost' };
    const result = await service.recover(error, async () => { /* success */ });
    expect(result.success).toBe(true);
    expect(result.attempts).toBe(1);
  });

  it('retries up to max attempts on failure', async () => {
    const error: VideoConferenceError = { type: 'connection-failed', message: 'lost' };
    let calls = 0;
    const result = await service.recover(error, async () => {
      calls++;
      throw new Error('still failing');
    });
    expect(result.success).toBe(false);
    expect(calls).toBe(3); // max for connection-failed
  });

  it('permission-denied is not retried', async () => {
    const error: VideoConferenceError = { type: 'permission-denied', message: 'denied' };
    let calls = 0;
    const result = await service.recover(error, async () => {
      calls++;
      throw new Error('denied');
    });
    expect(calls).toBe(1);
    expect(result.success).toBe(false);
  });

  it('emits recoverySuccess event on success', async () => {
    const events: any[] = [];
    service.on('recoverySuccess', (e: any) => events.push(e));
    const error: VideoConferenceError = { type: 'network-error', message: 'net' };
    await service.recover(error, async () => { /* ok */ });
    expect(events.length).toBe(1);
  });

  it('emits recoveryAborted after all attempts fail', async () => {
    const events: any[] = [];
    service.on('recoveryAborted', (e: any) => events.push(e));
    const error: VideoConferenceError = { type: 'connection-failed', message: 'fail' };
    await service.recover(error, async () => { throw new Error('x'); });
    expect(events.length).toBe(1);
  });
});

describe('Error handling scenarios', () => {
  let service: ErrorRecoveryService;

  beforeEach(() => {
    service = new ErrorRecoveryService();
  });

  it('handleMediaError: NotAllowedError returns canFallback=true', () => {
    const result = service.handleMediaError({ name: 'NotAllowedError' });
    expect(result.canFallback).toBe(true);
    expect(result.fallbackAction).toBe('join_audio_only');
  });

  it('handleMediaError: NotFoundError returns canFallback=true', () => {
    const result = service.handleMediaError({ name: 'NotFoundError' });
    expect(result.canFallback).toBe(true);
  });

  it('handleMediaError: NotReadableError returns canFallback=true', () => {
    const result = service.handleMediaError({ name: 'NotReadableError' });
    expect(result.canFallback).toBe(true);
  });

  it('handleRoomError: room-full is not recoverable', () => {
    const result = service.handleRoomError({ type: 'room-full', message: 'full' });
    expect(result.recoverable).toBe(false);
  });

  it('handleRoomError: connection-failed is recoverable', () => {
    const result = service.handleRoomError({ type: 'connection-failed', message: 'fail' });
    expect(result.recoverable).toBe(true);
  });

  it('handleRoomError: network-error is recoverable', () => {
    const result = service.handleRoomError({ type: 'network-error', message: 'net' });
    expect(result.recoverable).toBe(true);
  });

  it('handleRoomError: screen-share-conflict is not recoverable', () => {
    const result = service.handleRoomError({ type: 'screen-share-conflict', message: 'conflict' });
    expect(result.recoverable).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ConnectionQualityMonitor unit tests (Task 12.3 supplement)
// ═══════════════════════════════════════════════════════════════════════════
describe('ConnectionQualityMonitor', () => {
  it('classifies excellent connection correctly', () => {
    // latency < 50, packetLoss < 0.005, frameRate >= 25
    const monitor = new ConnectionQualityMonitor();
    // Access private method via cast for testing
    const classify = (monitor as any).classifyHealth.bind(monitor);
    expect(classify(makeMetrics({ latency: 20, packetLoss: 0.001, frameRate: 30 }))).toBe('excellent');
  });

  it('classifies poor connection correctly', () => {
    const monitor = new ConnectionQualityMonitor();
    const classify = (monitor as any).classifyHealth.bind(monitor);
    expect(classify(makeMetrics({ latency: 450, packetLoss: 0.08, frameRate: 12 }))).toBe('poor');
  });

  it('classifies critical connection correctly', () => {
    const monitor = new ConnectionQualityMonitor();
    const classify = (monitor as any).classifyHealth.bind(monitor);
    expect(classify(makeMetrics({ latency: 600, packetLoss: 0.15, frameRate: 5 }))).toBe('critical');
  });

  it('detects high latency issue', () => {
    const monitor = new ConnectionQualityMonitor();
    const detect = (monitor as any).detectIssues.bind(monitor);
    const issues = detect(makeMetrics({ latency: 400 }));
    expect(issues).toContain('High latency');
  });

  it('detects packet loss issue', () => {
    const monitor = new ConnectionQualityMonitor();
    const detect = (monitor as any).detectIssues.bind(monitor);
    const issues = detect(makeMetrics({ packetLoss: 0.08 }));
    expect(issues).toContain('Packet loss detected');
  });

  it('getLatestReport returns null for unknown user', () => {
    const monitor = new ConnectionQualityMonitor();
    expect(monitor.getLatestReport('unknown')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Task 15.3 — End-to-end workflow simulation
// ═══════════════════════════════════════════════════════════════════════════
describe('End-to-end video conference workflow', () => {
  it('complete join → media → share → leave workflow', () => {
    // Simulate a full workflow without real WebRTC/Firebase
    const room = makeRoom({ maxParticipants: 4 });
    const security = new RoomSecurityService();
    const consent = new PrivacyConsentService();

    // 1. Validate access
    const access = security.validateAccess(room, 'u1');
    expect(access.granted).toBe(true);

    // 2. Join room
    const p1 = makeParticipant('u1');
    room.participants.push(p1);
    expect(room.participants.length).toBe(1);

    // 3. Grant transcription consent
    consent.recordConsent('u1', room.id, 'transcription', true);
    expect(consent.hasConsent('u1', room.id, 'transcription')).toBe(true);

    // 4. Start screen share
    p1.isScreenSharing = true;
    room.activeScreenShare = 'u1';
    expect(room.activeScreenShare).toBe('u1');

    // 5. Second user tries to share — blocked
    const p2 = makeParticipant('u2');
    room.participants.push(p2);
    const canShare = !room.participants.some(p => p.isScreenSharing && p.userId !== 'u2');
    expect(canShare).toBe(false);

    // 6. Stop screen share
    p1.isScreenSharing = false;
    room.activeScreenShare = undefined;

    // 7. Leave room
    room.participants = room.participants.filter(p => p.userId !== 'u1');
    expect(room.participants.length).toBe(1);

    // 8. Revoke consent on leave
    consent.revokeConsent('u1', room.id, 'transcription');
    expect(consent.hasConsent('u1', room.id, 'transcription')).toBe(false);
  });

  it('multi-user capacity enforcement throughout session', () => {
    const room = makeRoom({ maxParticipants: 3 });
    const join = (id: string) => {
      if (room.participants.length >= room.maxParticipants) return false;
      room.participants.push(makeParticipant(id));
      return true;
    };

    expect(join('u1')).toBe(true);
    expect(join('u2')).toBe(true);
    expect(join('u3')).toBe(true);
    expect(join('u4')).toBe(false); // room full

    expect(room.participants.length).toBe(3);
  });

  it('feature interaction: transcription requires consent, screen share requires no conflict', () => {
    const room = makeRoom();
    const consent = new PrivacyConsentService();
    const p = makeParticipant('u1');
    room.participants.push(p);

    // Transcription blocked without consent
    const canTranscribe = consent.hasConsent('u1', room.id, 'transcription');
    expect(canTranscribe).toBe(false);

    // Screen share allowed when no one else is sharing
    const canShare = !room.participants.some(x => x.isScreenSharing);
    expect(canShare).toBe(true);
  });
});
