import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "../firebase";
import { buildNatureBotPanel } from "../services/aiNatureBotService";

interface Props {
  onPick?: (prompt: string) => void;
  onClear?: () => void;
}

export default function NatureBotAssistantPanel({ onPick, onClear }: Props) {
  const { t } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const loadingRef = React.useRef(false);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const load = useCallback(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    buildNatureBotPanel(auth.currentUser?.uid)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => { loadingRef.current = false; });
  }, []);

  useEffect(() => {
    if (!open) return; // Kapalıyken yükleme
    load();

    const refresh = () => load();
    window.addEventListener("naturebot-memory-reset", refresh);
    window.addEventListener("naturebot-memory-updated", refresh);

    return () => {
      window.removeEventListener("naturebot-memory-reset", refresh);
      window.removeEventListener("naturebot-memory-updated", refresh);
    };
  }, [load, open]);

  const prompts = data?.prompts || [
    t('natureBotPanel.defaultPrompt1'),
    t('natureBotPanel.defaultPrompt2'),
    t('natureBotPanel.defaultPrompt3'),
  ];

  const memoryText =
    data?.profile?.summary ||
    t('natureBotPanel.memoryDefault');

  const recent = data?.recentConversations || [];

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.14)] transition hover:bg-emerald-400/15"
        title="NatureBot AI"
      >
        ✨
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-[120] w-[360px] rounded-3xl border border-emerald-400/20 bg-[#07130d] p-4 shadow-2xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-emerald-300">
              NatureBot AI
            </div>

            <button
              type="button"
              onClick={() => { onClear?.(); setOpen(false); }}
              className="rounded-2xl border border-white/10 px-3 py-2 text-xs text-white/70 transition hover:bg-white/5"
            >
              {t('natureBotPanel.clear')}
            </button>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4">
              <div className="mb-1 text-xs uppercase tracking-[0.16em] text-emerald-300/70">
                {t('natureBotPanel.memory')}
              </div>
              <div className="text-sm leading-6 text-white/75">
                {memoryText}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs uppercase tracking-[0.16em] text-white/45">
                  {t('natureBotPanel.recentConversations')}
                </div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-emerald-300/70">
                  {t('natureBotPanel.live')}
                </div>
              </div>

              {recent.length ? (
                <div className="space-y-2">
                  {recent.slice(0, 3).map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/65"
                    >
                      {item?.content || item?.text || t('natureBotPanel.noRecords')}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-white/45">
                  {t('natureBotPanel.noRecords')}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 text-xs uppercase tracking-[0.16em] text-white/45">
                {t('natureBotPanel.quickActions')}
              </div>

              <div className="flex flex-wrap gap-2">
                {prompts.map((p: string) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      onPick?.(p);
                      setOpen(false);
                    }}
                    className="rounded-full border border-emerald-400/20 px-3 py-2 text-xs text-emerald-200 transition hover:bg-emerald-400/10"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
