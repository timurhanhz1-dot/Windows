export async function summarizeThread(messages: Array<{ text?: string; content?: string }>) {
  const items = (messages || []).slice(-20).map((m) => String(m?.text || m?.content || "")).filter(Boolean);
  const phrases = Array.from(new Set(items.join(" ").split(/\s+/).filter((w) => w.length >= 5))).slice(0, 5);
  return { summary: items.length ? `Öne çıkan başlıklar: ${phrases.join(", ") || "genel sohbet"}.` : "Henüz özetlenecek mesaj yok.", bullets: phrases.map((p) => `${p} konuşuldu`) };
}
