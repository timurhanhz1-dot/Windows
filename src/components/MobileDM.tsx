import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { ref, onValue, push, off, get, update } from 'firebase/database';
import { ArrowLeft, Send, Phone, Video, Search, Edit } from 'lucide-react';
import { StickerPicker } from './StickerPicker';
import { GroupDMPanel } from './GroupDMPanel';

const T = {
  bg: '#0B0E11',
  bgGradient: 'radial-gradient(circle at 20% 50%, rgba(16,185,129,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(139,92,246,0.10) 0%, transparent 50%)',
  surface: '#111418',
  border: 'rgba(16,185,129,0.12)',
  borderSubtle: 'rgba(255,255,255,0.05)',
  accent: '#10B981',
  accentDim: 'rgba(16,185,129,0.15)',
  text: '#E3E5E8',
  textMuted: '#6B7280',
  textDim: '#9CA3AF',
  bubble: '#0a1a12',
};

interface Friend {
  uid: string;
  displayName: string;
  photoURL?: string;
  online?: boolean;
}

interface Message {
  id: string;
  sender_id: string;
  content?: string;
  sticker?: string;
  timestamp: string | number;
  read?: boolean;
}

interface MobileDMProps {
  userId: string;
  currentUserName?: string;
  onStartCall?: (targetId: string, targetName: string, mode: 'voice' | 'video') => void;
}

const tsToMs = (ts: string | number): number =>
  typeof ts === 'number' ? ts : new Date(ts).getTime();

const Avatar = ({ user, size = 44 }: { user: Friend; size?: number }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: T.surface, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700, color: T.accent, overflow: 'hidden', border: `1.5px solid ${T.border}` }}>
    {user.photoURL
      ? <img src={user.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
      : user.displayName[0].toUpperCase()}
  </div>
);

export const MobileDM = ({ userId, currentUserName, onStartCall }: MobileDMProps) => {
  const [tab, setTab] = useState<'dm' | 'group'>('dm');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [allUsers, setAllUsers] = useState<Friend[]>([]);
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastMessages, setLastMessages] = useState<Record<string, Message>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showNewDM, setShowNewDM] = useState(false);
  const [newDMSearch, setNewDMSearch] = useState('');
  const [stories, setStories] = useState<Record<string, any>>({});
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dmListenersRef = useRef<Array<() => void>>([]);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Arkadaslar + son mesajlar + okunmamis
  useEffect(() => {
    if (!userId) return;
    const friendsRef = ref(db, `users/${userId}/friends`);
    onValue(friendsRef, async (snap) => {
      dmListenersRef.current.forEach((fn) => fn());
      dmListenersRef.current = [];
      const data = snap.val();
      if (!data) { setFriends([]); return; }
      const friendIds = Object.keys(data);
      const usersSnap = await get(ref(db, 'users'));
      const usersData: Record<string, any> = usersSnap.val() || {};
      const list: Friend[] = friendIds
        .filter((fid) => { const u = usersData[fid]; return u && (u.displayName || u.username); })
        .map((fid) => ({
          uid: fid,
          displayName: usersData[fid].displayName || usersData[fid].username,
          photoURL: usersData[fid].photoURL,
          online: usersData[fid].online,
        }));
      setFriends(list);
      // allUsers for GroupDMPanel
      const all: Friend[] = Object.entries(usersData)
        .filter(([uid, u]: [string, any]) => uid !== userId && (u.displayName || u.username))
        .map(([uid, u]: [string, any]) => ({ uid, displayName: u.displayName || u.username, photoURL: u.photoURL, online: u.online }));
      setAllUsers(all);
      list.forEach((friend) => {
        const dmKey = [userId, friend.uid].sort().join('_');
        const dmRef = ref(db, `dm/${dmKey}`);
        onValue(dmRef, (dmSnap) => {
          const msgs = dmSnap.val();
          if (!msgs) return;
          const arr: any[] = Object.entries(msgs).map(([id, m]: [string, any]) => ({ id, ...m }));
          arr.sort((a, b) => tsToMs(b.timestamp) - tsToMs(a.timestamp));
          if (arr[0]) setLastMessages((prev) => ({ ...prev, [friend.uid]: arr[0] }));
          const unread = arr.filter((m) => m.sender_id !== userId && !m.read).length;
          setUnreadCounts((prev) => ({ ...prev, [friend.uid]: unread }));
        });
        dmListenersRef.current.push(() => off(dmRef));
      });
    });
    return () => {
      off(ref(db, `users/${userId}/friends`));
      dmListenersRef.current.forEach((fn) => fn());
    };
  }, [userId]);

  // Hikayeler
  useEffect(() => {
    if (!userId) return;
    const storiesRef = ref(db, 'stories');
    onValue(storiesRef, (snap) => { setStories(snap.val() || {}); });
    return () => off(ref(db, 'stories'));
  }, [userId]);

  // Yeni DM kullanici listesi
  useEffect(() => {
    if (!showNewDM || allUsers.length > 0) return;
    get(ref(db, 'users')).then((snap) => {
      const data: Record<string, any> = snap.val() || {};
      const list: Friend[] = Object.entries(data)
        .filter(([uid, u]) => uid !== userId && (u.displayName || u.username))
        .map(([uid, u]) => ({ uid, displayName: (u as any).displayName || (u as any).username, photoURL: (u as any).photoURL, online: (u as any).online }));
      setAllUsers(list);
    });
  }, [showNewDM, userId, allUsers.length]);

  // Aktif sohbet mesajlari
  useEffect(() => {
    if (!activeFriend) return;
    const dmKey = [userId, activeFriend.uid].sort().join('_');
    const dmRef = ref(db, `dm/${dmKey}`);
    onValue(dmRef, (snap) => {
      const data = snap.val();
      if (!data) { setMessages([]); return; }
      const arr = Object.entries(data).map(([id, m]: [string, any]) => ({ id, ...m }));
      arr.sort((a: any, b: any) => tsToMs(a.timestamp) - tsToMs(b.timestamp));
      setMessages(arr as Message[]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      const updates: Record<string, any> = {};
      arr.forEach((m: any) => { if (m.sender_id !== userId && !m.read) updates[`dm/${dmKey}/${m.id}/read`] = true; });
      if (Object.keys(updates).length > 0) update(ref(db), updates);
    });
    return () => off(ref(db, `dm/${[userId, activeFriend.uid].sort().join('_')}`));
  }, [activeFriend, userId]);

  // Yaziyor dinle
  useEffect(() => {
    if (!activeFriend) return;
    const typingKey = `dm_${[userId, activeFriend.uid].sort().join('_')}`;
    const typingRef = ref(db, `typing/${typingKey}/${activeFriend.uid}`);
    onValue(typingRef, (snap) => { setIsTyping(!!snap.val()); });
    return () => off(typingRef);
  }, [activeFriend, userId]);

  const sendMessage = async (text?: string, sticker?: string) => {
    if (!activeFriend || (!text?.trim() && !sticker)) return;
    const dmKey = [userId, activeFriend.uid].sort().join('_');
    await push(ref(db, `dm/${dmKey}`), {
      sender_id: userId,
      sender_name: currentUserName || userId,
      receiver_id: activeFriend.uid,
      content: text?.trim() || null,
      sticker: sticker || null,
      timestamp: new Date().toISOString(),
      type: sticker ? 'sticker' : 'text',
      read: false,
    });
    setInputText('');
    setShowStickers(false);
    const typingKey = `dm_${[userId, activeFriend.uid].sort().join('_')}`;
    update(ref(db, `typing/${typingKey}`), { [userId]: null });
  };

  const handleTyping = (val: string) => {
    setInputText(val);
    if (!activeFriend) return;
    const typingKey = `dm_${[userId, activeFriend.uid].sort().join('_')}`;
    update(ref(db, `typing/${typingKey}`), { [userId]: val.length > 0 ? true : null });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      update(ref(db, `typing/${typingKey}`), { [userId]: null });
    }, 3000);
  };

  const fmtTime = (ts?: string | number) => {
    if (!ts) return '';
    return new Date(tsToMs(ts)).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const fmtDate = (ts?: string | number) => {
    if (!ts) return '';
    const d = new Date(tsToMs(ts));
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Bugun';
    const y = new Date(now);
    y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Dun';
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  const friendsWithStories = friends.filter((f) => stories[f.uid] && Object.keys(stories[f.uid]).length > 0);
  const filteredFriends = friends.filter((f) => f.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredAllUsers = allUsers.filter((u) => u.displayName.toLowerCase().includes(newDMSearch.toLowerCase()));

  // Yeni DM ekrani
  if (showNewDM) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg, backgroundImage: T.bgGradient }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: T.surface, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <button onClick={() => setShowNewDM(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: T.textMuted }}>
            <ArrowLeft size={22} />
          </button>
          <div style={{ color: T.text, fontWeight: 700, fontSize: 16, flex: 1 }}>Yeni Mesaj</div>
        </div>
        <div style={{ padding: '12px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.surface, borderRadius: 12, padding: '9px 14px', border: `1px solid ${T.border}` }}>
            <Search size={15} color={T.textMuted} />
            <input autoFocus value={newDMSearch} onChange={(e) => setNewDMSearch(e.target.value)} placeholder="Kullanici ara..." style={{ flex: 1, background: 'none', border: 'none', color: T.text, fontSize: 14, outline: 'none' }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredAllUsers.length === 0 && (
            <div style={{ textAlign: 'center', color: T.textMuted, padding: 40, fontSize: 14 }}>Kullanici bulunamadi</div>
          )}
          {filteredAllUsers.map((user) => (
            <button key={user.uid} onClick={() => { setShowNewDM(false); setNewDMSearch(''); setActiveFriend(user); }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${T.borderSubtle}`, WebkitTapHighlightColor: 'transparent', textAlign: 'left' }}>
              <div style={{ position: 'relative' }}>
                <Avatar user={user} size={44} />
                {user.online && <div style={{ position: 'absolute', bottom: 1, right: 1, width: 10, height: 10, borderRadius: '50%', background: T.accent, border: `2px solid ${T.bg}` }} />}
              </div>
              <div>
                <div style={{ color: T.text, fontWeight: 600, fontSize: 15 }}>{user.displayName}</div>
                {user.online && <div style={{ color: T.accent, fontSize: 12 }}>cevrimici</div>}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Chat ekrani
  if (activeFriend) {
    const lastMsg = messages[messages.length - 1];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg, backgroundImage: T.bgGradient }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: T.surface, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <button onClick={() => setActiveFriend(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: T.textMuted }}>
            <ArrowLeft size={22} />
          </button>
          <div style={{ position: 'relative' }}>
            <Avatar user={activeFriend} size={38} />
            {activeFriend.online && <div style={{ position: 'absolute', bottom: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: T.accent, border: `2px solid ${T.surface}` }} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: T.text, fontWeight: 700, fontSize: 15 }}>{activeFriend.displayName}</div>
            <div style={{ color: isTyping ? T.accent : (activeFriend.online ? T.accent : T.textMuted), fontSize: 11 }}>
              {isTyping ? 'yaziyor...' : (activeFriend.online ? 'cevrimici' : '')}
            </div>
          </div>
          {onStartCall && (
            <>
              <button onClick={() => onStartCall(activeFriend.uid, activeFriend.displayName, 'voice')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: T.textMuted }}>
                <Phone size={20} />
              </button>
              <button onClick={() => onStartCall(activeFriend.uid, activeFriend.displayName, 'video')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: T.textMuted }}>
                <Video size={20} />
              </button>
            </>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {messages.map((msg, i) => {
            const isMe = msg.sender_id === userId;
            const prev = messages[i - 1];
            const showDate = !prev || fmtDate(msg.timestamp) !== fmtDate(prev.timestamp);
            const isLast = i === messages.length - 1;
            return (
              <div key={msg.id}>
                {showDate && (
                  <div style={{ textAlign: 'center', margin: '10px 0', color: T.textMuted, fontSize: 12 }}>{fmtDate(msg.timestamp)}</div>
                )}
                <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '72%', padding: msg.sticker ? '4px' : '9px 13px', borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isMe ? T.bubble : T.surface, color: T.text, fontSize: 15, lineHeight: 1.45, wordBreak: 'break-word', border: isMe ? `1px solid ${T.border}` : `1px solid ${T.borderSubtle}` }}>
                    {msg.sticker ? <span style={{ fontSize: 36 }}>{msg.sticker}</span> : <span>{msg.content}</span>}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 3 }}>
                      <span style={{ fontSize: 11, color: isMe ? T.accent : T.textMuted }}>{fmtTime(msg.timestamp)}</span>
                      {isMe && isLast && (
                        <span style={{ fontSize: 11, color: msg.read ? T.accent : T.textMuted }}>{msg.read ? '\u2713\u2713' : '\u2713'}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {isTyping && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '10px 14px', borderRadius: '18px 18px 18px 4px', background: T.surface, border: `1px solid ${T.borderSubtle}`, display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, opacity: 0.7 }} />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {showStickers && (
          <div style={{ flexShrink: 0 }}>
            <StickerPicker userId={userId} onSelect={(s) => sendMessage(undefined, s)} onClose={() => setShowStickers(false)} />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom))', background: T.surface, borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
          <button onClick={() => setShowStickers((v) => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 4, color: T.textMuted }}>&#128522;</button>
          <input value={inputText} onChange={(e) => handleTyping(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputText)} placeholder="Mesaj yaz..." style={{ flex: 1, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 22, padding: '10px 16px', color: T.text, fontSize: 15, outline: 'none' }} />
          <button onClick={() => sendMessage(inputText)} disabled={!inputText.trim()} style={{ background: inputText.trim() ? T.accent : T.surface, border: `1px solid ${inputText.trim() ? T.accent : T.border}`, borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: inputText.trim() ? 'pointer' : 'default', transition: 'all 0.2s', flexShrink: 0 }}>
            <Send size={17} color={inputText.trim() ? '#fff' : T.textMuted} />
          </button>
        </div>
      </div>
    );
  }

  // Ana liste
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: T.bg, backgroundImage: T.bgGradient }}>
      <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ color: T.text, fontSize: 20, fontWeight: 700 }}>Mesajlar</div>
          <button onClick={() => setShowNewDM(true)} style={{ background: T.accentDim, border: `1px solid ${T.border}`, borderRadius: 10, padding: '7px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: T.accent, fontSize: 13, fontWeight: 600 }}>
            <Edit size={14} />
            Yeni
          </button>
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 12, background: T.surface, borderRadius: 10, padding: 3, border: `1px solid ${T.border}` }}>
          {(['dm', 'group'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: tab === t ? T.accent : 'transparent', color: tab === t ? '#fff' : T.textMuted, transition: 'all 0.2s' }}>
              {t === 'dm' ? 'Direkt' : 'Gruplar'}
            </button>
          ))}
        </div>
        {tab === 'dm' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: T.surface, borderRadius: 12, padding: '9px 14px', border: `1px solid ${T.border}`, marginBottom: 10 }}>
            <Search size={15} color={T.textMuted} />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Ara..." style={{ flex: 1, background: 'none', border: 'none', color: T.text, fontSize: 14, outline: 'none' }} />
          </div>
        )}
      </div>

      {tab === 'group' && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <GroupDMPanel userId={userId} currentUserName={currentUserName || ''} allUsers={allUsers.map((u) => ({ id: u.uid, username: u.displayName, avatar: u.photoURL }))} />
        </div>
      )}

      {tab === 'dm' && (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {friendsWithStories.length > 0 && (
            <div style={{ overflowX: 'auto', display: 'flex', gap: 12, padding: '8px 16px 12px', borderBottom: `1px solid ${T.borderSubtle}` }}>
              {friendsWithStories.map((f) => (
                <div key={f.uid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, cursor: 'pointer' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', padding: 2, background: `linear-gradient(135deg, ${T.accent}, #8B5CF6)` }}>
                    <Avatar user={f} size={48} />
                  </div>
                  <span style={{ color: T.textDim, fontSize: 11, maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.displayName}</span>
                </div>
              ))}
            </div>
          )}
          {filteredFriends.length === 0 && (
            <div style={{ textAlign: 'center', color: T.textMuted, padding: 40, fontSize: 14 }}>
              {friends.length === 0 ? 'Henuz arkadasin yok' : 'Sonuc bulunamadi'}
            </div>
          )}
          {filteredFriends.map((friend) => {
            const lastMsg = lastMessages[friend.uid];
            const unread = unreadCounts[friend.uid] || 0;
            return (
              <button key={friend.uid} onClick={() => setActiveFriend(friend)} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${T.borderSubtle}`, WebkitTapHighlightColor: 'transparent', textAlign: 'left' }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar user={friend} size={48} />
                  {friend.online && <div style={{ position: 'absolute', bottom: 2, right: 2, width: 11, height: 11, borderRadius: '50%', background: T.accent, border: `2px solid ${T.bg}` }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: T.text, fontWeight: unread > 0 ? 700 : 600, fontSize: 15 }}>{friend.displayName}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {lastMsg && <span style={{ color: T.textMuted, fontSize: 12 }}>{fmtTime(lastMsg.timestamp)}</span>}
                      {unread > 0 && <div style={{ background: T.accent, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>{unread > 9 ? '9+' : unread}</div>}
                    </div>
                  </div>
                  <div style={{ color: unread > 0 ? T.text : T.textDim, fontSize: 13, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: unread > 0 ? 600 : 400 }}>
                    {lastMsg ? (lastMsg.sticker ? 'Sticker' : lastMsg.content) : 'Mesaj yok'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
