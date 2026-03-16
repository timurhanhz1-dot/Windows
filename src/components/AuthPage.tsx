import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { auth, db } from '../firebase';
const EMAILJS_SERVICE     = 'service_pwyfg6j';
const EMAILJS_TEMPLATE    = 'template_jvivfgc';
const EMAILJS_PUBLIC_KEY  = 'k0VJPzZLwcdsOL7zc';
const EMAILJS_PRIVATE_KEY = 'VxxaOonkzQhJgW0NAP3mm';

// EmailJS REST API — domain kısıtlaması yok
async function sendVerificationEmail(toName: string, toEmail: string, passcode: string) {
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE,
      template_id: EMAILJS_TEMPLATE,
      user_id: EMAILJS_PUBLIC_KEY,
      accessToken: EMAILJS_PRIVATE_KEY,
      template_params: {
        to_name: toName,
        to_email: toEmail,
        email: toEmail,
        passcode: passcode,
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res;
}

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const G = {
  dark: '#0F172A',
  glass: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.1)',
  primary: '#10B981',
  danger: '#EF4444',
  grad: 'linear-gradient(135deg,#10B981,#8B5CF6)',
};

type Mode = 'login' | 'register' | 'forgot';

const NLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="28" height="28">
    <defs><linearGradient id="nlg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#10B981"/><stop offset="100%" stopColor="#059669"/>
    </linearGradient></defs>
    <path d="M50 8C50 8,18 38,18 60C18 79.5 32.5 92 50 92C67.5 92 82 79.5 82 60C82 38 50 8 50 8Z" fill="url(#nlg)"/>
    <text x="50" y="73" fontFamily="Arial Black,Arial,sans-serif" fontSize="44" fontWeight="900" fill="white" textAnchor="middle">N</text>
  </svg>
);

export const AuthPage = ({ onAuth }: { onAuth: () => void }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('login');
  const [loginTab, setLoginTab] = useState<'email'|'username'>('username');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdStrength, setPwdStrength] = useState(0);

  // Login
  const [loginId, setLoginId] = useState('');
  const [loginPwd, setLoginPwd] = useState('');

  // Register — Adım 1: form
  const [regName, setRegName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPwd, setRegPwd] = useState('');
  const [chkPrivacy, setChkPrivacy] = useState(false);
  const [chkTerms, setChkTerms] = useState(false);
  const [chkKvkk, setChkKvkk] = useState(false);
  const [chkShake, setChkShake] = useState<string|null>(null);

  // Register — Adım 2: kod doğrulama
  const [regStep, setRegStep] = useState<1|2>(1);
  const [verCode, setVerCode] = useState('');   // üretilen kod (bellekte)
  const [enteredCode, setEnteredCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot
  const [forgotEmail, setForgotEmail] = useState('');

  const calcStrength = (p: string) => {
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p) && /[0-9]/.test(p)) s++;
    setPwdStrength(s);
  };

  const findEmailByUsername = async (username: string) => {
    const snap = await get(ref(db, 'usernames/' + username.toLowerCase()));
    if (snap.exists()) {
      const uid = snap.val();
      // Eski kayıtlarda uid obje olarak saklanmış olabilir
      const uidStr = typeof uid === 'string' ? uid : (uid?.uid || uid?.id || null);
      if (!uidStr || typeof uidStr !== 'string') return null;
      const es = await get(ref(db, 'userEmails/' + uidStr));
      return es.exists() ? es.val() : null;
    }
    return null;
  };

  // ── GİRİŞ ──────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setError(''); setLoading(true);
    try {
      let email = loginId;
      if (loginTab === 'username') {
        const found = await findEmailByUsername(loginId);
        if (!found) { setError('Kullanıcı adı bulunamadı'); setLoading(false); return; }
        email = found;
      }
      await signInWithEmailAndPassword(auth, email, loginPwd);
      onAuth();
    } catch (e: any) {
      const msgs: Record<string,string> = {
        'auth/invalid-credential': t('auth.wrongPassword'),
        'auth/user-not-found': t('auth.userNotFound'),
        'auth/wrong-password': t('auth.wrongPassword'),
        'auth/too-many-requests': 'Çok fazla deneme, bekleyin',
        'auth/invalid-email': t('auth.invalidEmail'),
      };
      setError(msgs[e.code] || e.message);
    }
    setLoading(false);
  };

  // ── KAYIT ADIM 1: Formu doğrula + EmailJS ile kod gönder ───────────────
  const handleSendCode = async () => {
    setError('');
    if (!chkPrivacy) { shake('privacy'); setError('Gizlilik Politikasını onaylamanız zorunludur'); return; }
    if (!chkTerms)   { shake('terms');   setError('Kullanım Şartlarını onaylamanız zorunludur'); return; }
    if (!chkKvkk)    { shake('kvkk');    setError('KVKK Aydınlatma Metnini onaylamanız zorunludur'); return; }
    if (!regName.trim() || !regUsername.trim() || !regEmail.trim() || !regPwd) {
      setError('Tüm alanları doldurun'); return;
    }
    if (regPwd.length < 6) { setError('Şifre en az 6 karakter'); return; }

    setLoading(true);
    try {
      // Kullanıcı adı kontrolü
      const taken = await get(ref(db, 'usernames/' + regUsername.toLowerCase()));
      if (taken.exists()) { setError('Bu kullanıcı adı alınmış'); setLoading(false); return; }

      // Kod üret ve EmailJS ile gönder
      const code = generateCode();
      const result = await sendVerificationEmail(
        regName || regUsername,
        regEmail.trim(),
        code,
      );
      setVerCode(code);
      setRegStep(2);
      setSuccess('Doğrulama kodu e-posta adresinize gönderildi!');
    } catch (e: any) {
      setError('Hata: ' + (e?.code || e?.text || e?.message || JSON.stringify(e)));
    }
    setLoading(false);
  };

  // ── KAYIT ADIM 2: Kodu doğrula + Firebase'e kayıt yap ─────────────────
  const handleVerifyAndRegister = async () => {
    setCodeError('');
    if (!enteredCode.trim()) { setCodeError('Kodu girin'); return; }
    if (enteredCode.trim() !== verCode) { setCodeError('Kod hatalı, tekrar dene'); return; }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, regEmail.trim(), regPwd);
      await updateProfile(cred.user, { displayName: regUsername });
      await set(ref(db, 'users/' + cred.user.uid), {
        id: cred.user.uid, username: regUsername, displayName: regName,
        email: regEmail.trim(), createdAt: Date.now(), status: 'online',
        is_admin: false, is_verified: false, email_verified: true,
        consents: { privacy: true, terms: true, kvkk: true, acceptedAt: Date.now() },
      });
      await set(ref(db, 'usernames/' + regUsername.toLowerCase()), cred.user.uid);
      await set(ref(db, 'userEmails/' + cred.user.uid), regEmail.trim());
      await set(ref(db, 'user_index/' + cred.user.uid), { username: regUsername });
      onAuth();
    } catch (e: any) {
      const msgs: Record<string,string> = {
        'auth/email-already-in-use': 'Bu e-posta zaten kayıtlı. Giriş yapmayı dene.',
        'auth/invalid-email': 'Geçersiz e-posta',
        'auth/weak-password': 'Şifre çok zayıf',
      };
      setCodeError(msgs[e.code] || e.message);
    }
    setLoading(false);
  };

  // ── KOD TEKRAR GÖNDER ──────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true); setError(''); setSuccess('');
    try {
      const code = generateCode();
      await sendVerificationEmail(
        regName || regUsername,
        regEmail.trim(),
        code,
      );
      setVerCode(code);
      setSuccess('Yeni kod gönderildi!');
      setResendCooldown(60);
      const iv = setInterval(() => {
        setResendCooldown(p => { if (p <= 1) { clearInterval(iv); return 0; } return p - 1; });
      }, 1000);
    } catch (e: any) {
      setError('Gönderilemedi: ' + (e?.text || e?.message || JSON.stringify(e)));
    }
    setLoading(false);
  };

  const handleForgot = async () => {
    setError(''); setLoading(true);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setSuccess('Sıfırlama e-postası gönderildi!');
    } catch { setError('E-posta gönderilemedi'); }
    setLoading(false);
  };

  const shake = (id: string) => { setChkShake(id); setTimeout(() => setChkShake(null), 600); };
  const go = (m: Mode) => { setMode(m); setError(''); setSuccess(''); setRegStep(1); };
  const sc = ['','#ef4444','#f59e0b','#22c55e'];
  const sl = ['','Zayıf','Orta','Güçlü'];

  // ── KAYIT ADIM 2 EKRANI ────────────────────────────────────────────────
  if (mode === 'register' && regStep === 2) {
    return (
      <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:G.dark, backgroundImage:'radial-gradient(circle at 20% 50%,rgba(16,185,129,.1) 0%,transparent 50%),radial-gradient(circle at 80% 80%,rgba(139,92,246,.1) 0%,transparent 50%)', padding:20 }}>
        <style>{`@keyframes authIn{from{opacity:0;transform:scale(.95) translateY(20px)}to{opacity:1;transform:none}}@keyframes authSpin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ background:G.glass, border:`1px solid ${G.border}`, borderRadius:24, padding:'40px 36px', width:'100%', maxWidth:420, boxShadow:'0 32px 100px rgba(0,0,0,.5)', animation:'authIn .3s cubic-bezier(.34,1.56,.64,1) both', backdropFilter:'blur(20px)', textAlign:'center' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>📧</div>
          <div style={{ fontWeight:800, fontSize:22, color:'#fff', marginBottom:10 }}>E-postanı Doğrula</div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,.5)', lineHeight:1.7, marginBottom:24 }}>
            <strong style={{ color:'rgba(255,255,255,.8)' }}>{regEmail}</strong> adresine 6 haneli doğrulama kodu gönderdik.<br/>Kodu aşağıya gir.
          </div>
          <input
            value={enteredCode}
            onChange={e => { setEnteredCode(e.target.value.replace(/\D/g,'').slice(0,6)); setCodeError(''); }}
            placeholder="000000" maxLength={6}
            style={{ width:'100%', padding:'14px', background:'rgba(255,255,255,.06)', border:`2px solid ${codeError?'#ef4444':'rgba(255,255,255,.12)'}`, borderRadius:12, color:'#fff', fontSize:28, fontWeight:800, textAlign:'center', letterSpacing:12, outline:'none', boxSizing:'border-box', marginBottom:8, fontFamily:'monospace' }}
          />
          {codeError && <div style={{ color:'#fca5a5', fontSize:13, marginBottom:10 }}>⚠ {codeError}</div>}
          {error && <div style={{ padding:'10px 12px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, color:'#fca5a5', fontSize:13, marginBottom:10 }}>⚠ {error}</div>}
          {success && <div style={{ padding:'10px 12px', background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.2)', borderRadius:8, color:'#6ee7b7', fontSize:13, marginBottom:10 }}>✓ {success}</div>}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button onClick={handleVerifyAndRegister} disabled={loading || enteredCode.length < 6}
              style={{ padding:13, background:enteredCode.length===6?'linear-gradient(135deg,#10B981,#059669)':'rgba(16,185,129,.3)', border:'none', borderRadius:10, color:'#fff', fontSize:14, fontWeight:700, cursor:enteredCode.length===6?'pointer':'not-allowed', boxShadow:'0 4px 20px rgba(16,185,129,.3)' }}>
              {loading ? '...' : 'Kaydı Tamamla →'}
            </button>
            <button onClick={handleResend} disabled={loading || resendCooldown > 0}
              style={{ padding:13, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, color:resendCooldown>0?'rgba(255,255,255,.3)':'rgba(255,255,255,.7)', fontSize:13, cursor:resendCooldown>0?'not-allowed':'pointer' }}>
              {resendCooldown > 0 ? `Tekrar gönder (${resendCooldown}s)` : 'Kodu Tekrar Gönder'}
            </button>
            <button onClick={() => { setRegStep(1); setEnteredCode(''); setCodeError(''); setError(''); setSuccess(''); }}
              style={{ padding:10, background:'none', border:'none', color:'rgba(255,255,255,.3)', fontSize:13, cursor:'pointer' }}>
              ← Geri dön
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:G.dark, backdropFilter:'blur(20px)', padding:20, overflowY:'auto', backgroundImage:'radial-gradient(circle at 20% 50%,rgba(16,185,129,.1) 0%,transparent 50%),radial-gradient(circle at 80% 80%,rgba(139,92,246,.1) 0%,transparent 50%)' }}>
      <style>{`
        @keyframes authIn{from{opacity:0;transform:scale(.95) translateY(20px)}to{opacity:1;transform:none}}
        @keyframes authShake{0%,100%{transform:none}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
        @keyframes authSpin{to{transform:rotate(360deg)}}
        .ai{transition:border-color .2s,box-shadow .2s!important}
        .ai:focus{border-color:#10B98145!important;box-shadow:0 0 0 3px #10B98115!important;outline:none!important}
        .as:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 28px #10B98135!important}
        .as:disabled{opacity:.6;cursor:not-allowed}
        .al{color:#10B981;font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:2px}
        .al:hover{opacity:.8}
        .chk-shake{animation:authShake .6s ease!important}
        .chk-box{width:18px;height:18px;min-width:18px;border-radius:5px;border:2px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0}
        .chk-box.checked{background:#10B981;border-color:#10B981}
        .chk-box.error{border-color:#EF4444!important;box-shadow:0 0 0 3px #EF444425!important}
      `}</style>
      <div style={{ position:'relative', background:G.glass, border:`1px solid ${G.border}`, borderRadius:24, padding:'40px 36px', width:'100%', maxWidth:mode==='register'?460:420, boxShadow:'0 32px 100px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.1)', animation:'authIn .3s cubic-bezier(.34,1.56,.64,1) both', margin:'auto', backdropFilter:'blur(20px)' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:G.grad, border:`1px solid ${G.border}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:'0 8px 32px rgba(16,185,129,.3)', fontSize:28 }}>
            {mode==='register' ? '🌱' : <NLogo />}
          </div>
          <div style={{ fontWeight:800, fontSize:22, color:'#fff', letterSpacing:'-.3px' }}>
            {mode==='login'?t('auth.login'):mode==='register'?t('auth.register'):t('auth.resetPassword')}
          </div>
          <div style={{ fontSize:14, color:'rgba(255,255,255,.5)', marginTop:6 }}>
            {mode==='login'?'Doğa topluluğuna giriş yap':mode==='register'?'NatureCo topluluğuna katıl':'Sıfırlama e-postası gönderilecek'}
          </div>
        </div>

        {/* ── LOGIN ── */}
        {mode==='login' && <>
          <div style={{ position:'relative', display:'grid', gridTemplateColumns:'1fr 1fr', background:G.glass, borderRadius:12, padding:4, marginBottom:24, border:`1px solid ${G.border}` }}>
            <div style={{ position:'absolute', top:4, left:loginTab==='username'?4:'calc(50%)', width:'calc(50% - 4px)', height:'calc(100% - 8px)', background:G.grad, borderRadius:8, border:`1px solid ${G.border}`, transition:'left .25s cubic-bezier(.34,1.56,.64,1)', zIndex:1 }} />
            {(['username','email'] as const).map(t => (
              <button key={t} onClick={() => setLoginTab(t)} style={{ position:'relative', zIndex:2, padding:10, border:'none', background:'transparent', color:loginTab===t?'#fff':'rgba(255,255,255,.5)', fontSize:13, cursor:'pointer', borderRadius:8, fontFamily:'inherit', fontWeight:loginTab===t?600:400, transition:'color .2s' }}>
                {t==='email'?'E-posta':'Kullanıcı Adı'}
              </button>
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <F label={loginTab==='email'?'E-POSTA ADRESİ':'KULLANICI ADI'} icon="✉" value={loginId} onChange={setLoginId} placeholder={loginTab==='email'?'sen@ornek.com':'kullanici_adi'} />
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.35)', letterSpacing:'.8px' }}>ŞİFRE</span>
                <button onClick={() => go('forgot')} style={{ background:'none', border:'none', color:'rgba(16,185,129,.6)', fontSize:11, cursor:'pointer', fontFamily:'inherit', padding:0 }}>Şifremi unuttum</button>
              </div>
              <PF value={loginPwd} onChange={setLoginPwd} show={showPwd} toggle={() => setShowPwd(!showPwd)} placeholder="••••••••" />
            </div>
            {error && <Err msg={error} />}
            <Btn loading={loading} onClick={handleLogin} label={t('auth.login')} />
          </div>
          <div style={{ textAlign:'center', color:'rgba(255,255,255,.35)', fontSize:13, marginTop:18 }}>
            {t('auth.noAccount')} <span className="al" onClick={() => go('register')}>{t('auth.register')}</span>
          </div>
        </>}

        {/* ── REGISTER ADIM 1 ── */}
        {mode==='register' && regStep===1 && <>
          <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <F label="AD SOYAD" icon="👤" value={regName} onChange={setRegName} placeholder="Adın Soyadın" />
              <F label="KULLANICI ADI" icon="@" value={regUsername} onChange={(v:string) => setRegUsername(v.replace(/\s/g,''))} placeholder="kullanici_adi" />
            </div>
            <F label="E-POSTA ADRESİ" icon="✉" value={regEmail} onChange={setRegEmail} placeholder="sen@ornek.com" type="email" />
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.35)', letterSpacing:'.8px', display:'block', marginBottom:6 }}>ŞİFRE</label>
              <PF value={regPwd} onChange={(v:string) => { setRegPwd(v); calcStrength(v); }} show={showPwd} toggle={() => setShowPwd(!showPwd)} placeholder="En az 6 karakter" />
              {regPwd.length > 0 && <div style={{ marginTop:6 }}>
                <div style={{ display:'flex', gap:4, marginBottom:3 }}>
                  {[1,2,3].map(i => <div key={i} style={{ height:3, flex:1, borderRadius:2, background:i<=pwdStrength?sc[pwdStrength]:'rgba(255,255,255,.1)', transition:'background .3s' }} />)}
                </div>
                <span style={{ fontSize:10, color:sc[pwdStrength] }}>{sl[pwdStrength]}</span>
              </div>}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, padding:'14px 16px', background:'rgba(255,255,255,.02)', borderRadius:12, border:'1px solid rgba(255,255,255,.06)', marginTop:2 }}>
              <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.3)', letterSpacing:'.8px', margin:0 }}>ONAYLAR (ZORUNLU)</p>
              {([
                { id:'privacy', checked:chkPrivacy, set:setChkPrivacy, link:'/gizlilik.html', linkText:'Gizlilik Politikası', suffix:"'nı okudum ve kabul ediyorum.", text:'' },
                { id:'terms',   checked:chkTerms,   set:setChkTerms,   link:'/sartlar.html',  linkText:'Kullanım Şartları',  suffix:"'nı okudum ve kabul ediyorum.", text:'' },
                { id:'kvkk',    checked:chkKvkk,    set:setChkKvkk,    link:'', linkText:'', suffix:'', text:'KVKK kapsamında kişisel verilerimin işlenmesine onay veriyorum.' },
              ] as const).map(item => (
                <div key={item.id} className={chkShake===item.id?'chk-shake':''} style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }} onClick={() => (item.set as any)(!item.checked)}>
                  <div className={`chk-box${item.checked?' checked':''}${chkShake===item.id?' error':''}`}>
                    {item.checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontSize:12, color:'rgba(255,255,255,.5)', lineHeight:1.5, userSelect:'none' }}>
                    {item.link ? <><a href={item.link} target="_blank" rel="noreferrer" className="al" onClick={e => e.stopPropagation()}>{item.linkText}</a>{item.suffix}</> : item.text}
                  </span>
                </div>
              ))}
            </div>
            {error && <Err msg={error} />}
            <Btn loading={loading} onClick={handleSendCode} label="Doğrulama Kodu Gönder" />
          </div>
          <div style={{ textAlign:'center', color:'rgba(255,255,255,.35)', fontSize:13, marginTop:18 }}>
            {t('auth.hasAccount')} <span className="al" onClick={() => go('login')}>{t('auth.login')}</span>
          </div>
        </>}

        {/* ── FORGOT ── */}
        {mode==='forgot' && <>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <F label="E-POSTA ADRESİ" icon="✉" value={forgotEmail} onChange={setForgotEmail} placeholder="sen@ornek.com" type="email" />
            {error && <Err msg={error} />}
            {success && <div style={{ padding:'10px 12px', background:'rgba(16,185,129,.1)', border:'1px solid rgba(16,185,129,.2)', borderRadius:8, color:'#6ee7b7', fontSize:13 }}>✓ {success}</div>}
            <Btn loading={loading} onClick={handleForgot} label="Sıfırlama E-postası Gönder" disabled={!!success} />
          </div>
          <div style={{ textAlign:'center', color:'rgba(255,255,255,.35)', fontSize:13, marginTop:18 }}>
            <span className="al" onClick={() => go('login')}>← Giriş sayfasına dön</span>
          </div>
        </>}
      </div>
    </div>
  );
};

function F({ label, icon, value, onChange, placeholder, type='text' }: any) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,.35)', letterSpacing:'.8px' }}>{label}</label>
      <div style={{ position:'relative' }}>
        <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'rgba(16,185,129,.5)', fontSize:14, pointerEvents:'none' }}>{icon}</span>
        <input className="ai" type={type} value={value} onChange={(e:any) => onChange(e.target.value)} placeholder={placeholder}
          style={{ width:'100%', padding:'11px 12px 11px 36px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, color:'#fff', fontSize:14, fontFamily:'inherit', boxSizing:'border-box' as any }} />
      </div>
    </div>
  );
}

function PF({ value, onChange, show, toggle, placeholder }: any) {
  return (
    <div style={{ position:'relative' }}>
      <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'rgba(16,185,129,.5)', fontSize:14, pointerEvents:'none' }}>🔒</span>
      <input className="ai" type={show?'text':'password'} value={value} onChange={(e:any) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width:'100%', padding:'11px 40px 11px 36px', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, color:'#fff', fontSize:14, fontFamily:'inherit', boxSizing:'border-box' as any }} />
      <button onClick={toggle} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'rgba(255,255,255,.35)', cursor:'pointer', fontSize:15, padding:4 }}>
        {show ? '🙈' : '👁'}
      </button>
    </div>
  );
}

function Btn({ loading, onClick, label, disabled=false }: any) {
  return (
    <button className="as" onClick={onClick} disabled={loading||disabled}
      style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:13, background:'linear-gradient(135deg,#10B981,#059669)', border:'none', borderRadius:10, color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 20px rgba(16,185,129,.3)', marginTop:2, transition:'transform .15s,box-shadow .2s', width:'100%' }}>
      {loading ? <div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'authSpin .7s linear infinite' }} /> : <>{label} →</>}
    </button>
  );
}

function Err({ msg }: any) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 12px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', borderRadius:8, color:'#fca5a5', fontSize:13 }}>
      ⚠ {msg}
    </div>
  );
}
