import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './i18n';
import './index.css';

document.title = 'Nature.co';

const isBackoffice = window.location.pathname.startsWith('/backoffice');
const App = lazy(() => import('./App'));
const BackofficeApp = lazy(() => import('./components/backoffice/BackofficeApp').then(m => ({ default: m.BackofficeApp })));

function Spinner() {
  return (
    <div style={{ background: '#0d0d1a', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 36, height: 36, border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Suspense fallback={<Spinner />}>
      {isBackoffice ? <BackofficeApp /> : <App />}
    </Suspense>
  </BrowserRouter>
);
