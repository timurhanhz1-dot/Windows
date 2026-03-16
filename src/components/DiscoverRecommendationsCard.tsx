import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPersonalizedDiscovery } from "../services/aiDiscoveryService";
import { auth } from "../firebase";

export default function DiscoverRecommendationsCard() {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    setLoading(true);
    getPersonalizedDiscovery(userId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const allItems = [
    ...(data?.people || []).map((p: any) => ({ ...p, kind: 'person' })),
    ...(data?.communities || []).map((c: any) => ({ ...c, kind: 'community' })),
    ...(data?.channels || []).map((ch: any) => ({ ...ch, kind: 'channel' })),
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-white font-bold mb-1">Keşif Önerileri</div>
      {data?.reason && (
        <div className="text-xs text-white/40 mb-3">{data.reason}</div>
      )}
      <div className="space-y-2">
        {loading ? (
          <div className="text-sm text-white/50">{t('discover.loadingRecommendations', 'Yükleniyor...')}</div>
        ) : allItems.length === 0 ? (
          <div className="text-sm text-white/50">Henüz öneri yok. Daha fazla içerikle etkileşime geç.</div>
        ) : (
          allItems.slice(0, 6).map((item) => (
            <div key={`${item.kind}-${item.id}`} className="rounded-xl border border-white/10 p-3">
              <div className="text-white text-sm font-semibold">{item.username || item.name}</div>
              <div className="text-xs text-white/45 mt-1">
                {item.kind === 'person' && '👤 Kullanıcı'}
                {item.kind === 'community' && '🏘️ Topluluk'}
                {item.kind === 'channel' && '💬 Kanal'}
                {' • '}{item.reason}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
