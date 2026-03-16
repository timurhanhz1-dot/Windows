import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ref, update, get, onValue } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';

type Lang = 'tr' | 'en';

export function useLanguage() {
  const { i18n } = useTranslation();
  const [isChanging, setIsChanging] = useState(false);

  // Firebase'den dil tercihini yükle
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      if (!user) return;
      const langRef = ref(db, `users/${user.uid}/preferences/language`);
      const off = onValue(langRef, snap => {
        const lang: Lang = snap.val() || 'tr';
        if (lang !== i18n.language) {
          i18n.changeLanguage(lang);
          document.documentElement.lang = lang;
        }
      });
      return () => off();
    });
    return () => unsub();
  }, [i18n]);

  const changeLanguage = useCallback(async (lang: Lang) => {
    const safe: Lang = lang === 'en' ? 'en' : 'tr';
    setIsChanging(true);
    try {
      await i18n.changeLanguage(safe);
      localStorage.setItem('i18nextLng', safe);
      document.documentElement.lang = safe;

      const user = auth.currentUser;
      if (user) {
        try {
          await update(ref(db, `users/${user.uid}/preferences`), { language: safe });
        } catch (e) {
          if (import.meta.env.DEV) console.warn('[useLanguage] Firebase yazma hatası:', e);
        }
      }
    } finally {
      setIsChanging(false);
    }
  }, [i18n]);

  return { language: i18n.language as Lang, changeLanguage, isChanging };
}
