import { useState, useEffect, useRef } from 'react';
import { Search, Hash, X, ArrowRight, Flame, Sparkles, ChevronDown, ChevronUp, Bot, Bell, User } from 'lucide-react';
import { db, auth } from '../firebase';
import { ref, get } from 'firebase/database';
import DiscoverRecommendationsCard from './DiscoverRecommendationsCard';
import { getPersonalizedDiscovery, getUserInterests } from '../services/aiDiscoveryService';
import { buildSmartNotificationBundle } from '../services/aiSmartNotificationService';
import { buildSmartNotifications } from '../services/aiNotificationService';
import { searchUsers, getPopularUsers } from '../services/profileService';
import { getTrendingHashtags } from '../services/hashtagService';
import type { UserProfile } from '../types/profile';

interface GlobalSearchProps {
  theme: any;
  onNavigate: (type: 'channel' | 'user' | 'message' | 'profile', id: string) => void;
}

type TrendingItem = {
  id: string;
  name: string;
  kind: 'channel' | 'guild';
  score: number;
  meta: string;
};

function scoreName(name: string, base: number) {
  const bonus = /genel|duyuru|nature|bot|live/i.test(name) ? 8 : 0;
  return base + bonus;
}

export const GlobalSearch = ({ theme, onNavigate }: GlobalSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ channels: any[], users: any[], messages: any[], profiles: UserProfile[] }>({ channels: [], users: [], messages: [], profiles: [] });
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('search_recent') || '[]');
      // UID gibi görünen (20+ karakter alfanumerik) girişleri temizle
      return saved.filter((r: string) => !/^[A-Za-z0-9]{20,}$/.test(r));
    } catch { return []; }
  });
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [suggested, setSuggested] = useState<TrendingItem[]>([]);
  const [popularUsers, setPopularUsers] = useState<UserProfile[]>([]);
  const [communitySummary, setCommunitySummary] = useState('');
  const loadCollapse = (key: string, def: boolean) => { try { const v = localStorage.getItem('gs_' + key); return v !== null ? v === '1' : def; } catch { return def; } };
  const saveCollapse = (key: string, val: boolean) => { try { localStorage.setItem('gs_' + key, val ? '1' : '0'); } catch {} };
  const [communitySummaryCollapsed, setCommunitySummaryCollapsedRaw] = useState(() => loadCollapse('communitySummary', true));
  const [suggestedCollapsed, setSuggestedCollapsedRaw] = useState(() => loadCollapse('suggested', true));
  const [growthCollapsed, setGrowthCollapsedRaw] = useState(() => loadCollapse('growth', true));
  const [aiProfileCollapsed, setAiProfileCollapsedRaw] = useState(() => loadCollapse('aiProfile', true));
  const [notifPreviewCollapsed, setNotifPreviewCollapsedRaw] = useState(() => loadCollapse('notifPreview', true));
  const [smartNotifsCollapsed, setSmartNotifsCollapsedRaw] = useState(() => loadCollapse('smartNotifs', true));
  const [trendingCollapsed, setTrendingCollapsedRaw] = useState(() => loadCollapse('trending', false));
  const [popularUsersCollapsed, setPopularUsersCollapsedRaw] = useState(() => loadCollapse('popularUsers', false));
  const [trendTagsCollapsed, setTrendTagsCollapsedRaw] = useState(() => loadCollapse('trendTags', true));
  const setCommunitySummaryCollapsed = (v: boolean) => { setCommunitySummaryCollapsedRaw(v); saveCollapse('communitySummary', v); };
  const setSuggestedCollapsed = (v: boolean) => { setSuggestedCollapsedRaw(v); saveCollapse('suggested', v); };
  const setGrowthCollapsed = (v: boolean) => { setGrowthCollapsedRaw(v); saveCollapse('growth', v); };
  const setAiProfileCollapsed = (v: boolean) => { setAiProfileCollapsedRaw(v); saveCollapse('aiProfile', v); };
  const setNotifPreviewCollapsed = (v: boolean) => { setNotifPreviewCollapsedRaw(v); saveCollapse('notifPreview', v); };
  const setSmartNotifsCollapsed = (v: boolean) => { setSmartNotifsCollapsedRaw(v); saveCollapse('smartNotifs', v); };
  const setTrendingCollapsed = (v: boolean) => { setTrendingCollapsedRaw(v); saveCollapse('trending', v); };
  const setPopularUsersCollapsed = (v: boolean) => { setPopularUsersCollapsedRaw(v); saveCollapse('popularUsers', v); };
  const setTrendTagsCollapsed = (v: boolean) => { setTrendTagsCollapsedRaw(v); saveCollapse('trendTags', v); };
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [smartNotifs, setSmartNotifs] = useState<string[]>([]);
  const [trendTopics, setTrendTopics] = useState<string[]>([]);
  const [notifPreview, setNotifPreview] = useState<any[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<{ tag: string; count: number }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchCoach = userInterests.length ? `${userInterests.slice(0, 2).join(', ')} ilgilerine göre aramayı daraltabilirsin.` : 'Daha iyi sonuç için konu, ilgi alanı veya topluluk adı yaz.';

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    loadDiscovery();
    getUserInterests(auth.currentUser?.uid).then(setUserInterests).catch(() => setUserInterests([]));
    buildSmartNotificationBundle(auth.currentUser?.uid).then((result: any) => {
      const items = Array.isArray(result) ? result : (result?.priority || result?.discovery || []);
      setNotifPreview(items.slice(0, 3));
    }).catch(() => setNotifPreview([]));
    
    // Load popular users
    getPopularUsers(10).then(setPopularUsers).catch(() => setPopularUsers([]));
    // Trending hashtags
    getTrendingHashtags(20).then(setTrendingHashtags).catch(() => setTrendingHashtags([]));
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ channels: [], users: [], messages: [], profiles: [] });
      setAiSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      doSearch(query.trim());
      getPersonalizedDiscovery(auth.currentUser?.uid).then((res: any) => {
        const arr = Array.isArray(res) ? res : [];
        setAiSuggestions(arr);
      }).catch(() => setAiSuggestions([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadDiscovery = async () => {
    try {
      const [chanSnap, guildSnap] = await Promise.all([
        get(ref(db, 'channels')),
        get(ref(db, 'guilds')),
      ]);

      const trendItems: TrendingItem[] = [];
      const chanData = chanSnap.val() || {};
      Object.entries(chanData).forEach(([id, val]: any) => {
        const name = val?.name || id;
        const base = Number(val?.order || val?.onlineCount || 0);
        trendItems.push({ id: String(id), name, kind: 'channel', score: scoreName(name, base), meta: `Metin kanalı · Skor ${scoreName(name, base)}` });
      });
      const guildData = guildSnap.val() || {};
      Object.entries(guildData).forEach(([id, val]: any) => {
        const name = val?.name || id;
        const members = Number(val?.memberCount || val?.membersCount || val?.onlineCount || 1);
        trendItems.push({ id: String(id), name, kind: 'guild', score: members * 2, meta: `${members} üye · Skor ${members * 2}` });
      });

      const sorted = trendItems.sort((a, b) => b.score - a.score).slice(0, 6);
      setTrending(sorted);
      setSuggested(sorted.slice(0, 3));
      const topChannels = sorted.filter(i => i.kind === 'channel').slice(0, 2).map(i => i.name);
      const topGuilds = sorted.filter(i => i.kind === 'guild').slice(0, 1).map(i => i.name);
      const topics = [...topChannels, ...topGuilds].filter(Boolean);
      setTrendTopics(topics);
      setSmartNotifs(buildSmartNotifications(userInterests, topics, topChannels[0] || 'Genel'));
      setCommunitySummary(`Topluluk AI özeti: şu anda öne çıkan alanlar ${topics.join(', ') || 'henüz belirgin değil'}. En yüksek hareketlilik bu alanlarda görünüyor.`);
    } catch {
      setTrending([]); setSuggested([]);
    }
  };

  useEffect(() => {
    setSmartNotifs(buildSmartNotifications(userInterests, trendTopics, trendTopics[0] || 'Genel'));
  }, [userInterests, trendTopics]);

  const doSearch = async (q: string) => {
    setLoading(true);
    const lq = q.toLowerCase();
    try {
      const [chanSnap, userSnap, profileResults] = await Promise.all([
        get(ref(db, 'channels')), 
        get(ref(db, 'users')),
        searchUsers(q, 10).catch(() => [] as UserProfile[])
      ]);
      
      const channels: any[] = [];
      const chanData = chanSnap.val() || {};
      Object.entries(chanData).forEach(([id, val]: any) => {
        if ((val.name || '').toLowerCase().includes(lq)) channels.push({ id, ...val });
      });
      
      const users: any[] = [];
      const userData = userSnap.val() || {};
      Object.entries(userData).forEach(([id, val]: any) => {
        const username = val.username || id;
        if (username.toLowerCase().includes(lq)) users.push({ id, username, avatar: val.avatar || '', status: val.status });
      });
      
      setResults({ 
        channels: channels.slice(0, 5), 
        users: users.slice(0, 5), 
        messages: [],
        profiles: profileResults
      });
    } catch {
      setResults({ channels: [], users: [], messages: [], profiles: [] });
    } finally { setLoading(false); }
  };

  const handleSelect = (type: 'channel' | 'user' | 'message' | 'profile', id: string, label: string) => {
    // UID gibi görünen label'ları Son Aramalar'a kaydetme
    const isUid = /^[A-Za-z0-9]{20,}$/.test(label);
    if (!isUid) {
      const newRecent = [label, ...recent.filter(r => r !== label)].slice(0, 5);
      setRecent(newRecent);
      try { localStorage.setItem('search_recent', JSON.stringify(newRecent)); } catch {}
    }
    onNavigate(type, id);
  };

  const totalResults = results.channels.length + results.users.length + results.messages.length + results.profiles.length;

  return (
    <div className="h-full min-h-0 flex flex-col" style={{ background: '#0B0E11', backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)' }}>
      <div className="p-6 border-b border-white/5 shrink-0">
        <div className="relative max-w-3xl mx-auto">
          <Search size={20} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" />
          <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)} placeholder="Kanal, kullanıcı veya mesaj ara..." className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-12 py-4 text-white text-base focus:outline-none focus:border-emerald-500/50 transition-all" />
          {query && <button onClick={() => setQuery('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-all"><X size={16} /></button>}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-16 max-w-3xl mx-auto w-full custom-scrollbar">
        {!query && (
          <div className="space-y-6">
            {recent.length > 0 && (
              <div>
                <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Son Aramalar</p>
                <div className="flex flex-wrap gap-2">
                  {recent.map(r => <button key={r} onClick={() => setQuery(r)} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all">{r}</button>)}
                </div>
              </div>
            )}

            {popularUsers.length > 0 && (
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-4">
                <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => setPopularUsersCollapsed(!popularUsersCollapsed)}>
                  <div>
                    <div className="text-white text-lg font-bold flex items-center gap-2"><User size={18} className="text-emerald-400" /> Popüler Kullanıcılar</div>
                    <div className="text-white/40 text-sm">En çok takip edilen kullanıcıları keşfet.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-xs font-semibold">Keşfet</div>
                    {popularUsersCollapsed ? <ChevronDown size={16} className="text-white/40" /> : <ChevronUp size={16} className="text-white/40" />}
                  </div>
                </div>
                {!popularUsersCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {popularUsers.map((user, index) => (
                    <button 
                      key={user.id} 
                      onClick={e => { e.stopPropagation(); handleSelect('profile', user.id, user.username); }}
                      className="text-left rounded-2xl border border-white/10 bg-black/10 p-4 hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.username} className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 font-bold text-lg">
                              {user.username.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          {user.is_verified && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-semibold truncate">{user.displayName || user.username}</div>
                          <div className="text-white/40 text-sm truncate">@{user.username}</div>
                        </div>
                      </div>
                      {user.bio && (
                        <div className="text-white/60 text-sm mt-2 line-clamp-2">{user.bio}</div>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-white/40">
                        <span>#{index + 1} · Popüler</span>
                        <span>{user.eco_points || 0} Eco Points</span>
                      </div>
                    </button>
                  ))}
                </div>
                )}
              </div>
            )}

            <div className="rounded-3xl border border-cyan-500/15 bg-cyan-500/5 p-5">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setGrowthCollapsed(!growthCollapsed)}>
                <div className="text-white font-bold flex items-center gap-2"><Flame size={16} className="text-cyan-300" /> Growth Intelligence</div>
                {growthCollapsed ? <ChevronDown size={16} className="text-white/40" /> : <ChevronUp size={16} className="text-white/40" />}
              </div>
              {!growthCollapsed && (
              <div className="space-y-2 text-sm text-white/70 mt-3">
                <div>Trend Detection: {trendTopics.length ? trendTopics.slice(0,3).join(', ') : 'Henüz trend yok'}</div>
                <div>Smart Community Suggestions: {suggested.length ? suggested.map((s) => s.name).join(', ') : 'Hazırlanıyor'}</div>
                <div>Retention AI: Son aktif toplulukları öne çıkar.</div>
                <div>User Growth Radar: En çok büyüyen alanları admin panelde takip et.</div>
              </div>
              )}
            </div>

            {userInterests.length > 0 && (
              <div className="rounded-3xl border border-emerald-500/15 bg-emerald-500/5 p-5">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setAiProfileCollapsed(!aiProfileCollapsed)}>
                  <div className="text-white font-bold flex items-center gap-2"><Bot size={16} className="text-emerald-300" /> AI profiline göre öneri</div>
                  {aiProfileCollapsed ? <ChevronDown size={16} className="text-white/40" /> : <ChevronUp size={16} className="text-white/40" />}
                </div>
                {!aiProfileCollapsed && (
                <>
                <div className="flex flex-wrap gap-2 mb-3 mt-3">
                  {userInterests.map((interest) => <span key={interest} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">{interest}</span>)}
                </div>
                <div className="text-sm text-white/50">Arama yaptığında AI bu ilgi alanlarını kullanarak daha isabetli topluluk ve kanal önerileri üretir.</div>
                </>
                )}
              </div>
            )}

            {notifPreview.length > 0 && (
              <div className="rounded-3xl border border-amber-500/15 bg-amber-500/5 p-5">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setNotifPreviewCollapsed(!notifPreviewCollapsed)}>
                  <div className="text-white font-bold flex items-center gap-2"><Bell size={16} className="text-amber-300" /> Smart Notifications v2 Önizleme</div>
                  {notifPreviewCollapsed ? <ChevronDown size={16} className="text-white/40" /> : <ChevronUp size={16} className="text-white/40" />}
                </div>
                {!notifPreviewCollapsed && (
                <div className="space-y-2 mt-3">
                  {notifPreview.map((item) => (
                    <button key={item.id} onClick={() => item.channel && setQuery(item.channel)} className="w-full text-left rounded-2xl border border-white/10 bg-black/10 p-3 hover:bg-white/5">
                      <div className="text-sm text-white font-medium">{item.title}</div>
                      <div className="text-xs text-white/55 mt-1">{item.body}</div>
                    </button>
                  ))}
                </div>
                )}
              </div>
            )}

            {smartNotifs.length > 0 && (
              <div className="rounded-3xl border border-violet-500/15 bg-violet-500/5 p-5">
                <div className="flex items-center justify-between cursor-pointer" onClick={() => setSmartNotifsCollapsed(!smartNotifsCollapsed)}>
                  <div className="text-white font-bold flex items-center gap-2"><Sparkles size={16} className="text-violet-300" /> AI Bildirim Merkezi</div>
                  {smartNotifsCollapsed ? <ChevronDown size={16} className="text-white/40" /> : <ChevronUp size={16} className="text-white/40" />}
                </div>
                {!smartNotifsCollapsed && (
                <div className="space-y-2 mt-3">
                  {smartNotifs.map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-black/10 p-3 text-sm text-white/75">{item}</div>
                  ))}
                </div>
                )}
              </div>
            )}

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 cursor-pointer" onClick={() => setTrendingCollapsed(!trendingCollapsed)}>
                <div>
                  <div className="text-white text-lg font-bold flex items-center gap-2"><Flame size={18} className="text-orange-400" /> Trending Communities</div>
                  <div className="text-white/40 text-sm">Şu anda en çok öne çıkan kanal ve topluluklar.</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-300 text-xs font-semibold">Discover</div>
                  {trendingCollapsed ? <ChevronDown size={16} className="text-white/40" /> : <ChevronUp size={16} className="text-white/40" />}
                </div>
              </div>
              {!trendingCollapsed && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trending.map((item, index) => (
                  <button key={`${item.kind}-${item.id}`} onClick={() => item.kind === 'channel' ? handleSelect('channel', item.id, item.name) : undefined} className="text-left rounded-2xl border border-white/10 bg-black/10 p-4 hover:bg-white/5 transition-all">
                    <div className="text-xs uppercase tracking-wider text-white/35">#{index + 1} · {item.kind === 'channel' ? 'Kanal' : 'Topluluk'}</div>
                    <div className="text-white font-semibold mt-2 flex items-center gap-2">{item.kind === 'channel' ? <Hash size={16} className="text-emerald-400" /> : <Sparkles size={16} className="text-cyan-400" />}<span>{item.name}</span></div>
                    <div className="text-white/45 text-sm mt-3">{item.meta}</div>
                  </button>
                ))}
              </div>
              )}
            </div>

            <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-6 space-y-3">
              <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => setCommunitySummaryCollapsed(!communitySummaryCollapsed)}>
                <div className="text-white text-lg font-bold">Topluluk AI Özeti</div>
                <button type="button" className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white transition-all flex items-center gap-1">{communitySummaryCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}{communitySummaryCollapsed ? 'Aç' : 'Kapat'}</button>
              </div>
              {!communitySummaryCollapsed && <div className="text-sm text-cyan-100/90 leading-6">{communitySummary || 'Topluluk dinamikleri analiz ediliyor...'}</div>}
            </div>

            <div className="rounded-3xl border border-cyan-500/15 bg-cyan-500/5 p-6 space-y-3">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setTrendTagsCollapsed(!trendTagsCollapsed)}>
                <div className="text-white text-lg font-bold flex items-center gap-2"><Hash size={18} className="text-cyan-400" /> Trend Başlıklar & Etiketler</div>
                {trendTagsCollapsed ? <ChevronDown size={16} className="text-white/40" /> : <ChevronUp size={16} className="text-white/40" />}
              </div>
              {!trendTagsCollapsed && (
              <>
              {trendTopics.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {trendTopics.map((topic) => (
                    <button key={topic} onClick={e => { e.stopPropagation(); setQuery(topic); }} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-cyan-100 hover:bg-white/10">
                      {topic}
                    </button>
                  ))}
                </div>
              )}
              {trendingHashtags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {trendingHashtags.map((h) => (
                    <button key={h.tag} onClick={e => { e.stopPropagation(); setQuery('#' + h.tag); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300 hover:bg-emerald-500/20 transition-all">
                      <Hash size={11} />
                      <span>{h.tag}</span>
                      <span className="text-[10px] text-emerald-400/60 ml-0.5">{h.count}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-white/40 text-sm">Henüz etiket yok. Mesajlarda #etiket kullanınca burada görünür.</span>
              )}
              </>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4">
              <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => setSuggestedCollapsed(!suggestedCollapsed)}>
                <div className="text-white text-lg font-bold">Önerilen Alanlar</div>
                <button type="button" className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white transition-all flex items-center gap-1">{suggestedCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}{suggestedCollapsed ? 'Aç' : 'Kapat'}</button>
              </div>
              {!suggestedCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggested.length === 0 ? <div className="text-white/40 text-sm">Öneri bulunamadı.</div> : suggested.map((item) => (
                    <button key={`suggest-${item.kind}-${item.id}`} onClick={e => { e.stopPropagation(); item.kind === 'channel' ? handleSelect('channel', item.id, item.name) : undefined; }} className="text-left rounded-2xl border border-white/10 bg-black/10 p-4 hover:bg-white/5 transition-all flex items-center justify-between gap-3">
                      <div><div className="text-white font-semibold">{item.name}</div><div className="text-white/40 text-sm mt-1">{item.meta}</div></div><ArrowRight size={16} className="text-white/35" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {query && (
          <div className="space-y-6">
            <div className="flex items-center justify-between text-sm text-white/40">
              <span>{loading ? 'Aranıyor...' : `${totalResults} sonuç bulundu`}</span>
            </div>

            <div className="rounded-3xl border border-emerald-500/15 bg-emerald-500/5 p-5 space-y-3">
              <div className="text-white font-bold flex items-center gap-2"><Bot size={16} className="text-emerald-300" /> AI Discovery</div>
              {aiSuggestions.length === 0 ? (
                <div className="text-sm text-white/45">AI şu an aramana göre güçlü bir öneri bulamadı. Daha spesifik bir ifade dene.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {aiSuggestions.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      onClick={() => handleSelect(item.type === 'user' ? 'user' : 'channel', item.id, item.name)}
                      className="text-left rounded-2xl border border-white/10 bg-black/10 p-4 hover:bg-white/5 transition-all"
                    >
                      <div className="text-xs uppercase tracking-wider text-white/35">{item.type === 'user' ? 'Kullanıcı' : item.type === 'guild' ? 'Topluluk' : 'Kanal'} · Skor {item.score}</div>
                      <div className="text-white font-semibold mt-2">{item.name}</div>
                      <div className="text-emerald-200/80 text-sm mt-2">{item.reason}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {results.channels.length > 0 && (
              <Section title="Kanallar">
                {results.channels.map(channel => (
                  <ResultRow key={channel.id} icon={<Hash size={16} className="text-emerald-400" />} title={channel.name || channel.id} subtitle={channel.category || 'Kanal'} onClick={() => handleSelect('channel', channel.id, channel.name || channel.id)} />
                ))}
              </Section>
            )}

            {results.users.length > 0 && (
              <Section title="Kullanıcılar">
                {results.users.map(user => (
                  <ResultRow key={user.id} icon={<div className="w-6 h-6 rounded-full bg-emerald-500/20 text-xs flex items-center justify-center text-white">{(user.username || '?').slice(0,1).toUpperCase()}</div>} title={user.username} subtitle={user.status || 'offline'} onClick={() => handleSelect('user', user.id, user.username)} />
                ))}
              </Section>
            )}

            {results.profiles.length > 0 && (
              <Section title="Profiller">
                {results.profiles.map(profile => (
                  <button 
                    key={profile.id} 
                    onClick={() => handleSelect('profile', profile.id, profile.username)}
                    className="w-full text-left rounded-2xl border border-white/10 bg-black/10 p-4 hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {profile.avatar ? (
                          <img src={profile.avatar} alt={profile.username} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-300 font-bold">
                            {profile.username.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        {profile.is_verified && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{profile.displayName || profile.username}</div>
                        <div className="text-white/40 text-sm truncate">@{profile.username}</div>
                      </div>
                      <ArrowRight size={16} className="text-white/30" />
                    </div>
                    {profile.bio && (
                      <div className="text-white/60 text-sm mt-2 line-clamp-1">{profile.bio}</div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                      <span>{profile.eco_points || 0} Eco Points</span>
                      {profile.is_admin && <span className="text-amber-400">Admin</span>}
                    </div>
                  </button>
                ))}
              </Section>
            )}

            {totalResults === 0 && !loading && (
              <div className="rounded-3xl border border-dashed border-white/10 p-8 text-center text-white/40">Sonuç bulunamadı.</div>
            )}
          </div>
        )}

        <div className="mt-6">
          <DiscoverRecommendationsCard />
        </div>
      </div>
    </div>
  );
};

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="text-white font-bold mb-3">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ResultRow({ icon, title, subtitle, onClick }: { icon: any; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left rounded-2xl border border-white/10 bg-black/10 p-4 hover:bg-white/5 transition-all flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div>{icon}</div>
        <div className="min-w-0">
          <div className="text-white font-medium truncate">{title}</div>
          <div className="text-white/40 text-sm truncate">{subtitle}</div>
        </div>
      </div>
      <ArrowRight size={16} className="text-white/30" />
    </button>
  );
}
