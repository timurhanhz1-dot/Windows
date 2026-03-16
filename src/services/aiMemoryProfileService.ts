import { get, ref } from "firebase/database";
import { db, auth } from "../firebase";

export interface UserMemoryProfile {
  goals: string[];
  interests: string[];
  preferences: string[];
  tone: string;
  summary: string;
}

const STOP = new Set([
  "ve","ile","için","bir","çok","gibi","daha","olan",
  "this","that","with","your","have","from","about",
  "genel","kanal","mesaj","naturebot"
]);

function keyFor(userId: string) {
  return `natureco_user_memory_${userId}`;
}

function defaultProfile(): UserMemoryProfile {
  return {
    goals: [],
    interests: [],
    preferences: [],
    tone: "dengeli",
    summary: "",
  };
}

function uniq(items: string[], limit = 12) {
  return Array.from(new Set(items.filter(Boolean))).slice(0, limit);
}

function extractKeywords(text: string, limit = 8) {
  const counts: Record<string, number> = {};
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşü\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean)
    .forEach((w) => {
      if (w.length >= 4 && !STOP.has(w)) counts[w] = (counts[w] || 0) + 1;
    });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}

function inferTone(text: string) {
  const lower = String(text || "").toLowerCase();
  if (/yardım|destek|öğren|soru/.test(lower)) return "yardım odaklı";
  if (/plan|hedef|çalışma|üretim|içerik/.test(lower)) return "üretken";
  return "dengeli";
}

function buildSummary(interests: string[], goals: string[], tone: string) {
  const parts: string[] = [];
  if (interests.length) parts.push(`İlgi alanları: ${interests.join(", ")}`);
  if (goals.length) parts.push(`Hedef odakları: ${goals.join(", ")}`);
  parts.push(`Ton: ${tone}`);
  return parts.join(" • ");
}

export function getUserMemoryProfile(userId?: string): UserMemoryProfile {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return defaultProfile();

  try {
    const raw = localStorage.getItem(keyFor(uid));
    if (!raw) return defaultProfile();
    const parsed = JSON.parse(raw);
    return {
      goals: Array.isArray(parsed?.goals) ? parsed.goals : [],
      interests: Array.isArray(parsed?.interests) ? parsed.interests : [],
      preferences: Array.isArray(parsed?.preferences) ? parsed.preferences : [],
      tone: parsed?.tone || "dengeli",
      summary: parsed?.summary || "",
    };
  } catch {
    return defaultProfile();
  }
}

function saveUserMemoryProfile(userId: string, profile: UserMemoryProfile) {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(profile));
  } catch {}
}

export function clearUserMemoryProfile(userId: string) {
  try {
    localStorage.removeItem(keyFor(userId));
    window.dispatchEvent(new CustomEvent("naturebot-memory-reset"));
  } catch {}
}

export function updateUserMemoryFromAiHistory(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  userId?: string
): UserMemoryProfile {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return defaultProfile();

  const current = getUserMemoryProfile(uid);
  const userText = (history || [])
    .filter((h) => h.role === "user")
    .map((h) => h.content)
    .join(" ");

  const interests = uniq([
    ...current.interests,
    ...extractKeywords(userText, 8),
  ], 10);

  const goals = uniq([
    ...current.goals,
    ...extractKeywords(
      (history || [])
        .map((h) => h.content)
        .join(" "),
      6
    ),
  ], 6);

  const tone = inferTone(userText || current.summary);
  const next: UserMemoryProfile = {
    goals,
    interests,
    preferences: current.preferences || [],
    tone,
    summary: buildSummary(interests, goals, tone),
  };

  saveUserMemoryProfile(uid, next);

  try {
    window.dispatchEvent(new CustomEvent("naturebot-memory-updated"));
  } catch {}

  return next;
}

export function generateSmartPrompts(profile?: UserMemoryProfile): string[] {
  const p = profile || defaultProfile();
  const seed = p.interests[0] || p.goals[0] || "bugün";
  return [
    `${seed} için kısa bir plan hazırla`,
    `${seed} hakkında yaratıcı bir içerik fikri üret`,
    `${seed} konusunda bana yardımcı ol`,
  ];
}

export function buildCompanionInsight(profile?: UserMemoryProfile): string {
  const p = profile || defaultProfile();
  if (!p.interests.length && !p.goals.length) {
    return "NatureBot bugün sana eşlik etmeye hazır.";
  }
  return buildSummary(p.interests, p.goals, p.tone);
}

export async function buildMemoryProfile(userId?: string): Promise<UserMemoryProfile> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return defaultProfile();

  const cached = getUserMemoryProfile(uid);

  // Cache varsa ve özet doluysa Firebase'e gitme
  if (cached.summary && cached.interests.length > 0) {
    return cached;
  }

  const [userSnap, aiSnap] = await Promise.all([
    get(ref(db, `users/${uid}`)),
    get(ref(db, `ai_conversations/${uid}`)),
  ]);

  const user = userSnap.exists() ? userSnap.val() : {};
  const samples: string[] = [String(user?.bio || ""), String(user?.username || "")];

  if (aiSnap.exists()) {
    Object.values(aiSnap.val() || {})
      .slice(-10)
      .forEach((m: any) => {
        samples.push(String(m?.content || ""));
      });
  }

  const joined = samples.join(" ");
  const interests = uniq([...cached.interests, ...extractKeywords(joined, 10)], 10);
  const goals = uniq([...cached.goals, ...extractKeywords(joined, 6)], 6);
  const tone = inferTone(joined || cached.summary);

  const next: UserMemoryProfile = {
    goals,
    interests,
    preferences: cached.preferences || [],
    tone,
    summary: buildSummary(interests, goals, tone),
  };

  saveUserMemoryProfile(uid, next);

  try {
    window.dispatchEvent(new CustomEvent("naturebot-memory-updated"));
  } catch {}

  return next;
}
