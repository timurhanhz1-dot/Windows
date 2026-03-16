const BAD_WORDS = ["hakaret", "salak", "aptal", "küfür"];

export function scoreModerationRisk(text: string) {
  const lower = String(text || "").toLowerCase();
  const hits = BAD_WORDS.filter((w) => lower.includes(w));
  const spam = /(.)\1{5,}/.test(lower) || lower.split("http").length > 3;
  const score = Math.min(100, hits.length * 35 + (spam ? 25 : 0));
  return { score, label: score >= 70 ? "yüksek risk" : score >= 35 ? "orta risk" : "düşük risk", reasons: [...hits.map((w) => `${w} ifadesi`), ...(spam ? ["spam paterni"] : [])] };
}
