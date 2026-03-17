import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, signOut } from 'firebase/auth';
import { db } from '../firebase/index';
import { ref, onValue, off } from 'firebase/database';
import { T } from '../theme/index';

interface UserData { displayName?: string; username?: string; bio?: string; photoURL?: string; eco_points?: number; xp?: number; is_verified?: boolean; }

export const ProfileScreen = ({ userId }: { userId: string }) => {
  const [userData, setUserData] = useState<UserData>({});
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    const userRef = ref(db, `users/${userId}`);
    onValue(userRef, snap => { setUserData(snap.val() || {}); setLoading(false); });
    const followersRef = ref(db, `followers/${userId}`);
    onValue(followersRef, snap => setFollowerCount(Object.keys(snap.val() || {}).length));
    const followingRef = ref(db, `following/${userId}`);
    onValue(followingRef, snap => setFollowingCount(Object.keys(snap.val() || {}).length));
    const postsRef = ref(db, 'nature_posts');
    onValue(postsRef, snap => {
      const data = snap.val() || {};
      setPostCount(Object.values(data).filter((p: any) => p.userId === userId).length);
    });
    return () => { off(userRef); off(followersRef); off(followingRef); off(postsRef); };
  }, [userId]);

  const handleSignOut = () => {
    Alert.alert('Cikis Yap', 'Emin misin?', [
      { text: 'Iptal', style: 'cancel' },
      { text: 'Cikis Yap', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  const level = Math.floor((userData.eco_points || 0) / 100) + 1;
  const displayName = userData.displayName || userData.username || 'Kullanici';

  if (loading) return <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={T.accent} /></View>;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView>
        <View style={s.coverBg} />
        <View style={s.profileSection}>
          <View style={s.avatarWrap}>
            {userData.photoURL
              ? <Image source={{ uri: userData.photoURL }} style={s.avatar} />
              : <Text style={s.avatarText}>{displayName[0].toUpperCase()}</Text>}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
            <Text style={s.displayName}>{displayName}</Text>
            {userData.is_verified && <Ionicons name="checkmark-circle" size={18} color={T.accent} />}
          </View>
          {userData.username && <Text style={s.username}>@{userData.username}</Text>}
          {userData.bio && <Text style={s.bio}>{userData.bio}</Text>}

          <View style={s.statsRow}>
            <View style={s.stat}><Text style={s.statNum}>{postCount}</Text><Text style={s.statLabel}>Gonderi</Text></View>
            <View style={s.statDivider} />
            <View style={s.stat}><Text style={s.statNum}>{followerCount}</Text><Text style={s.statLabel}>Takipci</Text></View>
            <View style={s.statDivider} />
            <View style={s.stat}><Text style={s.statNum}>{followingCount}</Text><Text style={s.statLabel}>Takip</Text></View>
          </View>

          <View style={s.ecoRow}>
            <View style={s.ecoBadge}>
              <Text style={{ color: T.accent, fontSize: 13, fontWeight: '700' }}>🌿 {userData.eco_points || 0} Eco</Text>
            </View>
            <View style={s.ecoBadge}>
              <Text style={{ color: T.purple, fontSize: 13, fontWeight: '700' }}>⚡ Seviye {level}</Text>
            </View>
            <View style={s.ecoBadge}>
              <Text style={{ color: T.yellow, fontSize: 13, fontWeight: '700' }}>✨ {userData.xp || 0} XP</Text>
            </View>
          </View>
        </View>

        <View style={{ padding: 16, gap: 10 }}>
          <TouchableOpacity style={s.menuItem}>
            <Ionicons name="person-outline" size={20} color={T.accent} />
            <Text style={s.menuText}>Profili Duzenle</Text>
            <Ionicons name="chevron-forward" size={16} color={T.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <TouchableOpacity style={s.menuItem}>
            <Ionicons name="notifications-outline" size={20} color={T.accent} />
            <Text style={s.menuText}>Bildirimler</Text>
            <Ionicons name="chevron-forward" size={16} color={T.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <TouchableOpacity style={s.menuItem}>
            <Ionicons name="shield-outline" size={20} color={T.accent} />
            <Text style={s.menuText}>Gizlilik</Text>
            <Ionicons name="chevron-forward" size={16} color={T.textMuted} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.menuItem, { borderColor: 'rgba(239,68,68,0.2)' }]} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={T.red} />
            <Text style={[s.menuText, { color: T.red }]}>Cikis Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  coverBg: { height: 120, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border },
  profileSection: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, marginTop: -40 },
  avatarWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: T.bg, overflow: 'hidden' },
  avatar: { width: 80, height: 80 },
  avatarText: { fontSize: 32, fontWeight: '800', color: T.accent },
  displayName: { color: T.text, fontSize: 20, fontWeight: '800' },
  username: { color: T.textMuted, fontSize: 14, marginTop: 2 },
  bio: { color: T.textDim, fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: T.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: T.border, width: '100%' },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { color: T.text, fontSize: 18, fontWeight: '800' },
  statLabel: { color: T.textMuted, fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: T.border },
  ecoRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  ecoBadge: { backgroundColor: T.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: T.border },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: T.border },
  menuText: { color: T.text, fontSize: 15, fontWeight: '500' },
});
