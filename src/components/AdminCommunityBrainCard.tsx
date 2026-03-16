import React, { useEffect, useState } from "react";
import { analyzeCommunityBrain } from "../services/aiCommunityBrainService";

export default function AdminCommunityBrainCard() {
  const [report, setReport] = useState<any>(null);
  useEffect(() => { analyzeCommunityBrain().then(setReport).catch(() => setReport(null)); }, []);
  if (!report) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-white font-bold mb-2">AI Community Brain</div>
      <div className="text-sm text-white/70 mb-3">Topluluk ruh hali: <span className="text-white font-semibold">{report.mood}</span></div>
      <div className="flex flex-wrap gap-2 mb-3">
        {report.dominantTopics?.map((t: string) => (
          <span key={t} className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">{t}</span>
        ))}
      </div>
      <div className="space-y-1 text-sm text-white/65">
        {report.recommendations?.map((r: string) => <div key={r}>• {r}</div>)}
      </div>
    </div>
  );
}
