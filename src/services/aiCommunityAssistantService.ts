export async function buildCommunityAssist() {
  return {
    message: "Topluluğu canlandırmak için öneriler hazır.",
    topics: [
      { seed: "iklim", title: "İklim değişikliğiyle ilgili yerel çözüm önerileri neler?" },
      { seed: "orman", title: "Orman koruma için topluluk olarak ne yapabiliriz?" },
      { seed: "arı", title: "Arıları korumak için bireysel adımlar" },
    ],
  };
}
