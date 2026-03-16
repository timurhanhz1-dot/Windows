import React, { useState } from 'react';
import { Zap, MessageCircle, Mic, X } from 'lucide-react';

interface AdvancedDMPanelProps {
  conversationId: string;
  userId: string;
  onFeatureUse?: (feature: string) => void;
  onClose?: () => void;
}

const AdvancedDMPanel: React.FC<AdvancedDMPanelProps> = ({
  conversationId,
  userId,
  onFeatureUse,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'features' | 'info'>('features');

  return (
    <div style={{
      background: '#111418',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 14,
      overflow: 'hidden',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(139, 92, 246, 0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={14} color="#8B5CF6" />
          <span style={{ fontWeight: 700, fontSize: 13, color: '#8B5CF6' }}>Gelişmiş Özellikler</span>
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
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Hızlı Özellikler
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button
              onClick={() => onFeatureUse?.('voice')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                cursor: 'pointer',
                color: '#fff',
                fontSize: 13,
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <Mic size={14} color="#10B981" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 12 }}>Sesli Mesaj</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>Ses kaydı gönder</div>
              </div>
            </button>

            <button
              onClick={() => onFeatureUse?.('smart-reply')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                cursor: 'pointer',
                color: '#fff',
                fontSize: 13,
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <MessageCircle size={14} color="#3B82F6" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 12 }}>Akıllı Yanıt</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>AI destekli yanıt önerileri</div>
              </div>
            </button>
          </div>
        </div>

        <div style={{
          padding: '8px 10px',
          background: 'rgba(139, 92, 246, 0.08)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 10, color: '#8B5CF6', fontWeight: 600, marginBottom: 4 }}>Konuşma ID</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {conversationId}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedDMPanel;
