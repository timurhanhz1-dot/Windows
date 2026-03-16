import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "../firebase";
import { buildMemoryProfile } from "../services/aiMemoryProfileService";
export default function ProfileAiInsightsCard() {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  useEffect(() => { buildMemoryProfile(auth.currentUser?.uid).then(setData).catch(() => setData(null)); }, []);
  if (!data) return null;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mt-4">
      <div className="text-white font-bold mb-2">{t('profile.aiInsights')}</div>
      <div className="text-sm text-white/70 mb-2">{data.summary}</div>
      <div className="flex flex-wrap gap-2">{data.interests?.map((i:string)=><span key={i} className="px-2 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">{i}</span>)}</div>
    </div>
  );
}
