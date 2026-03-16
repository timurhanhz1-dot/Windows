const functions = require('firebase-functions');
const https = require('https');
const cors = require('cors')({ origin: true });
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

// Groq API Proxy
exports.groqProxy = functions.https.onRequest((req, res) => {
  // CORS'u handle et
  return cors(req, res, () => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }
    
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    
    const postData = JSON.stringify(req.body);
    
    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization,
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const proxyReq = https.request(options, (proxyRes) => {
      let data = '';
      
      proxyRes.on('data', (chunk) => {
        data += chunk;
      });
      
      proxyRes.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          res.status(proxyRes.statusCode).json(jsonData);
        } catch (error) {
          res.status(proxyRes.statusCode).send(data);
        }
      });
    });
    
    proxyReq.on('error', (error) => {
      console.error('Proxy request error:', error);
      res.status(500).json({ error: 'Proxy request failed' });
    });
    
    proxyReq.write(postData);
    proxyReq.end();
  });
});

// Admin: Delete user (Auth + RTDB) — sadece admin çağırabilir
exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Giriş yapmalısınız.');
  }

  const callerSnap = await admin.database().ref(`users/${context.auth.uid}/is_admin`).get();
  if (!callerSnap.val()) {
    throw new functions.https.HttpsError('permission-denied', 'Bu işlem için admin yetkisi gerekli.');
  }

  const { uid } = data;
  if (!uid) throw new functions.https.HttpsError('invalid-argument', 'uid gerekli.');

  // Firebase Auth'dan sil
  await admin.auth().deleteUser(uid);

  // Realtime Database'den temizle
  const db = admin.database();
  await Promise.all([
    db.ref(`users/${uid}`).remove(),
    db.ref(`userEmails/${uid}`).remove(),
    db.ref(`user_index/${uid}`).remove(),
    db.ref(`email_verifications/${uid}`).remove(),
  ]);

  // username kaydını da temizle
  const usernamesSnap = await db.ref('usernames').get();
  if (usernamesSnap.exists()) {
    const usernames = usernamesSnap.val();
    for (const [uname, id] of Object.entries(usernames)) {
      if (id === uid) {
        await db.ref(`usernames/${uname}`).remove();
        break;
      }
    }
  }

  return { success: true };
});

// Push bildirim gönder — server-side (Admin SDK ile)
exports.sendPushNotification = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Giriş yapmalısınız.');
  }

  const { targetUserId, title, body, url } = data;
  if (!targetUserId || !title) {
    throw new functions.https.HttpsError('invalid-argument', 'targetUserId ve title gerekli.');
  }

  // Hedef kullanıcının FCM token'larını al
  const tokensSnap = await admin.database().ref(`fcm_tokens/${targetUserId}`).get();
  if (!tokensSnap.exists()) return { sent: 0 };

  const tokens = Object.values(tokensSnap.val()).map(v => v.token).filter(Boolean);
  if (tokens.length === 0) return { sent: 0 };

  const message = {
    notification: { title, body: body || '' },
    data: { url: url || '/chat' },
    tokens,
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  // Geçersiz token'ları temizle
  const db = admin.database();
  response.responses.forEach((res, idx) => {
    if (!res.success && res.error?.code === 'messaging/registration-token-not-registered') {
      const token = tokens[idx];
      const key = token.slice(-20);
      db.ref(`fcm_tokens/${targetUserId}/${key}`).remove().catch(() => {});
    }
  });

  return { sent: response.successCount };
});

// DM geldiğinde otomatik bildirim gönder
exports.onNewDM = functions.database
  .ref('dm/{dmKey}/{messageId}')
  .onCreate(async (snap, context) => {
    const msg = snap.val();
    if (!msg) return;

    const { dmKey } = context.params;
    const parts = dmKey.split('_');
    if (parts.length !== 2) return;

    const senderId = msg.senderId || msg.sender_id;
    const receiverId = parts.find(id => id !== senderId);
    if (!receiverId || !senderId) return;

    // Gönderenin adını al
    const senderSnap = await admin.database().ref(`users/${senderId}/username`).get();
    const senderName = senderSnap.val() || 'Biri';

    // Alıcının token'larını al
    const tokensSnap = await admin.database().ref(`fcm_tokens/${receiverId}`).get();
    if (!tokensSnap.exists()) return;

    const tokens = Object.values(tokensSnap.val()).map(v => v.token).filter(Boolean);
    if (tokens.length === 0) return;

    const text = msg.text || msg.content || 'Yeni mesaj';
    await admin.messaging().sendEachForMulticast({
      notification: {
        title: `${senderName} sana mesaj gönderdi`,
        body: text.length > 80 ? text.slice(0, 80) + '…' : text,
      },
      data: { url: '/dm' },
      tokens,
    });
  });
