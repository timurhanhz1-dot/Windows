
import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { createDemoReport, getRecentReports, updateReportStatus } from "../services/rtdbModerationService";

export default function AdminModerationOverviewCard() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      const items = await getRecentReports();
      setReports(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const openCount = reports.filter((r) => r.status === "open").length;
  const reviewedCount = reports.filter((r) => r.status === "reviewed").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-white text-lg font-bold">AI Moderation</div>
          <div className="text-white/40 text-sm">{t('admin.reportsSubtitle', 'Raporlar ve hızlı aksiyon alanı')}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white/70 hover:text-white transition-all flex items-center gap-1"
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            {collapsed ? t('common.more') : t('common.less')}
          </button>
          <button
            onClick={async () => { await createDemoReport(); await loadReports(); }}
            className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/20 transition-all"
          >
            Demo Rapor Ekle
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
              <div className="text-xs uppercase tracking-wider text-red-300/80">Open</div>
              <div className="mt-1 text-2xl font-black text-white">{openCount}</div>
            </div>
            <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
              <div className="text-xs uppercase tracking-wider text-yellow-300/80">Reviewed</div>
              <div className="mt-1 text-2xl font-black text-white">{reviewedCount}</div>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="text-xs uppercase tracking-wider text-emerald-300/80">Resolved</div>
              <div className="mt-1 text-2xl font-black text-white">{resolvedCount}</div>
            </div>
          </div>

          <div className="space-y-3">
            {loading && <div className="text-white/50 text-sm">{t('common.loading')}</div>}

            {!loading && reports.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 p-4 text-white/40 text-sm">
                {t('admin.noReports', 'Henüz moderasyon raporu yok.')}
              </div>
            )}

            {!loading && reports.map((report) => (
              <div key={report.id} className="rounded-xl border border-white/10 bg-black/10 p-3 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-white font-semibold flex items-center gap-2">
                      <AlertTriangle size={16} className="text-yellow-400" />
                      {report.reason}
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      {report.targetType} / {report.targetId} · Bildiren: {report.reportedBy}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <span className="px-2 py-1 rounded-lg border border-white/10 text-xs text-white/70">Risk {report.riskScore || 20}</span>
                      <span className="px-2 py-1 rounded-lg border border-white/10 text-xs text-white/70">Öncelik: {report.priority || "Düşük"}</span>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg border border-white/10 text-white/70">
                    {report.status || "open"}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={async () => { await updateReportStatus(report.id, "reviewed"); await loadReports(); }}
                    className="px-3 py-1.5 rounded-lg border border-yellow-500/20 text-yellow-300 bg-yellow-500/5 text-sm"
                  >
                    <Eye size={14} className="inline mr-1" />
                    Reviewed
                  </button>
                  <button
                    onClick={async () => { await updateReportStatus(report.id, "resolved"); await loadReports(); }}
                    className="px-3 py-1.5 rounded-lg border border-emerald-500/20 text-emerald-300 bg-emerald-500/5 text-sm"
                  >
                    <CheckCircle2 size={14} className="inline mr-1" />
                    Resolved
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
