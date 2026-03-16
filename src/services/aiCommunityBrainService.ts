import { detectTrendingTopics } from "./aiTrendDetectionService";
import { buildGrowthRadar } from "./aiGrowthRadarService";

export async function analyzeCommunityBrain() {
  const [topics, growth] = await Promise.all([detectTrendingTopics(5), buildGrowthRadar()]);
  const mood = growth.growthScore > 60 ? "çok pozitif" : growth.growthScore > 30 ? "pozitif" : "nötr";
  const recommendations = [
    topics[0] ? `${topics[0].topic} odağında yeni forum konusu aç` : "Topluluk için yeni konu aç",
    growth.newUsers > 0 ? "Yeni kullanıcıları onboarding akışına yönlendir" : "Yeni kullanıcı kampanyası başlat",
    "En aktif kanalları discovery alanında öne çıkar",
  ];
  return {
    mood,
    dominantTopics: topics.map((t) => t.topic),
    recommendations,
  };
}
