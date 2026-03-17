import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { db } from '../firebase/index';
import { T } from '../theme/index';
import { NatureLogo } from '../components/NatureLogo';

export const AuthScreen = () => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = getAuth();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } else {
        if (!username.trim()) { Alert.alert('Hata', 'Kullanici adi gerekli'); setLoading(false); return; }
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: username.trim() });
        await set(ref(db, `users/${cred.user.uid}`), {
          uid: cred.user.uid,
          username: username.trim(),
          displayName: username.trim(),
          email: email.trim(),
          createdAt: new Date().toISOString(),
          online: true,
          eco_points: 0,
          xp: 0,
        });
      }
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Bir hata olustu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.card}>
        <View style={{ alignItems: 'center', marginBottom: 4 }}>
          <NatureLogo size={64} />
        </View>
        <Text style={s.logo}>Nature.co</Text>
        <Text style={s.subtitle}>Ekosistemin merkezi</Text>

        <View style={s.tabs}>
          <TouchableOpacity style={[s.tab, mode === 'login' && s.tabActive]} onPress={() => setMode('login')}>
            <Text style={[s.tabText, mode === 'login' && s.tabTextActive]}>Giris Yap</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, mode === 'register' && s.tabActive]} onPress={() => setMode('register')}>
            <Text style={[s.tabText, mode === 'register' && s.tabTextActive]}>Kayit Ol</Text>
          </TouchableOpacity>
        </View>

        {mode === 'register' && (
          <TextInput style={s.input} placeholder="Kullanici adi" placeholderTextColor={T.textMuted}
            value={username} onChangeText={setUsername} autoCapitalize="none" />
        )}
        <TextInput style={s.input} placeholder="E-posta" placeholderTextColor={T.textMuted}
          value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={s.input} placeholder="Sifre" placeholderTextColor={T.textMuted}
          value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <Text style={s.btnText}>{mode === 'login' ? 'Giris Yap' : 'Kayit Ol'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: T.surface, borderRadius: 20, padding: 28, borderWidth: 1, borderColor: T.border },
  logo: { fontSize: 28, fontWeight: '800', color: T.accent, textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: T.textMuted, textAlign: 'center', marginBottom: 24 },
  tabs: { flexDirection: 'row', backgroundColor: T.bg, borderRadius: 10, padding: 3, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: T.accent },
  tabText: { fontSize: 13, fontWeight: '600', color: T.textMuted },
  tabTextActive: { color: '#fff' },
  input: { backgroundColor: T.bg, borderWidth: 1, borderColor: T.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: T.text, fontSize: 15, marginBottom: 12 },
  btn: { backgroundColor: T.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
