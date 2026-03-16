import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { BackofficeUser } from '../types/backoffice.types';

// Mirrors UserManagementModule search filter logic
function filterUsers(users: BackofficeUser[], query: string): BackofficeUser[] {
  if (!query.trim()) return users;
  const q = query.toLowerCase();
  return users.filter(
    u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );
}

function makeUser(username: string, email: string): BackofficeUser {
  return {
    uid: `uid_${username}`,
    username,
    email,
    is_admin: false,
    is_banned: false,
    is_muted: false,
    created_at: Date.now(),
    message_count: 0,
  };
}

// ── Property 6: Search results always contain the query ──────────────────────

describe('Property 6: User search filtering correctness', () => {
  it('empty query returns all users', () => {
    const users = [makeUser('alice', 'alice@test.com'), makeUser('bob', 'bob@test.com')];
    expect(filterUsers(users, '')).toHaveLength(2);
    expect(filterUsers(users, '   ')).toHaveLength(2);
  });

  it('query matches username', () => {
    const users = [makeUser('alice', 'alice@test.com'), makeUser('bob', 'bob@test.com')];
    const result = filterUsers(users, 'ali');
    expect(result).toHaveLength(1);
    expect(result[0].username).toBe('alice');
  });

  it('query matches email', () => {
    const users = [makeUser('alice', 'alice@test.com'), makeUser('bob', 'bob@test.com')];
    const result = filterUsers(users, 'bob@');
    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('bob@test.com');
  });

  it('search is case-insensitive', () => {
    const users = [makeUser('Alice', 'Alice@Test.com')];
    expect(filterUsers(users, 'alice')).toHaveLength(1);
    expect(filterUsers(users, 'ALICE')).toHaveLength(1);
    expect(filterUsers(users, 'TEST')).toHaveLength(1);
  });

  it('Property 6: every result contains the search query in username or email', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            username: fc.string({ minLength: 2, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, 'x')),
            email: fc.emailAddress(),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        fc.string({ minLength: 1, maxLength: 10 }).map(s => s.replace(/[^a-zA-Z0-9]/g, 'a')),
        (rawUsers, query) => {
          const users = rawUsers.map(u => makeUser(u.username, u.email));
          const results = filterUsers(users, query);
          const q = query.toLowerCase();
          results.forEach(u => {
            const matches = u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
            expect(matches).toBe(true);
          });
        }
      ),
      { numRuns: 200 }
    );
  });

  it('Property 6: result is always a subset of input', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            username: fc.string({ minLength: 2, maxLength: 15 }).map(s => s.replace(/[^a-zA-Z0-9]/g, 'x')),
            email: fc.emailAddress(),
          }),
          { minLength: 0, maxLength: 10 }
        ),
        fc.string({ minLength: 0, maxLength: 10 }),
        (rawUsers, query) => {
          const users = rawUsers.map(u => makeUser(u.username, u.email));
          const results = filterUsers(users, query);
          expect(results.length).toBeLessThanOrEqual(users.length);
          results.forEach(r => {
            expect(users.some(u => u.uid === r.uid)).toBe(true);
          });
        }
      ),
      { numRuns: 200 }
    );
  });
});
