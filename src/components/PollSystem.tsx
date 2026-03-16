import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart2, Plus, X, Check, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PollSystemProps {
  onCreatePoll: (question: string, options: string[]) => void;
  onClose: () => void;
  theme: any;
}

export const PollCreator: React.FC<PollSystemProps> = ({ onCreatePoll, onClose, theme }) => {
  const { t } = useTranslation();
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multiVote, setMultiVote] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  const addOption = () => {
    if (options.length < 10) setOptions([...options, '']);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, value: string) => {
    const updated = [...options];
    updated[idx] = value;
    setOptions(updated);
  };

  const handleCreate = () => {
    const validOptions = options.filter(o => o.trim());
    if (!question.trim() || validOptions.length < 2) return;
    onCreatePoll(question.trim(), validOptions);
    onClose();
  };

  const isValid = question.trim() && options.filter(o => o.trim()).length >= 2;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        style={{ background: '#1a1d29', borderRadius: 20, maxWidth: 440, width: '100%', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart2 size={18} color="#10b981" />
            <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>Anket Oluştur</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Question */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block' }}>{t('poll.question', 'Soru')}</label>
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder={t('poll.questionPlaceholder', 'Anket sorunuzu yazın...')}
              maxLength={200}
              autoFocus
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px', color: 'white', fontSize: 14, outline: 'none' }}
            />
          </div>

          {/* Options */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, marginBottom: 8, display: 'block' }}>{t('poll.options', 'Seçenekler')}</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {options.map((opt, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, fontWeight: 700, width: 20, textAlign: 'center' }}>{idx + 1}</span>
                  <input
                    value={opt}
                    onChange={e => updateOption(idx, e.target.value)}
                    placeholder={`Seçenek ${idx + 1}`}
                    maxLength={100}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 12px', color: 'white', fontSize: 13, outline: 'none' }}
                  />
                  {options.length > 2 && (
                    <button onClick={() => removeOption(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: 4 }}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button onClick={addOption} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'none', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 12, width: '100%', justifyContent: 'center' }}>
                <Plus size={14} /> Seçenek Ekle
              </button>
            )}
          </div>

          {/* Settings */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <button
              onClick={() => setMultiVote(!multiVote)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: multiVote ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${multiVote ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, cursor: 'pointer', color: multiVote ? '#10b981' : 'rgba(255,255,255,0.4)', fontSize: 12 }}
            >
              <Check size={12} /> Çoklu Oy
            </button>
            <button
              onClick={() => setAnonymous(!anonymous)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: anonymous ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${anonymous ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, cursor: 'pointer', color: anonymous ? '#10b981' : 'rgba(255,255,255,0.4)', fontSize: 12 }}
            >
              <Check size={12} /> Anonim
            </button>
          </div>

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={!isValid}
            style={{
              width: '100%', background: isValid ? '#10b981' : 'rgba(255,255,255,0.05)',
              color: isValid ? 'white' : 'rgba(255,255,255,0.2)',
              border: 'none', padding: '12px 0', borderRadius: 12, cursor: isValid ? 'pointer' : 'default',
              fontSize: 14, fontWeight: 700, transition: 'all 0.15s',
            }}
          >
            Anketi Oluştur
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PollCreator;
