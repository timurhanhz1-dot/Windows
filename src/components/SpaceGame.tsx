import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket, Trophy, Play, Zap } from 'lucide-react';

interface Vec2 { x: number; y: number; }
interface Ship { x: number; y: number; vx: number; vy: number; }
interface Bullet { id: number; x: number; y: number; vy: number; }
interface Enemy { id: number; x: number; y: number; vx: number; vy: number; hp: number; type: 'scout' | 'heavy' | 'boss'; }
interface Particle { id: number; x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number; }
interface Star { x: number; y: number; size: number; speed: number; opacity: number; }

const W = 800, H = 600;
const SHIP_SPEED = 5;
const BULLET_SPEED = 10;
const ENEMY_SPAWN_INTERVAL = 1200;

function randomBetween(a: number, b: number) { return a + Math.random() * (b - a); }

export const SpaceGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    ship: { x: W / 2, y: H - 100, vx: 0, vy: 0 } as Ship,
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    particles: [] as Particle[],
    stars: Array.from({ length: 120 }, () => ({
      x: randomBetween(0, W), y: randomBetween(0, H),
      size: randomBetween(0.5, 2.5), speed: randomBetween(0.5, 2.5),
      opacity: randomBetween(0.3, 1),
    })) as Star[],
    keys: {} as Record<string, boolean>,
    score: 0,
    lives: 3,
    wave: 1,
    bulletCooldown: 0,
    enemySpawnTimer: 0,
    isPlaying: false,
    gameOver: false,
    highScore: 0,
    frameId: 0,
    lastTime: 0,
  });
  const [displayScore, setDisplayScore] = useState(0);
  const [displayLives, setDisplayLives] = useState(3);
  const [displayWave, setDisplayWave] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    const s = stateRef.current;
    for (let i = 0; i < count; i++) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(1, 6);
      s.particles.push({
        id: Date.now() + i + Math.random(),
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1, maxLife: 1,
        color,
        size: randomBetween(2, 6),
      });
    }
  }, []);

  const spawnEnemy = useCallback(() => {
    const s = stateRef.current;
    const roll = Math.random();
    const isBoss = s.wave > 2 && roll > 0.92;
    const isHeavy = roll > 0.7;
    const type: Enemy['type'] = isBoss ? 'boss' : isHeavy ? 'heavy' : 'scout';
    s.enemies.push({
      id: Date.now() + Math.random(),
      x: randomBetween(40, W - 40),
      y: -40,
      vx: randomBetween(-1.5, 1.5) * (1 + s.wave * 0.1),
      vy: randomBetween(1, 2.5) * (1 + s.wave * 0.08),
      hp: type === 'boss' ? 8 : type === 'heavy' ? 3 : 1,
      type,
    });
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    const s = stateRef.current;
    ctx.clearRect(0, 0, W, H);

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#020408');
    bg.addColorStop(1, '#050d1a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Stars
    s.stars.forEach(star => {
      ctx.save();
      ctx.globalAlpha = star.opacity;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Nebula glow
    const neb1 = ctx.createRadialGradient(200, 150, 0, 200, 150, 200);
    neb1.addColorStop(0, 'rgba(99,40,180,0.08)');
    neb1.addColorStop(1, 'transparent');
    ctx.fillStyle = neb1; ctx.fillRect(0, 0, W, H);
    const neb2 = ctx.createRadialGradient(600, 400, 0, 600, 400, 180);
    neb2.addColorStop(0, 'rgba(16,185,129,0.06)');
    neb2.addColorStop(1, 'transparent');
    ctx.fillStyle = neb2; ctx.fillRect(0, 0, W, H);

    // Bullets
    s.bullets.forEach(b => {
      const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + 20);
      grad.addColorStop(0, '#00ffcc');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(b.x - 2, b.y, 4, 20, 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Enemies
    s.enemies.forEach(e => {
      ctx.save();
      ctx.translate(e.x, e.y);
      if (e.type === 'boss') {
        // Boss: large red hexagon
        ctx.shadowColor = '#ff2244';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#ff2244';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          i === 0 ? ctx.moveTo(Math.cos(a) * 32, Math.sin(a) * 32) : ctx.lineTo(Math.cos(a) * 32, Math.sin(a) * 32);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fill();
      } else if (e.type === 'heavy') {
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(0, -22); ctx.lineTo(18, 14); ctx.lineTo(-18, 14);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(0, -16); ctx.lineTo(12, 10); ctx.lineTo(-12, 10);
        ctx.closePath(); ctx.fill();
      }
      // HP bar
      if (e.hp > 1) {
        const maxHp = e.type === 'boss' ? 8 : 3;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-20, 22, 40, 5);
        ctx.fillStyle = e.type === 'boss' ? '#ff2244' : '#f59e0b';
        ctx.fillRect(-20, 22, 40 * (e.hp / maxHp), 5);
      }
      ctx.restore();
    });

    // Particles
    s.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Ship
    const { x, y } = s.ship;
    ctx.save();
    ctx.translate(x, y);
    // Engine glow
    const eng = ctx.createRadialGradient(0, 18, 0, 0, 18, 22);
    eng.addColorStop(0, 'rgba(16,185,129,0.9)');
    eng.addColorStop(1, 'transparent');
    ctx.fillStyle = eng; ctx.fillRect(-22, 10, 44, 30);
    // Ship body
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(0, -28); ctx.lineTo(16, 16); ctx.lineTo(8, 10); ctx.lineTo(-8, 10); ctx.lineTo(-16, 16);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(0, -20); ctx.lineTo(8, 8); ctx.lineTo(-8, 8);
    ctx.closePath(); ctx.fill();
    // Cockpit
    const cock = ctx.createRadialGradient(0, -8, 0, 0, -8, 8);
    cock.addColorStop(0, '#7dd3fc');
    cock.addColorStop(1, '#1e40af');
    ctx.fillStyle = cock;
    ctx.beginPath(); ctx.arc(0, -8, 7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, W, 44);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`SCORE: ${s.score}`, 16, 28);
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`WAVE: ${s.wave}`, W / 2 - 30, 28);
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`LIVES: ${'♥'.repeat(s.lives)}`, W - 100, 28);
  }, []);

  const update = useCallback((dt: number) => {
    const s = stateRef.current;
    if (!s.isPlaying) return;

    // Stars scroll
    s.stars.forEach(star => {
      star.y += star.speed * dt * 60;
      if (star.y > H) { star.y = -4; star.x = randomBetween(0, W); }
    });

    // Ship movement
    const spd = SHIP_SPEED * dt * 60;
    if (s.keys['ArrowLeft'] || s.keys['a']) s.ship.x = Math.max(24, s.ship.x - spd);
    if (s.keys['ArrowRight'] || s.keys['d']) s.ship.x = Math.min(W - 24, s.ship.x + spd);
    if (s.keys['ArrowUp'] || s.keys['w']) s.ship.y = Math.max(60, s.ship.y - spd);
    if (s.keys['ArrowDown'] || s.keys['s']) s.ship.y = Math.min(H - 24, s.ship.y + spd);

    // Auto-fire
    s.bulletCooldown -= dt;
    if (s.bulletCooldown <= 0) {
      s.bullets.push({ id: Date.now() + Math.random(), x: s.ship.x, y: s.ship.y - 30, vy: -BULLET_SPEED });
      s.bulletCooldown = 0.18;
    }

    // Bullets
    s.bullets = s.bullets.filter(b => b.y > -20);
    s.bullets.forEach(b => { b.y += b.vy * dt * 60; });

    // Enemy spawn
    s.enemySpawnTimer -= dt * 1000;
    if (s.enemySpawnTimer <= 0) {
      spawnEnemy();
      s.enemySpawnTimer = Math.max(400, ENEMY_SPAWN_INTERVAL - s.wave * 80);
    }

    // Enemies
    s.enemies.forEach(e => {
      e.x += e.vx * dt * 60;
      e.y += e.vy * dt * 60;
      if (e.x < 20 || e.x > W - 20) e.vx *= -1;
    });
    s.enemies = s.enemies.filter(e => e.y < H + 60);

    // Bullet-enemy collision
    const bulletsToRemove = new Set<number>();
    const enemiesToRemove = new Set<number>();
    s.bullets.forEach(b => {
      s.enemies.forEach(e => {
        const r = e.type === 'boss' ? 32 : e.type === 'heavy' ? 20 : 14;
        if (Math.abs(b.x - e.x) < r && Math.abs(b.y - e.y) < r) {
          bulletsToRemove.add(b.id);
          e.hp--;
          if (e.hp <= 0) {
            enemiesToRemove.add(e.id);
            const pts = e.type === 'boss' ? 500 : e.type === 'heavy' ? 150 : 50;
            s.score += pts;
            spawnParticles(e.x, e.y, e.type === 'boss' ? '#ff2244' : e.type === 'heavy' ? '#f59e0b' : '#ef4444', e.type === 'boss' ? 40 : 20);
          } else {
            spawnParticles(e.x, e.y, '#ffffff', 6);
          }
        }
      });
    });
    s.bullets = s.bullets.filter(b => !bulletsToRemove.has(b.id));
    s.enemies = s.enemies.filter(e => !enemiesToRemove.has(e.id));

    // Enemy-ship collision
    s.enemies.forEach(e => {
      const r = e.type === 'boss' ? 36 : e.type === 'heavy' ? 22 : 16;
      if (Math.abs(e.x - s.ship.x) < r + 16 && Math.abs(e.y - s.ship.y) < r + 16) {
        s.lives--;
        spawnParticles(s.ship.x, s.ship.y, '#10b981', 30);
        s.enemies = s.enemies.filter(en => en.id !== e.id);
        if (s.lives <= 0) {
          s.isPlaying = false;
          s.gameOver = true;
          if (s.score > s.highScore) s.highScore = s.score;
          setHighScore(s.highScore);
          setGameOver(true);
          setIsPlaying(false);
        }
      }
    });

    // Particles
    s.particles.forEach(p => { p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; p.life -= dt * 1.5; p.vx *= 0.96; p.vy *= 0.96; });
    s.particles = s.particles.filter(p => p.life > 0);

    // Wave progression
    const newWave = Math.floor(s.score / 1000) + 1;
    if (newWave !== s.wave) s.wave = newWave;

    setDisplayScore(s.score);
    setDisplayLives(s.lives);
    setDisplayWave(s.wave);
  }, [spawnEnemy, spawnParticles]);

  const loop = useCallback((time: number) => {
    const s = stateRef.current;
    const dt = Math.min((time - s.lastTime) / 1000, 0.05);
    s.lastTime = time;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    update(dt);
    draw(ctx);
    s.frameId = requestAnimationFrame(loop);
  }, [update, draw]);

  useEffect(() => {
    const s = stateRef.current;
    if (!s.isPlaying) return;
    s.lastTime = performance.now();
    s.frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(s.frameId);
  }, [isPlaying, loop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { stateRef.current.keys[e.key] = e.type === 'keydown'; };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
  }, []);

  const startGame = () => {
    const s = stateRef.current;
    s.ship = { x: W / 2, y: H - 100, vx: 0, vy: 0 };
    s.bullets = []; s.enemies = []; s.particles = [];
    s.score = 0; s.lives = 3; s.wave = 1;
    s.bulletCooldown = 0; s.enemySpawnTimer = 0;
    s.isPlaying = true; s.gameOver = false;
    setDisplayScore(0); setDisplayLives(3); setDisplayWave(1);
    setGameOver(false); setIsPlaying(true);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#020408' }}>
      <header className="h-14 border-b border-white/5 flex items-center px-6 justify-between bg-black/60 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
            <Rocket size={18} className="text-emerald-400" />
          </div>
          <span className="font-black text-white uppercase tracking-widest text-xs">Uzay Savaşı</span>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Rekor</div>
            <div className="text-lg font-black text-amber-400 flex items-center gap-1"><Trophy size={12} />{highScore}</div>
          </div>
          <div className="text-center">
            <div className="text-[9px] text-white/30 uppercase tracking-widest font-bold">Dalga</div>
            <div className="text-lg font-black text-purple-400">{displayWave}</div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <canvas ref={canvasRef} width={W} height={H} className="max-w-full max-h-full" style={{ imageRendering: 'pixelated' }} />

        <AnimatePresence>
          {!isPlaying && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center"
              style={{ background: 'radial-gradient(ellipse at center, rgba(2,4,8,0.85) 0%, rgba(2,4,8,0.97) 100%)' }}>
              <motion.div animate={{ y: [0, -12, 0], filter: ['drop-shadow(0 0 20px #10b981)', 'drop-shadow(0 0 40px #10b981)', 'drop-shadow(0 0 20px #10b981)'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="mb-8">
                <Rocket size={80} className="text-emerald-400" />
              </motion.div>
              <h1 className="text-5xl font-black text-white mb-2 tracking-tighter">
                {gameOver ? 'OYUN BİTTİ' : 'UZAY SAVAŞI'}
              </h1>
              {gameOver && (
                <div className="mb-6 text-center">
                  <div className="text-white/40 text-sm font-bold uppercase tracking-widest mb-1">Son Skor</div>
                  <div className="text-4xl font-black text-emerald-400">{displayScore}</div>
                </div>
              )}
              {!gameOver && (
                <p className="text-white/40 mb-8 text-center max-w-xs leading-relaxed">
                  Ok tuşları ile hareket et. Otomatik ateş açık.<br />
                  <span className="text-amber-400 font-bold">Boss</span> düşmanlardan kaç!
                </p>
              )}
              <motion.button whileHover={{ scale: 1.05, y: -3 }} whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-lg text-black"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 40px rgba(16,185,129,0.4)' }}>
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
