import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Gamepad2, Trophy, Target, Play, Star, Zap, Timer, Sparkles, Server, Users, BookOpen, Link2, Plus, ChevronRight, ExternalLink, Shield, Clock, Rocket, Gem } from 'lucide-react';
import { db, auth } from '../firebase';
import { ref, onValue, push, set, serverTimestamp } from 'firebase/database';
import { SpaceGame } from './SpaceGame';
import { CrystalGame } from './CrystalGame';

type Tab = 'servers' | 'profile' | 'tournaments' | 'minigame' | 'space' | 'crystal';

// ─── Sunucu Dizini ────────────────────────────────────────────────────────────
const ServerDirectory = ({ userId, theme }: { userId: string; theme: any }) => {
  const { t } = useTranslation();
  const [servers, setServers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', game: 'Minecraft', ip: '', description: '' });

  useEffect(() => {
    const r = ref(db, 'game_servers');
    const unsub = onValue(r, snap => {
      const data = snap.val() || {};
      setServers(Object.entries(data).map(([id, v]: any) => ({ id, ...v })));
    });
    return () => unsub();
  }, []);

  const addServer = async () => {
    if (!form.name || !form.ip) return;
    await push(ref(db, 'game_servers'), {
      ...form,
      owner: userId,
      approved: false,
      createdAt: serverTimestamp(),
      votes: 0,
    });
    setForm({ name: '', game: 'Minecraft', ip: '', description: '' });
    setShowAdd(false);
  };

  const GAMES = ['Minecraft', 'Valheim', 'Rust', 'ARK', 'Terraria', 'Diğer'];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-white">{t('games.serverDirectory')}</h2>
            <p className="text-sm text-white/40 mt-1">{t('games.serverDirectoryDesc')}</p>
          </div>
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm font-bold hover:bg-emerald-500/30 transition-all">
            <Plus size={16} /> {t('games.addServer')}
          </button>
        </div>

        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-5 bg-white/5 border border-white/10 rounded-2xl">
              <h3 className="text-sm font-black text-white mb-4 uppercase tracking-widest">{t('games.serverInfo')}</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder={t('games.serverNamePlaceholder')} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50" />
                <select value={form.game} onChange={e => setForm(p => ({ ...p, game: e.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50">
                  {GAMES.map(g => <option key={g} value={g} className="bg-[#111]">{g}</option>)}
                </select>
              </div>
              <input value={form.ip} onChange={e => setForm(p => ({ ...p, ip: e.target.value }))}
                placeholder={t('games.ipPlaceholder')} className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 mb-3" />
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder={t('games.descriptionPlaceholder')} rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 mb-3 resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowAdd(false)} className="flex-1 py-2 bg-white/5 text-white/50 rounded-xl text-sm">{t('common.cancel')}</button>
                <button onClick={addServer} className="flex-1 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold">{t('games.submit')}</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {servers.length === 0 ? (
          <div className="text-center py-20 text-white/20">
            <Server size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold">{t('games.noServers')}</p>
            <p className="text-sm mt-1">{t('games.firstServer')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {servers.map(s => (
              <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                      <Gamepad2 size={20} className="text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{s.name}</span>
                        {s.approved && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Shield size={10} /> {t('games.approved')}</span>}
                        {!s.approved && <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Clock size={10} /> {t('games.pending')}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-white/40">{s.game}</span>
                        <span className="text-white/20">·</span>
                        <span className="text-xs text-white/40 font-mono">{s.ip}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {s.description && <p className="text-sm text-white/50 mt-2 ml-13">{s.description}</p>}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Oyun Profili ─────────────────────────────────────────────────────────────
const GameProfile = ({ userId }: { userId: string }) => {
  const { t } = useTranslation();
  const [mcUsername, setMcUsername] = useState('');
  const [mcInput, setMcInput] = useState('');
  const [mcSkin, setMcSkin] = useState('');
  const [steamId, setSteamId] = useState('');
  const [steamInput, setSteamInput] = useState('');

  useEffect(() => {
    if (!userId) return;
    const r = ref(db, `users/${userId}/gameProfile`);
    onValue(r, snap => {
      const d = snap.val() || {};
      if (d.mcUsername) { setMcUsername(d.mcUsername); setMcSkin(`https://mc-heads.net/avatar/${d.mcUsername}/64`); }
      if (d.steamId) setSteamId(d.steamId);
    });
  }, [userId]);

  const saveMc = async () => {
    if (!mcInput.trim()) return;
    await set(ref(db, `users/${userId}/gameProfile/mcUsername`), mcInput.trim());
    setMcUsername(mcInput.trim());
    setMcSkin(`https://mc-heads.net/avatar/${mcInput.trim()}/64`);
    setMcInput('');
  };

  const saveSteam = async () => {
    if (!steamInput.trim()) return;
    await set(ref(db, `users/${userId}/gameProfile/steamId`), steamInput.trim());
    setSteamId(steamInput.trim());
    setSteamInput('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-black text-white">{t('games.gameProfile')}</h2>
          <p className="text-sm text-white/40 mt-1">{t('games.gameProfileDesc')}</p>
        </div>

        {/* Minecraft */}
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center text-lg">⛏️</div>
            <div>
              <h3 className="font-bold text-white">Minecraft</h3>
              <p className="text-xs text-white/40">{t('games.mcDesc')}</p>
            </div>
          </div>
          {mcUsername ? (
            <div className="flex items-center gap-4">
              <img src={mcSkin} alt={mcUsername} className="w-16 h-16 rounded-xl border border-white/10" onError={e => (e.currentTarget.style.display = 'none')} />
              <div>
                <div className="font-bold text-white">{mcUsername}</div>
                <button onClick={() => setMcUsername('')} className="text-xs text-white/30 hover:text-white/60 mt-1">{t('games.change')}</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input value={mcInput} onChange={e => setMcInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveMc()}
                placeholder={t('games.mcPlaceholder')} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-green-500/50" />
              <button onClick={saveMc} className="px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-xl text-sm font-bold hover:bg-green-500/30 transition-all">{t('games.connect')}</button>
            </div>
          )}
        </div>

        {/* Steam */}
        <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-lg">🎮</div>
            <div>
              <h3 className="font-bold text-white">Steam</h3>
              <p className="text-xs text-white/40">{t('games.steamDesc')}</p>
            </div>
          </div>
          {steamId ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/70 font-mono">{steamId}</span>
              </div>
              <div className="flex items-center gap-2">
                <a href={`https://steamcommunity.com/id/${steamId}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                  <ExternalLink size={12} /> {t('games.viewProfile')}
                </a>
                <button onClick={() => setSteamId('')} className="text-xs text-white/30 hover:text-white/60">{t('games.change')}</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input value={steamInput} onChange={e => setSteamInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveSteam()}
                placeholder={t('games.steamPlaceholder')} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-500/50" />
              <button onClick={saveSteam} className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-500/30 transition-all">{t('games.connect')}</button>
            </div>
          )}
        </div>

        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-sm text-amber-400/80">
          <Zap size={14} className="inline mr-2" />
          {t('games.moreIntegrations')}
        </div>
      </div>
    </div>
  );
};

// ─── Turnuvalar ───────────────────────────────────────────────────────────────
const Tournaments = ({ userId }: { userId: string }) => {
  const { t } = useTranslation();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', game: 'Minecraft', maxTeams: '8', date: '', description: '' });

  useEffect(() => {
    const r = ref(db, 'tournaments');
    const unsub = onValue(r, snap => {
      const data = snap.val() || {};
      setTournaments(Object.entries(data).map(([id, v]: any) => ({ id, ...v })));
    });
    return () => unsub();
  }, []);

  const createTournament = async () => {
    if (!form.name || !form.date) return;
    await push(ref(db, 'tournaments'), {
      ...form,
      maxTeams: parseInt(form.maxTeams),
      organizer: userId,
      participants: [],
      status: 'upcoming',
      createdAt: serverTimestamp(),
    });
    setForm({ name: '', game: 'Minecraft', maxTeams: '8', date: '', description: '' });
    setShowCreate(false);
  };

  const join = async (tId: string, current: string[]) => {
    if (current.includes(userId)) return;
    await set(ref(db, `tournaments/${tId}/participants`), [...current, userId]);
  };

  const GAMES = ['Minecraft', 'Valheim', 'Rust', 'ARK', 'Terraria', 'Diğer'];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-white">{t('games.tournaments')}</h2>
            <p className="text-sm text-white/40 mt-1">{t('games.tournamentsDesc')}</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-xl text-sm font-bold hover:bg-purple-500/30 transition-all">
            <Plus size={16} /> {t('games.createTournament')}
          </button>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-5 bg-white/5 border border-white/10 rounded-2xl">
              <h3 className="text-sm font-black text-white mb-4 uppercase tracking-widest">{t('games.tournamentInfo')}</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder={t('games.tournamentNamePlaceholder')} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50" />
                <select value={form.game} onChange={e => setForm(p => ({ ...p, game: e.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50">
                  {GAMES.map(g => <option key={g} value={g} className="bg-[#111]">{g}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input type="datetime-local" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50" />
                <select value={form.maxTeams} onChange={e => setForm(p => ({ ...p, maxTeams: e.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50">
                  {['4','8','16','32'].map(n => <option key={n} value={n} className="bg-[#111]">{n} {t('games.teams')}</option>)}
                </select>
              </div>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder={t('games.descRulesPlaceholder')} rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 mb-3 resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowCreate(false)} className="flex-1 py-2 bg-white/5 text-white/50 rounded-xl text-sm">{t('common.cancel')}</button>
                <button onClick={createTournament} className="flex-1 py-2 bg-purple-500 text-white rounded-xl text-sm font-bold">Oluştur</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {tournaments.length === 0 ? (
          <div className="text-center py-20 text-white/20">
            <Trophy size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-bold">{t('games.noTournaments')}</p>
            <p className="text-sm mt-1">{t('games.firstTournament')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tournaments.map(t => {
              const participants: string[] = t.participants || [];
              const joined = participants.includes(userId);
              const full = participants.length >= t.maxTeams;
              return (
                <motion.div key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                        <Trophy size={20} className="text-purple-400" />
                      </div>
                      <div>
                        <div className="font-bold text-white">{t.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-white/40">{t.game}</span>
                          <span className="text-white/20">·</span>
                          <span className="text-xs text-white/40">{participants.length}/{t.maxTeams} {t('games.participants')}</span>
                          {t.date && <><span className="text-white/20">·</span><span className="text-xs text-white/40">{new Date(t.date).toLocaleDateString('tr-TR')}</span></>}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => join(t.id, participants)} disabled={joined || full}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${joined ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : full ? 'bg-white/5 text-white/30 cursor-not-allowed' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30'}`}>
                      {joined ? `✓ ${t('games.joined')}` : full ? t('games.full') : t('games.join')}
                    </button>
                  </div>
                  {t.description && <p className="text-sm text-white/50 mt-2">{t.description}</p>}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Mini Oyun (mevcut Tohum Toplayıcı) ──────────────────────────────────────
const MiniGame = () => {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [seeds, setSeeds] = useState<{ id: number, x: number, y: number, type: 'normal' | 'gold' }[]>([]);
  const [combo, setCombo] = useState(0);
  const [lastCollectTime, setLastCollectTime] = useState(0);

  const spawnSeed = useCallback(() => {
    const id = Date.now();
    const x = Math.random() * 80 + 10;
    const y = Math.random() * 60 + 20;
    const type = Math.random() > 0.9 ? 'gold' : 'normal';
    setSeeds(prev => [...prev, { id, x, y, type }]);
    setTimeout(() => setSeeds(prev => prev.filter(s => s.id !== id)), type === 'gold' ? 1200 : 2000);
  }, []);

  useEffect(() => {
    let timer: any; let spawner: any;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(p => p - 1), 1000);
      spawner = setInterval(() => { if (Math.random() > 0.3) spawnSeed(); }, 600);
    } else if (timeLeft === 0) {
      setIsPlaying(false);
      if (score > highScore) setHighScore(score);
    }
    return () => { clearInterval(timer); clearInterval(spawner); };
  }, [isPlaying, timeLeft, spawnSeed, score, highScore]);

  const collectSeed = (id: number, type: 'normal' | 'gold') => {
    const now = Date.now();
    const newCombo = now - lastCollectTime < 1000 ? combo + 1 : 1;
    setCombo(newCombo);
    setLastCollectTime(now);
    setScore(p => p + ((type === 'gold' ? 50 : 10) * newCombo));
    setSeeds(p => p.filter(s => s.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>
      <header className="h-16 border-b border-white/5 flex items-center px-8 justify-between bg-black/40 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-purple-500/20 rounded-2xl border border-purple-500/20">
            <Gamepad2 size={20} className="text-purple-400" />
          </div>
          <h3 className="font-black text-white uppercase tracking-[0.3em] text-[11px]">{t('games.seedCollector')}</h3>
        </div>
        <div className="flex items-center gap-12">
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">{t('games.highScore')}</span>
            <div className="flex items-center gap-2"><Trophy size={14} className="text-amber-500" /><span className="text-xl font-black text-white">{highScore}</span></div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">{t('games.score')}</span>
            <div className="flex items-center gap-2"><Target size={14} className="text-emerald-500" /><span className="text-xl font-black text-white">{score}</span></div>
          </div>
        </div>
      </header>
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {!isPlaying ? (
            <motion.div key="start" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-center p-12 z-10">
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-40 h-40 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[56px] flex items-center justify-center mb-10 border border-white/20 shadow-2xl shadow-purple-500/20 relative">
                <div className="absolute inset-0 bg-white/10 blur-2xl rounded-full animate-pulse" />
                <Gamepad2 size={80} className="text-white relative z-10" />
              </motion.div>
              <h2 className="text-6xl font-black text-white mb-6 tracking-tighter">{timeLeft === 0 ? t('games.gameOver') : t('games.ready')}</h2>
              {timeLeft === 0 && (
                <div className="mb-8 p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
                  <div className="text-sm font-bold text-white/40 uppercase tracking-widest mb-2">{t('games.lastScore')}</div>
                  <div className="text-5xl font-black text-emerald-500">{score}</div>
                </div>
              )}
              <p className="text-white/40 mb-10 max-w-sm mx-auto text-lg font-medium leading-relaxed">
                30 saniye içinde tohumları topla. <span className="text-amber-500 font-bold">Altın tohumlar</span> 5x puan verir!
              </p>
              <motion.button whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.95 }}
                onClick={() => { setScore(0); setTimeLeft(30); setIsPlaying(true); setSeeds([]); setCombo(0); }}
                className="px-16 py-5 bg-white text-black rounded-[32px] font-black text-xl shadow-2xl hover:bg-purple-50 transition-all flex items-center gap-4">
                {timeLeft === 0 ? t('games.retry') : t('games.startGame')}<Play size={24} fill="currentColor" />
              </motion.button>
            </motion.div>
          ) : (
            <>
              <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center z-20">
                <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-8 py-4 rounded-[32px] border border-white/10">
                  <Timer size={24} className={timeLeft <= 5 ? 'text-red-500' : 'text-white/40'} />
                  <div className={`text-5xl font-black tabular-nums transition-colors ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</div>
                </div>
              </div>
              <AnimatePresence>
                {combo > 1 && (
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="absolute top-12 left-12 z-20">
                    <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-3 rounded-2xl shadow-2xl border border-white/20">
                      <div className="text-[10px] font-black text-white/60 uppercase tracking-widest">{t('games.combo')}</div>
                      <div className="text-3xl font-black text-white">x{combo}</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="absolute inset-0">
                <AnimatePresence>
                  {seeds.map(s => (
                    <motion.button key={s.id} initial={{ scale: 0, rotate: -90, y: 20 }} animate={{ scale: 1, rotate: 0, y: 0 }} exit={{ scale: 0, opacity: 0, filter: 'blur(10px)' }}
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.8 }} onClick={() => collectSeed(s.id, s.type)}
                      className={`absolute w-20 h-20 rounded-[28px] shadow-2xl flex items-center justify-center border-4 cursor-pointer z-10 ${s.type === 'gold' ? 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300/50 shadow-amber-500/40' : 'bg-gradient-to-br from-emerald-400 to-teal-600 border-emerald-300/50 shadow-emerald-500/40'}`}
                      style={{ left: `${s.x}%`, top: `${s.y}%` }}>
                      {s.type === 'gold' ? <Sparkles size={32} className="text-white" /> : <Star size={32} className="text-white fill-white" />}
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Ana Games Bileşeni ───────────────────────────────────────────────────────
export const Games = ({ theme }: { theme: any }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('servers');
  const userId = auth.currentUser?.uid || '';

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'servers', label: t('games.tabServers'), icon: <Server size={16} /> },
    { id: 'profile', label: t('games.tabProfile'), icon: <Link2 size={16} /> },
    { id: 'tournaments', label: t('games.tabTournaments'), icon: <Trophy size={16} /> },
    { id: 'minigame', label: t('games.tabMiniGame'), icon: <Gamepad2 size={16} /> },
    { id: 'space', label: 'Uzay Savaşı', icon: <Rocket size={16} /> },
    { id: 'crystal', label: 'Kristal Avcısı', icon: <Gem size={16} /> },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#0B0E11', backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)' }}>
      {/* Tab Bar */}
      <div className="h-14 border-b border-white/5 flex items-center px-6 gap-1 bg-black/40 backdrop-blur-xl shrink-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === t.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }} className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'servers' && <ServerDirectory userId={userId} theme={theme} />}
          {activeTab === 'profile' && <GameProfile userId={userId} />}
          {activeTab === 'tournaments' && <Tournaments userId={userId} />}
          {activeTab === 'minigame' && <MiniGame />}
          {activeTab === 'space' && <SpaceGame />}
          {activeTab === 'crystal' && <CrystalGame />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
