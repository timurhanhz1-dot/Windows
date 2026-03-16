import { get, ref } from "firebase/database";
import { db, auth } from "../firebase";

export async function suggestCommunities(limit = 5) {
  const [guildsSnap, channelsSnap, userSnap] = await Promise.all([
    get(ref(db, "guilds")),
    get(ref(db, "channels")),
    get(ref(db, `users/${auth.currentUser?.uid || "__none__"}`)),
  ]);

  const guilds = guildsSnap.exists() ? guildsSnap.val() : {};
  const channels = channelsSnap.exists() ? channelsSnap.val() : {};
  const user = userSnap.exists() ? userSnap.val() : {};
  const hint = String(user?.bio || user?.username || "").toLowerCase();

  const results: { id: string; name: string; kind: "guild" | "channel"; reason: string }[] = [];
  Object.entries(guilds || {}).forEach(([id, g]: any) => {
    const name = String(g?.name || id);
    const score = hint && name.toLowerCase().includes(hint.split(" ")[0]) ? "İlgi alanına yakın" : "Toplulukta hareket yüksek";
    results.push({ id: String(id), name, kind: "guild", reason: score });
  });
  Object.entries(channels || {}).slice(0, limit).forEach(([id, c]: any) => {
    results.push({ id: String(id), name: c?.name || String(id), kind: "channel", reason: "Öne çıkan kanal" });
  });

  return results.slice(0, limit);
}
