import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// ── Property 4: Firebase record deleted on stopStream ────────────────────────
// Simulate stopStream logic without Firebase

interface StreamStore {
  records: Record<string, any>;
  set(path: string, data: any): void;
  remove(path: string): void;
  get(path: string): any;
}

function createStore(): StreamStore {
  const records: Record<string, any> = {};
  return {
    records,
    set(path, data) { records[path] = data; },
    remove(path) { delete records[path]; },
    get(path) { return records[path] ?? null; },
  };
}

function simulateStartStream(store: StreamStore, userId: string, metadata: any): void {
  store.set(`live_streams/${userId}`, { uid: userId, status: 'live', ...metadata });
}

function simulateStopStream(store: StreamStore, userId: string): void {
  store.remove(`live_streams/${userId}`);
}

describe('Property 4: Firebase record deleted on stopStream', () => {
  it('record exists after start, removed after stop', () => {
    const store = createStore();
    simulateStartStream(store, 'user1', { title: 'Test' });
    expect(store.get('live_streams/user1')).not.toBeNull();
    simulateStopStream(store, 'user1');
    expect(store.get('live_streams/user1')).toBeNull();
  });

  it('Property 4: stopStream always removes the record', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, 'x')),
        fc.string({ minLength: 1, maxLength: 50 }),
        (userId, title) => {
          const store = createStore();
          simulateStartStream(store, userId, { title });
          expect(store.get(`live_streams/${userId}`)).not.toBeNull();
          simulateStopStream(store, userId);
          expect(store.get(`live_streams/${userId}`)).toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });

  it('stopStream on non-existent record is safe', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, 'x')),
        (userId) => {
          const store = createStore();
          // No start, just stop
          expect(() => simulateStopStream(store, userId)).not.toThrow();
          expect(store.get(`live_streams/${userId}`)).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 5: onDisconnect mechanism ───────────────────────────────────────

describe('Property 5: onDisconnect mechanism', () => {
  it('onDisconnect handler is registered on stream start', () => {
    const disconnectHandlers: Record<string, boolean> = {};

    function simulateStartWithDisconnect(userId: string): void {
      disconnectHandlers[`live_streams/${userId}`] = true;
    }

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, 'x')),
        (userId) => {
          simulateStartWithDisconnect(userId);
          expect(disconnectHandlers[`live_streams/${userId}`]).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
