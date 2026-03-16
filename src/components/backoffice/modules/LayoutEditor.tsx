import React, { useState } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Monitor, Smartphone } from 'lucide-react';
import { LayoutConfig, LayoutSlot, clampNumeric, saveLayout } from '../services/designStateManager';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { Btn, useToast, Toast } from './shared';

interface Props {
  layout: LayoutConfig;
  onChange: (l: LayoutConfig) => void;
}

const DEFAULT_SLOTS: LayoutSlot[] = [
  { id: 'sidebar', label: '🗂 Ana Sidebar', position: 'left', order: 0, width: 72 },
  { id: 'channel-sidebar', label: '📋 Kanal Listesi', position: 'left', order: 1, width: 240 },
  { id: 'header', label: '🔝 Üst Bar', position: 'top', order: 2 },
  { id: 'chat-area', label: '💬 Sohbet Alanı', position: 'left', order: 3 },
  { id: 'footer', label: '⌨️ Mesaj Kutusu', position: 'bottom', order: 4 },
];

function SortableSlot({ slot }: { slot: LayoutSlot }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slot.id });
  return (
    <div ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform), transition,
        opacity: isDragging ? 0.5 : 1,
        background: isDragging ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${isDragging ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 10, padding: '12px 14px', marginBottom: 8,
        display: 'flex', alignItems: 'center', gap: 10, cursor: 'grab',
      }}
      {...attributes} {...listeners}>
      <GripVertical size={16} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
      <span style={{ color: '#fff', fontSize: 13, flex: 1 }}>{slot.label}</span>
      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 6 }}>
        {slot.position}
      </span>
    </div>
  );
}

export default function LayoutEditor({ layout, onChange }: Props) {
  const { uid } = useBackofficeAuth();
  const { toast, show } = useToast();
  const [preview, setPreview] = useState<'desktop' | 'mobile'>('desktop');
  const slots = layout.slots?.length ? layout.slots : DEFAULT_SLOTS;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = slots.findIndex(s => s.id === active.id);
    const newIndex = slots.findIndex(s => s.id === over.id);
    const newSlots = arrayMove(slots, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }));
    onChange({ ...layout, slots: newSlots });
  };

  const handleSave = async () => {
    try {
      await saveLayout(layout, uid!);
      show('Layout kaydedildi');
    } catch (e: any) {
      show(e.message, 'error');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <Toast toast={toast} />
      {/* Sol — drag & drop */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 }}>
          ↕ Bileşen Sırası
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={slots.map(s => s.id)} strategy={verticalListSortingStrategy}>
            {slots.map(slot => <SortableSlot key={slot.id} slot={slot} />)}
          </SortableContext>
        </DndContext>

        <div style={{ marginTop: 16, marginBottom: 16 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, display: 'block', marginBottom: 6 }}>
            Sidebar Genişliği ({layout.sidebarWidth || 72}px)
          </label>
          <input type="range" min={48} max={320} value={layout.sidebarWidth || 72}
            onChange={e => onChange({ ...layout, sidebarWidth: clampNumeric(Number(e.target.value), 48, 320) })}
            style={{ width: '100%', accentColor: '#6366f1' }} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, display: 'block', marginBottom: 6 }}>
            Kanal Sidebar Genişliği ({layout.channelSidebarWidth || 240}px)
          </label>
          <input type="range" min={48} max={320} value={layout.channelSidebarWidth || 240}
            onChange={e => onChange({ ...layout, channelSidebarWidth: clampNumeric(Number(e.target.value), 48, 320) })}
            style={{ width: '100%', accentColor: '#6366f1' }} />
        </div>

        <Btn onClick={handleSave}>Kaydet</Btn>
      </div>

      {/* Sağ — önizleme */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 20, border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>👁 Önizleme</p>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['desktop', 'mobile'] as const).map(m => (
              <button key={m} onClick={() => setPreview(m)}
                style={{ background: preview === m ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: preview === m ? '#a5b4fc' : 'rgba(255,255,255,0.4)' }}>
                {m === 'desktop' ? <Monitor size={14} /> : <Smartphone size={14} />}
              </button>
            ))}
          </div>
        </div>
        <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', maxWidth: preview === 'mobile' ? 280 : '100%', margin: '0 auto' }}>
          {slots.map(slot => (
            <div key={slot.id} style={{
              background: slot.id === 'sidebar' ? 'rgba(99,102,241,0.15)' : slot.id === 'channel-sidebar' ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
              borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '8px 12px',
              display: 'flex', alignItems: 'center', gap: 6
            }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{slot.order + 1}</span>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{slot.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
