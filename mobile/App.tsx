import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { ref, update } from 'firebase/database';
import { db } from './src/firebase/index';
import { AuthScreen } from './src/screens/AuthScreen';
import { AppNavigator } from './src/navigation/AppNavigator';
import { T } from './src/theme/index';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // Online durumunu guncelle
        await update(ref(db, `users/${u.uid}`), { online: true, last_seen: new Date().toISOString() });
      }
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={T.accent} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" backgroundColor={T.bg} />
          {user ? (
            <AppNavigator
              userId={user.uid}
              username={user.displayName || user.email?.split('@')[0] || 'Kullanici'}
            />
          ) : (
            <AuthScreen />
          )}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
