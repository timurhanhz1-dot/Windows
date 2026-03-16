import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Brain, Sparkles, MessageCircle, TrendingUp, Heart, Zap, Coffee, Star, Laugh, ThumbsUp, Lightbulb, Target, Rocket, Crown, Diamond } from 'lucide-react';

interface DmAiAssistantProps {
  userId?: string;
  activeDmUserId?: string;
  messages?: any[];
  onSuggestionSelect?: (suggestion: string) => void;
}

export default function DmAiAssistant({ 
  userId, 
  activeDmUserId, 
  messages = [], 
  onSuggestionSelect 
}: DmAiAssistantProps) {
  const { t } = useTranslation();
  const [aiInsights, setAiInsights] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [conversationMood, setConversationMood] = useState<string>('');

  // Konuşmayı analiz et
  useEffect(() => {
    if (!messages.length || !activeDmUserId) return;

    const analyzeConversation = () => {
      setIsAnalyzing(true);
      
      // Konuşma analizi
      const recentMessages = messages.slice(-10);
      const messageTexts = recentMessages.map(m => m.content || '').join(' ').toLowerCase();
      
      // Mood tespiti
      let mood = 'neutral';
      if (messageTexts.includes('haha') || messageTexts.includes('😂') || messageTexts.includes('lol')) {
        mood = 'happy';
      } else if (messageTexts.includes('😢') || messageTexts.includes('sad') || messageTexts.includes('üzgün')) {
        mood = 'sad';
      } else if (messageTexts.includes('🔥') || messageTexts.includes('trend') || messageTexts.includes('viral')) {
        mood = 'excited';
      } else if (messageTexts.includes('❤️') || messageTexts.includes('love') || messageTexts.includes('sevgi')) {
        mood = 'romantic';
      }
      
      setConversationMood(mood);

      // AI içgörüleri oluştur
      const insights = [
        {
          id: '1',
          type: 'mood',
          title: t('aiAssistant.conversationMood'),
          description: mood === 'happy' ? t('aiAssistant.moodHappy') : mood === 'sad' ? t('aiAssistant.moodSad') : mood === 'excited' ? t('aiAssistant.moodExcited') : t('aiAssistant.moodNeutral'),
          icon: mood === 'happy' ? <Laugh size={14} className="text-pink-400" /> : 
                mood === 'sad' ? <Heart size={14} className="text-blue-400" /> : 
                mood === 'excited' ? <Zap size={14} className="text-yellow-400" /> : 
                <MessageCircle size={14} className="text-gray-400" />,
          color: mood === 'happy' ? 'pink' : mood === 'sad' ? 'blue' : mood === 'excited' ? 'yellow' : 'gray'
        },
        {
          id: '2',
          type: 'suggestion',
          title: t('aiAssistant.aiSuggestion'),
          description: t('aiAssistant.suggestionDesc'),
          icon: <Lightbulb size={14} className="text-purple-400" />,
          color: 'purple'
        },
        {
          id: '3',
          type: 'engagement',
          title: t('aiAssistant.engagement'),
          description: `${messages.length} ${t('aiAssistant.messages')} • ${t('aiAssistant.highEngagement')}`,
          icon: <TrendingUp size={14} className="text-green-400" />,
          color: 'green'
        }
      ];

      setAiInsights(insights);
      setTimeout(() => setIsAnalyzing(false), 800);
    };

    analyzeConversation();
  }, [messages, activeDmUserId]);

  // Akıllı yanıtlar
  const smartReplies = [
    {
      id: '1',
      text: 'Bu çok ilginç! Detayları anlatır mısın? 🤔',
      type: 'curiosity',
      icon: <Brain size={12} className="text-purple-400" />,
      priority: 1
    },
    {
      id: '2',
      text: 'Kesinlikle katılıyorum! 💯',
      type: 'agreement',
      icon: <ThumbsUp size={12} className="text-green-400" />,
      priority: 2
    },
    {
      id: '3',
      text: 'Bu fikir harika! Geliştirebiliriz 🚀',
      type: 'enthusiasm',
      icon: <Rocket size={12} className="text-blue-400" />,
      priority: 2
    },
    {
      id: '4',
      text: 'Haha bu çok komik 😂',
      type: 'humor',
      icon: <Laugh size={12} className="text-pink-400" />,
      priority: 3
    },
    {
      id: '5',
      text: 'Kahve molası zamanı ☕',
      type: 'casual',
      icon: <Coffee size={12} className="text-amber-400" />,
      priority: 3
    },
    {
      id: '6',
      text: 'Bu yıldız gibi parlıyor! ⭐',
      type: 'compliment',
      icon: <Star size={12} className="text-yellow-400" />,
      priority: 2
    },
    {
      id: '7',
      text: 'Premium seviye! 💎',
      type: 'premium',
      icon: <Diamond size={12} className="text-cyan-400" />,
      priority: 1
    },
    {
      id: '8',
      text: 'Kral gibi! 👑',
      type: 'royal',
      icon: <Crown size={12} className="text-purple-300" />,
      priority: 1
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      pink: 'bg-pink-500/10 border-pink-500/20 text-pink-300',
      blue: 'bg-blue-500/10 border-blue-500/20 text-blue-300',
      yellow: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
      gray: 'bg-gray-500/10 border-gray-500/20 text-gray-300',
      purple: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
      green: 'bg-green-500/10 border-green-500/20 text-green-300',
      cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300',
      amber: 'bg-amber-500/10 border-amber-500/20 text-amber-300'
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  return (
    <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
      {/* AI Assistant Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 px-3 py-1.5 rounded-full">
            <Brain size={14} className="text-purple-400" />
            <span className="text-[11px] font-bold text-purple-300">{t('aiAssistant.title')}</span>
            {isAnalyzing && (
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-white/40">
            <Sparkles size={8} />
            <span>{t('aiAssistant.smartAnalysis')}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
          <span className="text-[10px] text-green-400">{t('aiAssistant.active')}</span>
        </div>
      </div>

      {/* AI Insights */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {aiInsights.map((insight) => (
          <div
            key={insight.id}
            className={`p-2 rounded-lg border ${getColorClasses(insight.color)}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              {insight.icon}
              <span className="text-[9px] font-bold">{insight.title}</span>
            </div>
            <p className="text-[9px] opacity-80">{insight.description}</p>
          </div>
        ))}
      </div>

      {/* Smart Replies */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-2">
          <Target size={12} className="text-purple-400" />
          <span className="text-[10px] font-bold text-purple-300">{t('aiAssistant.smartReplies')}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {smartReplies.slice(0, 6).map((reply) => (
            <button
              key={reply.id}
              onClick={() => onSuggestionSelect?.(reply.text)}
              className={`group flex items-center gap-1.5 p-2 rounded-lg border transition-all hover:scale-105 ${getColorClasses(reply.color)}`}
            >
              <span className="transition-transform group-hover:scale-110">
                {reply.icon}
              </span>
              <span className="text-[10px] font-medium text-left">
                {reply.text}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* AI Footer */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[9px] text-white/30">
          <Brain size={8} />
          <span>{t('aiAssistant.analyzedBy')}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-white/40">
            {messages.length} {t('aiAssistant.messages')}
          </span>
          <span className="text-white/20">•</span>
          <span className="text-[9px] text-purple-400">
            {conversationMood === 'happy' ? '😊' : 
             conversationMood === 'sad' ? '😢' : 
             conversationMood === 'excited' ? '🔥' : 
             conversationMood === 'romantic' ? '❤️' : '😐'}
          </span>
        </div>
      </div>
    </div>
  );
}
