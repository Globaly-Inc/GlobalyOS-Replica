/**
 * Organization-scoped protected route component
 * Validates both authentication and organization access
 * Resolves orgCode (slug) to orgId server-side for security
 * Enforces mandatory onboarding before accessing dashboard
 */

import { useEffect } from 'react';
import { Navigate, useParams, useLocation } from 'react-router-dom';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from './Layout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  const { currentOrg, organizations, loading: orgLoading, switchOrganization } = useOrganization();

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

  // Show loading while auth or org data is being fetched
  if (authLoading || orgLoading || onboardingLoading) {
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

  // Check onboarding status - redirect to onboarding if not complete
  const isOnboardingRoute = location.pathname.includes('/onboarding');
  if (onboardingStatus && !onboardingStatus.org_onboarding_completed && !isOnboardingRoute) {
    return <Navigate to={`/org/${currentOrg.slug}/onboarding`} replace />;
  }

  // Everything is valid - render children
  const content = <>{children}</>;
  
  return withLayout ? <Layout>{content}</Layout> : content;
};

export default OrgProtectedRoute;
