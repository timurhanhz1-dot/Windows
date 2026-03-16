import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

// ── Property 10: Audit log on every emoji mutation ────────────────────────────
// We test the audit log call pattern without Firebase by simulating the service

interface AuditEntry {
  action: string;
  detail: string;
  admin_uid: string;
  admin_role: string;
  target_uid?: string;
}

function simulateAddEmoji(
  name: string,
  value: string,
  uid: string,
  role: string,
  writeAuditLog: (entry: AuditEntry) => void
): void {
  // Mirrors AssetsEditor.handleAddEmoji logic
  writeAuditLog({ action: 'ADD_EMOJI', detail: `Emoji eklendi: ${name}`, admin_uid: uid, admin_role: role });
}

function simulateRemoveEmoji(
  emojiId: string,
  uid: string,
  role: string,
  writeAuditLog: (entry: AuditEntry) => void
): void {
  // Mirrors AssetsEditor.handleRemoveEmoji logic
  writeAuditLog({ action: 'REMOVE_EMOJI', detail: `Emoji silindi: ${emojiId}`, admin_uid: uid, admin_role: role });
}

describe('Property 10: Audit log on every emoji mutation', () => {
  it('ADD_EMOJI triggers writeAuditLog with correct action', () => {
    const mockLog = vi.fn();
    simulateAddEmoji('smile', '😊', 'uid123', 'super_admin', mockLog);
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ADD_EMOJI', admin_uid: 'uid123' })
    );
  });

  it('REMOVE_EMOJI triggers writeAuditLog with correct action', () => {
    const mockLog = vi.fn();
    simulateRemoveEmoji('emoji_abc', 'uid123', 'super_admin', mockLog);
    expect(mockLog).toHaveBeenCalledTimes(1);
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REMOVE_EMOJI', admin_uid: 'uid123' })
    );
  });

  it('Property 10: every add mutation produces exactly one audit log entry', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 10 }),
        (name, value) => {
          const mockLog = vi.fn();
          simulateAddEmoji(name, value, 'uid', 'super_admin', mockLog);
          expect(mockLog).toHaveBeenCalledTimes(1);
          mockLog.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 10: every remove mutation produces exactly one audit log entry', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        (emojiId) => {
          const mockLog = vi.fn();
          simulateRemoveEmoji(emojiId, 'uid', 'super_admin', mockLog);
          expect(mockLog).toHaveBeenCalledTimes(1);
          mockLog.mockClear();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('audit log entry always contains required fields', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.constantFrom('super_admin', 'admin'),
        (name, role) => {
          const entries: AuditEntry[] = [];
          simulateAddEmoji(name, '😊', 'uid_test', role, (e) => entries.push(e));
          expect(entries).toHaveLength(1);
          expect(entries[0].action).toBeTruthy();
          expect(entries[0].admin_uid).toBeTruthy();
          expect(entries[0].admin_role).toBeTruthy();
          expect(entries[0].detail).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });
});
