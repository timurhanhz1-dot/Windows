import React from 'react';
import { useBackofficeAuth } from './hooks/useBackofficeAuth';
import { BackofficeRole } from './types/backoffice.types';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';

interface RoleGuardProps {
  allowedRoles?: BackofficeRole[];
  children: React.ReactNode;
}

function LoadingScreen() {
  return (
    <div style={{ background: '#0d0d1a', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function AccessDeniedScreen() {
  return (
    <div style={{ background: '#0d0d1a', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 48 }}>🚫</div>
      <p style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Erişim Reddedildi</p>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Bu bölüme erişim yetkiniz bulunmamaktadır.</p>
      <a href="/chat" style={{ marginTop: 8, color: '#6366f1', fontSize: 14 }}>Ana sayfaya dön</a>
    </div>
  );
}

function LoginScreen() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError('E-posta veya şifre hatalı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#0d0d1a', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleLogin} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: 32, width: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔐</div>
          <p style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Backoffice Girişi</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Yetkili personel girişi</p>
        </div>
        <input
          type="email" placeholder="E-posta" value={email} onChange={e => setEmail(e.target.value)} required
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }}
        />
        <input
          type="password" placeholder="Şifre" value={password} onChange={e => setPassword(e.target.value)} required
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }}
        />
        {error && <p style={{ color: '#ef4444', fontSize: 13, textAlign: 'center' }}>{error}</p>}
        <button type="submit" disabled={loading}
          style={{ background: '#6366f1', border: 'none', borderRadius: 8, padding: '10px 0', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
        </button>
      </form>
    </div>
  );
}

export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { uid, role, isLoading, isAuthorized } = useBackofficeAuth();

  if (isLoading) return <LoadingScreen />;
  if (!uid) return <LoginScreen />;
  if (!isAuthorized) return <AccessDeniedScreen />;
  if (allowedRoles && allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
    return <AccessDeniedScreen />;
  }
  return <>{children}</>;
}
