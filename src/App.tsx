import { Suspense, lazy } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { OrganizationProvider } from '@/hooks/useOrganization';
import { TimezoneProvider } from '@/hooks/useTimezone';
import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate';
import Landing from './pages/Landing';
import { OrgProtectedRoute } from './components/OrgProtectedRoute';

// Lazy load public website pages
const Features = lazy(() => import('./pages/Features'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));

// Component to handle SW updates
const ServiceWorkerUpdater = () => {
  useServiceWorkerUpdate();
  return null;
};

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const Team = lazy(() => import('./pages/Team'));
const PendingApproval = lazy(() => import('./pages/PendingApproval'));
const TeamMemberProfile = lazy(() => import('./pages/TeamMemberProfile'));
const BulkImport = lazy(() => import('./pages/BulkImport'));
const OrgChart = lazy(() => import('./pages/OrgChart'));
const Growth = lazy(() => import('./pages/Growth'));
const Auth = lazy(() => import('./pages/Auth'));
const Signup = lazy(() => import('./pages/Signup'));
const Settings = lazy(() => import('./pages/Settings'));
const Join = lazy(() => import('./pages/Join'));
const LeaveHistory = lazy(() => import('./pages/LeaveHistory'));
const OrgLeaveHistory = lazy(() => import('./pages/OrgLeaveHistory'));
const OrgAttendanceHistory = lazy(() => import('./pages/OrgAttendanceHistory'));
const AttendanceHistory = lazy(() => import('./pages/AttendanceHistory'));
const Notifications = lazy(() => import('./pages/Notifications'));
const NotificationPreferences = lazy(() => import('./pages/NotificationPreferences'));
const Install = lazy(() => import('./pages/Install'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const PerformanceReviews = lazy(() => import('./pages/PerformanceReviews'));
const TeamKPIDashboard = lazy(() => import('./pages/TeamKPIDashboard'));
const Chat = lazy(() => import('./pages/Chat'));
const Wiki = lazy(() => import('./pages/Wiki'));
const AskAI = lazy(() => import('./pages/AskAI'));
const WikiEditPage = lazy(() => import('./pages/WikiEditPage'));
const Tasks = lazy(() => import('./pages/Tasks'));
const CRM = lazy(() => import('./pages/CRM'));
const NotFound = lazy(() => import('./pages/NotFound'));

const SuperAdminOrganisations = lazy(() => import('./pages/super-admin/SuperAdminOrganisations'));
const SuperAdminUsers = lazy(() => import('./pages/super-admin/SuperAdminUsers'));
const SuperAdminAnalytics = lazy(() => import('./pages/super-admin/SuperAdminAnalytics'));
const SuperAdminBlog = lazy(() => import('./pages/super-admin/SuperAdminBlog'));
const SuperAdminPayments = lazy(() => import('./pages/super-admin/SuperAdminPayments'));
const SuperAdminPlanEditor = lazy(() => import('./pages/super-admin/SuperAdminPlanEditor'));
const SuperAdminTesting = lazy(() => import('./pages/super-admin/SuperAdminTesting'));
const SuperAdminProtectedRoute = lazy(() => import('./components/super-admin/SuperAdminProtectedRoute'));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Redirect component for root path - redirects to org-scoped home
const RootRedirect = lazy(() => import('./components/RootRedirect'));

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ServiceWorkerUpdater />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <TimezoneProvider>
          <OrganizationProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public website routes */}
                <Route path="/landing" element={<Landing />} />
                <Route path="/features" element={<Features />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                
                {/* Auth routes */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/pending-approval" element={<PendingApproval />} />
                <Route path="/join" element={<Join />} />
                <Route path="/install" element={<Install />} />
                
                {/* Root redirect - will redirect to /org/:orgId */}
                <Route path="/" element={<RootRedirect />} />
                
                {/* Organization-scoped routes - uses orgCode (slug) not orgId */}
                <Route path="/org/:orgCode">
                  {/* Team section */}
                  <Route index element={<OrgProtectedRoute><Home /></OrgProtectedRoute>} />
                  <Route path="team" element={<OrgProtectedRoute><Team /></OrgProtectedRoute>} />
                  <Route path="team/bulk-import" element={<OrgProtectedRoute><BulkImport /></OrgProtectedRoute>} />
                  <Route path="team/:id" element={<OrgProtectedRoute><TeamMemberProfile /></OrgProtectedRoute>} />
                  <Route path="team/:id/leave-history" element={<OrgProtectedRoute><LeaveHistory /></OrgProtectedRoute>} />
                  <Route path="team/:id/attendance" element={<OrgProtectedRoute><AttendanceHistory /></OrgProtectedRoute>} />
                  <Route path="team/:id/reviews" element={<OrgProtectedRoute><PerformanceReviews /></OrgProtectedRoute>} />
                  
                  {/* Org-wide views */}
                  <Route path="org-chart" element={<OrgProtectedRoute><OrgChart /></OrgProtectedRoute>} />
                  <Route path="growth" element={<OrgProtectedRoute><Growth /></OrgProtectedRoute>} />
                  <Route path="calendar" element={<OrgProtectedRoute><CalendarPage /></OrgProtectedRoute>} />
                  <Route path="kpi-dashboard" element={<OrgProtectedRoute><TeamKPIDashboard /></OrgProtectedRoute>} />
                  <Route path="leave-history" element={<OrgProtectedRoute><OrgLeaveHistory /></OrgProtectedRoute>} />
                  <Route path="attendance-history" element={<OrgProtectedRoute><OrgAttendanceHistory /></OrgProtectedRoute>} />
                  
                  {/* Settings & Notifications */}
                  <Route path="settings" element={<OrgProtectedRoute><Settings /></OrgProtectedRoute>} />
                  <Route path="notifications" element={<OrgProtectedRoute><Notifications /></OrgProtectedRoute>} />
                  <Route path="notifications/preferences" element={<OrgProtectedRoute><NotificationPreferences /></OrgProtectedRoute>} />
                  
                  {/* Feature modules */}
                  <Route path="chat" element={<OrgProtectedRoute><Chat /></OrgProtectedRoute>} />
                  <Route path="wiki" element={<OrgProtectedRoute><Wiki /></OrgProtectedRoute>} />
                  <Route path="wiki/edit/:pageId" element={<OrgProtectedRoute><WikiEditPage /></OrgProtectedRoute>} />
                  <Route path="ask-ai" element={<OrgProtectedRoute><AskAI /></OrgProtectedRoute>} />
                  <Route path="tasks" element={<OrgProtectedRoute><Tasks /></OrgProtectedRoute>} />
                  <Route path="crm" element={<OrgProtectedRoute><CRM /></OrgProtectedRoute>} />
                </Route>
                
                {/* Super Admin Portal - separate from org context */}
                <Route path="/super-admin" element={<Navigate to="/super-admin/analytics" replace />} />
                <Route path="/super-admin/analytics" element={
                  <SuperAdminProtectedRoute>
                    <SuperAdminAnalytics />
                  </SuperAdminProtectedRoute>
                } />
                <Route path="/super-admin/organisations" element={
                  <SuperAdminProtectedRoute>
                    <SuperAdminOrganisations />
                  </SuperAdminProtectedRoute>
                } />
                <Route path="/super-admin/users" element={
                  <SuperAdminProtectedRoute>
                    <SuperAdminUsers />
                  </SuperAdminProtectedRoute>
                } />
                <Route path="/super-admin/payments" element={
                  <SuperAdminProtectedRoute>
                    <SuperAdminPayments />
                  </SuperAdminProtectedRoute>
                } />
                <Route path="/super-admin/blog" element={
                  <SuperAdminProtectedRoute>
                    <SuperAdminBlog />
                  </SuperAdminProtectedRoute>
                } />
                <Route path="/super-admin/testing" element={
                  <SuperAdminProtectedRoute>
                    <SuperAdminTesting />
                  </SuperAdminProtectedRoute>
                } />
                <Route path="/super-admin/plans/new" element={
                  <SuperAdminProtectedRoute>
                    <SuperAdminPlanEditor />
                  </SuperAdminProtectedRoute>
                } />
                <Route path="/super-admin/plans/:planId/edit" element={
                  <SuperAdminProtectedRoute>
                    <SuperAdminPlanEditor />
                  </SuperAdminProtectedRoute>
                } />
                
                {/* Legacy routes redirect - for backward compatibility */}
                <Route path="/team/*" element={<Navigate to="/" replace />} />
                <Route path="/calendar" element={<Navigate to="/" replace />} />
                <Route path="/wiki/*" element={<Navigate to="/" replace />} />
                <Route path="/settings" element={<Navigate to="/" replace />} />
                <Route path="/notifications/*" element={<Navigate to="/" replace />} />
                
                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </OrganizationProvider>
        </TimezoneProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
