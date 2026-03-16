import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

// Initialize Firebase Admin
admin.initializeApp();

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// API configuration endpoint
app.get("/api/config", (req, res) => {
  res.json({
    app: {
      name: "Nature.co",
      version: "1.0.0",
      description: "Ekosistemin merkezi",
    },
    features: {
      ai: true,
      live: true,
      voice: true,
      games: true,
      forum: true,
    },
    ai: {
      enabled: true,
      model: "llama-3.3-70b-versatile",
      visionModel: "llama-3.2-11b-vision-preview",
    },
  });
});

// AI endpoint for NatureBot
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Here you would integrate with your AI service
    // For now, return a mock response
    const response = {
      content: "Nature.co ekosisteminde size nasıl yardımcı olabilirim?",
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// User analytics endpoint
app.post("/api/analytics", async (req, res) => {
  try {
    const { event, data, userId } = req.body;
    
    // Log to Firebase Analytics
    if (userId) {
      await admin.analytics().logEvent(event, {
        ...data,
        user_id: userId,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Rate limiting middleware
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const rateLimit = (maxRequests: number, windowMs: number) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const clientIp = req.ip || req.connection.remoteAddress || "unknown";
    const now = Date.now();
    const windowStart = now - windowMs;

    const clientData = rateLimitMap.get(clientIp) || { count: 0, resetTime: now + windowMs };

    if (now > clientData.resetTime) {
      clientData.count = 0;
      clientData.resetTime = now + windowMs;
    }

    clientData.count++;
    rateLimitMap.set(clientIp, clientData);

    if (clientData.count > maxRequests) {
      return res.status(429).json({
        error: "Too many requests",
        message: `Rate limit exceeded. Try again in ${Math.ceil((clientData.resetTime - now) / 1000)} seconds.`,
      });
    }

    next();
  };
};

// Apply rate limiting
app.use("/api/", rateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

// Export the Express app as a Firebase Function
export const api = functions.https.onRequest(app);

// Admin: Delete user (Auth + RTDB) — sadece admin çağırabilir
export const deleteUserAccount = functions.https.onCall(async (data, context) => {
  // Çağıranın admin olup olmadığını kontrol et
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Giriş yapmalısınız.");
  }
  const callerSnap = await admin.database().ref(`users/${context.auth.uid}/is_admin`).get();
  if (!callerSnap.val()) {
    throw new functions.https.HttpsError("permission-denied", "Bu işlem için admin yetkisi gerekli.");
  }

  const { uid } = data;
  if (!uid) throw new functions.https.HttpsError("invalid-argument", "uid gerekli.");

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

  // username kaydını da temizle (email üzerinden uid bul)
  const usernamesSnap = await db.ref("usernames").get();
  if (usernamesSnap.exists()) {
    const usernames = usernamesSnap.val() as Record<string, string>;
    for (const [uname, id] of Object.entries(usernames)) {
      if (id === uid) {
        await db.ref(`usernames/${uname}`).remove();
        break;
      }
    }
  }

  return { success: true };
});

// Background functions
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  console.log("New user created:", user.uid);
  
  // Create user profile in Firestore
  await admin.firestore().collection("users").doc(user.uid).set({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastActive: admin.firestore.FieldValue.serverTimestamp(),
  });
});

export const onUserDelete = functions.auth.user().onDelete(async (user) => {
  console.log("User deleted:", user.uid);
  
  // Clean up user data
  await admin.firestore().collection("users").doc(user.uid).delete();
});

// Scheduled function for cleanup
export const scheduledCleanup = functions.pubsub
  .schedule("every 24 hours")
  .onRun(async (context) => {
    console.log("Running scheduled cleanup...");
    
    // Clean up old data, logs, etc.
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);
    
    // Example: Clean up old analytics data
    const oldAnalytics = await admin.firestore()
      .collection("analytics")
      .where("timestamp", "<", cutoffDate)
      .get();
    
    const batch = admin.firestore().batch();
    oldAnalytics.forEach((doc) => batch.delete(doc.ref));
    
    await batch.commit();
    console.log(`Cleaned up ${oldAnalytics.size} old analytics records`);
  });
