import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) setVisible(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem('cookie_consent', 'rejected');
    setVisible(false);
    window.location.href = '/landing';
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
            background: 'rgba(11,14,17,0.97)',
            borderTop: '1px solid rgba(16,185,129,0.2)',
            backdropFilter: 'blur(20px)',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>
              🍪 Çerez Politikası
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              Nature.co olarak sitemizin düzgün çalışması, güvenliğin sağlanması ve kullanıcı deneyimini kişiselleştirmek amacıyla zorunlu ve analitik çerezler kullanıyoruz.
              Çerezler; oturum bilgilerini, dil tercihlerini ve tema ayarlarını hatırlamak için kullanılır.
              Üçüncü taraf çerezleri yalnızca açık onayınızla etkinleştirilir.
              Daha fazla bilgi için{' '}
              <a href="/cerez-politikasi" style={{ color: '#10B981' }}>Çerez Politikamızı</a>
              {' '}ve{' '}
              <a href="/privacy" style={{ color: '#10B981' }}>Gizlilik Politikamızı</a>
              {' '}inceleyebilirsiniz.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
            <button
              onClick={handleReject}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.5rem',
                padding: '0.5rem 1rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
            >
              Reddet
            </button>
            <button
              onClick={handleAccept}
              style={{
                background: 'linear-gradient(135deg, #10B981, #059669)',
                border: 'none',
                borderRadius: '0.5rem',
                padding: '0.5rem 1.2rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#fff',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
              }}
            >
              Kabul Et
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
