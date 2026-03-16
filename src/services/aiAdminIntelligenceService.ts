import { analyzeCommunityBrain } from "./aiCommunityBrainService";
import { buildGrowthRadar } from "./aiGrowthRadarService";
import { detectViralPosts } from "./aiViralContentService";

export async function buildAdminIntelligenceSnapshot() {
  const [brain, growth, viral] = await Promise.all([
    analyzeCommunityBrain(),
    buildGrowthRadar(),
    detectViralPosts(3),
  ]);
  return { brain, growth, viral };
}
