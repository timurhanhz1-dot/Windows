import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Leaf, MessageSquare, Users, Tv, Gamepad2, Shield, ChevronRight, Check, Sparkles, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { db, auth } from '../firebase';
import { ref, set, serverTimestamp } from 'firebase/database';

interface OnboardingFlowProps {
  userId: string;
  displayName: string;
  onComplete: () => void;
  theme: any;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ userId, displayName, onComplete, theme }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [bio, setBio] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [avatar, setAvatar] = useState('');

  const STEPS = [
    { id: 'welcome', title: t('onboarding.welcome'), subtitle: t('onboarding.welcomeSubtitle') },
    { id: 'profile', title: t('onboarding.createProfile'), subtitle: t('onboarding.createProfileSubtitle') },
    { id: 'interests', title: t('onboarding.selectInterests'), subtitle: t('onboarding.selectInterestsSubtitle') },
    { id: 'features', title: t('onboarding.discoverFeatures'), subtitle: t('onboarding.discoverFeaturesSubtitle') },
    { id: 'ready', title: t('onboarding.ready'), subtitle: t('onboarding.readySubtitle') },
  ];

  const INTERESTS = [
    { id: 'nature', emoji: '🌿', label: t('onboarding.interests.nature') },
    { id: 'tech', emoji: '💻', label: t('onboarding.interests.tech') },
    { id: 'gaming', emoji: '🎮', label: t('onboarding.interests.gaming') },
    { id: 'music', emoji: '🎵', label: t('onboarding.interests.music') },
    { id: 'art', emoji: '🎨', label: t('onboarding.interests.art') },
    { id: 'science', emoji: '🔬', label: t('onboarding.interests.science') },
    { id: 'travel', emoji: '✈️', label: t('onboarding.interests.travel') },
    { id: 'food', emoji: '🍕', label: t('onboarding.interests.food') },
    { id: 'sports', emoji: '⚽', label: t('onboarding.interests.sports') },
    { id: 'books', emoji: '📚', label: t('onboarding.interests.books') },
    { id: 'film', emoji: '🎬', label: t('onboarding.interests.film') },
    { id: 'crypto', emoji: '₿', label: t('onboarding.interests.crypto') },
  ];

  const FEATURES = [
    { icon: MessageSquare, label: t('onboarding.features.chat'), desc: t('onboarding.features.chatDesc'), color: '#10b981' },
    { icon: Users, label: t('onboarding.features.community'), desc: t('onboarding.features.communityDesc'), color: '#3b82f6' },
    { icon: Tv, label: t('onboarding.features.live'), desc: t('onboarding.features.liveDesc'), color: '#8b5cf6' },
    { icon: Gamepad2, label: t('onboarding.features.games'), desc: t('onboarding.features.gamesDesc'), color: '#f97316' },
    { icon: Sparkles, label: t('onboarding.features.ai'), desc: t('onboarding.features.aiDesc'), color: '#ec4899' },
    { icon: Shield, label: t('onboarding.features.security'), desc: t('onboarding.features.securityDesc'), color: '#eab308' },
  ];

  const currentStep = STEPS[step];

  const toggleInterest = (id: string) => {
    setSelectedInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleComplete = async () => {
    try {
      const userRef = ref(db, `users/${userId}`);
      await set(userRef, {
        displayName,
        bio,
        interests: selectedInterests,
        avatar,
        onboarded: true,
        onboardedAt: serverTimestamp(),
        badges: ['newcomer'],
        level: 1,
        xp: 0,
      });
    } catch (e) {
      console.error('Onboarding save error:', e);
    }
    onComplete();
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else handleComplete();
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
          style={{ maxWidth: 480, width: '100%', background: '#1a1d29', borderRadius: 24, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}
        >
          {/* Progress bar */}
          <div style={{ height: 3, background: 'rgba(255,255,255,0.05)' }}>
            <div style={{ height: '100%', width: `${((step + 1) / STEPS.length) * 100}%`, background: 'linear-gradient(90deg, #10b981, #3b82f6)', borderRadius: 3, transition: 'width 0.3s' }} />
          </div>

          <div style={{ padding: 32 }}>
            {/* Step: Welcome */}
            {currentStep.id === 'welcome' && (
              <div style={{ textAlign: 'center' }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
                  style={{ width: 80, height: 80, background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 36 }}>
                  🌿
                </motion.div>
                <h1 style={{ color: 'white', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{currentStep.title}</h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, lineHeight: 1.6 }}>{currentStep.subtitle}</p>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 16 }}>
                  {t('onboarding.greeting', { name: displayName })}
                </p>
              </div>
            )}

            {/* Step: Profile */}
            {currentStep.id === 'profile' && (
              <div>
                <h2 style={{ color: 'white', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{currentStep.title}</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 }}>{currentStep.subtitle}</p>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, cursor: 'pointer', position: 'relative' }}>
                    {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : displayName[0]?.toUpperCase()}
                    <div style={{ position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #1a1d29' }}>
                      <Upload size={10} color="white" />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>{displayName}</div>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{t('onboarding.member')}</div>
                  </div>
                </div>

                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>{t('onboarding.about')}</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder={t('onboarding.bioPlaceholder')}
                  maxLength={200}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', color: 'white', fontSize: 14, resize: 'none', height: 80, outline: 'none' }}
                />
                <div style={{ textAlign: 'right', color: 'rgba(255,255,255,0.2)', fontSize: 11, marginTop: 4 }}>{bio.length}/200</div>
              </div>
            )}

            {/* Step: Interests */}
            {currentStep.id === 'interests' && (
              <div>
                <h2 style={{ color: 'white', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{currentStep.title}</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 }}>{currentStep.subtitle}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {INTERESTS.map(interest => {
                    const isSelected = selectedInterests.includes(interest.id);
                    return (
                      <motion.button
                        key={interest.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleInterest(interest.id)}
                        style={{
                          background: isSelected ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isSelected ? '#10b981' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: 12, padding: '12px 8px', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                          transition: 'all 0.2s', color: 'white',
                        }}
                      >
                        <span style={{ fontSize: 24 }}>{interest.emoji}</span>
                        <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.7 }}>{interest.label}</span>
                        {isSelected && <Check size={12} color="#10b981" />}
                      </motion.button>
                    );
                  })}
                </div>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
                  {t('onboarding.selectedCount', { count: selectedInterests.length })}
                </p>
              </div>
            )}

            {/* Step: Features */}
            {currentStep.id === 'features' && (
              <div>
                <h2 style={{ color: 'white', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{currentStep.title}</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 24 }}>{currentStep.subtitle}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {FEATURES.map((feat, i) => {
                    const Icon = feat.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: `${feat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={18} color={feat.color} />
                        </div>
                        <div>
                          <div style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>{feat.label}</div>
                          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{feat.desc}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step: Ready */}
            {currentStep.id === 'ready' && (
              <div style={{ textAlign: 'center' }}>
                <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', delay: 0.2 }}
                  style={{ width: 80, height: 80, background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                  <Check size={40} color="white" />
                </motion.div>
                <h1 style={{ color: 'white', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{t('onboarding.ready')} 🎉</h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, lineHeight: 1.6 }}>
                  {t('onboarding.firstBadge')} <span style={{ color: '#10b981', fontWeight: 700 }}>{t('onboarding.newMember')}</span>
                </p>
                <div style={{ marginTop: 20, padding: 16, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14 }}>
                  <div style={{ color: '#10b981', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{t('onboarding.xpEarned')}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{t('onboarding.profileBonus')}</div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 }}>
              {step > 0 ? (
                <button onClick={back} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 14, padding: '8px 16px' }}>{t('onboarding.back')}</button>
              ) : <div />}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={next}
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', padding: '12px 32px', borderRadius: 14, cursor: 'pointer', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                {step === STEPS.length - 1 ? t('onboarding.letsGo') : t('onboarding.continue')}
                <ChevronRight size={16} />
              </motion.button>
            </div>

            {/* Step dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
              {STEPS.map((_, i) => (
                <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? '#10b981' : i < step ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s' }} />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default OnboardingFlow;
