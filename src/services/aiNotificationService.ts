export function buildSmartNotifications(interests: string[] = [], topics: string[] = [], topChannel: string = 'Genel'): string[] {
  const notifs: string[] = [];
  if (topics.length > 0) notifs.push(`Trend: ${topics.slice(0, 2).join(', ')} alanlarında hareketlilik var.`);
  if (interests.length > 0) notifs.push(`İlgi alanlarına göre: ${interests.slice(0, 2).join(', ')} kanallarını keşfet.`);
  if (topChannel) notifs.push(`${topChannel} kanalında yeni içerikler var.`);
  return notifs;
}

export async function getSmartNotifications(userId?: string) {
  return [];
}

export default {
  buildSmartNotifications,
  getSmartNotifications,
};
