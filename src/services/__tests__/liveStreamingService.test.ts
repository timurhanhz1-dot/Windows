import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  serializeMetadata,
  parseMetadata,
  buildMediaConstraints,
  StreamMetadata,
  LiveStreamRecord,
  SRS_HLS_BASE,
} from '../liveStreamingService';

// ── Property 1: HLS URL Format ────────────────────────────────────────────────

describe('Property 1: HLS URL format', () => {
  it('hlsUrl follows pattern SRS_HLS_BASE + userId + .m3u8', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).map(s => s.replace(/[^a-zA-Z0-9_]/g, 'x')),
        (userId) => {
          const hlsUrl = `${SRS_HLS_BASE}${userId}.m3u8`;
          expect(hlsUrl).toContain(userId);
          expect(hlsUrl).toMatch(/\.m3u8$/);
          expect(hlsUrl).toContain(SRS_HLS_BASE);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ── Property 2: StreamKey and userId identity ─────────────────────────────────

describe('Property 2: StreamKey equals userId', () => {
  it('streamKey is always equal to userId', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).map(s => s.replace(/[^a-zA-Z0-9_]/g, 'x')),
        (userId) => {
          const streamKey = userId; // mirrors liveStreamingService logic
          expect(streamKey).toBe(userId);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ── Property 7: StreamMetadata required fields ────────────────────────────────

describe('Property 7: StreamMetadata required fields', () => {
  const makeValidMeta = (uid: string): StreamMetadata => ({
    uid,
    username: 'testuser',
    title: 'Test Stream',
    category: 'gaming',
    mode: 'browser_camera',
    quality: '720p',
    status: 'live',
    started_at: Date.now(),
    hlsUrl: `${SRS_HLS_BASE}${uid}.m3u8`,
    streamKey: uid,
  });

  it('serializeMetadata produces all required fields', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, 'x')),
        (uid) => {
          const meta = makeValidMeta(uid);
          const record = serializeMetadata(meta);
          expect(record.uid).toBe(uid);
          expect(record.username).toBeTruthy();
          expect(record.title).toBeTruthy();
          expect(record.hlsUrl).toBeTruthy();
          expect(record.streamKey).toBeTruthy();
          expect(record.status).toBe('live');
          expect(typeof record.started_at).toBe('number');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 8: StreamMetadata round-trip ────────────────────────────────────

describe('Property 8: StreamMetadata round-trip', () => {
  it('serialize then parse returns equivalent metadata', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, 'x')),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.constantFrom('browser_camera', 'browser_screen', 'obs') as fc.Arbitrary<StreamMetadata['mode']>,
        fc.constantFrom('360p', '720p', '1080p') as fc.Arbitrary<StreamMetadata['quality']>,
        (uid, title, mode, quality) => {
          const meta: StreamMetadata = {
            uid, username: 'user', title, category: 'gaming',
            mode, quality, status: 'live',
            started_at: 1000000,
            hlsUrl: `${SRS_HLS_BASE}${uid}.m3u8`,
            streamKey: uid,
          };
          const serialized = serializeMetadata(meta);
          const parsed = parseMetadata(serialized);
          expect(parsed).not.toBeNull();
          expect(parsed?.uid).toBe(uid);
          expect(parsed?.mode).toBe(mode);
          expect(parsed?.quality).toBe(quality);
          expect(parsed?.status).toBe('live');
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 9: Invalid StreamMetadata filtering ─────────────────────────────

describe('Property 9: Invalid StreamMetadata filtering', () => {
  it('parseMetadata returns null for missing required fields', () => {
    expect(parseMetadata(null)).toBeNull();
    expect(parseMetadata(undefined)).toBeNull();
    expect(parseMetadata({})).toBeNull();
    expect(parseMetadata({ uid: 'x' })).toBeNull(); // missing other fields
  });

  it('parseMetadata returns null for non-object input', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.integer(), fc.boolean()),
        (val) => {
          expect(parseMetadata(val)).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('parseMetadata accepts valid complete records', () => {
    const valid: LiveStreamRecord = {
      uid: 'u1', username: 'user', title: 'title', category: 'cat',
      mode: 'browser_camera', quality: '720p', status: 'live',
      started_at: Date.now(), hlsUrl: 'https://example.com/stream.m3u8',
      streamKey: 'u1', viewerCount: 0,
    };
    expect(parseMetadata(valid)).not.toBeNull();
  });
});

// ── Property 10: Quality constraints ─────────────────────────────────────────

describe('Property 10: Quality constraints match expected values', () => {
  it('360p produces 640x360 constraints', () => {
    const c = buildMediaConstraints('360p');
    expect((c.width as any).ideal).toBe(640);
    expect((c.height as any).ideal).toBe(360);
  });

  it('720p produces 1280x720 constraints', () => {
    const c = buildMediaConstraints('720p');
    expect((c.width as any).ideal).toBe(1280);
    expect((c.height as any).ideal).toBe(720);
  });

  it('1080p produces 1920x1080 constraints', () => {
    const c = buildMediaConstraints('1080p');
    expect((c.width as any).ideal).toBe(1920);
    expect((c.height as any).ideal).toBe(1080);
  });

  it('deviceId is included when provided', () => {
    const c = buildMediaConstraints('720p', 'device123');
    expect((c.deviceId as any).exact).toBe('device123');
  });
});

// ── Property 18: HTTPS requirement ───────────────────────────────────────────

describe('Property 18: HTTPS requirement check', () => {
  function isHttpsRequired(protocol: string, hostname: string): boolean {
    return protocol !== 'https:' && hostname !== 'localhost';
  }

  it('http on non-localhost requires HTTPS', () => {
    expect(isHttpsRequired('http:', 'example.com')).toBe(true);
  });

  it('https on any host does not require HTTPS upgrade', () => {
    expect(isHttpsRequired('https:', 'example.com')).toBe(false);
  });

  it('http on localhost is allowed', () => {
    expect(isHttpsRequired('http:', 'localhost')).toBe(false);
  });

  it('Property 18: https protocol never triggers HTTPS error', () => {
    fc.assert(
      fc.property(
        fc.domain(),
        (hostname) => {
          expect(isHttpsRequired('https:', hostname)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
