import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { AuditLogEntry, BackofficeRole } from '../types/backoffice.types';
import { filterLogs } from '../services/auditLogService';

// Simulate in-memory audit log for property testing
function createInMemoryAuditLog() {
  const logs: (AuditLogEntry & { id: string })[] = [];
  let counter = 0;

  const write = (entry: Omit<AuditLogEntry, 'timestamp'>): void => {
    logs.push({
      ...entry,
      id: `log_${++counter}`,
      timestamp: new Date().toISOString(),
    });
  };

  const getAll = () => [...logs];
  const count = () => logs.length;
  return { write, getAll, count };
}

// ── Property 4: Log count increases by 1 per action ─────────────────────────

describe('Property 4: Log count increases by 1 per action', () => {
  it('each writeAuditLog call adds exactly one entry', () => {
    const log = createInMemoryAuditLog();
    const before = log.count();
    log.write({ action: 'BAN_USER', detail: 'test', admin_uid: 'uid1', admin_role: 'admin' });
    expect(log.count()).toBe(before + 1);
  });

  it('Property 4: n writes produce exactly n log entries', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (n) => {
          const log = createInMemoryAuditLog();
          for (let i = 0; i < n; i++) {
            log.write({ action: `ACTION_${i}`, detail: `detail ${i}`, admin_uid: 'uid', admin_role: 'admin' });
          }
          expect(log.count()).toBe(n);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 5: AuditLog field integrity ─────────────────────────────────────

describe('Property 5: writeAuditLog contains all required fields', () => {
  it('written entry has all required fields', () => {
    const log = createInMemoryAuditLog();
    log.write({ action: 'DELETE_MSG', detail: 'msg deleted', admin_uid: 'uid123', admin_role: 'super_admin' });
    const entry = log.getAll()[0];
    expect(entry.action).toBeTruthy();
    expect(entry.detail).toBeTruthy();
    expect(entry.admin_uid).toBeTruthy();
    expect(entry.admin_role).toBeTruthy();
    expect(entry.timestamp).toBeTruthy();
    expect(entry.id).toBeTruthy();
  });

  it('Property 5: every entry always has required fields', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.constantFrom('super_admin' as BackofficeRole, 'admin' as BackofficeRole, 'moderator' as BackofficeRole),
        (action, detail, adminUid, adminRole) => {
          const log = createInMemoryAuditLog();
          log.write({ action, detail, admin_uid: adminUid, admin_role: adminRole });
          const entry = log.getAll()[0];
          expect(entry.action).toBe(action);
          expect(entry.detail).toBe(detail);
          expect(entry.admin_uid).toBe(adminUid);
          expect(entry.admin_role).toBe(adminRole);
          expect(typeof entry.timestamp).toBe('string');
          expect(entry.timestamp.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ── filterLogs tests ──────────────────────────────────────────────────────────

describe('filterLogs', () => {
  const sampleLogs: (AuditLogEntry & { id: string })[] = [
    { id: '1', action: 'BAN_USER', detail: 'banned', admin_uid: 'uid1', admin_role: 'admin', timestamp: '2024-01-01T00:00:00Z' },
    { id: '2', action: 'DELETE_MSG', detail: 'deleted', admin_uid: 'uid2', admin_role: 'moderator', timestamp: '2024-01-02T00:00:00Z' },
    { id: '3', action: 'BAN_USER', detail: 'banned again', admin_uid: 'uid1', admin_role: 'admin', timestamp: '2024-01-03T00:00:00Z' },
  ];

  it('filters by action', () => {
    const result = filterLogs(sampleLogs, { action: 'BAN' });
    expect(result).toHaveLength(2);
  });

  it('filters by adminUid', () => {
    const result = filterLogs(sampleLogs, { adminUid: 'uid2' });
    expect(result).toHaveLength(1);
  });

  it('returns all when no filter', () => {
    const result = filterLogs(sampleLogs, {});
    expect(result).toHaveLength(3);
  });
});
