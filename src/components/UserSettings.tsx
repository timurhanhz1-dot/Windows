import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Palette, Type, Bell, BellOff, Monitor, Moon, Zap, Check, Layout, Volume2, BadgeCheck, Clock, CheckCircle2, AlertTriangle, MessageCircle, Send, Globe, Trash2 } from 'lucide-react';
import { db, auth } from '../firebase';
import { ref, update, get, set, remove, push } from 'firebase/database';
import { EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
import { themes } from '../constants/themes.tsx';
import { ALL_SOUNDS } from '../services/soundService';
import { useLanguage } from '../hooks/useLanguage';

interface Props {
  userId: string;
  currentTheme: string;
  onThemeChange: (t: string) => void;
  onClose: () => void;
  onCompactChange: (c: boolean) => void;
  onFontSizeChange: (s: number) => void;
  isCompact: boolean;
  fontSize: number;
}

export const UserSettings = ({
  userId, currentTheme, onThemeChange, onClose,
  onCompactChange, onFontSizeChange, isCompact, fontSize
}: Props) => {
  const [tab, setTab] = useState<'appearance' | 'notifications' | 'accessibility' | 'verify' | 'feedback' | 'language' | 'danger'>('appearance');
  const { language, changeLanguage, isChanging } = useLanguage();
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>('default');
  const [verifyRequest, setVerifyRequest] = useState<any>(null);
  const [verifyNote, setVerifyNote] = useState('');
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [username, setUsername] = useState('');
  // Feedback
  const [feedbackType, setFeedbackType] = useState<'suggestion' | 'complaint'>('suggestion');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);

  useEffect(() => {
    if ('Notification' in window) setNotifPerm(Notification.permission);
  }, []);

  useEffect(() => {
    if (!userId) return;
    // Kullanıcı bilgilerini yükle
    get(ref(db, `users/${userId}`)).then(snap => {
      if (snap.exists()) {
        const d = snap.val();
        setIsVerified(d.is_verified || false);
        setUsername(d.username || '');
      }
    });
    // Rozet talebini yükle
    get(ref(db, `verification_requests/${userId}`)).then(snap => {
      if (snap.exists()) setVerifyRequest(snap.val());
    });
  }, [userId]);

  const handleVerifySubmit = async () => {
    if (verifyNote.trim().length < 20) return;
    setVerifySubmitting(true);
    const data = {
      userId,
      username,
      email: auth.currentUser?.email || '',
      note: verifyNote.trim(),
      requestedAt: new Date().toISOString(),
      status: 'pending',
    };
    await set(ref(db, `verification_requests/${userId}`), data);
    setVerifyRequest(data);
    setVerifyNote('');
    setVerifySubmitting(false);
  };

  const handleVerifyCancel = async () => {
    await remove(ref(db, `verification_requests/${userId}`));
    setVerifyRequest(null);
  };

  const requestNotif = async () => {
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      new Notification('Nature.co', { body: 'Bildirimler aktif! 🌿', icon: '/icon-192.png' });
    }
  };

  const savePrefs = async () => {
    if (!userId) return;
    try {
      await update(ref(db, `users/${userId}/preferences`), {
        theme: currentTheme, compact: isCompact, fontSize
      });
    } catch {}
  };

  const handleFeedbackSubmit = async () => {
    if (feedbackText.trim().length < 10) return;
    setFeedbackSending(true);
    try {
      await push(ref(db, 'support_tickets'), {
        userId,
        username,
        fullName: username,
        email: auth.currentUser?.email || '',
        type: feedbackType,
        category: feedbackType === 'suggestion' ? 'öneri' : 'şikayet',
        subject: feedbackType === 'suggestion' ? '💡 Öneri' : '⚠️ Şikayet',
        message: feedbackText.trim(),
        status: 'open',
        createdAt: Date.now(),
      });
      setFeedbackText('');
      setFeedbackDone(true);
    } catch {}
    setFeedbackSending(false);
  };

  // Danger zone state
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'HESABIMI SİL') return;
    setDeleteError('');
    setDeleteLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) throw new Error('Oturum bulunamadı');
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);
      // DB temizleme
      await Promise.all([
        remove(ref(db, `users/${userId}`)),
        remove(ref(db, `usernames/${username}`)),
        remove(ref(db, `userEmails/${userId}`)),
        remove(ref(db, `user_index/${userId}`)),
      ]);
      await deleteUser(user);
      window.location.href = '/landing';
    } catch (err: any) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setDeleteError('Şifre hatalı. Lütfen tekrar dene.');
      } else {
        setDeleteError('Bir hata oluştu: ' + (err.message || err.code));
      }
    }
    setDeleteLoading(false);
  };

  const TABS = [
    { id: 'appearance', label: 'Görünüm', icon: Palette },
    { id: 'notifications', label: 'Bildirimler', icon: Bell },
    { id: 'accessibility', label: 'Erişilebilirlik', icon: Layout },
    { id: 'language', label: 'Dil / Language', icon: Globe },
    { id: 'verify', label: 'Doğrulanmış Rozet', icon: BadgeCheck },
    { id: 'feedback', label: 'Öneri & Şikayet', icon: MessageCircle },
    { id: 'danger', label: 'Hesabı Sil', icon: Trash2 },
  ] as const;

  const themeList = Object.values(themes).filter((t: any) => !t.icon || typeof t.icon !== 'string');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#111418] border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex">

        {/* Sidebar */}
        <div className="w-44 border-r border-white/5 p-3 flex flex-col gap-1">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-2 mb-2">Ayarlar</p>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                t.id === 'danger'
                  ? tab === 'danger' ? 'bg-red-500/20 text-red-400 font-bold' : 'text-red-400/50 hover:text-red-400 hover:bg-red-500/10'
                  : tab === t.id ? 'bg-emerald-500/20 text-emerald-400 font-bold' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}>
              <t.icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto max-h-[80vh]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-white font-bold text-lg">
              {tab === 'appearance' ? 'Görünüm' : tab === 'notifications' ? 'Bildirimler' : 'Erişilebilirlik'}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/5">
              <X size={16} />
            </button>
          </div>

          {/* APPEARANCE */}
          {tab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <p className="text-white/50 text-xs font-bold uppercase mb-3">Tema Seç</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(themes).map((t: any) => (
                    <button key={t.id} onClick={() => { onThemeChange(t.id); savePrefs(); }}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${currentTheme === t.id ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg shrink-0"
                        style={{ background: t.accent, opacity: 0.8 }}>
                        {currentTheme === t.id ? <Check size={16} className="text-white" /> : null}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-xs font-bold truncate">{t.name}</p>
                        <div className="flex gap-1 mt-1">
                          {[t.bg?.includes('gradient') ? '#10b981' : t.bg, t.accent, t.channelSidebar].map((c, i) => (
                            <div key={i} className="w-3 h-3 rounded-full border border-white/10"
                              style={{ background: typeof c === 'string' && c.includes('gradient') ? '#10b981' : c || '#333' }} />
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {tab === 'notifications' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${notifPerm === 'granted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                  {notifPerm === 'granted' ? <Bell size={22} /> : <BellOff size={22} />}
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium text-sm">Push Bildirimleri</p>
                  <p className="text-white/40 text-xs mt-0.5">
                    {notifPerm === 'granted' ? '✅ Aktif — yeni mesaj ve arkadaş isteklerinde uyarılırsın' :
                     notifPerm === 'denied' ? '❌ Engellendi — tarayıcı ayarlarından izin ver' :
                     'Yeni mesajlar ve bildirimler için izin ver'}
                  </p>
                </div>
                {notifPerm !== 'granted' && notifPerm !== 'denied' && (
                  <button onClick={requestNotif}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600">
                    İzin Ver
                  </button>
                )}
              </div>

              <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/50 text-xs font-bold uppercase">Bildirim Tercihleri</p>
                {[
                  { label: 'DM bildirimleri', key: 'dm' },
                  { label: 'Kanal @mention', key: 'mention' },
                  { label: 'Arkadaş istekleri', key: 'friend' },
                  { label: 'Sistem mesajları', key: 'system' },
                ].map(item => (
                  <label key={item.key} className="flex items-center justify-between cursor-pointer">
                    <span className="text-white/70 text-sm">{item.label}</span>
                    <div className="w-9 h-5 bg-emerald-500 rounded-full relative">
                      <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full" />
                    </div>
                  </label>
                ))}
              </div>

              {/* SES SEÇİCİ */}
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/50 text-xs font-bold uppercase mb-3">🎵 Doğa Sesleri</p>
                {Object.entries(
                  Object.entries(ALL_SOUNDS).reduce((acc, [key, val]) => {
                    if (!acc[val.category]) acc[val.category] = [];
                    acc[val.category].push({ key, ...val });
                    return acc;
                  }, {} as Record<string, any[]>)
                ).map(([cat, sounds]) => (
                  <div key={cat} className="mb-4">
                    <p className="text-white/30 text-[10px] font-bold uppercase mb-2">{cat}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {sounds.map((s: any) => (
                        <button key={s.key}
                          onClick={() => s.fn()}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 border border-white/5 hover:border-emerald-500/30 transition-all text-left group">
                          <Volume2 size={11} className="text-white/30 group-hover:text-emerald-400 shrink-0" />
                          <span className="text-white/60 group-hover:text-white text-xs truncate">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <p className="text-white/20 text-[10px] mt-2">▶ Tıklayarak önizle</p>
              </div>
            </div>
          )}

          {/* ACCESSIBILITY */}
          {tab === 'accessibility' && (
            <div className="space-y-5">
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <p className="text-white/50 text-xs font-bold uppercase mb-4">Yazı Boyutu</p>
                <div className="flex items-center gap-4">
                  <span className="text-white/40 text-xs">Küçük</span>
                  <input type="range" min={12} max={20} value={fontSize}
                    onChange={e => { onFontSizeChange(+e.target.value); savePrefs(); }}
                    className="flex-1 accent-emerald-500" />
                  <span className="text-white/40 text-xs">Büyük</span>
                  <span className="text-emerald-400 text-sm font-bold w-10 text-right">{fontSize}px</span>
                </div>
                <div className="mt-3 p-3 bg-black/20 rounded-lg">
                  <p style={{ fontSize }} className="text-white/70">Örnek metin — Nature.co mesaj önizlemesi</p>
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-white font-medium text-sm">Kompakt Mod</p>
                    <p className="text-white/40 text-xs mt-0.5">Mesajlar arasındaki boşluğu azalt</p>
                  </div>
                  <div onClick={() => { onCompactChange(!isCompact); savePrefs(); }} className="cursor-pointer">
                    <div className={`w-10 h-5 rounded-full transition-all relative ${isCompact ? 'bg-emerald-500' : 'bg-white/10'}`}>
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${isCompact ? 'left-5' : 'left-0.5'}`} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DİL SEÇİCİ */}
          {tab === 'language' && (
            <div className="space-y-4">
              <p className="text-white/50 text-xs font-bold uppercase mb-3">Uygulama Dili / App Language</p>
              {[
                { code: 'tr' as const, flag: '🇹🇷', label: 'Türkçe', sub: 'Türkiye' },
                { code: 'en' as const, flag: '🇬🇧', label: 'English', sub: 'United Kingdom' },
              ].map(opt => (
                <button key={opt.code} onClick={() => changeLanguage(opt.code)} disabled={isChanging}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${language === opt.code ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                  <span className="text-3xl">{opt.flag}</span>
                  <div className="flex-1">
                    <p className={`font-bold text-sm ${language === opt.code ? 'text-emerald-300' : 'text-white/80'}`}>{opt.label}</p>
                    <p className="text-white/30 text-xs">{opt.sub}</p>
                  </div>
                  {language === opt.code && <Check size={16} className="text-emerald-400 shrink-0" />}
                </button>
              ))}
              {isChanging && <p className="text-white/30 text-xs text-center">Dil değiştiriliyor...</p>}
            </div>
          )}

          {/* DOĞRULANMIŞ ROZET */}
          {tab === 'verify' && (
            <div className="space-y-4">

              {/* Kurallar */}
              <div className="rounded-xl overflow-hidden border border-emerald-500/20 bg-emerald-950/20">
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-emerald-500/10">
                  <BadgeCheck size={16} className="text-emerald-400" />
                  <p className="text-sm font-black text-emerald-300 tracking-wide">🍃 Doğrulanmış Üye Rozeti</p>
                  {isVerified && (
                    <span className="ml-auto flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-emerald-400 text-[10px] font-black uppercase">
                      <CheckCircle2 size={10} /> Aktif
                    </span>
                  )}
                </div>
                <div className="px-4 py-3 space-y-2">
                  {[
                    { icon: '🌱', title: 'Gerçek Kimlik', desc: 'Taklit veya sahte profiller kesinlikle reddedilir.' },
                    { icon: '🌿', title: 'Tamamlanmış Profil', desc: 'Profil fotoğrafı, kullanıcı adı ve biyografi dolu olmalı.' },
                    { icon: '🍃', title: 'Topluluk Katkısı', desc: 'İçerik üreten, tartışmalara katılan üyeler önceliklidir.' },
                    { icon: '🌲', title: 'Güvenilir Davranış', desc: 'Kurallara uyan, saygılı iletişim geçmişi şart.' },
                    { icon: '🌍', title: 'Tanınırlık', desc: 'İçerik üreticisi, sanatçı, yazar, aktivist vb. tercih edilir.' },
                  ].map(rule => (
                    <div key={rule.icon} className="flex gap-2.5 p-2.5 bg-white/3 rounded-lg border border-white/5">
                      <span className="text-sm flex-shrink-0">{rule.icon}</span>
                      <div>
                        <p className="text-xs font-bold text-white/80">{rule.title}</p>
                        <p className="text-[11px] text-white/40">{rule.desc}</p>
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-yellow-400/70 pt-1">
                    ⚠️ Rozet, popülerliği değil <span className="font-bold">gerçekliği</span> gösterir. Karar tamamen Nature.co yönetimine aittir.
                  </p>
                </div>
              </div>

              {/* Durum / Form */}
              {isVerified ? (
                <div className="flex items-center gap-2.5 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  <div>
                    <p className="text-sm font-bold text-emerald-300">Hesabın doğrulanmış 🎉</p>
                    <p className="text-xs text-emerald-400/60">Profilinde 🍃 rozeti aktif</p>
                  </div>
                </div>
              ) : verifyRequest?.status === 'pending' ? (
                <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                  <div className="flex items-center gap-2 text-yellow-400 mb-2">
                    <Clock size={14} />
                    <span className="text-sm font-bold">Talebiniz inceleniyor...</span>
                  </div>
                  <p className="text-[11px] text-white/40 italic mb-3">"{verifyRequest.note}"</p>
                  <button onClick={handleVerifyCancel} className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
                    Talebi geri çek
                  </button>
                </div>
              ) : verifyRequest?.status === 'rejected' ? (
                <div className="space-y-3">
                  <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
                    <p className="text-sm font-bold text-red-400">Talebiniz reddedildi</p>
                    {verifyRequest.adminNote && <p className="text-xs text-white/40 mt-1">Gerekçe: {verifyRequest.adminNote}</p>}
                  </div>
                  <textarea
                    value={verifyNote}
                    onChange={e => setVerifyNote(e.target.value)}
                    placeholder="Yukarıdaki kurallara göre neden uygun olduğunu açıkla..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/40 resize-none"
                    rows={3} maxLength={300}
                  />
                  <button onClick={handleVerifySubmit} disabled={verifySubmitting || verifyNote.trim().length < 20}
                    className="w-full py-2.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 rounded-xl text-sm font-bold hover:bg-emerald-500/25 transition-all disabled:opacity-40">
                    {verifySubmitting ? 'Gönderiliyor...' : '🍃 Tekrar Başvur'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={verifyNote}
                    onChange={e => setVerifyNote(e.target.value)}
                    placeholder="Kendin hakkında kısaca yaz. Kim olduğunu, ne yaptığını ve neden doğrulanmak istediğini anlat..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/40 resize-none"
                    rows={4} maxLength={300}
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/25">{verifyNote.length}/300 (min. 20)</span>
                    <button onClick={handleVerifySubmit} disabled={verifySubmitting || verifyNote.trim().length < 20}
                      className="px-5 py-2 bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 rounded-xl text-sm font-bold hover:bg-emerald-500/25 transition-all disabled:opacity-40">
                      {verifySubmitting ? 'Gönderiliyor...' : '🍃 Rozet Talep Et'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ÖNERI & ŞİKAYET */}
          {tab === 'feedback' && (
            <div className="space-y-5">
              {feedbackDone ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">Teşekkürler! 🌿</p>
                    <p className="text-white/40 text-sm mt-1">Geri bildiriminiz ekibimize iletildi.</p>
                  </div>
                  <button onClick={() => setFeedbackDone(false)}
                    className="px-5 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white transition-all">
                    Yeni Gönder
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-white/50 text-xs font-bold uppercase mb-3">Geri Bildirim Türü</p>
                    <div className="flex gap-2">
                      {([['suggestion', '💡 Öneri'], ['complaint', '⚠️ Şikayet']] as const).map(([val, label]) => (
                        <button key={val} onClick={() => setFeedbackType(val)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${feedbackType === val ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-white/50 hover:text-white'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-white/50 text-xs font-bold uppercase mb-2">
                      {feedbackType === 'suggestion' ? 'Önerinizi yazın' : 'Şikayetinizi yazın'}
                    </p>
                    <textarea
                      value={feedbackText}
                      onChange={e => setFeedbackText(e.target.value)}
                      placeholder={feedbackType === 'suggestion'
                        ? 'Uygulamayı geliştirmek için bir fikrin mi var? Anlat...'
                        : 'Yaşadığın sorunu veya şikayetini detaylıca anlat...'}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/40 resize-none"
                      rows={5} maxLength={500}
                    />
                    <span className="text-[10px] text-white/25">{feedbackText.length}/500 (min. 10)</span>
                  </div>
                  <button onClick={handleFeedbackSubmit} disabled={feedbackSending || feedbackText.trim().length < 10}
                    className="w-full py-2.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 rounded-xl text-sm font-bold hover:bg-emerald-500/25 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                    <Send size={14} />
                    {feedbackSending ? 'Gönderiliyor...' : 'Gönder'}
                  </button>
                </>
              )}
            </div>
          )}
          {/* HESABI SİL */}
          {tab === 'danger' && (
            <div className="space-y-5">
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-300 font-bold text-sm">Bu işlem geri alınamaz</p>
                  <p className="text-red-400/60 text-xs mt-1">
                    Hesabın, tüm mesajların, profil bilgilerin ve içeriklerin kalıcı olarak silinecek.
                    Bu işlem geri alınamaz.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-white/50 text-xs font-bold uppercase mb-2">Şifreni Gir</p>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={e => setDeletePassword(e.target.value)}
                    placeholder="Mevcut şifren"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-red-500/40"
                  />
                </div>

                <div>
                  <p className="text-white/50 text-xs font-bold uppercase mb-2">
                    Onaylamak için <span className="text-red-400">HESABIMI SİL</span> yaz
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder="HESABIMI SİL"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-red-500/40"
                  />
                </div>

                {deleteError && (
                  <p className="text-red-400 text-xs px-1">{deleteError}</p>
                )}

                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteConfirmText !== 'HESABIMI SİL' || deletePassword.length < 6}
                  className="w-full py-2.5 bg-red-500/15 border border-red-500/30 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/25 transition-all disabled:opacity-30 flex items-center justify-center gap-2">
                  <Trash2 size={14} />
                  {deleteLoading ? 'Siliniyor...' : 'Hesabımı Kalıcı Olarak Sil'}
                </button>
              </div>
            </div>
          )}

        </div>
      </motion.div>
    </div>
  );
};
