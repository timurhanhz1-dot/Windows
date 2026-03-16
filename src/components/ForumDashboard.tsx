import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, Sparkles, X } from 'lucide-react';
import { advancedForumService } from '../services/advancedForumService';

interface ForumDashboardProps {
  userId: string;
  username?: string;
  onTopicSelect?: (topic: string) => void;
  onRecommendationClick?: (post: any) => void;
}

const ForumDashboard: React.FC<ForumDashboardProps> = ({
  userId,
  username,
  onTopicSelect,
  onRecommendationClick,
}) => {
  const [trendingTopics, setTrendingTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const topics = await advancedForumService.getTrendingTopics(5);
        setTrendingTopics(topics);
      } catch (e) {
        console.error('ForumDashboard load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  return (
    <div style={{
      background: 'rgba(139, 92, 246, 0.08)',
      border: '1px solid rgba(139, 92, 246, 0.2)',
      borderRadius: 14,
      padding: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Brain size={16} color="#8B5CF6" />
        <span style={{ fontWeight: 700, fontSize: 14, color: '#8B5CF6' }}>AI Forum Dashboard</span>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 8 }}>
          Yükleniyor...
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <TrendingUp size={12} color="#10B981" />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Trend Konular
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {trendingTopics.map((topic, i) => (
              <button
                key={i}
                onClick={() => onTopicSelect?.(topic.topic)}
                style={{
                  padding: '4px 10px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: 20,
                  fontSize: 11,
                  color: '#10B981',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                #{topic.topic}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 12, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Sparkles size={11} color="#F59E0B" />
              <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>AI İpucu</span>
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.5 }}>
              Doğa ve çevre konularında paylaşım yaparak topluluğa katkıda bulun.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForumDashboard;
