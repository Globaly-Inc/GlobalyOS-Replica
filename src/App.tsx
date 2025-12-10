import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { OrganizationProvider } from "@/hooks/useOrganization";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Team from "./pages/Team";
import TeamMemberProfile from "./pages/TeamMemberProfile";
import InviteTeamMember from "./pages/InviteTeamMember";
import OrgChart from "./pages/OrgChart";
import Kudos from "./pages/Kudos";
import Growth from "./pages/Growth";
import Auth from "./pages/Auth";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Settings from "./pages/Settings";
import Join from "./pages/Join";
import LeaveHistory from "./pages/LeaveHistory";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <OrganizationProvider>
          <Routes>
            <Route path="/landing" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/join" element={<Join />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
            <Route path="/team/invite" element={<ProtectedRoute><InviteTeamMember /></ProtectedRoute>} />
            <Route path="/team/:id" element={<ProtectedRoute><TeamMemberProfile /></ProtectedRoute>} />
            <Route path="/team/:id/leave-history" element={<ProtectedRoute><LeaveHistory /></ProtectedRoute>} />
            <Route path="/org-chart" element={<ProtectedRoute><OrgChart /></ProtectedRoute>} />
            <Route path="/kudos" element={<ProtectedRoute><Kudos /></ProtectedRoute>} />
            <Route path="/growth" element={<ProtectedRoute><Growth /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </OrganizationProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
