/**
 * Nature.co — Doğa Temalı Ses Servisi (24 ses)
 * Web Audio API ile tamamen programatik, harici dosya yok.
 */

let _ctx: AudioContext | null = null;
function ac(): AudioContext {
  if (!_ctx || _ctx.state === 'closed')
    _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function tone(freq: number, type: OscillatorType = 'sine', startT = 0, dur = 0.3, vol = 0.2, freqEnd?: number) {
  try {
    const c = ac(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime + startT);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime + startT + dur);
    g.gain.setValueAtTime(vol, c.currentTime + startT);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startT + dur);
    o.start(c.currentTime + startT); o.stop(c.currentTime + startT + dur);
  } catch (_) {}
}

function noise(dur = 0.2, vol = 0.15, filterFreq = 2000, startT = 0) {
  try {
    const c = ac(), bufSize = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, bufSize, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), flt = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf;
    flt.type = 'bandpass'; flt.frequency.value = filterFreq; flt.Q.value = 1.5;
    src.connect(flt); flt.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(vol, c.currentTime + startT);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startT + dur);
    src.start(c.currentTime + startT); src.stop(c.currentTime + startT + dur);
  } catch (_) {}
}

// ────────────────────────── KUŞLAR ──────────────────────────
export function birdsparrow()   { tone(3200,'sine',0,0.06,0.18,4200); tone(4200,'sine',0.08,0.06,0.15,3000); tone(3500,'sine',0.18,0.08,0.12,4500); }
export function birdbulbul()    { [1320,1568,1760,1568,1320,1046,1175,1320].forEach((f,i)=>tone(f,'sine',i*0.09,0.12,0.2-i*0.01)); }
export function birdwarbler()   { for(let i=0;i<12;i++) tone(2200+Math.sin(i*0.8)*600,'sine',i*0.05,0.04,0.15); }
export function birdcuckoo()    { tone(523,'sine',0,0.18,0.25); tone(392,'sine',0.22,0.22,0.22); }
export function birdowl()       { tone(220,'sine',0,0.5,0.3,180); tone(330,'sine',0.1,0.3,0.1,280); tone(220,'sine',0.65,0.5,0.25,180); }

// ────────────────────────── SU ───────────────────────────────
export function waterdrop()     { tone(1200,'sine',0,0.04,0.3,600); tone(900,'sine',0.04,0.1,0.15,400); noise(0.06,0.08,3000,0); }
export function waterstream()   { [800,1200,1800,2400].forEach((f,i)=>noise(0.5,0.06,f,i*0.02)); }
export function waterrain()     { for(let i=0;i<5;i++){const f=600+Math.random()*800,t=Math.random()*0.3; tone(f,'sine',t,0.05,0.2,f*0.5); noise(0.04,0.06,f*1.5,t);} }
export function watersea()      { [400,700,1100].forEach((f,i)=>{noise(0.7,0.08-i*0.01,f,i*0.05); noise(0.5,0.05,f*1.2,0.4+i*0.05);}); }
export function waterice()      { tone(2400,'triangle',0,0.04,0.35,800); tone(3200,'triangle',0.02,0.03,0.25,1200); tone(1800,'triangle',0.05,0.06,0.2,600); noise(0.08,0.1,5000,0); }
export function dewdrop()       { tone(3600,'sine',0,0.03,0.25,2000); tone(4800,'sine',0.02,0.02,0.18,3200); noise(0.04,0.06,6000,0); }
export function riverflow()     { for(let i=0;i<8;i++) noise(0.12,0.07,600+Math.sin(i*0.7)*300,i*0.06); tone(200,'sine',0,0.5,0.04,180); }

// ────────────────────────── RÜZGAR ───────────────────────────
export function leafrustle()    { noise(0.4,0.12,4000,0); noise(0.3,0.08,6000,0.1); noise(0.2,0.06,3000,0.25); }
export function windgust()      { [300,600,900,1200].forEach((f,i)=>noise(0.6,0.07-i*0.01,f,i*0.04)); tone(180,'sine',0,0.7,0.08,160); }
export function windwhisper()   { noise(0.5,0.05,2000,0); noise(0.4,0.04,3500,0.1); tone(440,'sine',0.1,0.4,0.03,380); }

// ────────────────────────── BÖCEKLER & KURBAĞA ───────────────
export function insectcricket() { for(let i=0;i<16;i++) tone(4200,'square',i*0.035,0.025,0.08); }
export function insectbee()     { tone(220,'sawtooth',0,0.5,0.12,280); tone(440,'sawtooth',0,0.5,0.05,360); noise(0.4,0.04,2000,0.05); }
export function frog()          { tone(180,'sawtooth',0,0.08,0.3,120); tone(240,'square',0.05,0.06,0.2,180); tone(160,'sawtooth',0.12,0.1,0.25,100); noise(0.15,0.1,800,0); }
export function insectcicada()  { for(let i=0;i<20;i++) tone(1800+i*40,'square',i*0.04,0.035,0.06); }

// ────────────────────────── ORMAN ────────────────────────────
export function woodcrack()     { noise(0.05,0.3,800,0); noise(0.08,0.2,1500,0.01); noise(0.12,0.15,400,0.02); }
export function stonewater()    { noise(0.06,0.2,500,0); tone(800,'sine',0,0.05,0.3,300); tone(1200,'sine',0.03,0.08,0.2,500); [800,1200,1600].forEach((f,i)=>noise(0.15,0.06,f,0.06+i*0.04)); }
export function thunder()       { [80,100,120,150].forEach((f,i)=>{noise(1.0,0.15-i*0.02,f,i*0.05); tone(f,'sawtooth',i*0.05,0.4,0.08,f*0.7);}); }
export function leaffall()      { noise(0.04,0.15,3000,0); tone(600,'triangle',0,0.06,0.1,300); tone(900,'triangle',0.05,0.05,0.08,450); }
export function forestmorning() { tone(2600,'sine',0,0.06,0.15,3200); tone(3200,'sine',0.1,0.05,0.12,2800); tone(1760,'sine',0.2,0.08,0.18,2200); tone(2200,'sine',0.32,0.06,0.14,3000); noise(0.6,0.03,4000,0); }

// ─────────────────── ARAMA SESLERİ ───────────────────────────
let _ringInt: ReturnType<typeof setInterval> | null = null;

function ringOnce() { birdbulbul(); setTimeout(() => leafrustle(), 1200); }

export function startRingtone()  { stopRingtone(); ringOnce(); _ringInt = setInterval(ringOnce, 3200); }
export function stopRingtone()   { if (_ringInt) { clearInterval(_ringInt); _ringInt = null; } }
export function playCallConnected() { forestmorning(); }
export function playCallEnded()  { leaffall(); setTimeout(windwhisper, 150); }

// ─────────────────── MESAJ BİLDİRİMLERİ ─────────────────────
const MSG_SOUNDS  = [waterdrop, birdsparrow, dewdrop, leaffall, stonewater, birdwarbler, waterice, insectcricket, woodcrack, birdcuckoo];
const DM_SOUNDS   = [dewdrop, birdsparrow, waterice, leaffall, waterdrop, birdwarbler, insectbee, windwhisper, frog, stonewater];
let _mi = 0, _di = 0;

export function playMessageSound() { try { MSG_SOUNDS[_mi % MSG_SOUNDS.length](); } catch(_){} _mi++; }
export function playDmSound()      { try { DM_SOUNDS[_di % DM_SOUNDS.length](); }  catch(_){} _di++; }

// ─────────────────── TÜM SESLER (ayarlar paneli için) ────────
export const ALL_SOUNDS: Record<string, { label: string; fn: () => void; category: string }> = {
  birdsparrow:   { label: '🐦 Serçe',              fn: birdsparrow,   category: 'Kuşlar'   },
  birdbulbul:    { label: '🎵 Bülbül',             fn: birdbulbul,    category: 'Kuşlar'   },
  birdwarbler:   { label: '🐦 Ötleğen',            fn: birdwarbler,   category: 'Kuşlar'   },
  birdcuckoo:    { label: '🕊️ Guguk',             fn: birdcuckoo,    category: 'Kuşlar'   },
  birdowl:       { label: '🦉 Baykuş',             fn: birdowl,       category: 'Kuşlar'   },
  waterdrop:     { label: '💧 Su Damlası',          fn: waterdrop,     category: 'Su'       },
  waterstream:   { label: '🌊 Akan Su',             fn: waterstream,   category: 'Su'       },
  waterrain:     { label: '🌧️ Yağmur',            fn: waterrain,     category: 'Su'       },
  watersea:      { label: '🌊 Deniz Dalgası',       fn: watersea,      category: 'Su'       },
  waterice:      { label: '🧊 Buz Kristal',         fn: waterice,      category: 'Su'       },
  dewdrop:       { label: '✨ Çiğ Damlası',         fn: dewdrop,       category: 'Su'       },
  riverflow:     { label: '🏞️ Nehir Akışı',        fn: riverflow,     category: 'Su'       },
  leafrustle:    { label: '🍃 Yaprak Hışırtısı',    fn: leafrustle,    category: 'Rüzgar'   },
  windgust:      { label: '💨 Rüzgar Esintisi',     fn: windgust,      category: 'Rüzgar'   },
  windwhisper:   { label: '🌬️ Fısıldayan Rüzgar',  fn: windwhisper,   category: 'Rüzgar'   },
  insectcricket: { label: '🦗 Cırcır Böceği',       fn: insectcricket, category: 'Canlılar' },
  insectbee:     { label: '🐝 Arı Vızıltısı',       fn: insectbee,     category: 'Canlılar' },
  frog:          { label: '🐸 Kurbağa',             fn: frog,          category: 'Canlılar' },
  insectcicada:  { label: '🦟 Ağustos Böceği',      fn: insectcicada,  category: 'Canlılar' },
  woodcrack:     { label: '🌲 Dal Kırılması',       fn: woodcrack,     category: 'Orman'    },
  stonewater:    { label: '🪨 Taş-Su',              fn: stonewater,    category: 'Orman'    },
  thunder:       { label: '⛈️ Gök Gürültüsü',      fn: thunder,       category: 'Orman'    },
  leaffall:      { label: '🍂 Yaprak Düşüşü',       fn: leaffall,      category: 'Orman'    },
  forestmorning: { label: '🌅 Orman Sabahı',        fn: forestmorning, category: 'Orman'    },
};
