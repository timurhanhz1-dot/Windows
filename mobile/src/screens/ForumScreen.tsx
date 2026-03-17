import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Image, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase/index';
import { ref, onValue, off, push, update } from 'firebase/database';
import { T } from '../theme/index';

interface Post {
  id: string; userId: string; displayName: string; content: string;
  timestamp: string; likes?: Record<string,boolean>; photoURL?: string;
  category?: string; title?: string; commentCount?: number;
}

const CATEGORIES = ['Tümü','Genel','Doğa','Çevre','Teknoloji','Sosyal'];

export const ForumScreen = ({ userId, displayName }: { userId: string; displayName?: string }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [category, setCategory] = useState('Tümü');
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const postsRef = ref(db, 'nature_posts');
    onValue(postsRef, snap => {
      const data = snap.val() || {};
      const arr: Post[] = Object.entries(data).map(([id, p]: [string, any]) => ({ id, ...p }));
      arr.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setPosts(arr.slice(0, 50));
    });
    return () => off(postsRef);
  }, []);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      await push(ref(db, 'nature_posts'), {
        userId, displayName: displayName || 'Kullanici',
        content: newPost.trim(), timestamp: new Date().toISOString(),
        likes: {}, category: category === 'Tümü' ? 'Genel' : category,
      });
      setNewPost('');
      setShowModal(false);
    } finally { setPosting(false); }
  };

  const handleLike = async (post: Post) => {
    const liked = post.likes?.[userId];
    await update(ref(db, `nature_posts/${post.id}/likes`), { [userId]: liked ? null : true });
  };

  const likeCount = (post: Post) => Object.values(post.likes || {}).filter(Boolean).length;

  const filtered = posts.filter(p => {
    const matchCat = category === 'Tümü' || p.category === category;
    const matchSearch = !search || p.content.toLowerCase().includes(search.toLowerCase()) || (p.displayName || '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const fmtDate = (ts: string) => {
    const d = new Date(ts);
    return `${d.getDate()} ${['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][d.getMonth()]}`;
  };

  const catColor: Record<string,string> = {
    'Doğa': '#10B981', 'Çevre': '#3B82F6', 'Teknoloji': '#8B5CF6',
    'Sosyal': '#F59E0B', 'Genel': '#6B7280',
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="chatbubbles" size={20} color={T.accent} />
          <Text style={s.headerTitle}>Forum</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={s.newBtn} onPress={() => setShowModal(true)}>
            <Ionicons name="add" size={14} color="#fff" />
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginLeft: 3 }}>Yeni</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={s.searchBar}>
        <Ionicons name="search" size={15} color={T.textMuted} />
        <TextInput style={s.searchInput} placeholder="Ara" placeholderTextColor={T.textMuted}
          value={search} onChangeText={setSearch} />
      </View>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity key={cat} style={[s.catBtn, category === cat && s.catBtnActive]} onPress={() => setCategory(cat)}>
            <Text style={[s.catText, category === cat && { color: '#fff' }]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={p => p.id}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        ListEmptyComponent={<Text style={{ color: T.textMuted, textAlign: 'center', padding: 40 }}>Henüz gönderi yok</Text>}
        renderItem={({ item: post }) => (
          <View style={s.card}>
            {post.category && post.category !== 'Genel' && (
              <View style={[s.catTag, { backgroundColor: `${catColor[post.category] || T.accent}20`, borderColor: `${catColor[post.category] || T.accent}40` }]}>
                <Text style={{ color: catColor[post.category] || T.accent, fontSize: 11, fontWeight: '700' }}>{post.category}</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={s.avatar}>
                  <Text style={{ color: T.accent, fontWeight: '700', fontSize: 14 }}>{(post.displayName || '?')[0].toUpperCase()}</Text>
                </View>
                <Text style={{ color: T.textDim, fontSize: 13, fontWeight: '600' }}>{post.displayName}</Text>
              </View>
              <Text style={{ color: T.textMuted, fontSize: 12 }}>{fmtDate(post.timestamp)}</Text>
            </View>
            <Text style={{ color: T.text, fontSize: 15, lineHeight: 22 }} numberOfLines={4}>{post.content}</Text>
            <View style={{ flexDirection: 'row', marginTop: 12, gap: 16 }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleLike(post)}>
                <Ionicons name={post.likes?.[userId] ? 'heart' : 'heart-outline'} size={17} color={post.likes?.[userId] ? '#EF4444' : T.textMuted} />
                <Text style={{ color: T.textMuted, fontSize: 13 }}>{likeCount(post)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="chatbubble-outline" size={16} color={T.textMuted} />
                <Text style={{ color: T.textMuted, fontSize: 13 }}>{post.commentCount || 0}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* New Post Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: T.text, fontSize: 16, fontWeight: '700' }}>Yeni Gönderi</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={22} color={T.textMuted} />
              </TouchableOpacity>
            </View>
            <TextInput style={s.composeInput} placeholder="Ne düşünüyorsun?" placeholderTextColor={T.textMuted}
              value={newPost} onChangeText={setNewPost} multiline maxLength={500} autoFocus />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }} contentContainerStyle={{ gap: 8 }}>
              {CATEGORIES.slice(1).map(cat => (
                <TouchableOpacity key={cat} style={[s.catBtn, category === cat && s.catBtnActive]} onPress={() => setCategory(cat)}>
                  <Text style={[s.catText, category === cat && { color: '#fff' }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={[s.postBtn, !newPost.trim() && { opacity: 0.4 }]} onPress={handlePost} disabled={!newPost.trim() || posting}>
              <Text style={s.postBtnText}>Paylaş</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border },
  headerTitle: { color: T.text, fontSize: 18, fontWeight: '700' },
  newBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1, borderColor: T.border, marginHorizontal: 16, marginVertical: 10 },
  searchInput: { flex: 1, color: T.text, fontSize: 14 },
  catBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  catBtnActive: { backgroundColor: T.accent, borderColor: T.accent },
  catText: { color: T.textMuted, fontSize: 13, fontWeight: '600' },
  card: { backgroundColor: T.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: T.border },
  catTag: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, marginBottom: 8 },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: T.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: T.border },
  composeInput: { color: T.text, fontSize: 15, minHeight: 100, textAlignVertical: 'top', backgroundColor: T.bg, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: T.border },
  postBtn: { backgroundColor: T.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
