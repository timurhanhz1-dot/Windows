import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Simulate user/channel state for round-trip testing (no Firebase)

interface UserState {
  uid: string;
  is_banned: boolean;
  is_muted: boolean;
  mute_until: string | null;
}

interface ChannelState {
  id: string;
  is_locked: boolean;
  is_hidden: boolean;
}

function banUser(user: UserState, banned: boolean): UserState {
  return { ...user, is_banned: banned };
}

function muteUser(user: UserState, minutes: number): UserState {
  return {
    ...user,
    is_muted: true,
    mute_until: new Date(Date.now() + minutes * 60000).toISOString(),
  };
}

function unmuteUser(user: UserState): UserState {
  return { ...user, is_muted: false, mute_until: null };
}

function lockChannel(ch: ChannelState, locked: boolean): ChannelState {
  return { ...ch, is_locked: locked };
}

function hideChannel(ch: ChannelState, hidden: boolean): ChannelState {
  return { ...ch, is_hidden: hidden };
}

// ── Property 7: banUser/muteUser round-trip ───────────────────────────────────

describe('Property 7: banUser/muteUser round-trip correctness', () => {
  it('ban then unban restores original state', () => {
    const user: UserState = { uid: 'u1', is_banned: false, is_muted: false, mute_until: null };
    const banned = banUser(user, true);
    const unbanned = banUser(banned, false);
    expect(unbanned.is_banned).toBe(false);
    expect(unbanned.uid).toBe(user.uid);
  });

  it('mute then unmute clears mute state', () => {
    const user: UserState = { uid: 'u1', is_banned: false, is_muted: false, mute_until: null };
    const muted = muteUser(user, 30);
    expect(muted.is_muted).toBe(true);
    expect(muted.mute_until).not.toBeNull();
    const unmuted = unmuteUser(muted);
    expect(unmuted.is_muted).toBe(false);
    expect(unmuted.mute_until).toBeNull();
  });

  it('Property 7: ban(true) then ban(false) always results in is_banned=false', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (initialBanned) => {
          const user: UserState = { uid: 'u', is_banned: initialBanned, is_muted: false, mute_until: null };
          const result = banUser(banUser(user, true), false);
          expect(result.is_banned).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 7: mute then unmute always results in is_muted=false', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1440 }),
        (minutes) => {
          const user: UserState = { uid: 'u', is_banned: false, is_muted: false, mute_until: null };
          const result = unmuteUser(muteUser(user, minutes));
          expect(result.is_muted).toBe(false);
          expect(result.mute_until).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('ban/unban preserves other user fields', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.boolean(),
        (uid, banned) => {
          const user: UserState = { uid, is_banned: false, is_muted: false, mute_until: null };
          const result = banUser(user, banned);
          expect(result.uid).toBe(uid);
          expect(result.is_muted).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 8: lockChannel/hideChannel round-trip ───────────────────────────

describe('Property 8: lockChannel/hideChannel round-trip correctness', () => {
  it('lock then unlock restores original state', () => {
    const ch: ChannelState = { id: 'ch1', is_locked: false, is_hidden: false };
    const locked = lockChannel(ch, true);
    const unlocked = lockChannel(locked, false);
    expect(unlocked.is_locked).toBe(false);
  });

  it('hide then show restores original state', () => {
    const ch: ChannelState = { id: 'ch1', is_locked: false, is_hidden: false };
    const hidden = hideChannel(ch, true);
    const shown = hideChannel(hidden, false);
    expect(shown.is_hidden).toBe(false);
  });

  it('Property 8: lock(true) then lock(false) always results in is_locked=false', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (initialLocked) => {
          const ch: ChannelState = { id: 'ch', is_locked: initialLocked, is_hidden: false };
          const result = lockChannel(lockChannel(ch, true), false);
          expect(result.is_locked).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 8: hide(true) then hide(false) always results in is_hidden=false', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (initialHidden) => {
          const ch: ChannelState = { id: 'ch', is_locked: false, is_hidden: initialHidden };
          const result = hideChannel(hideChannel(ch, true), false);
          expect(result.is_hidden).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('lockChannel preserves other channel fields', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.boolean(),
        (id, locked) => {
          const ch: ChannelState = { id, is_locked: false, is_hidden: false };
          const result = lockChannel(ch, locked);
          expect(result.id).toBe(id);
          expect(result.is_hidden).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
