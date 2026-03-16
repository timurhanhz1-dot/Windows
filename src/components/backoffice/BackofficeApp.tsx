import React, { Suspense, lazy } from 'react';
import { RoleGuard } from './RoleGuard';
import { BackofficeLayout } from './BackofficeLayout';
import { Routes, Route } from 'react-router-dom';

const DashboardModule = lazy(() => import('./modules/DashboardModule'));
const UserManagementModule = lazy(() => import('./modules/UserManagementModule'));
const ChannelManagementModule = lazy(() => import('./modules/ChannelManagementModule'));
const MessageManagementModule = lazy(() => import('./modules/MessageManagementModule'));
const ForumManagementModule = lazy(() => import('./modules/ForumManagementModule'));
const SupportTicketsModule = lazy(() => import('./modules/SupportTicketsModule'));
const VerificationModule = lazy(() => import('./modules/VerificationModule'));
const AnnouncementsModule = lazy(() => import('./modules/AnnouncementsModule'));
const GamesModule = lazy(() => import('./modules/GamesModule'));
const TvChannelsModule = lazy(() => import('./modules/TvChannelsModule'));
const GuildsModule = lazy(() => import('./modules/GuildsModule'));
const DesignSettingsModule = lazy(() => import('./modules/DesignSettingsModule'));
const SiteSettingsModule = lazy(() => import('./modules/SiteSettingsModule'));
const FeatureFlagsModule = lazy(() => import('./modules/FeatureFlagsModule'));
const AnalyticsModule = lazy(() => import('./modules/AnalyticsModule'));
const SecurityModule = lazy(() => import('./modules/SecurityModule'));
const AuditLogModule = lazy(() => import('./modules/AuditLogModule'));

function Loader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <div style={{ width: 28, height: 28, border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function BackofficeApp() {
  return (
    <RoleGuard>
      <BackofficeLayout>
        <Routes>
          <Route path="/backoffice" element={<Suspense fallback={<Loader />}><DashboardModule /></Suspense>} />
          <Route path="/backoffice/users" element={<Suspense fallback={<Loader />}><UserManagementModule /></Suspense>} />
          <Route path="/backoffice/channels" element={<Suspense fallback={<Loader />}><ChannelManagementModule /></Suspense>} />
          <Route path="/backoffice/messages" element={<Suspense fallback={<Loader />}><MessageManagementModule /></Suspense>} />
          <Route path="/backoffice/forum" element={<Suspense fallback={<Loader />}><ForumManagementModule /></Suspense>} />
          <Route path="/backoffice/support" element={<Suspense fallback={<Loader />}><SupportTicketsModule /></Suspense>} />
          <Route path="/backoffice/verification" element={<Suspense fallback={<Loader />}><VerificationModule /></Suspense>} />
          <Route path="/backoffice/announcements" element={<Suspense fallback={<Loader />}><AnnouncementsModule /></Suspense>} />
          <Route path="/backoffice/games" element={<Suspense fallback={<Loader />}><GamesModule /></Suspense>} />
          <Route path="/backoffice/tv-channels" element={<Suspense fallback={<Loader />}><TvChannelsModule /></Suspense>} />
          <Route path="/backoffice/guilds" element={<Suspense fallback={<Loader />}><GuildsModule /></Suspense>} />
          <Route path="/backoffice/design" element={<Suspense fallback={<Loader />}><DesignSettingsModule /></Suspense>} />
          <Route path="/backoffice/settings" element={<Suspense fallback={<Loader />}><SiteSettingsModule /></Suspense>} />
          <Route path="/backoffice/feature-flags" element={<Suspense fallback={<Loader />}><FeatureFlagsModule /></Suspense>} />
          <Route path="/backoffice/analytics" element={<Suspense fallback={<Loader />}><AnalyticsModule /></Suspense>} />
          <Route path="/backoffice/security" element={<Suspense fallback={<Loader />}><SecurityModule /></Suspense>} />
          <Route path="/backoffice/audit-log" element={<Suspense fallback={<Loader />}><AuditLogModule /></Suspense>} />
        </Routes>
      </BackofficeLayout>
    </RoleGuard>
  );
}
