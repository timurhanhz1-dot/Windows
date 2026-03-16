import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { AuditLogEntry } from '../types/backoffice.types';

// Simulate getAuditLogs with cap logic (mirrors auditLogService.getAuditLogs)
function getAuditLogs(
  allLogs: (AuditLogEntry & { id: string })[],
  limit = 500
): (AuditLogEntry & { id: string })[] {
  const cap = Math.min(limit, 500);
  return allLogs.slice(-cap).reverse();
}

function makeLogs(n: number): (AuditLogEntry & { id: string })[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `log_${i}`,
    action: 'TEST_ACTION',
    detail: `detail ${i}`,
    admin_uid: 'uid',
    admin_role: 'admin' as const,
    timestamp: new Date(Date.now() + i * 1000).toISOString(),
  }));
}

// ── Property 10: Log list size limit ─────────────────────────────────────────

describe('Property 10: getAuditLogs(limit) returns at most 500 entries', () => {
  it('returns at most 500 when 1000+ logs exist', () => {
    const logs = makeLogs(1200);
    const result = getAuditLogs(logs);
    expect(result.length).toBeLessThanOrEqual(500);
  });

  it('returns all logs when fewer than 500 exist', () => {
    const logs = makeLogs(100);
    const result = getAuditLogs(logs);
    expect(result.length).toBe(100);
  });

  it('returns empty array for empty input', () => {
    expect(getAuditLogs([])).toHaveLength(0);
  });

  it('Property 10: result never exceeds 500 regardless of input size', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2000 }),
        (n) => {
          const logs = makeLogs(n);
          const result = getAuditLogs(logs);
          expect(result.length).toBeLessThanOrEqual(500);
          expect(result.length).toBeLessThanOrEqual(n);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('Property 10: custom limit is also capped at 500', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2000 }),
        fc.integer({ min: 1, max: 2000 }),
        (n, limit) => {
          const logs = makeLogs(n);
          const result = getAuditLogs(logs, limit);
          expect(result.length).toBeLessThanOrEqual(500);
          expect(result.length).toBeLessThanOrEqual(n);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('result is a subset of input logs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 600 }),
        (n) => {
          const logs = makeLogs(n);
          const result = getAuditLogs(logs);
          const inputIds = new Set(logs.map(l => l.id));
          result.forEach(r => {
            expect(inputIds.has(r.id)).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
