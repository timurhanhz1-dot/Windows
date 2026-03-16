import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gem, Trophy, Play, Zap } from 'lucide-react';

const W = 800, H = 600;

interface Crystal {
  id: number; x: number; y: number;
  type: 'common' | 'rare' | 'legendary';
  pulse: number; scale: number; collected: boolean;
  glowPhase: number;
}
interface Particle {
  id: number; x: number; y: number; vx: number; vy: number;
  life: number; color: string; size: number;
}
interface FloatText { id: number; x: number; y: number; text: string; life: number; color: string; }
interface Stalactite { x: number; h: number; }

const CRYSTAL_COLORS = {
  common: { fill: '#22d3ee', glow: '#06b6d4', points: 10 },
  rare: { fill: '#a78bfa', glow: '#7c3aed', points: 30 },
  legendary: { fill: '#fbbf24', glow: '#f59e0b', points: 100 },
};

function rand(a: number, b: number) { return a + Math.random() * (b - a); }

export const CrystalGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    crystals: [] as Crystal[],
    particles: [] as Particle[],
    floatTexts: [] as FloatText[],
    stalactites: Array.from({ length: 18 }, (_, i) => ({
      x: (i / 18) * W + rand(0, W / 18),
      h: rand(30, 120),
    })) as Stalactite[],
    score: 0, combo: 0, comboTimer: 0,
    timeLeft: 45, isPlaying: false, gameOver: false,
    highScore: 0, spawnTimer: 0, frameId: 0, lastTime: 0,
    bgOffset: 0,
  });
  const [displayScore, setDisplayScore] = useState(0);
  const [displayTime, setDisplayTime] = useState(45);
  const [displayCombo, setDisplayCombo] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const spawnCrystal = useCallback(() => {
    const s = stateRef.current;
    const roll = Math.random();
    const type: Crystal['type'] = roll > 0.95 ? 'legendary' : roll > 0.75 ? 'rare' : 'common';
    s.crystals.push({
      id: Date.now() + Math.random(),
      x: rand(50, W - 50), y: rand(80, H - 80),
      type, pulse: 0, scale: 0, collected: false,
      glowPhase: rand(0, Math.PI * 2),
    });
  }, []);

  const collectCrystal = useCallback((id: number) => {
    const s = stateRef.current;
    const c = s.crystals.find(cr => cr.id === id);
    if (!c || c.collected) return;
    c.collected = true;
    s.comboTimer = 1.5;
    s.combo++;
    const pts = CRYSTAL_COLORS[c.type].points * s.combo;
    s.score += pts;
    const col = CRYSTAL_COLORS[c.type];
    // Particles
    for (let i = 0; i < (c.type === 'legendary' ? 30 : c.type === 'rare' ? 18 : 10); i++) {
      const angle = rand(0, Math.PI * 2);
      const spd = rand(2, 8);
      s.particles.push({
        id: Date.now() + i + Math.random(),
        x: c.x, y: c.y,
        vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
        life: 1, color: col.glow, size: rand(2, 5),
      });
    }
    s.floatTexts.push({
      id: Date.now() + Math.random(),
      x: c.x, y: c.y - 20,
      text: s.combo > 1 ? `+${pts} x${s.combo}!` : `+${pts}`,
      life: 1,
      color: c.type === 'legendary' ? '#fbbf24' : c.type === 'rare' ? '#a78bfa' : '#22d3ee',
    });
    setDisplayScore(s.score);
    setDisplayCombo(s.combo);
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, t: number) => {
    const s = stateRef.current;
    ctx.clearRect(0, 0, W, H);

    // Deep cave background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a0612');
    bg.addColorStop(0.5, '#0d0a1a');
    bg.addColorStop(1, '#060410');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Ambient glow pools on floor
    [[150, H - 20, '#7c3aed', 120], [400, H - 20, '#06b6d4', 100], [650, H - 20, '#f59e0b', 80]].forEach(([x, y, c, r]) => {
      const g = ctx.createRadialGradient(x as number, y as number, 0, x as number, y as number, r as number);
      g.addColorStop(0, (c as string) + '22');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    });

    // Stalactites
    s.stalactites.forEach(st => {
      ctx.save();
      const stGrad = ctx.createLinearGradient(st.x, 0, st.x, st.h);
      stGrad.addColorStop(0, '#1a1030');
      stGrad.addColorStop(1, '#0d0820');
      ctx.fillStyle = stGrad;
      ctx.beginPath();
      ctx.moveTo(st.x - 12, 0);
      ctx.lineTo(st.x + 12, 0);
      ctx.lineTo(st.x + 4, st.h);
      ctx.lineTo(st.x - 4, st.h);
      ctx.closePath(); ctx.fill();
      // Drip glow
      const drip = ctx.createRadialGradient(st.x, st.h, 0, st.x, st.h, 8);
      drip.addColorStop(0, 'rgba(34,211,238,0.3)');
      drip.addColorStop(1, 'transparent');
      ctx.fillStyle = drip; ctx.fillRect(st.x - 8, st.h - 8, 16, 16);
      ctx.restore();
    });

    // Floor
    const floor = ctx.createLinearGradient(0, H - 30, 0, H);
    floor.addColorStop(0, '#1a1030');
    floor.addColorStop(1, '#0a0612');
    ctx.fillStyle = floor; ctx.fillRect(0, H - 30, W, 30);

    // Crystals
    s.crystals.forEach(c => {
      if (c.collected) return;
      const col = CRYSTAL_COLORS[c.type];
      const pulse = Math.sin(t * 2 + c.glowPhase) * 0.5 + 0.5;
      const sc = c.scale;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.scale(sc, sc);
      // Outer glow
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 40 + pulse * 15);
      glow.addColorStop(0, col.glow + '44');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow; ctx.fillRect(-55, -55, 110, 110);
      // Crystal shape
      ctx.shadowColor = col.glow;
      ctx.shadowBlur = 20 + pulse * 15;
      ctx.fillStyle = col.fill;
      ctx.beginPath();
      if (c.type === 'legendary') {
        // Diamond
        ctx.moveTo(0, -28); ctx.lineTo(18, 0); ctx.lineTo(0, 28); ctx.lineTo(-18, 0);
      } else if (c.type === 'rare') {
        // Hexagon
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          i === 0 ? ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20) : ctx.lineTo(Math.cos(a) * 20, Math.sin(a) * 20);
        }
      } else {
        // Triangle cluster
        ctx.moveTo(0, -22); ctx.lineTo(14, 10); ctx.lineTo(-14, 10);
      }
      ctx.closePath(); ctx.fill();
      // Inner highlight
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      if (c.type === 'legendary') {
        ctx.moveTo(0, -20); ctx.lineTo(8, -4); ctx.lineTo(0, 4); ctx.lineTo(-8, -4);
      } else {
        ctx.moveTo(0, -14); ctx.lineTo(6, 0); ctx.lineTo(-6, 0);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    });

    // Particles
    s.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Float texts
    s.floatTexts.forEach(ft => {
      ctx.save();
      ctx.globalAlpha = ft.life;
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 12;
      ctx.font = 'bold 18px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    });

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, 44);
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#22d3ee';
    ctx.fillText(`SKOR: ${s.score}`, 16, 28);
    ctx.textAlign = 'center';
    const tColor = s.timeLeft <= 10 ? '#ef4444' : '#ffffff';
    ctx.fillStyle = tColor;
    ctx.fillText(`${Math.ceil(s.timeLeft)}s`, W / 2, 28);
    if (s.combo > 1) {
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`COMBO x${s.combo}`, W / 2 + 80, 28);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = '#a78bfa';
    ctx.fillText(`REKOR: ${s.highScore}`, W - 16, 28);
    ctx.textAlign = 'left';
  }, []);

  const update = useCallback((dt: number) => {
    const s = stateRef.current;
    if (!s.isPlaying) return;

    s.timeLeft -= dt;
    if (s.timeLeft <= 0) {
      s.timeLeft = 0;
      s.isPlaying = false;
      s.gameOver = true;
      if (s.score > s.highScore) s.highScore = s.score;
      setHighScore(s.highScore);
      setGameOver(true);
      setIsPlaying(false);
    }

    // Combo timer
    s.comboTimer -= dt;
    if (s.comboTimer <= 0 && s.combo > 0) { s.combo = 0; setDisplayCombo(0); }

    // Crystal spawn
    s.spawnTimer -= dt;
    if (s.spawnTimer <= 0) {
      if (s.crystals.filter(c => !c.collected).length < 12) spawnCrystal();
      s.spawnTimer = rand(0.4, 1.0);
    }

    // Crystal scale-in
    s.crystals.forEach(c => { if (!c.collected) c.scale = Math.min(1, c.scale + dt * 4); });
    s.crystals = s.crystals.filter(c => !c.collected || c.scale > 0);

    // Particles
    s.particles.forEach(p => { p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; p.life -= dt * 2; p.vx *= 0.94; p.vy *= 0.94; });
    s.particles = s.particles.filter(p => p.life > 0);

    // Float texts
    s.floatTexts.forEach(ft => { ft.y -= dt * 40; ft.life -= dt * 1.5; });
    s.floatTexts = s.floatTexts.filter(ft => ft.life > 0);

    setDisplayTime(Math.ceil(s.timeLeft));
    setDisplayScore(s.score);
  }, [spawnCrystal]);

  const loop = useCallback((time: number) => {
    const s = stateRef.current;
    const dt = Math.min((time - s.lastTime) / 1000, 0.05);
    s.lastTime = time;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    update(dt);
    draw(ctx, time / 1000);
    s.frameId = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    const s = stateRef.current;
    if (!s.isPlaying) return;
    s.lastTime = performance.now();
    s.frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(s.frameId);
  }, [isPlaying, loop]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const s = stateRef.current;
    if (!s.isPlaying) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    s.crystals.forEach(c => {
      if (c.collected) return;
      const r = c.type === 'legendary' ? 32 : c.type === 'rare' ? 24 : 18;
      if (Math.abs(mx - c.x) < r && Math.abs(my - c.y) < r) collectCrystal(c.id);
    });
  }, [collectCrystal]);

  const startGame = () => {
    const s = stateRef.current;
    s.crystals = []; s.particles = []; s.floatTexts = [];
    s.score = 0; s.combo = 0; s.comboTimer = 0;
    s.timeLeft = 45; s.spawnTimer = 0;
    s.isPlaying = true; s.gameOver = false;
    setDisplayScore(0); setDisplayTime(45); setDisplayCombo(0);
    setGameOver(false); setIsPlaying(true);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0a0612' }}>
      <header className="h-14 border-b border-white/5 flex items-center px-6 justify-between bg-black/60 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-500/20">
            <Gem size={18} className="text-purple-400" />
          </div>
          <span className="font-black text-white uppercase tracking-widest text-xs">Kristal Avcısı</span>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Rekor</div>
            <div className="text-lg font-black text-amber-400 flex items-center gap-1"><Trophy size={12} />{highScore}</div>
          </div>
          {displayCombo > 1 && (
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center">
              <div className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Combo</div>
              <div className="text-lg font-black text-yellow-400">x{displayCombo}</div>
            </motion.div>
          )}
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <canvas ref={canvasRef} width={W} height={H}
          className="max-w-full max-h-full cursor-crosshair"
          onClick={handleCanvasClick} />

        <AnimatePresence>
          {!isPlaying && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ background: 'radial-gradient(ellipse at center, rgba(10,6,18,0.88) 0%, rgba(10,6,18,0.97) 100%)' }}>
              <motion.div
                animate={{ filter: ['drop-shadow(0 0 20px #7c3aed)', 'drop-shadow(0 0 50px #a78bfa)', 'drop-shadow(0 0 20px #7c3aed)'] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="mb-8">
                <Gem size={80} className="text-purple-400" />
              </motion.div>
              <h1 className="text-5xl font-black text-white mb-2 tracking-tighter">
                {gameOver ? 'SÜRE DOLDU' : 'KRİSTAL AVCISI'}
              </h1>
              {gameOver && (
                <div className="mb-6 text-center">
                  <div className="text-white/40 text-sm font-bold uppercase tracking-widest mb-1">Son Skor</div>
                  <div className="text-4xl font-black text-purple-400">{displayScore}</div>
                </div>
              )}
              {!gameOver && (
                <div className="mb-8 text-center max-w-xs">
                  <p className="text-white/40 leading-relaxed mb-3">
                    Kristallere tıkla, puan kazan. Hızlı toplarsan combo çarpar!
                  </p>
                  <div className="flex justify-center gap-4 text-sm">
                    <span className="text-cyan-400 font-bold">◆ Sıradan</span>
                    <span className="text-purple-400 font-bold">⬡ Nadir</span>
                    <span className="text-amber-400 font-bold">◇ Efsanevi</span>
                  </div>
                </div>
              )}
              <motion.button whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-lg text-white"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 0 40px rgba(124,58,237,0.5)' }}>
                <Play size={20} fill="currentColor" />
                {gameOver ? 'TEKRAR OYNA' : 'BAŞLAT'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
