import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { buildGrowthRadar } from "../services/aiGrowthRadarService";

export default function AdminGrowthRadarCard() {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  useEffect(() => { buildGrowthRadar().then(setData).catch(() => setData(null)); }, []);
  if (!data) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-white font-bold mb-3">AI Growth Radar</div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-white/10 p-3"><div className="text-white/50">Growth Score</div><div className="text-white font-bold text-xl">{data.growthScore}</div></div>
        <div className="rounded-xl border border-white/10 p-3"><div className="text-white/50">{t('admin.newUsers')}</div><div className="text-white font-bold text-xl">{data.newUsers}</div></div>
        <div className="rounded-xl border border-white/10 p-3"><div className="text-white/50">{t('admin.totalMessages')}</div><div className="text-white font-bold">{data.messageCount}</div></div>
        <div className="rounded-xl border border-white/10 p-3"><div className="text-white/50">Forum</div><div className="text-white font-bold">{data.forumCount}</div></div>
      </div>
    </div>
  );
}
