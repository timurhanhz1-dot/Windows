import { buildMemoryProfile } from "./aiMemoryProfileService";
import { suggestCommunities } from "./aiSmartCommunitySuggestionsService";

export async function buildOnboardingPlan(userId?: string) {
  const [profile, communities] = await Promise.all([buildMemoryProfile(userId), suggestCommunities(3)]);
  return {
    welcome: "Nature.co'ya hoş geldin. İlgi alanlarına göre başlangıç önerileri hazır.",
    firstSteps: [
      communities[0] ? `${communities[0].name} topluluğunu keşfet` : "Öne çıkan bir topluluğa katıl",
      "Forumda kendini tanıtan kısa bir gönderi paylaş",
      "NatureBot ile hedeflerini konuş",
    ],
    profile,
  };
}
