import React, { useEffect, useState } from "react";
import { buildCommunityAssist } from "../services/aiCommunityAssistantService";
export default function ForumAiAssistCard() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { buildCommunityAssist().then(setData).catch(() => setData(null)); }, []);
  if (!data) return null;
  return (
    <div style={{marginBottom:12,padding:16,border:'1px solid rgba(255,255,255,0.08)',borderRadius:16,background:'rgba(255,255,255,0.04)'}}>
      <div style={{fontWeight:700,fontSize:16,color:'#fff',marginBottom:8}}>Forum AI</div>
      <div style={{fontSize:12,color:'rgba(255,255,255,0.6)',marginBottom:10}}>{data.message}</div>
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        {data.topics?.map((t:any)=><div key={t.seed} style={{fontSize:13,color:'rgba(255,255,255,0.74)'}}>• {t.title}</div>)}
      </div>
    </div>
  );
}
