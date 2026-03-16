import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface MessageLike {
  text?: string;
  content?: string;
}

interface Props {
  messages?: MessageLike[];
}

const STOP = new Set([
  "ve","ile","için","bir","çok","gibi","daha","olan",
  "bu","şu","the","that","with","your","from"
]);

function extractKeywords(messages: MessageLike[] = [], limit = 5) {
  const counts: Record<string, number> = {};

  messages.forEach((m) => {
    const text = String(m?.text || m?.content || "").toLowerCase();
    text
      .replace(/[^a-z0-9çğıöşü\s]/gi, " ")
      .split(/\s+/)
      .filter(Boolean)
      .forEach((w) => {
        if (w.length >= 4 && !STOP.has(w)) {
          counts[w] = (counts[w] || 0) + 1;
        }
      });
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

export default function ChannelAiSummaryCard({ messages = [] }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const keywords = useMemo(() => extractKeywords(messages, 5), [messages]);
  const summary = keywords.length
    ? t('channelAi.highlights', { keywords: keywords.join(", ") })
    : t('channelAi.noSignal');

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.10)] transition hover:bg-cyan-400/15"
        title="AI Özeti"
      >
        ✨
      </button>

      {open && (
        <div className="absolute right-0 top-14 z-30 w-[340px] rounded-2xl border border-cyan-400/20 bg-[#07131a]/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="mb-2 text-sm font-semibold text-cyan-300">
            {t('channelAi.title')}
          </div>

          <div className="text-sm leading-6 text-white/75">
            {summary}
          </div>

          {!!keywords.length && (
            <div className="mt-3 flex flex-wrap gap-2">
              {keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-full border border-cyan-400/20 px-2.5 py-1 text-xs text-cyan-200"
                >
                  {k}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
