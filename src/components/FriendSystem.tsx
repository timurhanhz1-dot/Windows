import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { UserPlus, UserCheck, UserX, Users, Search, Shield, Flag, X, Check, MessageSquare, Clock, Sparkles, UserMinus, Lock } from 'lucide-react';
import { db } from '../firebase';
import { ref, onValue, off, push, set, remove, update, get } from 'firebase/database';

interface Props {
  theme: any;
  userId: string;
  allUsers: any[];
  discoverUsers?: any[];
  onStartDM: (targetId: string) => void;
}

const ACCENT = '#10B981';

function Avatar({ user, size = 44, showStatus = false }: { user: any; size?: number; showStatus?: boolean }) {
  const initials = (user?.username || '?').substring(0, 2).toUpperCase();
  const colors = ['#10B981','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#EC4899','#06B6D4'];
  const color = colors[(user?.username || '').charCodeAt(0) % colors.length];
  const isOnline = user?.status === 'online';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{ width: size, height: size, borderRadius: size * 0.28, overflow: 'hidden', background: color + '22', border: `2px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {user?.avatar
          ? <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
          : <span style={{ fontSize: size * 0.33, fontWeight: 800, color }}>{initials}</span>}
      </div>
      {showStatus && (
        <div style={{ position: 'absolute', bottom: 1, right: 1, width: size * 0.28, height: size * 0.28, borderRadius: '50%', background: isOnline ? '#10B981' : '#6B7280', border: '2px solid #0B0E11' }} />
      )}
    </div>
  );
}

export const FriendSystem = ({ theme, userId, allUsers = [], discoverUsers = [], onStartDM }: Props) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'friends' | 'requests' | 'find' | 'blocked'>('friends');
  const [friends, setFriends] = useState<string[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [incoming, setIncoming] = useState<any[]>([]);
  const [outgoing, setOutgoing] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [fetchedUsers, setFetchedUsers] = useState<Record<string, any>>({});

  // Bilinmeyen kullanıcıları Firebase'den çek
  useEffect(() => {
    const unknownIds = [
      ...incoming.map(r => r.from),
      ...outgoing,
    ].filter(id => id && !allUsers.find(u => u.id === id) && !fetchedUsers[id]);

    if (unknownIds.length === 0) return;
    unknownIds.forEach(async (id) => {
      const snap = await get(ref(db, `users/${id}`));
      if (snap.exists()) {
        setFetchedUsers(prev => ({ ...prev, [id]: { id, ...snap.val() } }));
      } else {
        setFetchedUsers(prev => ({ ...prev, [id]: { id, username: id } }));
      }
    });
  }, [incoming, outgoing, allUsers]);

  const findUser = (id: string) => allUsers.find(u => u.id === id) || fetchedUsers[id];

  useEffect(() => {
    if (!userId) return;
    const uRef = ref(db, `users/${userId}`);
    onValue(uRef, snap => {
      const d = snap.val() || {};
      setFriends(Object.keys(d.friends || {}));
      setBlocked(Object.keys(d.blocked || {}));
    });
    const frRef = ref(db, `friend_requests/${userId}`);
    onValue(frRef, snap => {
      const d = snap.val() || {};
      setIncoming(Object.entries(d).map(([id, v]: any) => ({ id, ...v })));
    });
    const outRef = ref(db, `users/${userId}/outgoing_requests`);
    onValue(outRef, snap => {
      const d = snap.val() || {};
      // Sadece gerçekten bekleyen istekleri göster (friends listesinde olmayanlar)
      const pendingIds = Object.keys(d).filter(id => id);
      setOutgoing(pendingIds);
    });
    return () => {
      off(ref(db, `users/${userId}`));
      off(ref(db, `friend_requests/${userId}`));
      off(ref(db, `users/${userId}/outgoing_requests`));
    };
  }, [userId]);

  const sendRequest = async (targetId: string) => {
    const reqRef = await push(ref(db, `friend_requests/${targetId}`), { from: userId, timestamp: new Date().toISOString() });
    if (reqRef.key) await update(ref(db, `users/${userId}/outgoing_requests`), { [targetId]: true });
    await push(ref(db, `notifications/${targetId}`), {
      type: 'friend_request', from_id: userId,
      content: `${allUsers.find(u => u.id === userId)?.username || 'Biri'} sana arkadaşlık isteği gönderdi`,
      read: false, timestamp: new Date().toISOString()
    });
  };

  const cancelRequest = async (targetId: string) => {
    await remove(ref(db, `users/${userId}/outgoing_requests/${targetId}`));
    const snap = await get(ref(db, `friend_requests/${targetId}`));
    const d = snap.val() || {};
    for (const [key, val] of Object.entries(d) as any) {
      if (val.from === userId) await remove(ref(db, `friend_requests/${targetId}/${key}`));
    }
  };

  const acceptRequest = async (req: any) => {
    await remove(ref(db, `friend_requests/${userId}/${req.id}`));
    await remove(ref(db, `users/${req.from}/outgoing_requests/${userId}`));
    await update(ref(db, `users/${userId}/friends`), { [req.from]: true });
    await update(ref(db, `users/${req.from}/friends`), { [userId]: true });
    // Karşı tarafın outgoing_requests'ini de temizle (ek güvence)
    await remove(ref(db, `outgoing_requests/${req.from}/${userId}`)).catch(() => {});
    setFriends(prev => prev.includes(req.from) ? prev : [...prev, req.from]);
    setIncoming(prev => prev.filter(r => r.id !== req.id));
    await push(ref(db, `notifications/${req.from}`), {
      type: 'friend_accept', from_id: userId,
      content: `${allUsers.find(u => u.id === userId)?.username || 'Biri'} arkadaşlık isteğini kabul etti`,
      read: false, timestamp: new Date().toISOString()
    });
  };

  const rejectRequest = async (req: any) => {
    await remove(ref(db, `friend_requests/${userId}/${req.id}`));
    await remove(ref(db, `users/${req.from}/outgoing_requests/${userId}`));
  };

  const removeFriend = async (fId: string) => {
    await remove(ref(db, `users/${userId}/friends/${fId}`));
    await remove(ref(db, `users/${fId}/friends/${userId}`));
  };

  const blockUser = async (targetId: string) => {
    await set(ref(db, `users/${userId}/blocked/${targetId}`), true);
    await removeFriend(targetId);
    setActiveMenu(null);
  };

  const unblockUser = async (targetId: string) => {
    await remove(ref(db, `users/${userId}/blocked/${targetId}`));
  };

  const reportUser = async (targetId: string) => {
    const target = allUsers.find(u => u.id === targetId);
    await push(ref(db, 'logs'), {
      type: 'USER_REPORT', userId,
      detail: `${allUsers.find(u => u.id === userId)?.username} → ${target?.username}`,
      timestamp: Date.now()
    });
    setActiveMenu(null);
    alert('Şikayet iletildi.');
  };

  const allKnownUsers = [...allUsers, ...Object.values(fetchedUsers).filter(fu => !allUsers.find((u: any) => u.id === (fu as any).id))];
  const friendUsers = allKnownUsers.filter((u: any) => friends.includes(u.id));
  const onlineFriends = friendUsers.filter((u: any) => u.status === 'online');
  const offlineFriends = friendUsers.filter((u: any) => u.status !== 'online');
  const sourceUsers = discoverUsers.length > 0 ? discoverUsers : allUsers;
  // Zaten arkadaş olanları outgoing listesinden çıkar
  const pendingOutgoing = outgoing.filter(id => !friends.includes(id));
  const filteredAll = sourceUsers.filter(u =>
    u.id !== userId && !blocked.includes(u.id) &&
    u.username && u.username !== 'Unknown' && u.username !== 'Kullanıcı' &&
    !u.is_deleted && !u.deleted &&
    (u.username || '').toLowerCase().includes(search.toLowerCase())
  );
  const suggestions = sourceUsers.filter(u =>
    u.id !== userId && !friends.includes(u.id) && !blocked.includes(u.id) &&
    !pendingOutgoing.includes(u.id) && u.status === 'online'
  ).slice(0, 6);

  const tabs = [
    { id: 'friends' as const, label: t('friends.allFriends'), count: friends.length },
    { id: 'requests' as const, label: t('friends.pendingRequests'), count: incoming.length },
    { id: 'find' as const, label: t('friends.suggestions'), count: 0 },
    { id: 'blocked' as const, label: t('friends.blocked'), count: blocked.length },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: '#0B0E11', color: '#E3E5E8', overflow: 'hidden', backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(16, 185, 129, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)' }}>

      {/* Header */}
      <div style={{ padding: '24px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: ACCENT + '22', border: `1px solid ${ACCENT}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={18} color={ACCENT} />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>Arkadaşlar</h2>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
              {onlineFriends.length} çevrimiçi · {friends.length} toplam
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: -1 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '8px 14px', borderRadius: '10px 10px 0 0', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: tab === t.id ? '#111418' : 'transparent',
                color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.4)',
                borderBottom: tab === t.id ? `2px solid ${ACCENT}` : '2px solid transparent' }}>
              {t.label}
              {t.count > 0 && (
                <span style={{ marginLeft: 6, background: t.id === 'requests' ? '#EF4444' : ACCENT + '33', color: t.id === 'requests' ? '#fff' : ACCENT, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999 }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

        {/* FRIENDS */}
        {tab === 'friends' && (
          friendUsers.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ width: 72, height: 72, borderRadius: 24, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Users size={32} color="rgba(255,255,255,0.2)" />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 6 }}>{t('friends.noFriends')}</p>
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>Keşfet sekmesinden arkadaş bulabilirsin</p>
              <button onClick={() => setTab('find')} style={{ marginTop: 16, padding: '8px 20px', borderRadius: 12, background: ACCENT + '22', border: `1px solid ${ACCENT}44`, color: ACCENT, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Kullanıcı Bul
              </button>
            </motion.div>
          ) : (
            <>
              {onlineFriends.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Çevrimiçi — {onlineFriends.length}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{onlineFriends.map(u => <FriendCard key={u.id} u={u} />)}</div>
                </div>
              )}
              {offlineFriends.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Çevrimdışı — {offlineFriends.length}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{offlineFriends.map(u => <FriendCard key={u.id} u={u} offline />)}</div>
                </div>
              )}
            </>
          )
        )}

        {/* REQUESTS */}
        {tab === 'requests' && (
          <div>
            {incoming.length === 0 ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ width: 72, height: 72, borderRadius: 24, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <UserPlus size={32} color="rgba(255,255,255,0.2)" />
                </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{t('friends.noPendingRequests')}</p>
              </motion.div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Gelen İstekler — {incoming.length}</p>
                {incoming.map(req => {
                  const sender = findUser(req.from);
                  return (
                    <motion.div key={req.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Avatar user={sender} size={46} showStatus />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{sender?.username || req.from}</p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Arkadaşlık isteği gönderdi</p>
                      </div>
                      <button onClick={() => acceptRequest(req)} style={{ padding: '8px 16px', borderRadius: 10, background: ACCENT, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Check size={14} /> Kabul
                      </button>
                      <button onClick={() => rejectRequest(req)} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#EF4444', fontSize: 13, cursor: 'pointer' }}>
                        <X size={14} />
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
            {pendingOutgoing.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Gönderilen — {pendingOutgoing.length}</p>
                {pendingOutgoing.map(targetId => {
                  const u = findUser(targetId);
                  return (
                    <div key={targetId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
                      <Avatar user={u} size={38} showStatus />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{u?.username || targetId}</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>İstek bekleniyor</p>
                      </div>
                      <button onClick={() => cancelRequest(targetId)} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer' }}>İptal</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* FIND */}
        {tab === 'find' && (
          <div>
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kullanıcı adıyla ara..."
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 14px 12px 42px', fontSize: 14, color: '#fff', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {!search && suggestions.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <Sparkles size={13} color={ACCENT} />
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Şu An Çevrimiçi</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {suggestions.map(u => (
                    <motion.div key={u.id} whileHover={{ scale: 1.02 }}
                      style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
                      <Avatar user={u} size={48} showStatus />
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.username}</p>
                      <button onClick={() => sendRequest(u.id)} style={{ width: '100%', padding: '6px', borderRadius: 8, background: ACCENT + '22', border: `1px solid ${ACCENT}44`, color: ACCENT, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <UserPlus size={12} /> Ekle
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!search && <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Tüm Kullanıcılar</p>}
              {filteredAll.length === 0 && search ? (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px 0' }}>Sonuç bulunamadı</p>
              ) : filteredAll.map(u => {
                const isFriend = friends.includes(u.id);
                const isPending = pendingOutgoing.includes(u.id);
                return (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Avatar user={u} size={40} showStatus />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{u.username}</p>
                      <p style={{ fontSize: 11, color: u.status === 'online' ? ACCENT : 'rgba(255,255,255,0.25)' }}>
                        {u.status === 'online' ? '● Çevrimiçi' : '● Çevrimdışı'}
                      </p>
                    </div>
                    {isFriend ? <UserCheck size={16} color={ACCENT} />
                      : isPending ? <Clock size={16} color="rgba(255,255,255,0.3)" />
                      : <button onClick={() => sendRequest(u.id)} style={{ padding: '6px 12px', borderRadius: 9, background: ACCENT + '22', border: `1px solid ${ACCENT}33`, color: ACCENT, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>+ Ekle</button>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BLOCKED */}
        {tab === 'blocked' && (
          blocked.length === 0 ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ width: 72, height: 72, borderRadius: 24, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Lock size={32} color="rgba(255,255,255,0.2)" />
              </div>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Engellenen kullanıcı yok</p>
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Engellendi — {blocked.length}</p>
              {allUsers.filter(u => blocked.includes(u.id)).map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', opacity: 0.7 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 14, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,0.3)' }}>
                    {(u.username || '?').substring(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{u.username}</p>
                  </div>
                  <button onClick={() => unblockUser(u.id)} style={{ padding: '6px 14px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Engeli Kaldır
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {activeMenu && <div onClick={() => setActiveMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 50 }} />}
    </div>
  );

  function FriendCard({ u, offline }: { u: any; offline?: boolean }) {
    const isMenuOpen = activeMenu === u.id;
    return (
      <motion.div layout style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16, background: isMenuOpen ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', opacity: offline ? 0.6 : 1, position: 'relative' }}>
        <Avatar user={u} size={44} showStatus />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.username}</p>
          <p style={{ fontSize: 12, color: u.status === 'online' ? ACCENT : 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            {u.status === 'online' ? '● Çevrimiçi' : '● Çevrimdışı'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => onStartDM(u.id)} style={{ width: 34, height: 34, borderRadius: 10, background: ACCENT + '22', border: `1px solid ${ACCENT}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <MessageSquare size={15} color={ACCENT} />
          </button>
          <button onClick={() => setActiveMenu(isMenuOpen ? null : u.id)} style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 18, fontWeight: 700 }}>
            ···
          </button>
        </div>
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ position: 'absolute', right: 14, top: 56, zIndex: 100, background: '#1A1D23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, overflow: 'hidden', minWidth: 180, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
              {[
                { label: 'Mesaj Gönder', icon: <MessageSquare size={14} color={ACCENT} />, action: () => { onStartDM(u.id); setActiveMenu(null); }, color: '#fff' },
                { label: 'Arkadaşlıktan Çıkar', icon: <UserMinus size={14} />, action: () => { removeFriend(u.id); setActiveMenu(null); }, color: 'rgba(255,255,255,0.6)' },
              ].map((item, i) => (
                <button key={i} onClick={item.action} style={{ width: '100%', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', color: item.color, fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                  {item.icon} {item.label}
                </button>
              ))}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />
              <button onClick={() => blockUser(u.id)} style={{ width: '100%', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', color: '#F59E0B', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                <Shield size={14} /> Engelle
              </button>
              <button onClick={() => reportUser(u.id)} style={{ width: '100%', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', color: '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                <Flag size={14} /> Şikayet Et
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }
};
