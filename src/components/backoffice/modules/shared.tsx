import React, { useState } from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
      {children}
    </div>
  );
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 20 }}>{children}</h2>;
}

interface ToastState { message: string; type: 'success' | 'error' }

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const show = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  return { toast, show };
}

export function Toast({ toast }: { toast: { message: string; type: 'success' | 'error' } | null }) {
  if (!toast) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
      background: toast.type === 'success' ? '#10b981' : '#ef4444',
      color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    }}>
      {toast.message}
    </div>
  );
}

export function Btn({ children, onClick, color = '#6366f1', disabled = false, small = false }: {
  children: React.ReactNode; onClick?: () => void; color?: string; disabled?: boolean; small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? '4px 10px' : '7px 14px',
        background: color + '22', border: `1px solid ${color}44`,
        color, borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: small ? 11 : 13, fontWeight: 600, opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}

export function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8, padding: '7px 12px', color: '#fff', fontSize: 13,
        outline: 'none', width: '100%',
      }}
    />
  );
}
