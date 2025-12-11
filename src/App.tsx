import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { OrganizationProvider } from "@/hooks/useOrganization";
import Landing from "./pages/Landing";
import { ProtectedRoute } from "./components/ProtectedRoute";

// Lazy load pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const Team = lazy(() => import("./pages/Team"));
const TeamMemberProfile = lazy(() => import("./pages/TeamMemberProfile"));
const InviteTeamMember = lazy(() => import("./pages/InviteTeamMember"));
const OrgChart = lazy(() => import("./pages/OrgChart"));
const Growth = lazy(() => import("./pages/Growth"));
const Auth = lazy(() => import("./pages/Auth"));
const Signup = lazy(() => import("./pages/Signup"));
const Settings = lazy(() => import("./pages/Settings"));
const Join = lazy(() => import("./pages/Join"));
const LeaveHistory = lazy(() => import("./pages/LeaveHistory"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <OrganizationProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/landing" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/join" element={<Join />} />
              <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
              <Route path="/team/invite" element={<ProtectedRoute><InviteTeamMember /></ProtectedRoute>} />
              <Route path="/team/:id" element={<ProtectedRoute><TeamMemberProfile /></ProtectedRoute>} />
              <Route path="/team/:id/leave-history" element={<ProtectedRoute><LeaveHistory /></ProtectedRoute>} />
              <Route path="/org-chart" element={<ProtectedRoute><OrgChart /></ProtectedRoute>} />
              <Route path="/growth" element={<ProtectedRoute><Growth /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </OrganizationProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
