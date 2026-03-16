import { get, ref } from "firebase/database";
import { db } from "../firebase";

export async function buildGrowthRadar() {
  try {
    const [usersSnap, forumSnap, guildSnap] = await Promise.all([
      get(ref(db, "users")),
      get(ref(db, "forum")),
      get(ref(db, "guilds")),
    ]);

    const users = usersSnap.exists() ? usersSnap.val() : {};
    const forum = forumSnap.exists() ? forumSnap.val() : {};
    const guilds = guildSnap.exists() ? guildSnap.val() : {};

    const totalUsers = Object.keys(users || {}).length;
    const newUsers = Object.values(users || {}).filter((u: any) => {
      const created = Number(u?.created_at || u?.createdAt || 0);
      return created > Date.now() - 1000 * 60 * 60 * 24 * 7;
    }).length;

    const forumCount = Object.keys(forum || {}).length;
    const guildCount = Object.keys(guilds || {}).length;
    const growthScore = Math.round(newUsers * 4 + forumCount * 2 + guildCount);

    return { totalUsers, newUsers, messageCount: 0, forumCount, guildCount, growthScore };
  } catch {
    return { totalUsers: 0, newUsers: 0, messageCount: 0, forumCount: 0, guildCount: 0, growthScore: 0 };
  }
}
