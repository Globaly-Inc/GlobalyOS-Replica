import { Suspense, lazy } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { OrganizationProvider } from '@/hooks/useOrganization';
import { AuthProvider } from '@/hooks/useAuth';
import { FeatureFlagsProvider } from '@/hooks/useFeatureFlags';
import { TimezoneProvider } from '@/hooks/useTimezone';
import { useServiceWorkerUpdate } from '@/hooks/useServiceWorkerUpdate';
import { UpdatePrompt } from '@/components/ui/UpdatePrompt';
import { AppVersionBadge } from '@/components/ui/AppVersionBadge';
import { NativeAppInitializer } from '@/components/NativeAppInitializer';
import RouteTracker from '@/components/RouteTracker';
import Landing from './pages/Landing';
import { OrgProtectedRoute } from './components/OrgProtectedRoute';
import { FeatureProtectedRoute } from './components/FeatureProtectedRoute';

// Lazy load public website pages
const Features = lazy(() => import('./pages/Features'));
const About = lazy(() => import('./pages/About'));
const Careers = lazy(() => import('./pages/Careers'));
const Contact = lazy(() => import('./pages/Contact'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Blog = lazy(() => import('./pages/Blog'));
const BlogPost = lazy(() => import('./pages/BlogPost'));

// Component to handle SW updates and show version
const ServiceWorkerUpdater = () => {
  const {
    showPrompt,
    isUpdating,
    handleUpdate
  } = useServiceWorkerUpdate();
  return <>
      {showPrompt && <UpdatePrompt onUpdate={handleUpdate} isUpdating={isUpdating} />}
      {/* Version badge in bottom-left corner */}
      <div className="fixed bottom-2 left-2 z-40">
        <AppVersionBadge />
      </div>
    </>;
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
const Leave = lazy(() => import('./pages/Leave'));
const BulkLeaveImport = lazy(() => import('./pages/BulkLeaveImport'));
const OrgLeaveHistory = lazy(() => import('./pages/OrgLeaveHistory'));
const OrgAttendanceHistory = lazy(() => import('./pages/OrgAttendanceHistory'));
const AttendanceHistory = lazy(() => import('./pages/AttendanceHistory'));
const Notifications = lazy(() => import('./pages/Notifications'));
const NotificationPreferences = lazy(() => import('./pages/NotificationPreferences'));
const Install = lazy(() => import('./pages/Install'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const PerformanceReviews = lazy(() => import('./pages/PerformanceReviews'));
const TeamKPIDashboard = lazy(() => import('./pages/TeamKPIDashboard'));
const KpiDetail = lazy(() => import('./pages/KpiDetail'));
const BulkKpiCreate = lazy(() => import('./pages/BulkKpiCreate'));
const KpiGenerationHistory = lazy(() => import('./pages/KpiGenerationHistory'));
const Chat = lazy(() => import('./pages/Chat'));
const Wiki = lazy(() => import('./pages/Wiki'));
const AskAI = lazy(() => import('./pages/AskAI'));
const WikiEditPage = lazy(() => import('./pages/WikiEditPage'));
const Tasks = lazy(() => import('./pages/Tasks'));
const CRM = lazy(() => import('./pages/CRM'));
const Payroll = lazy(() => import('./pages/Payroll'));
const MyPayslips = lazy(() => import('./pages/MyPayslips'));
const Workflows = lazy(() => import('./pages/Workflows'));
const ApplicationDetail = lazy(() => import('./pages/ApplicationDetail'));
const WorkflowSettings = lazy(() => import('./pages/WorkflowSettings'));
const ManageOffices = lazy(() => import('./pages/ManageOffices'));
const OrgOnboardingWizard = lazy(() => import('./pages/onboarding/OrgOnboardingWizard'));
const EmployeeOnboardingWizard = lazy(() => import('./pages/onboarding/EmployeeOnboardingWizard'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Hiring pages
const HiringDashboard = lazy(() => import('./pages/hiring/HiringDashboard'));
const JobsList = lazy(() => import('./pages/hiring/JobsList'));
const JobCreate = lazy(() => import('./pages/hiring/JobCreate'));
const JobDetail = lazy(() => import('./pages/hiring/JobDetail'));
const CandidatesList = lazy(() => import('./pages/hiring/CandidatesList'));
const HiringAnalytics = lazy(() => import('./pages/hiring/HiringAnalytics'));

// Support pages
const Support = lazy(() => import('./pages/Support'));
const SupportGettingStarted = lazy(() => import('./pages/SupportGettingStarted'));
const SupportFAQ = lazy(() => import('./pages/SupportFAQ'));
const SupportFeatures = lazy(() => import('./pages/SupportFeatures'));
const SupportModule = lazy(() => import('./pages/SupportModule'));
const SupportArticle = lazy(() => import('./pages/SupportArticle'));
const SupportAPI = lazy(() => import('./pages/SupportAPI'));

// Legal pages
const Terms = lazy(() => import('./pages/legal/Terms'));
const Privacy = lazy(() => import('./pages/legal/Privacy'));
const AcceptableUse = lazy(() => import('./pages/legal/AcceptableUse'));
const DPA = lazy(() => import('./pages/legal/DPA'));
const Cookies = lazy(() => import('./pages/legal/Cookies'));
const SupportGetHelp = lazy(() => import('./pages/SupportGetHelp'));
const SuperAdminOrganisations = lazy(() => import('./pages/super-admin/SuperAdminOrganisations'));
const SuperAdminOrganisationDetail = lazy(() => import('./pages/super-admin/SuperAdminOrganisationDetail'));
const SuperAdminUsers = lazy(() => import('./pages/super-admin/SuperAdminUsers'));
const SuperAdminAnalytics = lazy(() => import('./pages/super-admin/SuperAdminAnalytics'));
const SuperAdminBlog = lazy(() => import('./pages/super-admin/SuperAdminBlog'));
const SuperAdminPayments = lazy(() => import('./pages/super-admin/SuperAdminPayments'));
const SuperAdminPlanEditor = lazy(() => import('./pages/super-admin/SuperAdminPlanEditor'));
const SuperAdminTesting = lazy(() => import('./pages/super-admin/SuperAdminTesting'));
const SuperAdminBlogEditor = lazy(() => import('./pages/super-admin/SuperAdminBlogEditor'));
const SuperAdminCustomerSuccess = lazy(() => import('./pages/super-admin/SuperAdminCustomerSuccess'));
const SuperAdminDocumentation = lazy(() => import('./pages/super-admin/SuperAdminDocumentation'));
const SuperAdminErrorLogs = lazy(() => import('./pages/super-admin/SuperAdminErrorLogs'));
const SuperAdminErrorLogDetail = lazy(() => import('./pages/super-admin/SuperAdminErrorLogDetail'));
const SuperAdminTemplates = lazy(() => import('./pages/super-admin/SuperAdminTemplates'));
const SuperAdminProtectedRoute = lazy(() => import('./components/super-admin/SuperAdminProtectedRoute'));
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute - data considered fresh
      gcTime: 5 * 60 * 1000, // 5 minutes in cache
      retry: 1, // Only retry once on failure
      refetchOnWindowFocus: false, // Don't refetch when tab gains focus
    },
  },
});
const PageLoader = () => <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>;

// Redirect component for root path - redirects to org-scoped home
const RootRedirect = lazy(() => import('./components/RootRedirect'));
const App = () => <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ServiceWorkerUpdater />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RouteTracker />
        <NativeAppInitializer />
        <AuthProvider>
          <TimezoneProvider>
            <OrganizationProvider>
              <FeatureFlagsProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public website routes */}
                <Route path="/landing" element={<Navigate to="/" replace />} />
                <Route path="/features" element={<Features />} />
                <Route path="/about" element={<About />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                
                {/* Legal pages */}
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/acceptable-use" element={<AcceptableUse />} />
                <Route path="/dpa" element={<DPA />} />
                <Route path="/cookies" element={<Cookies />} />
                
                {/* Auth routes */}
                <Route path="/auth" element={<Auth />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/pending-approval" element={<PendingApproval />} />
                <Route path="/join" element={<Join />} />
                <Route path="/install" element={<Install />} />
                
                {/* Support pages - public for authenticated users */}
                <Route path="/support" element={<Support />} />
                <Route path="/support/getting-started" element={<SupportGettingStarted />} />
                <Route path="/support/faq" element={<SupportFAQ />} />
                <Route path="/support/features" element={<SupportFeatures />} />
                <Route path="/support/features/:module" element={<SupportModule />} />
                <Route path="/support/features/:module/:slug" element={<SupportArticle />} />
                <Route path="/support/api" element={<SupportAPI />} />
                <Route path="/support/get-help" element={<SupportGetHelp />} />
                
                {/* Root redirect - will redirect to /org/:orgId */}
                <Route path="/" element={<RootRedirect />} />
                
                {/* Organization-scoped routes - uses orgCode (slug) not orgId */}
                <Route path="/org/:orgCode">
                  {/* Onboarding wizard - mandatory before accessing dashboard */}
                  <Route path="onboarding" element={<OrgProtectedRoute withLayout={false}><OrgOnboardingWizard /></OrgProtectedRoute>} />
                  <Route path="onboarding/team" element={<OrgProtectedRoute withLayout={false}><EmployeeOnboardingWizard /></OrgProtectedRoute>} />
                  
                  {/* Team section */}
                  <Route index element={<OrgProtectedRoute><Home /></OrgProtectedRoute>} />
                  <Route path="team" element={<OrgProtectedRoute><Team /></OrgProtectedRoute>} />
                  <Route path="team/offices" element={<OrgProtectedRoute><ManageOffices /></OrgProtectedRoute>} />
                  <Route path="team/bulk-import" element={<OrgProtectedRoute><BulkImport /></OrgProtectedRoute>} />
                  <Route path="team/:id" element={<OrgProtectedRoute><TeamMemberProfile /></OrgProtectedRoute>} />
                  <Route path="team/:id/attendance" element={<OrgProtectedRoute><AttendanceHistory /></OrgProtectedRoute>} />
                  <Route path="team/:id/reviews" element={<OrgProtectedRoute><PerformanceReviews /></OrgProtectedRoute>} />
                  
                  {/* Org-wide views */}
                  <Route path="org-chart" element={<OrgProtectedRoute><OrgChart /></OrgProtectedRoute>} />
                  <Route path="growth" element={<OrgProtectedRoute><Growth /></OrgProtectedRoute>} />
                  <Route path="calendar" element={<OrgProtectedRoute><CalendarPage /></OrgProtectedRoute>} />
                  <Route path="kpi-dashboard" element={<OrgProtectedRoute><TeamKPIDashboard /></OrgProtectedRoute>} />
                  <Route path="kpi/bulk-create" element={<OrgProtectedRoute><BulkKpiCreate /></OrgProtectedRoute>} />
                  <Route path="kpi/generation-history" element={<OrgProtectedRoute><KpiGenerationHistory /></OrgProtectedRoute>} />
                  <Route path="kpi/:kpiId" element={<OrgProtectedRoute><KpiDetail /></OrgProtectedRoute>} />
                  <Route path="leave" element={<OrgProtectedRoute><Leave /></OrgProtectedRoute>} />
                  <Route path="leave-history" element={<OrgProtectedRoute><OrgLeaveHistory /></OrgProtectedRoute>} />
                  <Route path="leave/import" element={<OrgProtectedRoute><BulkLeaveImport /></OrgProtectedRoute>} />
                  <Route path="attendance-history" element={<OrgProtectedRoute><OrgAttendanceHistory /></OrgProtectedRoute>} />
                  
                  {/* Settings & Notifications */}
                  <Route path="settings" element={<OrgProtectedRoute><Settings /></OrgProtectedRoute>} />
                  <Route path="settings/workflow/:templateId" element={<OrgProtectedRoute><WorkflowSettings /></OrgProtectedRoute>} />
                  <Route path="notifications" element={<OrgProtectedRoute><Notifications /></OrgProtectedRoute>} />
                  <Route path="notifications/preferences" element={<OrgProtectedRoute><NotificationPreferences /></OrgProtectedRoute>} />
                  
                  {/* Feature modules */}
                  <Route path="chat" element={<OrgProtectedRoute><FeatureProtectedRoute feature="chat"><Chat /></FeatureProtectedRoute></OrgProtectedRoute>} />
                  <Route path="wiki" element={<OrgProtectedRoute><Wiki /></OrgProtectedRoute>} />
                  <Route path="wiki/edit/:pageId" element={<OrgProtectedRoute><WikiEditPage /></OrgProtectedRoute>} />
                  <Route path="ask-ai" element={<OrgProtectedRoute><FeatureProtectedRoute feature="ask-ai"><AskAI /></FeatureProtectedRoute></OrgProtectedRoute>} />
                  <Route path="tasks" element={<OrgProtectedRoute><FeatureProtectedRoute feature="tasks"><Tasks /></FeatureProtectedRoute></OrgProtectedRoute>} />
                  <Route path="crm" element={<OrgProtectedRoute><FeatureProtectedRoute feature="crm"><CRM /></FeatureProtectedRoute></OrgProtectedRoute>} />
                  <Route path="payroll" element={<OrgProtectedRoute><FeatureProtectedRoute feature="payroll"><Payroll /></FeatureProtectedRoute></OrgProtectedRoute>} />
                  <Route path="workflows" element={<OrgProtectedRoute><FeatureProtectedRoute feature="workflows"><Workflows /></FeatureProtectedRoute></OrgProtectedRoute>} />
                  <Route path="workflows/:workflowId" element={<OrgProtectedRoute><FeatureProtectedRoute feature="workflows"><ApplicationDetail /></FeatureProtectedRoute></OrgProtectedRoute>} />
                  <Route path="my-payslips" element={<OrgProtectedRoute><FeatureProtectedRoute feature="payroll"><MyPayslips /></FeatureProtectedRoute></OrgProtectedRoute>} />
                  
                  {/* Hiring module */}
                  <Route path="hiring" element={<OrgProtectedRoute><FeatureProtectedRoute feature="hiring"><HiringDashboard /></FeatureProtectedRoute></OrgProtectedRoute>} />
                  <Route path="hiring/jobs" element={<OrgProtectedRoute><FeatureProtectedRoute feature="hiring"><JobsList /></FeatureProtectedRoute></OrgProtectedRoute>} />
                  <Route path="hiring/jobs/new" element={<OrgProtectedRoute><FeatureProtectedRoute feature="hiring"><JobCreate /></FeatureProtectedRoute></OrgProtectedRoute>} />
                  <Route path="hiring/jobs/:jobSlug" element={<OrgProtectedRoute><FeatureProtectedRoute feature="hiring"><JobDetail /></FeatureProtectedRoute></OrgProtectedRoute>} />
                  <Route path="hiring/candidates" element={<OrgProtectedRoute><FeatureProtectedRoute feature="hiring"><CandidatesList /></FeatureProtectedRoute></OrgProtectedRoute>} />
                  <Route path="hiring/analytics" element={<OrgProtectedRoute><FeatureProtectedRoute feature="hiring"><HiringAnalytics /></FeatureProtectedRoute></OrgProtectedRoute>} />
                </Route>
                
                {/* Super Admin Portal - separate from org context */}
                <Route path="/super-admin" element={<Navigate to="/super-admin/analytics" replace />} />
                <Route path="/super-admin/analytics" element={<SuperAdminProtectedRoute>
                    <SuperAdminAnalytics />
                  </SuperAdminProtectedRoute>} />
                <Route path="/super-admin/organisations" element={<SuperAdminProtectedRoute>
                    <SuperAdminOrganisations />
                  </SuperAdminProtectedRoute>} />
                <Route path="/super-admin/organisations/:orgId" element={<SuperAdminProtectedRoute>
                    <SuperAdminOrganisationDetail />
                  </SuperAdminProtectedRoute>} />
                <Route path="/super-admin/users" element={<SuperAdminProtectedRoute>
                    <SuperAdminUsers />
                  </SuperAdminProtectedRoute>} />
                <Route path="/super-admin/payments" element={<SuperAdminProtectedRoute>
                    <SuperAdminPayments />
                  </SuperAdminProtectedRoute>} />
                <Route path="/super-admin/blog" element={<SuperAdminProtectedRoute>
                    <SuperAdminBlog />
                  </SuperAdminProtectedRoute>} />
                <Route path="/super-admin/blog/new" element={<SuperAdminProtectedRoute>
                    <SuperAdminBlogEditor />
                  </SuperAdminProtectedRoute>} />
                <Route path="/super-admin/blog/:postId/edit" element={<SuperAdminProtectedRoute>
                    <SuperAdminBlogEditor />
                  </SuperAdminProtectedRoute>} />
                <Route path="/super-admin/testing" element={<SuperAdminProtectedRoute>
                    <SuperAdminTesting />
                  </SuperAdminProtectedRoute>} />
                <Route path="/super-admin/customer-success" element={<SuperAdminProtectedRoute>
                    <SuperAdminCustomerSuccess />
                  </SuperAdminProtectedRoute>} />
                <Route path="/super-admin/customer-success/:requestId" element={<SuperAdminProtectedRoute>
                    <SuperAdminCustomerSuccess />
                  </SuperAdminProtectedRoute>} />
                <Route path="/super-admin/documentation" element={<SuperAdminProtectedRoute>
                    <SuperAdminDocumentation />
                  </SuperAdminProtectedRoute>} />
                <Route path="/super-admin/error-logs" element={<SuperAdminProtectedRoute>
                    <SuperAdminErrorLogs />
                  </SuperAdminProtectedRoute>} />
                <Route path="/super-admin/error-logs/:errorId" element={<SuperAdminProtectedRoute>
                    <SuperAdminErrorLogDetail />
                  </SuperAdminProtectedRoute>} />
                <Route path="/super-admin/templates" element={<SuperAdminProtectedRoute>
                    <SuperAdminTemplates />
                  </SuperAdminProtectedRoute>} />
                <Route path="/super-admin/plans/new" element={<SuperAdminProtectedRoute>
                    <SuperAdminPlanEditor />
                  </SuperAdminProtectedRoute>} />
                <Route path="/super-admin/plans/:planId/edit" element={<SuperAdminProtectedRoute>
                    <SuperAdminPlanEditor />
                  </SuperAdminProtectedRoute>} />
                
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
            </FeatureFlagsProvider>
          </OrganizationProvider>
        </TimezoneProvider>
      </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>;
export default App;