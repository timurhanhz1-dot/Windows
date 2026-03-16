import { detectTrendingTopics } from "./aiTrendDetectionService";

export async function generateForumTopics(limit = 5) {
  const topics = await detectTrendingTopics(limit);
  return topics.map((t) => ({
    seed: t.topic,
    title: `${t.topic} hakkında topluluğun görüşü nedir?`,
  }));
}
