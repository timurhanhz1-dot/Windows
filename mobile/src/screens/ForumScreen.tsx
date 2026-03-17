import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase/index';
import { ref, onValue, off, push, update, get } from 'firebase/database';
import { T } from '../theme/index';

interface Post { id: string; userId: string; displayName: string; content: string; timestamp: string; likes?: Record<string,boolean>; photoURL?: string; }

export const ForumScreen = ({ userId, displayName }: { userId: string; displayName?: string }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

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
        content: newPost.trim(), timestamp: new Date().toISOString(), likes: {},
      });
      setNewPost('');
    } finally { setPosting(false); }
  };

  const handleLike = async (post: Post) => {
    const liked = post.likes?.[userId];
    await update(ref(db, `nature_posts/${post.id}/likes`), { [userId]: liked ? null : true });
  };

  const likeCount = (post: Post) => Object.values(post.likes || {}).filter(Boolean).length;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Forum</Text>
      </View>
      <View style={s.composeBox}>
        <TextInput style={s.composeInput} placeholder="Ne dusunuyorsun?" placeholderTextColor={T.textMuted}
          value={newPost} onChangeText={setNewPost} multiline maxLength={500} />
        <TouchableOpacity style={[s.postBtn, !newPost.trim() && { opacity: 0.4 }]} onPress={handlePost} disabled={!newPost.trim() || posting}>
          <Text style={s.postBtnText}>Paylas</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={posts}
        keyExtractor={p => p.id}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        renderItem={({ item: post }) => (
          <View style={s.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <View style={s.avatar}>
                <Text style={{ color: T.accent, fontWeight: '700', fontSize: 16 }}>{(post.displayName || '?')[0].toUpperCase()}</Text>
              </View>
              <View>
                <Text style={{ color: T.text, fontWeight: '700', fontSize: 14 }}>{post.displayName}</Text>
                <Text style={{ color: T.textMuted, fontSize: 11 }}>{new Date(post.timestamp).toLocaleDateString('tr-TR')}</Text>
              </View>
            </View>
            <Text style={{ color: T.text, fontSize: 15, lineHeight: 22 }}>{post.content}</Text>
            <View style={{ flexDirection: 'row', marginTop: 10, gap: 16 }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} onPress={() => handleLike(post)}>
                <Ionicons name={post.likes?.[userId] ? 'heart' : 'heart-outline'} size={18} color={post.likes?.[userId] ? '#EF4444' : T.textMuted} />
                <Text style={{ color: T.textMuted, fontSize: 13 }}>{likeCount(post)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="chatbubble-outline" size={17} color={T.textMuted} />
                <Text style={{ color: T.textMuted, fontSize: 13 }}>Yorum</Text>
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
  header: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
  headerTitle: { color: T.text, fontSize: 20, fontWeight: '700' },
  composeBox: { margin: 12, backgroundColor: T.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: T.border },
  composeInput: { color: T.text, fontSize: 15, minHeight: 60, textAlignVertical: 'top' },
  postBtn: { backgroundColor: T.accent, borderRadius: 10, paddingVertical: 9, alignItems: 'center', marginTop: 8 },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  card: { backgroundColor: T.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: T.border },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
});
