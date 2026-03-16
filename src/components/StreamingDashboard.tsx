import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, MessageCircle, X } from 'lucide-react';
import { advancedStreamingService } from '../services/advancedStreamingService';

interface StreamingDashboardProps {
  streamId: string;
  isLive?: boolean;
  onClose?: () => void;
}

const StreamingDashboard: React.FC<StreamingDashboardProps> = ({
  streamId,
  isLive = false,
  onClose,
}) => {
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (!isLive) return;
    const load = () => {
      const data = advancedStreamingService.getStreamAnalytics(streamId);
      setAnalytics(data);
    };
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [streamId, isLive]);

  return (
    <div style={{
      background: '#111418',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(59, 130, 246, 0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BarChart3 size={14} color="#3B82F6" />
          <span style={{ fontWeight: 700, fontSize: 13, color: '#3B82F6' }}>Stream Dashboard</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 2 }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 14 }}>
        {!isLive ? (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 16 }}>
            Yayın başladığında analitikler görünecek
          </div>
        ) : analytics ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Users size={11} color="#10B981" />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Ort. İzleyici</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{analytics.averageViewers}</div>
            </div>

            <div style={{
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <TrendingUp size={11} color="#F59E0B" />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Zirve</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{analytics.peakViewers}</div>
            </div>

            <div style={{
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <MessageCircle size={11} color="#3B82F6" />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Mesajlar</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{analytics.chatMessages}</div>
            </div>

            <div style={{
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <BarChart3 size={11} color="#8B5CF6" />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Süre (sn)</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{analytics.duration}</div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: 16 }}>
            Analitikler yükleniyor...
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamingDashboard;
