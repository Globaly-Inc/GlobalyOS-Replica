/**
 * Organization-scoped protected route component
 * Validates both authentication and organization access
 * Resolves orgCode (slug) to orgId server-side for security
 */

import { useEffect, useState } from 'react';
import { Navigate, useParams, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { useOrganization } from '@/hooks/useOrganization';
import { Layout } from './Layout';

interface OrgProtectedRouteProps {
  children: React.ReactNode;
  /** If true, wraps children in Layout component */
  withLayout?: boolean;
}

export const OrgProtectedRoute = ({ 
  children, 
  withLayout = true,
}: OrgProtectedRouteProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { orgCode } = useParams<{ orgCode: string }>();
  const location = useLocation();
  const { currentOrg, organizations, loading: orgLoading, switchOrganization } = useOrganization();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle organization switching when URL orgCode differs from current org's slug
  useEffect(() => {
    if (!orgLoading && orgCode && currentOrg && orgCode !== currentOrg.slug) {
      // Find the org by slug and switch to it
      const targetOrg = organizations.find(org => org.slug === orgCode);
      if (targetOrg) {
        switchOrganization(targetOrg.id);
      }
    }
  }, [orgCode, currentOrg, organizations, orgLoading, switchOrganization]);

  // Show loading while auth or org data is being fetched
  if (loading || orgLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to landing
  if (!session) {
    return <Navigate to="/landing" replace />;
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

  // Everything is valid - render children
  const content = <>{children}</>;
  
  return withLayout ? <Layout>{content}</Layout> : content;
};

export default OrgProtectedRoute;
