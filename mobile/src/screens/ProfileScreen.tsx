import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, signOut } from 'firebase/auth';
import { db } from '../firebase/index';
import { ref, onValue, off } from 'firebase/database';
import { T } from '../theme/index';

interface UserData {
  displayName?: string; username?: string; bio?: string; photoURL?: string;
  eco_points?: number; xp?: number; is_verified?: boolean; is_admin?: boolean; level?: number;
}

const LEVEL_XP = [0,100,250,500,800,1200,1700,2300,3000,3800,4700];
const LEVEL_NAMES = ['Tohum','Filiz','Yaprak','Dal','Ağaç','Orman','Ekosistem Gücü','Doğa Koruyucu','Gezegen Bekçisi','Evren Ruhu'];

export const ProfileScreen = ({ userId }: { userId: string }) => {
  const [userData, setUserData] = useState<UserData>({});
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [friendCount, setFriendCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'ekosistem'|'rozetler'|'hakkinda'>('ekosistem');
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    const userRef = ref(db, `users/${userId}`);
    onValue(userRef, snap => { setUserData(snap.val() || {}); setLoading(false); });
    onValue(ref(db, `followers/${userId}`), snap => setFollowerCount(Object.keys(snap.val() || {}).length));
    onValue(ref(db, `following/${userId}`), snap => setFollowingCount(Object.keys(snap.val() || {}).length));
    onValue(ref(db, `users/${userId}/friends`), snap => setFriendCount(Object.keys(snap.val() || {}).length));
    onValue(ref(db, 'nature_posts'), snap => {
      const data = snap.val() || {};
      setPostCount(Object.values(data).filter((p: any) => p.userId === userId).length);
    });
    return () => {
      off(ref(db, `users/${userId}`));
      off(ref(db, `followers/${userId}`));
      off(ref(db, `following/${userId}`));
      off(ref(db, `users/${userId}/friends`));
      off(ref(db, 'nature_posts'));
    };
  }, [userId]);

  const handleSignOut = () => {
    Alert.alert('Cikis Yap', 'Emin misin?', [
      { text: 'Iptal', style: 'cancel' },
      { text: 'Cikis Yap', style: 'destructive', onPress: () => signOut(auth) },
    ]);
  };

  const xp = userData.xp || 0;
  const eco = userData.eco_points || 0;
  const level = Math.min(Math.floor(xp / 100) + 1, 10);
  const levelName = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)];
  const currentLevelXP = LEVEL_XP[Math.min(level - 1, LEVEL_XP.length - 1)];
  const nextLevelXP = LEVEL_XP[Math.min(level, LEVEL_XP.length - 1)] || currentLevelXP + 100;
  const xpProgress = Math.min((xp - currentLevelXP) / (nextLevelXP - currentLevelXP), 1);
  const displayName = userData.displayName || userData.username || 'Kullanici';

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={T.accent} />
    </View>
  );

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover */}
        <View style={s.cover}>
          <View style={s.levelBadge}>
            <Ionicons name="flash" size={12} color={T.yellow} />
            <Text style={{ color: T.yellow, fontSize: 12, fontWeight: '700', marginLeft: 3 }}>Seviye {level}</Text>
          </View>
        </View>

        {/* Avatar + Actions */}
        <View style={s.avatarRow}>
          <View style={s.avatarWrap}>
            {userData.photoURL
              ? <Image source={{ uri: userData.photoURL }} style={s.avatar} />
              : <Text style={s.avatarText}>{displayName[0].toUpperCase()}</Text>}
            <View style={s.cameraBtn}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <TouchableOpacity style={s.editBtn}>
              <Ionicons name="pencil" size={14} color={T.accent} />
              <Text style={{ color: T.accent, fontSize: 13, fontWeight: '600', marginLeft: 4 }}>Güncelle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn}>
              <Ionicons name="share-outline" size={16} color={T.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn}>
              <Ionicons name="shield-outline" size={16} color={T.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Name */}
        <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={s.displayName}>{displayName}</Text>
            {userData.is_verified && <Ionicons name="checkmark-circle" size={18} color={T.accent} />}
            {userData.is_admin && (
              <View style={s.adminBadge}><Text style={{ color: T.yellow, fontSize: 11, fontWeight: '700' }}>ADMİN</Text></View>
            )}
          </View>
          {userData.username && <Text style={s.username}>@{userData.username}</Text>}
          {userData.bio && <Text style={s.bio}>{userData.bio}</Text>}

          {/* Stats */}
          <View style={s.statsRow}>
            <TouchableOpacity style={s.stat}>
              <Ionicons name="chatbubble-outline" size={14} color={T.textMuted} />
              <Text style={s.statNum}>{postCount} Post</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.stat}>
              <Ionicons name="leaf-outline" size={14} color={T.accent} />
              <Text style={s.statNum}>{followerCount} Takipçi</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.stat}>
              <Ionicons name="leaf-outline" size={14} color={T.accent} />
              <Text style={s.statNum}>{followingCount} Takip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.stat}>
              <Ionicons name="people-outline" size={14} color={T.textMuted} />
              <Text style={s.statNum}>{friendCount} Arkadaş</Text>
            </TouchableOpacity>
          </View>

          {/* Level Card */}
          <View style={s.levelCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={s.levelIcon}>
                  <Ionicons name="flash" size={16} color={T.yellow} />
                </View>
                <View>
                  <Text style={{ color: T.text, fontWeight: '700', fontSize: 14 }}>Seviye {level}</Text>
                  <Text style={{ color: T.textMuted, fontSize: 12 }}>{levelName}</Text>
                </View>
              </View>
              <View style={s.ecoBadge}>
                <Ionicons name="leaf" size={13} color={T.accent} />
                <Text style={{ color: T.accent, fontSize: 13, fontWeight: '700', marginLeft: 4 }}>{eco} EP</Text>
              </View>
            </View>
            <View style={s.xpBar}>
              <View style={[s.xpFill, { width: `${xpProgress * 100}%` as any }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
              <Text style={{ color: T.accent, fontSize: 11 }}>{xp} XP</Text>
              <Text style={{ color: T.textMuted, fontSize: 11 }}>{nextLevelXP - xp} XP kaldı</Text>
              <Text style={{ color: T.textMuted, fontSize: 11 }}>{nextLevelXP} XP</Text>
            </View>
          </View>

          {/* Story */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
            <TouchableOpacity style={s.storyAdd}>
              <View style={s.storyAddIcon}>
                <Ionicons name="add" size={22} color={T.accent} />
              </View>
              <Text style={{ color: T.textMuted, fontSize: 11, marginTop: 4 }}>Hikaye E...</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Tabs */}
          <View style={s.tabRow}>
            {(['ekosistem','rozetler','hakkinda'] as const).map(tab => (
              <TouchableOpacity key={tab} style={[s.tabBtn, activeTab === tab && s.tabBtnActive]} onPress={() => setActiveTab(tab)}>
                <Ionicons
                  name={tab === 'ekosistem' ? 'leaf' : tab === 'rozetler' ? 'trophy' : 'information-circle'}
                  size={14} color={activeTab === tab ? T.accent : T.textMuted}
                />
                <Text style={[s.tabText, activeTab === tab && { color: T.accent }]}>
                  {tab === 'ekosistem' ? 'Ekosistem' : tab === 'rozetler' ? 'Rozetler' : 'Hakkında'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          {activeTab === 'ekosistem' && (
            <View style={s.contentCard}>
              <Ionicons name="leaf" size={20} color={T.accent} />
              <View style={{ marginLeft: 12 }}>
                <Text style={{ color: T.text, fontWeight: '700', fontSize: 14 }}>Yeni İçerik Paylaş</Text>
                <Text style={{ color: T.textMuted, fontSize: 12, marginTop: 2 }}>Ekosisteme katkıda bulun ve +10 eco points kazan</Text>
              </View>
            </View>
          )}
          {activeTab === 'rozetler' && (
            <View style={{ alignItems: 'center', padding: 24 }}>
              <Text style={{ color: T.textMuted, fontSize: 14 }}>Henüz rozet yok</Text>
            </View>
          )}
          {activeTab === 'hakkinda' && (
            <View style={{ gap: 10, paddingVertical: 8 }}>
              <TouchableOpacity style={s.menuItem} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={20} color={T.red} />
                <Text style={[s.menuText, { color: T.red }]}>Çıkış Yap</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  cover: { height: 110, backgroundColor: T.surface, borderBottomWidth: 1, borderBottomColor: T.border, justifyContent: 'flex-end', alignItems: 'flex-end', padding: 12 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  avatarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, marginTop: -36 },
  avatarWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: T.accentDim, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: T.bg, overflow: 'hidden' },
  avatar: { width: 80, height: 80 },
  avatarText: { fontSize: 32, fontWeight: '800', color: T.accent },
  cameraBtn: { position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: T.accent, alignItems: 'center', justifyContent: 'center' },
  editBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: T.border },
  iconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: T.border },
  displayName: { color: T.text, fontSize: 20, fontWeight: '800' },
  username: { color: T.textMuted, fontSize: 14, marginTop: 2 },
  bio: { color: T.textDim, fontSize: 14, marginTop: 6, lineHeight: 20 },
  adminBadge: { backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.surface, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: T.border },
  statNum: { color: T.textDim, fontSize: 12, fontWeight: '600' },
  levelCard: { backgroundColor: T.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: T.border, marginTop: 12 },
  levelIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(245,158,11,0.15)', alignItems: 'center', justifyContent: 'center' },
  ecoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.accentDim, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: T.border },
  xpBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: 8, backgroundColor: T.accent, borderRadius: 4 },
  storyAdd: { alignItems: 'center', marginRight: 12 },
  storyAddIcon: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: T.accent, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  tabRow: { flexDirection: 'row', backgroundColor: T.surface, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: T.border, marginBottom: 12 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8, borderRadius: 10 },
  tabBtnActive: { backgroundColor: T.accentDim },
  tabText: { color: T.textMuted, fontSize: 12, fontWeight: '600' },
  contentCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: T.border, marginBottom: 12 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  menuText: { color: T.text, fontSize: 15, fontWeight: '500' },
});
