import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase/index';
import { ref, onValue, off, update } from 'firebase/database';
import { T } from '../theme/index';

interface ChatMsg { id: string; role: 'user' | 'assistant'; content: string; }
interface Post { id: string; userId: string; displayName: string; content: string; timestamp: string; likes?: Record<string,boolean>; photoURL?: string; imageUrl?: string; }

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY || '';

const TABS = ['Akış','Trendler','Keşfet','Teknoloji'] as const;
type Tab = typeof TABS[number];

export const AIScreen = ({ userId }: { userId?: string }) => {
  const [activeTab, setActiveTab] = useState<Tab>('Akış');
  const [posts, setPosts] = useState<Post[]>([]);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: '0', role: 'assistant', content: 'Merhaba! Ben NatureBot. Doga, cevre ve surdurulebilirlik hakkinda sana yardimci olabilirim. 🌿' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const postsRef = ref(db, 'nature_posts');
    onValue(postsRef, snap => {
      const data = snap.val() || {};
      const arr: Post[] = Object.entries(data).map(([id, p]: [string, any]) => ({ id, ...p }));
      arr.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setPosts(arr.slice(0, 30));
    });
    return () => off(postsRef);
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMsg = { id: Date.now().toString(), role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            { role: 'system', content: 'Sen NatureBot, Nature.co platformunun AI asistanisin. Turkce konusuyorsun.' },
            ...newMessages.map(m => ({ role: m.role, content: m.content })),
          ],
          max_tokens: 500,
        }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || 'Bir hata olustu.';
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: reply }]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'Baglanti hatasi.' }]);
    } finally { setLoading(false); }
  };

  const handleLike = async (post: Post) => {
    if (!userId) return;
    const liked = post.likes?.[userId];
    await update(ref(db, `nature_posts/${post.id}/likes`), { [userId]: liked ? null : true });
  };

  const likeCount = (post: Post) => Object.values(post.likes || {}).filter(Boolean).length;
  const fmtDate = (ts: string) => {
    const d = new Date(ts);
    return `${d.getDate()} ${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][d.getMonth()]} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  if (showChat) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setShowChat(false)} style={{ padding: 4, marginRight: 8 }}>
            <Ionicons name="arrow-back" size={22} color={T.textMuted} />
          </TouchableOpacity>
          <View style={s.botIcon}><Text style={{ fontSize: 18 }}>🤖</Text></View>
          <View style={{ marginLeft: 10 }}>
            <Text style={s.headerTitle}>NatureBot</Text>
            <Text style={{ color: T.accent, fontSize: 11 }}>Doga AI Asistani</Text>
          </View>
        </View>
        <FlatList ref={flatListRef} data={messages} keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 12, gap: 10 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item: msg }) => (
            <View style={{ alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <View style={[s.bubble, msg.role === 'user' ? s.userBubble : s.botBubble]}>
                <Text style={{ color: T.text, fontSize: 15, lineHeight: 22 }}>{msg.content}</Text>
              </View>
            </View>
          )} />
        {loading && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <View style={[s.bubble, s.botBubble, { flexDirection: 'row', gap: 4 }]}>
              {[0,1,2].map(i => <View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: T.accent, opacity: 0.7 }} />)}
            </View>
          </View>
        )}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.inputRow}>
            <TextInput style={s.msgInput} placeholder="NatureBot'a sor..." placeholderTextColor={T.textMuted}
              value={input} onChangeText={setInput} onSubmitEditing={sendMessage} returnKeyType="send" multiline />
            <TouchableOpacity style={[s.sendBtn, (!input.trim() || loading) && { backgroundColor: T.surface }]}
              onPress={sendMessage} disabled={!input.trim() || loading}>
              {loading ? <ActivityIndicator size="small" color={T.textMuted} /> : <Ionicons name="send" size={17} color={input.trim() ? '#fff' : T.textMuted} />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={s.botIcon}><Text style={{ fontSize: 16 }}>🤖</Text></View>
          <Text style={s.headerTitle}>Nature Hub</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={s.ecoBadge}>
            <Ionicons name="leaf" size={13} color={T.accent} />
            <Text style={{ color: T.accent, fontSize: 12, fontWeight: '700', marginLeft: 4 }}>48</Text>
          </View>
          <TouchableOpacity style={s.shareBtn} onPress={() => setShowChat(true)}>
            <Ionicons name="hardware-chip-outline" size={14} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginLeft: 4 }}>AI Bot</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={s.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab} style={[s.tabBtn, activeTab === tab && s.tabBtnActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[s.tabText, activeTab === tab && { color: T.accent }]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Feed */}
      <FlatList
        data={posts}
        keyExtractor={p => p.id}
        contentContainerStyle={{ padding: 12, gap: 12 }}
        ListEmptyComponent={<Text style={{ color: T.textMuted, textAlign: 'center', padding: 40 }}>Henüz gönderi yok</Text>}
        renderItem={({ item: post }) => (
          <View style={s.postCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <View style={s.avatar}>
                <Text style={{ color: T.accent, fontWeight: '700', fontSize: 14 }}>{(post.displayName || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ color: T.text, fontWeight: '700', fontSize: 14 }}>{post.displayName}</Text>
                  <View style={s.textTag}><Text style={{ color: T.blue, fontSize: 10, fontWeight: '700' }}>Text</Text></View>
                </View>
                <Text style={{ color: T.textMuted, fontSize: 12 }}>{fmtDate(post.timestamp)}</Text>
              </View>
              <Ionicons name="ellipsis-vertical" size={16} color={T.textMuted} />
            </View>
            <Text style={{ color: T.text, fontSize: 15, lineHeight: 22 }}>{post.content}</Text>
            {post.imageUrl && (
              <Image source={{ uri: post.imageUrl }} style={{ width: '100%', height: 200, borderRadius: 12, marginTop: 10 }} resizeMode="cover" />
            )}
            <View style={{ flexDirection: 'row', marginTop: 12, gap: 16 }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleLike(post)}>
                <Ionicons name={post.likes?.[userId || ''] ? 'heart' : 'heart-outline'} size={18} color={post.likes?.[userId || ''] ? '#EF4444' : T.textMuted} />
                <Text style={{ color: T.textMuted, fontSize: 13 }}>{likeCount(post)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="chatbubble-outline" size={17} color={T.textMuted} />
                <Text style={{ color: T.textMuted, fontSize: 13 }}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="share-social-outline" size={17} color={T.textMuted} />
                <Text style={{ color: T.textMuted, fontSize: 13 }}>1</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ marginLeft: 'auto' as any }}>
                <Ionicons name="bookmark-outline" size={17} color={T.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border, backgroundColor: T.surface },
  botIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  headerTitle: { color: T.text, fontWeight: '700', fontSize: 16 },
  ecoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.accentDim, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: T.border },
  shareBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: T.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: T.accent },
  tabText: { color: T.textMuted, fontSize: 13, fontWeight: '600' },
  postCard: { backgroundColor: T.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: T.border },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  textTag: { backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  postImage: { width: '100%', height: 200, borderRadius: 12, marginTop: 10 },
  bubble: { maxWidth: '80%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  userBubble: { backgroundColor: T.bubble, borderWidth: 1, borderColor: T.border, borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: T.surface, borderWidth: 1, borderColor: T.borderSubtle, borderBottomLeftRadius: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, paddingHorizontal: 12, backgroundColor: T.surface, borderTopWidth: 1, borderTopColor: T.border },
  msgInput: { flex: 1, backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: T.text, fontSize: 15, maxHeight: 100 },
  sendBtn: { backgroundColor: T.accent, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
