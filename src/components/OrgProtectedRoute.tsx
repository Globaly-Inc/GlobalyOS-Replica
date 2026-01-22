/**
 * Organization-scoped protected route component
 * Validates both authentication and organization access
 * Resolves orgCode (slug) to orgId server-side for security
 * Enforces mandatory onboarding before accessing dashboard
 */

import { useEffect, useRef } from 'react';
import { Navigate, useParams, useLocation } from 'react-router-dom';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from './Layout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface LocationState {
  justCompletedOrgOnboarding?: boolean;
  justCompletedEmployeeOnboarding?: boolean;
}

interface OrgProtectedRouteProps {
  children: React.ReactNode;
  /** If true, wraps children in Layout component */
  withLayout?: boolean;
}

export const OrgProtectedRoute = ({ 
  children, 
  withLayout = true,
}: OrgProtectedRouteProps) => {
  const { session, loading: authLoading } = useAuth();
  const { orgCode } = useParams<{ orgCode: string }>();
  const location = useLocation();
  const locationState = location.state as LocationState | null;
  const { currentOrg, organizations, loading: orgLoading, switchOrganization } = useOrganization();
  
  // Track "just completed" state to prevent redirect flickering
  const justCompletedOrgRef = useRef(false);
  const justCompletedEmployeeRef = useRef(false);
  
  // Handle "just completed org onboarding" state from navigation
  useEffect(() => {
    if (locationState?.justCompletedOrgOnboarding) {
      justCompletedOrgRef.current = true;
      // Clear flag after queries have had time to update
      const timer = setTimeout(() => {
        justCompletedOrgRef.current = false;
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [locationState?.justCompletedOrgOnboarding]);

  // Handle "just completed employee onboarding" state from navigation
  useEffect(() => {
    if (locationState?.justCompletedEmployeeOnboarding) {
      justCompletedEmployeeRef.current = true;
      // Clear flag after queries have had time to update
      const timer = setTimeout(() => {
        justCompletedEmployeeRef.current = false;
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [locationState?.justCompletedEmployeeOnboarding]);

  // Check onboarding status for the current organization
  const { data: onboardingStatus, isLoading: onboardingLoading } = useQuery({
    queryKey: ['org-onboarding-check', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return null;
      const { data } = await supabase
        .from('organizations')
        .select('org_onboarding_completed')
        .eq('id', currentOrg.id)
        .single();
      return data;
    },
    enabled: !!currentOrg?.id,
    staleTime: 30 * 1000, // Cache for 30 seconds - onboarding status rarely changes mid-session
  });

  // Check employee onboarding status for all employees
  const { data: employeeOnboardingStatus, isLoading: employeeOnboardingLoading } = useQuery({
    queryKey: ['employee-onboarding-check', session?.user?.id, currentOrg?.id],
    queryFn: async () => {
      if (!session?.user?.id || !currentOrg?.id) return null;
      const { data } = await supabase
        .from('employees')
        .select('id, is_new_hire, employee_onboarding_completed')
        .eq('user_id', session.user.id)
        .eq('organization_id', currentOrg.id)
        .single();
      return data;
    },
    enabled: !!session?.user?.id && !!currentOrg?.id,
    staleTime: 30 * 1000, // Cache for 30 seconds - onboarding status rarely changes mid-session
  });

  // Handle organization switching when URL orgCode differs from current org's slug
  useEffect(() => {
    if (orgLoading || !orgCode) return;

    // If we don't have a current org yet, pick the org that matches the URL
    if (!currentOrg) {
      const targetOrg = organizations.find((org) => org.slug === orgCode);
      if (targetOrg) {
        switchOrganization(targetOrg.id);
      }
      return;
    }

    // If we do have a current org and it doesn't match, switch to the URL org
    if (orgCode !== currentOrg.slug) {
      const targetOrg = organizations.find((org) => org.slug === orgCode);
      if (targetOrg) {
        switchOrganization(targetOrg.id);
      }
    }
  }, [orgCode, currentOrg, organizations, orgLoading, switchOrganization]);


  // Auto-select a fallback org if we have orgs but currentOrg is not set yet
  useEffect(() => {
    if (authLoading || orgLoading) return;
    if (!session) return;
    if (currentOrg?.id) return;

    const fallbackOrgId = organizations[0]?.id;
    if (fallbackOrgId) {
      switchOrganization(fallbackOrgId);
    }
  }, [authLoading, orgLoading, session, currentOrg?.id, organizations, switchOrganization]);

  // Wait for auth first, then org, then only wait for onboarding queries if we have valid org
  const isAuthOrOrgLoading = authLoading || orgLoading;
  const isOnboardingQueriesLoading = currentOrg?.id && (onboardingLoading || employeeOnboardingLoading);
  
  if (isAuthOrOrgLoading || isOnboardingQueriesLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to home (landing)
  if (!session) {
    return <Navigate to="/" replace />;
  }

  // Ensure we have a valid current organization before proceeding
  // This prevents queries with undefined org IDs
  if (!currentOrg?.id) {
    // If we have organizations but no current one selected, auto-select first
    if (organizations.length > 0) {
      // The switchOrganization should handle this, but show loading while it processes
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Setting up organization...</p>
          </div>
        </div>
      );
    }
    // No organizations at all - redirect to signup
    console.warn('[OrgProtectedRoute] No organizations found for authenticated user');
    return <Navigate to="/signup" replace />;
  }

  // If orgCode in URL doesn't match any user's orgs (by slug), show access denied
  if (orgCode && !organizations.some(org => org.slug === orgCode)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md p-6">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don&apos;t have access to this organization.
          </p>
          <a 
            href={`/org/${currentOrg?.slug || organizations[0]?.slug}`}
            className="text-primary hover:underline"
          >
            Go to your organization
          </a>
        </div>
      </div>
    );
  }

  // No org in URL but we have a current org - redirect to include orgCode in URL
  if (!orgCode && currentOrg) {
    const targetPath = `/org/${currentOrg.slug}${location.pathname}`;
    return <Navigate to={targetPath} replace />;
  }

  // Route classification
  const isAnyOnboardingRoute = location.pathname.includes('/onboarding');
  const isEmployeeOnboardingRoute = location.pathname.includes('/onboarding/team');
  const isDemoOrg = currentOrg.slug === 'globalyhub';

  // STEP 1: Check org onboarding status first
  // Skip this check if we're on ANY onboarding route (including /onboarding/team)
  if (onboardingStatus && !onboardingStatus.org_onboarding_completed && !isAnyOnboardingRoute && !isDemoOrg && !justCompletedOrgRef.current) {
    return <Navigate to={`/org/${currentOrg.slug}/onboarding`} replace />;
  }

  // STEP 2: Only check employee onboarding AFTER org onboarding is complete
  // This prevents the redirect loop between org and employee onboarding
  // Applies to ALL employees who haven't completed onboarding
  // Skip check if we just completed org onboarding (prevents flickering)
  if (
    !isDemoOrg &&
    !isEmployeeOnboardingRoute &&
    !justCompletedOrgRef.current &&
    !justCompletedEmployeeRef.current &&
    onboardingStatus?.org_onboarding_completed === true &&
    employeeOnboardingStatus?.employee_onboarding_completed === false
  ) {
    return <Navigate to={`/org/${currentOrg.slug}/onboarding/team`} replace />;
  }

  // Everything is valid - render children
  const content = <>{children}</>;
  
  return withLayout ? <Layout>{content}</Layout> : content;
};

export default OrgProtectedRoute;
