import React from 'react';
import { BackofficeTopBar } from './BackofficeTopBar';
import { BackofficeSidebar } from './BackofficeSidebar';
import { useBackofficeAuth } from './hooks/useBackofficeAuth';

export function BackofficeLayout({ children }: { children?: React.ReactNode }) {
  const { displayName, role } = useBackofficeAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#0d0d1a', color: '#fff' }}>
      <BackofficeTopBar displayName={displayName} role={role} />
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <BackofficeSidebar role={role} />
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
