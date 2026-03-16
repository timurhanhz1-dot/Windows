import React from "react";
import AdminAiAnalyticsCard from "./AdminAiAnalyticsCard";
import AdminGrowthRadarCard from "./AdminGrowthRadarCard";
import AdminViralContentCard from "./AdminViralContentCard";
import AdminCommunityBrainCard from "./AdminCommunityBrainCard";

export default function AdminAiIntelligencePanel() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <AdminAiAnalyticsCard />
      <AdminGrowthRadarCard />
      <AdminCommunityBrainCard />
      <AdminViralContentCard />
    </div>
  );
}
