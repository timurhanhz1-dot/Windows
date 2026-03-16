import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Smartphone, Key, Check, X, Copy, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { auth } from '../firebase';
import { multiFactor, PhoneAuthProvider, PhoneMultiFactorGenerator, RecaptchaVerifier } from 'firebase/auth';

interface TwoFactorAuthProps {
  userId: string;
  theme: any;
  onClose: () => void;
}

export const TwoFactorAuth: React.FC<TwoFactorAuthProps> = ({ userId, theme, onClose }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'intro' | 'setup' | 'verify' | 'backup' | 'done'>('intro');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [backupCodes] = useState(() => 
    Array.from({ length: 8 }, () => Math.random().toString(36).substring(2, 8).toUpperCase())
  );
  const [copiedBackup, setCopiedBackup] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);

  const handleSendCode = async () => {
    if (!phone || phone.length < 10) {
      setError(t('twoFactor.invalidPhone'));
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      // In production, use Firebase Phone Auth
      // For now, simulate sending code
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStep('verify');
    } catch (err: any) {
      setError(err.message || t('twoFactor.codeSendFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setError(t('twoFactor.enterSixDigit'));
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIs2FAEnabled(true);
      setStep('backup');
    } catch (err: any) {
      setError(err.message || t('twoFactor.verificationFailed'));
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#1a1d29', borderRadius: 20, maxWidth: 420, width: '100%', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={18} color="#10b981" />
            <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>{t('twoFactor.title')}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 24 }}>
          <AnimatePresence mode="wait">
            {/* Intro */}
            {step === 'intro' && (
              <motion.div key="intro" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <Shield size={28} color="#10b981" />
                  </div>
                  <h3 style={{ color: 'white', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{t('twoFactor.protectAccount')}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.6 }}>
                    {t('twoFactor.protectDesc')}
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {[
                    { icon: Smartphone, text: t('twoFactor.smsVerification') },
                    { icon: Key, text: t('twoFactor.backupCodes') },
                    { icon: Shield, text: t('twoFactor.blockUnauthorized') },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                        <Icon size={16} color="#10b981" />
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{item.text}</span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setStep('setup')}
                  style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '12px 0', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
                >
                  {t('twoFactor.enable')}
                </button>
              </motion.div>
            )}

            {/* Setup - Phone number */}
            {step === 'setup' && (
              <motion.div key="setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 style={{ color: 'white', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{t('twoFactor.phoneNumber')}</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 20 }}>{t('twoFactor.phoneDesc')}</p>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>{t('twoFactor.phoneNumber')}</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+90 5XX XXX XX XX"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 14px', color: 'white', fontSize: 15, outline: 'none', letterSpacing: 1 }}
                  />
                </div>

                {error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 16 }}>
                    <AlertTriangle size={14} color="#ef4444" />
                    <span style={{ color: '#ef4444', fontSize: 12 }}>{error}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep('intro')} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: 'none', padding: '12px 0', borderRadius: 12, cursor: 'pointer', fontSize: 13 }}>{t('common.back')}</button>
                  <button onClick={handleSendCode} disabled={loading} style={{ flex: 2, background: '#10b981', color: 'white', border: 'none', padding: '12px 0', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: loading ? 0.6 : 1 }}>
                    {loading ? t('twoFactor.sending') : t('twoFactor.sendCode')}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Verify code */}
            {step === 'verify' && (
              <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 style={{ color: 'white', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{t('twoFactor.verificationCode')}</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 20 }}>{t('twoFactor.verifyDesc', { phone })}</p>

                <div style={{ marginBottom: 16 }}>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '14px', color: 'white', fontSize: 28, outline: 'none', textAlign: 'center', letterSpacing: 12, fontWeight: 700 }}
                  />
                </div>

                {error && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, marginBottom: 16 }}>
                    <AlertTriangle size={14} color="#ef4444" />
                    <span style={{ color: '#ef4444', fontSize: 12 }}>{error}</span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setStep('setup')} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: 'none', padding: '12px 0', borderRadius: 12, cursor: 'pointer', fontSize: 13 }}>{t('common.back')}</button>
                  <button onClick={handleVerifyCode} disabled={loading || code.length !== 6} style={{ flex: 2, background: '#10b981', color: 'white', border: 'none', padding: '12px 0', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: (loading || code.length !== 6) ? 0.6 : 1 }}>
                    {loading ? t('twoFactor.verifying') : t('twoFactor.verify')}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Backup codes */}
            {step === 'backup' && (
              <motion.div key="backup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <Check size={32} color="#10b981" />
                  <h3 style={{ color: '#10b981', fontSize: 16, fontWeight: 700, marginTop: 8 }}>{t('twoFactor.enabled')}</h3>
                </div>
                
                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <AlertTriangle size={14} color="#f59e0b" />
                    <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 700 }}>{t('twoFactor.saveBackupCodes')}</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, lineHeight: 1.5 }}>
                    {t('twoFactor.backupCodesDesc')}
                  </p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                    {backupCodes.map((code, i) => (
                      <div key={i} style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)', fontSize: 13, padding: '4px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6, textAlign: 'center' }}>
                        {code}
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={copyBackupCodes} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 0', cursor: 'pointer', color: copiedBackup ? '#10b981' : 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 16 }}>
                  {copiedBackup ? <><Check size={14} /> {t('twoFactor.copiedBackupCodes')}</> : <><Copy size={14} /> {t('twoFactor.copyBackupCodes')}</>}
                </button>

                <button onClick={() => { setStep('done'); onClose(); }} style={{ width: '100%', background: '#10b981', color: 'white', border: 'none', padding: '12px 0', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                  {t('twoFactor.complete')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TwoFactorAuth;
