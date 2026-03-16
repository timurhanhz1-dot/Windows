import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getRolePermissions,
  isValidBackofficeRole,
  BackofficeRole,
  BackofficeError,
} from '../types/backoffice.types';
import { assignBackofficeRole } from '../services/backofficeService';

// ── Property 1: Invalid role → access denied ─────────────────────────────────

describe('Property 1: Invalid/missing role → isAuthorized: false', () => {
  it('valid roles are recognized', () => {
    expect(isValidBackofficeRole('super_admin')).toBe(true);
    expect(isValidBackofficeRole('admin')).toBe(true);
    expect(isValidBackofficeRole('moderator')).toBe(true);
  });

  it('invalid roles are rejected', () => {
    expect(isValidBackofficeRole('')).toBe(false);
    expect(isValidBackofficeRole(null)).toBe(false);
    expect(isValidBackofficeRole(undefined)).toBe(false);
    expect(isValidBackofficeRole('owner')).toBe(false);
    expect(isValidBackofficeRole(42)).toBe(false);
  });

  it('Property 1: any non-valid role string returns false', () => {
    fc.assert(
      fc.property(
        fc.string().filter(s => !['super_admin', 'admin', 'moderator'].includes(s)),
        (role) => {
          expect(isValidBackofficeRole(role)).toBe(false);
        }
      ),
      { numRuns: 200 }
    );
  });
});

// ── Property 2: Role permission matrix correctness ───────────────────────────

describe('Property 2: Role permission matrix correctness', () => {
  it('super_admin has all permissions', () => {
    const perms = getRolePermissions('super_admin');
    Object.values(perms).forEach(v => expect(v).toBe(true));
  });

  it('moderator has only canDeleteMessages and canViewSupport', () => {
    const perms = getRolePermissions('moderator');
    expect(perms.canDeleteMessages).toBe(true);
    expect(perms.canViewSupport).toBe(true);
    expect(perms.canManageUsers).toBe(false);
    expect(perms.canAssignSuperAdmin).toBe(false);
    expect(perms.canManageDesign).toBe(false);
  });

  it('admin has management permissions but not super_admin-only ones', () => {
    const perms = getRolePermissions('admin');
    expect(perms.canManageUsers).toBe(true);
    expect(perms.canDeleteMessages).toBe(true);
    expect(perms.canAssignSuperAdmin).toBe(false);
    expect(perms.canManageDesign).toBe(false);
    expect(perms.canManageSiteSettings).toBe(false);
  });

  it('Property 2: super_admin always has more or equal permissions than admin', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('super_admin' as BackofficeRole, 'admin' as BackofficeRole, 'moderator' as BackofficeRole),
        (role) => {
          const perms = getRolePermissions(role);
          const superPerms = getRolePermissions('super_admin');
          // super_admin must have at least all permissions that role has
          Object.keys(perms).forEach(key => {
            if ((perms as any)[key] === true) {
              expect((superPerms as any)[key]).toBe(true);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 3: Admin cannot assign super_admin ───────────────────────────────

describe('Property 3: Admin cannot assign super_admin role', () => {
  it('throws PERMISSION_DENIED when admin tries to assign super_admin', async () => {
    await expect(
      assignBackofficeRole('target_uid', 'super_admin', 'admin')
    ).rejects.toThrow(BackofficeError);
  });

  it('throws PERMISSION_DENIED when moderator tries to assign super_admin', async () => {
    await expect(
      assignBackofficeRole('target_uid', 'super_admin', 'moderator')
    ).rejects.toThrow(BackofficeError);
  });

  it('Property 3: any non-super_admin caller cannot assign super_admin', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('admin' as BackofficeRole, 'moderator' as BackofficeRole),
        async (callerRole) => {
          await expect(
            assignBackofficeRole('uid', 'super_admin', callerRole)
          ).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
          return true;
        }
      ),
      { numRuns: 10 }
    );
  });
});
