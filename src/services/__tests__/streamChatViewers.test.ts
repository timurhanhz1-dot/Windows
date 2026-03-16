import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ── Property 11: Chat message length limit ────────────────────────────────────

const MAX_CHAT_LENGTH = 500;
const MAX_CHAT_MESSAGES = 200;

function validateChatMessage(text: string, isBanned: boolean): { valid: boolean; reason?: string } {
  if (isBanned) return { valid: false, reason: 'banned' };
  if (text.length === 0) return { valid: false, reason: 'empty' };
  if (text.length > MAX_CHAT_LENGTH) return { valid: false, reason: 'too_long' };
  return { valid: true };
}

function limitMessages<T>(messages: T[], max = MAX_CHAT_MESSAGES): T[] {
  return messages.slice(-max);
}

describe('Property 11: Chat message length limit (500 chars)', () => {
  it('accepts messages up to 500 chars', () => {
    expect(validateChatMessage('a'.repeat(500), false).valid).toBe(true);
    expect(validateChatMessage('hello', false).valid).toBe(true);
  });

  it('rejects messages over 500 chars', () => {
    expect(validateChatMessage('a'.repeat(501), false).valid).toBe(false);
    expect(validateChatMessage('a'.repeat(1000), false).valid).toBe(false);
  });

  it('rejects empty messages', () => {
    expect(validateChatMessage('', false).valid).toBe(false);
  });

  it('Property 11: messages <= 500 chars are always valid (non-banned)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }),
        (text) => {
          expect(validateChatMessage(text, false).valid).toBe(true);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('Property 11: messages > 500 chars are always invalid', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 501, maxLength: 1000 }),
        (text) => {
          expect(validateChatMessage(text, false).valid).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ── Property 12: Chat message list limit ─────────────────────────────────────

describe('Property 12: Chat message list limit (200 messages)', () => {
  it('keeps at most 200 messages', () => {
    const msgs = Array.from({ length: 300 }, (_, i) => `msg_${i}`);
    const limited = limitMessages(msgs);
    expect(limited.length).toBeLessThanOrEqual(200);
  });

  it('keeps the most recent messages', () => {
    const msgs = Array.from({ length: 250 }, (_, i) => `msg_${i}`);
    const limited = limitMessages(msgs);
    expect(limited[limited.length - 1]).toBe('msg_249');
  });

  it('Property 12: result never exceeds 200 messages', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 500 }),
        (n) => {
          const msgs = Array.from({ length: n }, (_, i) => i);
          const limited = limitMessages(msgs);
          expect(limited.length).toBeLessThanOrEqual(200);
          expect(limited.length).toBeLessThanOrEqual(n);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ── Property 13: Banned user message blocking ─────────────────────────────────

describe('Property 13: Banned user message blocking', () => {
  it('banned users cannot send messages', () => {
    expect(validateChatMessage('hello', true).valid).toBe(false);
    expect(validateChatMessage('hello', true).reason).toBe('banned');
  });

  it('Property 13: banned users are always blocked regardless of message content', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }),
        (text) => {
          expect(validateChatMessage(text, true).valid).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ── Property 14: Viewer count accuracy ───────────────────────────────────────

describe('Property 14: Viewer count accuracy', () => {
  function countViewers(viewers: Record<string, boolean>, broadcasterId: string): number {
    return Object.keys(viewers).filter(uid => uid !== broadcasterId).length;
  }

  it('viewer count excludes broadcaster', () => {
    const viewers = { 'broadcaster': true, 'viewer1': true, 'viewer2': true };
    expect(countViewers(viewers, 'broadcaster')).toBe(2);
  });

  it('Property 14: viewer count is always non-negative', () => {
    fc.assert(
      fc.property(
        fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), fc.constant(true)),
        fc.string({ minLength: 1, maxLength: 10 }),
        (viewers, broadcasterId) => {
          const count = countViewers(viewers, broadcasterId);
          expect(count).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ── Property 15: Broadcaster not in viewer list ───────────────────────────────

describe('Property 15: Broadcaster not counted as viewer', () => {
  function getViewerList(viewers: Record<string, boolean>, broadcasterId: string): string[] {
    return Object.keys(viewers).filter(uid => uid !== broadcasterId);
  }

  it('Property 15: broadcaster is never in viewer list', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, 'x') || 'broadcaster'),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, 'x') || 'viewer'), { minLength: 0, maxLength: 10 }),
        (broadcasterId, viewerIds) => {
          const viewers: Record<string, boolean> = { [broadcasterId]: true };
          viewerIds.forEach(id => { viewers[id] = true; });
          const list = getViewerList(viewers, broadcasterId);
          expect(list).not.toContain(broadcasterId);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ── Property 16: Hot-swap stops old track ────────────────────────────────────

describe('Property 16: Hot-swap stops old track', () => {
  interface MockTrack {
    id: string;
    kind: 'video' | 'audio';
    stopped: boolean;
    stop(): void;
  }

  function createTrack(id: string, kind: 'video' | 'audio'): MockTrack {
    return { id, kind, stopped: false, stop() { this.stopped = true; } };
  }

  function hotSwap(
    tracks: MockTrack[],
    type: 'video' | 'audio',
    newTrack: MockTrack
  ): MockTrack[] {
    const oldTracks = tracks.filter(t => t.kind === type);
    oldTracks.forEach(t => t.stop());
    const remaining = tracks.filter(t => t.kind !== type);
    return [...remaining, newTrack];
  }

  it('old track is stopped after hot-swap', () => {
    const oldVideo = createTrack('old_video', 'video');
    const newVideo = createTrack('new_video', 'video');
    const tracks = [oldVideo];
    hotSwap(tracks, 'video', newVideo);
    expect(oldVideo.stopped).toBe(true);
  });

  it('new track is in stream after hot-swap', () => {
    const oldVideo = createTrack('old_video', 'video');
    const newVideo = createTrack('new_video', 'video');
    const result = hotSwap([oldVideo], 'video', newVideo);
    expect(result.some(t => t.id === 'new_video')).toBe(true);
    expect(result.some(t => t.id === 'old_video')).toBe(false);
  });

  it('Property 16: old track is always stopped after hot-swap', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.constantFrom('video' as const, 'audio' as const),
        (oldId, newId) => {
          const oldTrack = createTrack(oldId, 'video');
          const newTrack = createTrack(newId, 'video');
          hotSwap([oldTrack], 'video', newTrack);
          expect(oldTrack.stopped).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
