import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ref as dbRef, update } from 'firebase/database';
import { db } from '../../../firebase';
import { BannerElement } from '../services/designStateManager';
import { useBackofficeAuth } from '../hooks/useBackofficeAuth';
import { writeAuditLog } from '../services/auditLogService';
import { Btn, useToast, Toast } from './shared';
import { Type, Square, ImageIcon, Trash2 } from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const CANVAS_W = 760;
const CANVAS_H = 280;

type BannerType = 'profile_banner' | 'server_cover';

const sanitizeText = (t: string) =>
  t.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]||c));

export default function BannerEditor() {
  const { uid, role } = useBackofficeAuth();
  const { toast, show } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [bannerType, setBannerType] = useState<BannerType>('profile_banner');
  const [elements, setElements] = useState<BannerElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState('#1a1a2e');
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);

  // Redraw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    [...elements].sort((a, b) => a.zIndex - b.zIndex).forEach(el => {
      ctx.save();
      ctx.globalAlpha = el.opacity;
      ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
      ctx.rotate((el.rotation * Math.PI) / 180);

      if (el.type === 'shape') {
        ctx.fillStyle = el.props.fill || '#6366f1';
        const r = el.props.cornerRadius || 0;
        const x = -el.width / 2, y = -el.height / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + el.width - r, y);
        ctx.quadraticCurveTo(x + el.width, y, x + el.width, y + r);
        ctx.lineTo(x + el.width, y + el.height - r);
        ctx.quadraticCurveTo(x + el.width, y + el.height, x + el.width - r, y + el.height);
        ctx.lineTo(x + r, y + el.height);
        ctx.quadraticCurveTo(x, y + el.height, x, y + el.height - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
      } else if (el.type === 'text') {
        ctx.fillStyle = el.props.fill || '#ffffff';
        ctx.font = `${el.props.fontWeight || 'normal'} ${el.props.fontSize || 24}px ${el.props.fontFamily || 'Inter, sans-serif'}`;
        ctx.textBaseline = 'middle';
        ctx.fillText(el.props.text || '', -el.width / 2, 0);
      } else if (el.type === 'image' && el.props._img) {
        ctx.drawImage(el.props._img, -el.width / 2, -el.height / 2, el.width, el.height);
      } else if (el.type === 'gradient') {
        const grad = ctx.createLinearGradient(-el.width / 2, 0, el.width / 2, 0);
        grad.addColorStop(0, el.props.color1 || '#6366f1');
        grad.addColorStop(1, el.props.color2 || '#10b981');
        ctx.fillStyle = grad;
        ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height);
      }

      // Selection border
      if (el.id === selectedId) {
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-el.width / 2, -el.height / 2, el.width, el.height);
        ctx.setLineDash([]);
      }
      ctx.restore();
    });
  }, [elements, bgColor, selectedId]);

  useEffect(() => { draw(); }, [draw]);

  const hitTest = (mx: number, my: number): string | null => {
    const sorted = [...elements].sort((a, b) => b.zIndex - a.zIndex);
    for (const el of sorted) {
      if (mx >= el.x && mx <= el.x + el.width && my >= el.y && my <= el.y + el.height) return el.id;
    }
    return null;
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = hitTest(mx, my);
    setSelectedId(hit);
    if (hit) {
      const el = elements.find(x => x.id === hit)!;
      setDragging({ id: hit, ox: mx - el.x, oy: my - el.y });
    }
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    setElements(prev => prev.map(el => el.id === dragging.id ? { ...el, x: mx - dragging.ox, y: my - dragging.oy } : el));
  };

  const onMouseUp = () => setDragging(null);

  const addText = () => {
    const el: BannerElement = {
      id: `t_${Date.now()}`, type: 'text', x: 60, y: 100,
      width: 220, height: 36, rotation: 0, opacity: 1, zIndex: elements.length,
      props: { text: 'Metin ekle', fontSize: 28, fill: '#ffffff', fontFamily: 'Inter, sans-serif' }
    };
    setElements(p => [...p, el]); setSelectedId(el.id);
  };

  const addShape = () => {
    const el: BannerElement = {
      id: `s_${Date.now()}`, type: 'shape', x: 100, y: 80,
      width: 140, height: 70, rotation: 0, opacity: 0.85, zIndex: elements.length,
      props: { fill: '#6366f1', cornerRadius: 10 }
    };
    setElements(p => [...p, el]); setSelectedId(el.id);
  };

  const addGradient = () => {
    const el: BannerElement = {
      id: `g_${Date.now()}`, type: 'gradient', x: 0, y: 0,
      width: CANVAS_W, height: CANVAS_H, rotation: 0, opacity: 0.5, zIndex: elements.length,
      props: { color1: '#6366f1', color2: '#10b981' }
    };
    setElements(p => [...p, el]); setSelectedId(el.id);
  };

  const addImage = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > MAX_FILE_SIZE) { show('Dosya 5MB\'ı aşıyor', 'error'); return; }
      const url = URL.createObjectURL(file);
      const img = new window.Image();
      img.onload = () => {
        const el: BannerElement = {
          id: `i_${Date.now()}`, type: 'image', x: 50, y: 50,
          width: Math.min(img.width, 300), height: Math.min(img.height, 200),
          rotation: 0, opacity: 1, zIndex: elements.length,
          props: { src: url, _img: img }
        };
        setElements(p => [...p, el]); setSelectedId(el.id);
      };
      img.src = url;
    };
    input.click();
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setElements(p => p.filter(e => e.id !== selectedId));
    setSelectedId(null);
  };

  const updateEl = (id: string, patch: Partial<BannerElement>) =>
    setElements(p => p.map(e => e.id === id ? { ...e, ...patch } : e));

  const updateProp = (id: string, key: string, val: any) =>
    setElements(p => p.map(e => e.id === id ? { ...e, props: { ...e.props, [key]: val } } : e));

  const exportAndSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    // Read previous URL to restore on failure
    let previousUrl: string | null = null;
    try {
      const { get, ref: dbRefFn } = await import('firebase/database');
      const snap = await get(dbRefFn(db, `settings/design/${bannerType}_url`));
      previousUrl = snap.val() || null;
    } catch { /* ignore */ }
    try {
      const dataUrl = canvas.toDataURL('image/png');
      await update(dbRef(db, 'settings/design'), {
        [`${bannerType}_url`]: dataUrl,
        last_updated: Date.now(), updated_by: uid,
      });
      await writeAuditLog({ action: 'BANNER_EXPORT', detail: `Banner: ${bannerType}`, admin_uid: uid!, admin_role: role! });
      show('Banner kaydedildi');
    } catch (e: any) {
      // Restore previous URL on failure
      if (previousUrl !== null) {
        try {
          await update(dbRef(db, 'settings/design'), { [`${bannerType}_url`]: previousUrl });
        } catch { /* ignore restore error */ }
      }
      show(e.message, 'error');
    } finally { setSaving(false); }
  };

  const selected = elements.find(e => e.id === selectedId);

  return (
    <div>
      <Toast toast={toast} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['profile_banner', 'server_cover'] as BannerType[]).map(t => (
          <button key={t} onClick={() => { setBannerType(t); setElements([]); setSelectedId(null); }}
            style={{ background: bannerType === t ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', color: bannerType === t ? '#a5b4fc' : 'rgba(255,255,255,0.5)', fontSize: 12 }}>
            {t === 'profile_banner' ? '👤 Profil Banner' : '🖼 Sunucu Kapak'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: 16 }}>
        <div>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={addText} style={toolBtn}><Type size={13} /> Metin</button>
            <button onClick={addShape} style={toolBtn}><Square size={13} /> Şekil</button>
            <button onClick={addGradient} style={toolBtn}>🌈 Gradient</button>
            <button onClick={addImage} style={toolBtn}><ImageIcon size={13} /> Görsel</button>
            {selectedId && <button onClick={deleteSelected} style={{ ...toolBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}><Trash2 size={13} /> Sil</button>}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Arka Plan</span>
              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                style={{ width: 32, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
            </div>
          </div>

          {/* Canvas */}
          <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden', cursor: dragging ? 'grabbing' : 'default' }}>
            <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
              onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
              style={{ display: 'block', width: '100%' }} />
          </div>

          <div style={{ marginTop: 10 }}>
            <Btn onClick={exportAndSave} disabled={saving}>{saving ? 'Kaydediliyor...' : '💾 Export & Kaydet'}</Btn>
          </div>
        </div>

        {/* Properties */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, border: '1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, marginBottom: 12, textTransform: 'uppercase' }}>Özellikler</p>
          {!selected ? (
            <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>Bir element seç</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[['X', 'x'], ['Y', 'y'], ['G', 'width'], ['Y', 'height']].map(([lbl, key], i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, width: 14 }}>{lbl}</span>
                  <input type="number" value={Math.round((selected as any)[key])}
                    onChange={e => updateEl(selected.id, { [key]: Number(e.target.value) } as any)}
                    style={numInput} />
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, width: 14 }}>Op</span>
                <input type="range" min={0} max={1} step={0.05} value={selected.opacity}
                  onChange={e => updateEl(selected.id, { opacity: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: '#6366f1' }} />
              </div>
              {selected.type === 'text' && <>
                <input type="text" value={selected.props.text || ''} placeholder="Metin"
                  onChange={e => updateProp(selected.id, 'text', sanitizeText(e.target.value))} style={numInput} />
                <input type="number" value={selected.props.fontSize || 24} placeholder="Boyut"
                  onChange={e => updateProp(selected.id, 'fontSize', Number(e.target.value))} style={numInput} />
                <input type="color" value={selected.props.fill || '#ffffff'}
                  onChange={e => updateProp(selected.id, 'fill', e.target.value)}
                  style={{ width: '100%', height: 28, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
              </>}
              {selected.type === 'shape' && <>
                <input type="color" value={selected.props.fill || '#6366f1'}
                  onChange={e => updateProp(selected.id, 'fill', e.target.value)}
                  style={{ width: '100%', height: 28, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
              </>}
              {selected.type === 'gradient' && <>
                <input type="color" value={selected.props.color1 || '#6366f1'}
                  onChange={e => updateProp(selected.id, 'color1', e.target.value)}
                  style={{ width: '100%', height: 28, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
                <input type="color" value={selected.props.color2 || '#10b981'}
                  onChange={e => updateProp(selected.id, 'color2', e.target.value)}
                  style={{ width: '100%', height: 28, border: 'none', borderRadius: 6, cursor: 'pointer' }} />
              </>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const toolBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '5px 11px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
  fontSize: 12, display: 'flex', alignItems: 'center', gap: 5
};
const numInput: React.CSSProperties = {
  background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
  borderRadius: 6, padding: '4px 8px', fontSize: 12, width: '100%'
};
