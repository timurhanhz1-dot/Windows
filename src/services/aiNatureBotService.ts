import { buildMemoryProfile } from "./aiMemoryProfileService";
export async function buildNatureBotPanel(userId?: string) {
  const profile = await buildMemoryProfile(userId);
  return {
    greeting: "NatureBot bugün sana plan, içerik ve topluluk büyütme konusunda eşlik etmeye hazır.",
    prompts: [
      "Bugün için 3 adımlı kısa plan hazırla",
      "Topluluğum için 5 içerik fikri üret",
      "Beni motive edecek kısa bir rutin yaz",
    ],
    profile,
  };
}
