import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildAdminIntelligenceSnapshot } from "../services/aiAdminIntelligenceService";

export default function AdminAiAnalyticsCard() {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<any>(null);
  useEffect(() => { buildAdminIntelligenceSnapshot().then(setSnapshot).catch(() => setSnapshot(null)); }, []);
  if (!snapshot) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-white font-bold mb-3">{t('admin.analytics')}</div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl border border-white/10 p-3"><div className="text-white/50">{t('admin.mood', 'Ruh Hali')}</div><div className="text-white font-bold">{snapshot.brain.mood}</div></div>
        <div className="rounded-xl border border-white/10 p-3"><div className="text-white/50">Growth</div><div className="text-white font-bold">{snapshot.growth.growthScore}</div></div>
        <div className="rounded-xl border border-white/10 p-3"><div className="text-white/50">{t('admin.viralContent', 'Viral İçerik')}</div><div className="text-white font-bold">{snapshot.viral.length}</div></div>
      </div>
    </div>
  );
}
