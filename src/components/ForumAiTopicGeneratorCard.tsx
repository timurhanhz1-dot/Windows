import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { generateForumTopics } from "../services/aiTopicGeneratorService";

export default function ForumAiTopicGeneratorCard() {
  const { t } = useTranslation();
  const [topics, setTopics] = useState<any[]>([]);
  useEffect(() => { generateForumTopics().then(setTopics).catch(() => setTopics([])); }, []);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
      <div className="text-white font-bold mb-3">AI Topic Generator</div>
      <div className="space-y-2">
        {topics.length === 0 ? <div className="text-sm text-white/50">{t('forum.aiTopicsLoading')}</div> : topics.map((t) => (
          <div key={t.seed} className="text-sm text-white/70">• {t.title}</div>
        ))}
      </div>
    </div>
  );
}
