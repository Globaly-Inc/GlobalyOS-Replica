/**
 * Organization-scoped protected route component
 * Validates both authentication and organization access
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
  const { orgId } = useParams<{ orgId: string }>();
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

  // Handle organization switching when URL org differs from current
  useEffect(() => {
    if (!orgLoading && orgId && currentOrg && orgId !== currentOrg.id) {
      // Check if user has access to the requested org
      const hasAccess = organizations.some(org => org.id === orgId);
      if (hasAccess) {
        switchOrganization(orgId);
      }
    }
  }, [orgId, currentOrg, organizations, orgLoading, switchOrganization]);

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

  // No organizations - redirect to create one
  if (organizations.length === 0) {
    return <Navigate to="/signup" replace />;
  }

  // If orgId in URL doesn't match any user's orgs, show access denied or redirect
  if (orgId && !organizations.some(org => org.id === orgId)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center max-w-md p-6">
          <h1 className="text-2xl font-semibold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You don&apos;t have access to this organization.
          </p>
          <a 
            href={`/org/${currentOrg?.id || organizations[0]?.id}`}
            className="text-primary hover:underline"
          >
            Go to your organization
          </a>
        </div>
      </div>
    );
  }

  // No org in URL but we have a current org - redirect to include org in URL
  if (!orgId && currentOrg) {
    const targetPath = `/org/${currentOrg.id}${location.pathname}`;
    return <Navigate to={targetPath} replace />;
  }

  // Everything is valid - render children
  const content = <>{children}</>;
  
  return withLayout ? <Layout>{content}</Layout> : content;
};

export default OrgProtectedRoute;
