import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { ref, set, get } from 'firebase/database';
import { db } from '../firebase';
import { initializeApp, getApps } from 'firebase/app';

const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY || '';

function getMessagingInstance() {
  const app = getApps()[0];
  if (!app) return null;
  try {
    return getMessaging(app);
  } catch {
    return null;
  }
}

/**
 * Kullanıcının FCM token'ını al ve Firebase'e kaydet
 */
export async function initFCM(userId: string): Promise<string | null> {
  try {
    if (!('Notification' in window)) return null;
    if (!('serviceWorker' in navigator)) return null;
    if (!VAPID_KEY) {
      console.warn('FCM VAPID key eksik — .env dosyasına VITE_FCM_VAPID_KEY ekleyin');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessagingInstance();
    if (!messaging) return null;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: sw,
    });

    if (token) {
      // Token'ı kullanıcı kaydına yaz
      await set(ref(db, `fcm_tokens/${userId}/${token.slice(-20)}`), {
        token,
        updatedAt: Date.now(),
        platform: 'web',
      });
    }

    return token;
  } catch (err) {
    console.error('FCM init failed:', err);
    return null;
  }
}

/**
 * Ön planda gelen bildirimleri dinle
 */
export function listenForegroundMessages(
  onNotification: (title: string, body: string, data?: any) => void
): (() => void) | null {
  const messaging = getMessagingInstance();
  if (!messaging) return null;

  const unsub = onMessage(messaging, payload => {
    const title = payload.notification?.title || 'Nature.co';
    const body = payload.notification?.body || '';
    onNotification(title, body, payload.data);
  });

  return unsub;
}

/**
 * Kullanıcının token'larını getir (Cloud Function için)
 */
export async function getUserFCMTokens(userId: string): Promise<string[]> {
  try {
    const snap = await get(ref(db, `fcm_tokens/${userId}`));
    if (!snap.exists()) return [];
    return Object.values(snap.val()).map((v: any) => v.token);
  } catch {
    return [];
  }
}
