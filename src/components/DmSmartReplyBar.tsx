import React, { useState, useEffect } from "react";
import { Brain, Sparkles, MessageCircle } from "lucide-react";

export default function DmSmartReplyBar({ 
  suggestions = [], 
  onPick 
}: { 
  suggestions?: string[]; 
  onPick?: (v: string) => void; 
}) {
  if (!suggestions.length) return null;

  return (
    <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02]">
      {/* Minimal AI Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex items-center gap-1 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-full">
          <Brain size={10} className="text-purple-400" />
          <span className="text-[9px] font-medium text-purple-300">AI</span>
        </div>
      </div>

      {/* Simple Suggestions */}
      <div className="flex flex-wrap gap-1.5">
        {suggestions.slice(0, 4).map((s) => (
          <button
            key={s}
            onClick={() => onPick?.(s)}
            className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs hover:bg-white/10 hover:text-white transition-all"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
