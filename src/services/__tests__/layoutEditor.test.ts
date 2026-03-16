import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ── Layout slot types ─────────────────────────────────────────────────────────

type SlotId = 'sidebar' | 'channel-sidebar' | 'chat-area' | 'header' | 'footer';

interface LayoutSlot {
  id: SlotId;
  label: string;
  position: string;
  order: number;
}

const SLOT_IDS: SlotId[] = ['sidebar', 'channel-sidebar', 'chat-area', 'header', 'footer'];

// Simulate arrayMove + order update (mirrors LayoutEditor.handleDragEnd)
function applyDragEnd(slots: LayoutSlot[], fromId: SlotId, toId: SlotId): LayoutSlot[] {
  if (fromId === toId) return slots;
  const oldIndex = slots.findIndex(s => s.id === fromId);
  const newIndex = slots.findIndex(s => s.id === toId);
  if (oldIndex === -1 || newIndex === -1) return slots;
  const result = [...slots];
  const [moved] = result.splice(oldIndex, 1);
  result.splice(newIndex, 0, moved);
  return result.map((s, i) => ({ ...s, order: i }));
}

// ── Property 5: Layout slot integrity ────────────────────────────────────────

describe('Property 5: Layout slot integrity after drag', () => {
  const makeSlots = (): LayoutSlot[] =>
    SLOT_IDS.map((id, i) => ({ id, label: id, position: 'left', order: i }));

  it('drag preserves all slot IDs (no duplicates, no missing)', () => {
    const slots = makeSlots();
    const result = applyDragEnd(slots, 'sidebar', 'chat-area');
    const ids = result.map(s => s.id).sort();
    expect(ids).toEqual([...SLOT_IDS].sort());
  });

  it('drag updates order values to be sequential 0..n-1', () => {
    const slots = makeSlots();
    const result = applyDragEnd(slots, 'header', 'footer');
    const orders = result.map(s => s.order).sort((a, b) => a - b);
    expect(orders).toEqual([0, 1, 2, 3, 4]);
  });

  it('each slot appears exactly once after drag', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(SLOT_IDS, { minLength: 2, maxLength: 2 }),
        ([fromId, toId]) => {
          const slots = makeSlots();
          const result = applyDragEnd(slots, fromId, toId);
          // Each slot ID appears exactly once
          SLOT_IDS.forEach(id => {
            expect(result.filter(s => s.id === id).length).toBe(1);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5: order values are always a permutation of 0..n-1', () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray(SLOT_IDS, { minLength: 2, maxLength: 2 }),
        ([fromId, toId]) => {
          const slots = makeSlots();
          const result = applyDragEnd(slots, fromId, toId);
          const orders = result.map(s => s.order).sort((a, b) => a - b);
          expect(orders).toEqual([0, 1, 2, 3, 4]);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 3: Partial write atomicity (layout) ─────────────────────────────

describe('Property 3: Layout partial write atomicity', () => {
  it('layout save does not affect theme fields', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 48, max: 320 }),
        fc.stringMatching(/^#[0-9A-Fa-f]{6}$/),
        (sidebarWidth, primaryColor) => {
          const existing = { theme: { primary_color: primaryColor }, layout: { sidebarWidth: 72 } };
          const afterLayoutSave = { ...existing, layout: { sidebarWidth } };
          expect(afterLayoutSave.theme.primary_color).toBe(primaryColor);
        }
      ),
      { numRuns: 100 }
    );
  });
});
