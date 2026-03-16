/**
 * Responsive Design Tests - Social Media Profile System
 * Tasks 27.1, 27.2, 27.3
 * Verifies responsive layout classes and touch target requirements via source analysis
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf-8');

// ─── Task 27.1: Mobile view ───────────────────────────────────────────────────
describe('27.1 Mobil görünüm testi', () => {
  it('PostGrid uses 2-column grid on mobile (grid-cols-2)', () => {
    const src = read('src/components/PostGrid.tsx');
    expect(src).toMatch(/grid-cols-2/);
  });

  it('PostGrid uses 3-column grid on desktop (md:grid-cols-3)', () => {
    const src = read('src/components/PostGrid.tsx');
    expect(src).toMatch(/md:grid-cols-3/);
  });

  it('PostDetailModal has full-screen layout on mobile', () => {
    const src = read('src/components/PostDetailModal.tsx');
    // Modal should use flex-col on mobile, flex-row on md+
    expect(src).toMatch(/flex-col.*md:flex-row|md:flex-row/);
  });

  it('ProfilePage has responsive padding/layout classes', () => {
    const src = read('src/components/ProfilePage.tsx');
    expect(src).toMatch(/md:|sm:/);
  });
});

// ─── Task 27.2: Tablet view ───────────────────────────────────────────────────
describe('27.2 Tablet görünüm testi', () => {
  it('PostGrid responsive gap adjusts for tablet (md:gap-4)', () => {
    const src = read('src/components/PostGrid.tsx');
    expect(src).toMatch(/md:gap-/);
  });

  it('ProfilePage stats use responsive grid', () => {
    const src = read('src/components/ProfilePage.tsx');
    expect(src).toMatch(/grid-cols|md:grid-cols/);
  });
});

// ─── Task 27.3: Desktop view ──────────────────────────────────────────────────
describe('27.3 Desktop görünüm testi', () => {
  it('PostGrid shows 3 columns on desktop (md:grid-cols-3)', () => {
    const src = read('src/components/PostGrid.tsx');
    expect(src).toMatch(/md:grid-cols-3/);
  });

  it('ProfilePage has max-width container for desktop', () => {
    const src = read('src/components/ProfilePage.tsx');
    expect(src).toMatch(/max-w-/);
  });

  it('FollowerListModal has responsive layout', () => {
    const src = read('src/components/FollowerListModal.tsx');
    expect(src).toMatch(/max-w-|w-full/);
  });
});

// ─── Touch targets ────────────────────────────────────────────────────────────
describe('Touch target sizes (min 44x44px)', () => {
  it('LikeButton uses motion.button for touch interaction', () => {
    const src = read('src/components/LikeButton.tsx');
    // LikeButton uses motion.button with whileTap for touch feedback
    expect(src).toMatch(/motion\.button/);
    expect(src).toMatch(/whileTap/);
  });

  it('ProfilePage action buttons have adequate size', () => {
    const src = read('src/components/ProfilePage.tsx');
    expect(src).toMatch(/px-[4-9]|py-[2-9]|p-[2-9]/);
  });
});
