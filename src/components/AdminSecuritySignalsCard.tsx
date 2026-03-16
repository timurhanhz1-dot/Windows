import React from "react";
export default function AdminSecuritySignalsCard() {
  return (
    <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
      <div className="text-white font-bold mb-2">Güvenlik Sinyalleri</div>
      <div className="text-sm text-white/60">Anomali, spam ve riskli davranış alanı.</div>
    </div>
  );
}
