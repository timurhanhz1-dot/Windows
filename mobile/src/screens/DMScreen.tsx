import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase/index';
import { ref, onValue, push, off, get, update } from 'firebase/database';
import { T } from '../theme/index';

interface Friend { uid: string; displayName: string; photoURL?: string; online?: boolean; }
interface Message { id: string; sender_id: string; content?: string; sticker?: string; timestamp: string | number; read?: boolean; }

const tsToMs = (ts: string | number) => typeof ts === 'number' ? ts : new Date(ts).getTime();

const Avatar = ({ user, size = 44 }: { user: Friend; size?: number }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1.5, borderColor: T.border }}>
    {user.photoURL
      ? <Image source={{ uri: user.photoURL }} style={{ width: size, height: size }} />
      : <Text style={{ fontSize: size * 0.4, fontWeight: '700', color: T.accent }}>{user.displayName[0].toUpperCase()}</Text>}
  </View>
);

export const DMScreen = ({ userId, currentUserName }: { userId: string; currentUserName?: string }) => {
  const [tab, setTab] = useState<'dm' | 'group'>('dm');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [allUsers, setAllUsers] = useState<Friend[]>([]);
  const [activeFriend, setActiveFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastMessages, setLastMessages] = useState<Record<string, Message>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showNewDM, setShowNewDM] = useState(false);
  const [newDMSearch, setNewDMSearch] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [stories, setStories] = useState<Record<string, any>>({});
  const flatListRef = useRef<FlatList>(null);
  const dmListenersRef = useRef<Array<() => void>>([]);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;
    const friendsRef = ref(db, `users/${userId}/friends`);
    onValue(friendsRef, async (snap) => {
      dmListenersRef.current.forEach(fn => fn());
      dmListenersRef.current = [];
      const data = snap.val();
      if (!data) { setFriends([]); return; }
      const usersSnap = await get(ref(db, 'users'));
      const usersData: Record<string, any> = usersSnap.val() || {};
      const list: Friend[] = Object.keys(data)
        .filter(fid => { const u = usersData[fid]; return u && (u.displayName || u.username); })
        .map(fid => ({ uid: fid, displayName: usersData[fid].displayName || usersData[fid].username, photoURL: usersData[fid].photoURL, online: usersData[fid].online }));
      setFriends(list);
      const all: Friend[] = Object.entries(usersData)
        .filter(([uid, u]: [string, any]) => uid !== userId && (u.displayName || u.username))
        .map(([uid, u]: [string, any]) => ({ uid, displayName: u.displayName || u.username, photoURL: u.photoURL, online: u.online }));
      setAllUsers(all);
      list.forEach(friend => {
        const dmKey = [userId, friend.uid].sort().join('_');
        const dmRef = ref(db, `dm/${dmKey}`);
        onValue(dmRef, dmSnap => {
          const msgs = dmSnap.val();
          if (!msgs) return;
          const arr: any[] = Object.entries(msgs).map(([id, m]: [string, any]) => ({ id, ...m }));
          arr.sort((a, b) => tsToMs(b.timestamp) - tsToMs(a.timestamp));
          if (arr[0]) setLastMessages(prev => ({ ...prev, [friend.uid]: arr[0] }));
          const unread = arr.filter(m => m.sender_id !== userId && !m.read).length;
          setUnreadCounts(prev => ({ ...prev, [friend.uid]: unread }));
        });
        dmListenersRef.current.push(() => off(dmRef));
      });
    });
    return () => { off(ref(db, `users/${userId}/friends`)); dmListenersRef.current.forEach(fn => fn()); };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const storiesRef = ref(db, 'stories');
    onValue(storiesRef, snap => setStories(snap.val() || {}));
    return () => off(ref(db, 'stories'));
  }, [userId]);

  useEffect(() => {
    if (!activeFriend) return;
    const dmKey = [userId, activeFriend.uid].sort().join('_');
    const dmRef = ref(db, `dm/${dmKey}`);
    onValue(dmRef, snap => {
      const data = snap.val();
      if (!data) { setMessages([]); return; }
      const arr = Object.entries(data).map(([id, m]: [string, any]) => ({ id, ...m }));
      arr.sort((a: any, b: any) => tsToMs(a.timestamp) - tsToMs(b.timestamp));
      setMessages(arr as Message[]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      const updates: Record<string, any> = {};
      arr.forEach((m: any) => { if (m.sender_id !== userId && !m.read) updates[`dm/${dmKey}/${m.id}/read`] = true; });
      if (Object.keys(updates).length > 0) update(ref(db), updates);
    });
    return () => off(ref(db, `dm/${[userId, activeFriend.uid].sort().join('_')}`));
  }, [activeFriend, userId]);

  useEffect(() => {
    if (!activeFriend) return;
    const typingKey = `dm_${[userId, activeFriend.uid].sort().join('_')}`;
    const typingRef = ref(db, `typing/${typingKey}/${activeFriend.uid}`);
    onValue(typingRef, snap => setIsTyping(!!snap.val()));
    return () => off(typingRef);
  }, [activeFriend, userId]);

  const sendMessage = async (text?: string) => {
    if (!activeFriend || !text?.trim()) return;
    const dmKey = [userId, activeFriend.uid].sort().join('_');
    await push(ref(db, `dm/${dmKey}`), {
      sender_id: userId, sender_name: currentUserName || userId,
      receiver_id: activeFriend.uid, content: text.trim(),
      timestamp: new Date().toISOString(), type: 'text', read: false,
    });
    setInputText('');
    const typingKey = `dm_${[userId, activeFriend.uid].sort().join('_')}`;
    update(ref(db, `typing/${typingKey}`), { [userId]: null });
  };

  const handleTyping = (val: string) => {
    setInputText(val);
    if (!activeFriend) return;
    const typingKey = `dm_${[userId, activeFriend.uid].sort().join('_')}`;
    update(ref(db, `typing/${typingKey}`), { [userId]: val.length > 0 ? true : null });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => update(ref(db, `typing/${typingKey}`), { [userId]: null }), 3000);
  };

  const fmtTime = (ts?: string | number) => {
    if (!ts) return '';
    return new Date(tsToMs(ts)).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const friendsWithStories = friends.filter(f => stories[f.uid] && Object.keys(stories[f.uid]).length > 0);
  const filteredFriends = friends.filter(f => f.displayName.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredAllUsers = allUsers.filter(u => u.displayName.toLowerCase().includes(newDMSearch.toLowerCase()));

  // Yeni DM ekrani
  if (showNewDM) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setShowNewDM(false)} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={T.textMuted} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Yeni Mesaj</Text>
        </View>
        <View style={s.searchBar}>
          <Ionicons name="search" size={15} color={T.textMuted} />
          <TextInput style={s.searchInput} placeholder="Kullanici ara..." placeholderTextColor={T.textMuted}
            value={newDMSearch} onChangeText={setNewDMSearch} autoFocus />
        </View>
        <FlatList
          data={filteredAllUsers}
          keyExtractor={u => u.uid}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.friendRow} onPress={() => { setShowNewDM(false); setNewDMSearch(''); setActiveFriend(item); }}>
              <View style={{ position: 'relative' }}>
                <Avatar user={item} size={44} />
                {item.online && <View style={s.onlineDot} />}
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={s.friendName}>{item.displayName}</Text>
                {item.online && <Text style={{ color: T.accent, fontSize: 12 }}>cevrimici</Text>}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={s.emptyText}>Kullanici bulunamadi</Text>}
        />
      </SafeAreaView>
    );
  }

  // Chat ekrani
  if (activeFriend) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setActiveFriend(null)} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={T.textMuted} />
          </TouchableOpacity>
          <View style={{ position: 'relative', marginRight: 10 }}>
            <Avatar user={activeFriend} size={36} />
            {activeFriend.online && <View style={[s.onlineDot, { width: 9, height: 9 }]} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{activeFriend.displayName}</Text>
            <Text style={{ color: isTyping ? T.accent : T.textMuted, fontSize: 11 }}>
              {isTyping ? 'yaziyor...' : activeFriend.online ? 'cevrimici' : ''}
            </Text>
          </View>
          <Ionicons name="call-outline" size={20} color={T.textMuted} style={{ marginRight: 12 }} />
          <Ionicons name="videocam-outline" size={20} color={T.textMuted} />
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 12, gap: 4 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item: msg, index }) => {
            const isMe = msg.sender_id === userId;
            const isLast = index === messages.length - 1;
            return (
              <View style={{ alignItems: isMe ? 'flex-end' : 'flex-start', marginVertical: 2 }}>
                <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
                  {msg.sticker
                    ? <Text style={{ fontSize: 36 }}>{msg.sticker}</Text>
                    : <Text style={{ color: T.text, fontSize: 15, lineHeight: 21 }}>{msg.content}</Text>}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 3 }}>
                    <Text style={{ fontSize: 11, color: isMe ? T.accent : T.textMuted }}>{fmtTime(msg.timestamp)}</Text>
                    {isMe && isLast && <Text style={{ fontSize: 11, color: msg.read ? T.accent : T.textMuted }}>{msg.read ? '✓✓' : '✓'}</Text>}
                  </View>
                </View>
              </View>
            );
          }}
        />

        {isTyping && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
            <View style={[s.bubble, s.bubbleThem, { flexDirection: 'row', gap: 4 }]}>
              {[0,1,2].map(i => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: T.accent, opacity: 0.7 }} />)}
            </View>
          </View>
        )}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.inputRow}>
            <TextInput style={s.msgInput} placeholder="Mesaj yaz..." placeholderTextColor={T.textMuted}
              value={inputText} onChangeText={handleTyping}
              onSubmitEditing={() => sendMessage(inputText)} returnKeyType="send" multiline />
            <TouchableOpacity style={[s.sendBtn, !inputText.trim() && { backgroundColor: T.surface }]}
              onPress={() => sendMessage(inputText)} disabled={!inputText.trim()}>
              <Ionicons name="send" size={17} color={inputText.trim() ? '#fff' : T.textMuted} />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Ana liste
  return (
    <SafeAreaView style={s.container}>
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ color: T.text, fontSize: 20, fontWeight: '700' }}>Mesajlar</Text>
          <TouchableOpacity style={s.newBtn} onPress={() => setShowNewDM(true)}>
            <Ionicons name="create-outline" size={14} color={T.accent} />
            <Text style={{ color: T.accent, fontSize: 13, fontWeight: '600', marginLeft: 4 }}>Yeni</Text>
          </TouchableOpacity>
        </View>
        <View style={s.tabRow}>
          {(['dm', 'group'] as const).map(t => (
            <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
              <Text style={[s.tabBtnText, tab === t && { color: '#fff' }]}>{t === 'dm' ? 'Direkt' : 'Gruplar'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {tab === 'dm' && (
          <View style={[s.searchBar, { marginBottom: 10 }]}>
            <Ionicons name="search" size={15} color={T.textMuted} />
            <TextInput style={s.searchInput} placeholder="Ara..." placeholderTextColor={T.textMuted}
              value={searchQuery} onChangeText={setSearchQuery} />
          </View>
        )}
      </View>

      {tab === 'dm' && (
        <FlatList
          data={filteredFriends}
          keyExtractor={f => f.uid}
          ListHeaderComponent={friendsWithStories.length > 0 ? (
            <FlatList horizontal data={friendsWithStories} keyExtractor={f => f.uid}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 12 }}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item: f }) => (
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, padding: 2, backgroundColor: T.accent }}>
                    <Avatar user={f} size={48} />
                  </View>
                  <Text style={{ color: T.textDim, fontSize: 11 }} numberOfLines={1}>{f.displayName}</Text>
                </View>
              )} />
          ) : null}
          ListEmptyComponent={<Text style={s.emptyText}>{friends.length === 0 ? 'Henuz arkadasin yok' : 'Sonuc bulunamadi'}</Text>}
          renderItem={({ item: friend }) => {
            const lastMsg = lastMessages[friend.uid];
            const unread = unreadCounts[friend.uid] || 0;
            return (
              <TouchableOpacity style={s.friendRow} onPress={() => setActiveFriend(friend)}>
                <View style={{ position: 'relative' }}>
                  <Avatar user={friend} size={48} />
                  {friend.online && <View style={s.onlineDot} />}
                </View>
                <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: T.text, fontWeight: unread > 0 ? '700' : '600', fontSize: 15 }}>{friend.displayName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {lastMsg && <Text style={{ color: T.textMuted, fontSize: 12 }}>{fmtTime(lastMsg.timestamp)}</Text>}
                      {unread > 0 && (
                        <View style={{ backgroundColor: T.accent, borderRadius: 9, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{unread > 9 ? '9+' : unread}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={{ color: unread > 0 ? T.text : T.textDim, fontSize: 13, marginTop: 2 }} numberOfLines={1}>
                    {lastMsg ? (lastMsg.sticker ? 'Sticker' : lastMsg.content) : 'Mesaj yok'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {tab === 'group' && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: T.textMuted, fontSize: 14 }}>Grup DM yakininda geliyor</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { color: T.text, fontWeight: '700', fontSize: 16, flex: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: T.border, marginHorizontal: 16, marginBottom: 0 },
  searchInput: { flex: 1, color: T.text, fontSize: 14 },
  friendRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: T.borderSubtle },
  friendName: { color: T.text, fontWeight: '600', fontSize: 15 },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 11, height: 11, borderRadius: 6, backgroundColor: T.accent, borderWidth: 2, borderColor: T.bg },
  newBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.accentDim, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  tabRow: { flexDirection: 'row', gap: 4, backgroundColor: T.surface, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: T.border, marginBottom: 12 },
  tabBtn: { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: T.accent },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: T.textMuted },
  bubble: { maxWidth: '72%', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18 },
  bubbleMe: { backgroundColor: T.bubble, borderWidth: 1, borderColor: T.border, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.borderSubtle, borderBottomLeftRadius: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, paddingHorizontal: 12, backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
  msgInput: { flex: 1, backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: T.text, fontSize: 15, maxHeight: 100 },
  sendBtn: { backgroundColor: T.accent, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  emptyText: { textAlign: 'center', color: T.textMuted, padding: 40, fontSize: 14 },
});
