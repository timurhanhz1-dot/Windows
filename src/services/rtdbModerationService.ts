
import { get, push, ref, update } from "firebase/database";
import { auth, db } from "../firebase";

export interface ModerationReport {
  id?: string;
  targetType: "message" | "user";
  targetId: string;
  reason: string;
  reportedBy: string;
  status?: "open" | "reviewed" | "resolved";
  created_at: number;
}

export async function getRecentReports(): Promise<ModerationReport[]> {
  const snapshot = await get(ref(db, "moderation_reports_v2"));
  if (!snapshot.exists()) return [];

  const raw = snapshot.val() || {};
  return Object.entries(raw)
    .map(([id, value]: any) => ({
      id,
      ...(value as ModerationReport),
    }))
    .sort((a, b) => Number(b.created_at || 0) - Number(a.created_at || 0))
    .slice(0, 8);
}

export async function updateReportStatus(
  reportId: string,
  status: "reviewed" | "resolved"
) {
  await update(ref(db, `moderation_reports_v2/${reportId}`), { status });
}

export async function createDemoReport() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Oturum bulunamadı");
  }

  const reportRef = ref(db, "moderation_reports_v2");

  await push(reportRef, {
    targetType: "message",
    targetId: "demo-message",
    reason: "Demo rapor kaydı",
    reportedBy: currentUser.uid,
    status: "open",
    created_at: Date.now(),
  });
}
