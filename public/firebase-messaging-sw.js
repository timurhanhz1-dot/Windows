importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBMA7zmhpq66DBjacenKzZIub_-YCZWegk",
  authDomain: "lisa-518f0.firebaseapp.com",
  databaseURL: "https://lisa-518f0-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "lisa-518f0",
  storageBucket: "lisa-518f0.firebasestorage.app",
  messagingSenderId: "873280730927",
  appId: "1:873280730927:web:68548536ebbcc91da593da",
});

const messaging = firebase.messaging();

// Arka planda gelen bildirimleri göster
messaging.onBackgroundMessage(payload => {
  const { title, body, icon, click_action } = payload.notification || {};
  self.registration.showNotification(title || 'Nature.co', {
    body: body || 'Yeni bildirim',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: click_action || '/chat' },
    vibrate: [100, 50, 100],
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/chat';
  e.waitUntil(clients.openWindow(url));
});
