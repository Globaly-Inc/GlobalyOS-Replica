/**
 * Root path redirect component
 * Redirects authenticated users to their org-scoped home page using orgCode (slug)
 */

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';

const RootRedirect = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const { currentOrg, loading: orgLoading } = useOrganization();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
  }, []);

  // Still loading auth state
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not authenticated - go to landing
  if (!isAuthenticated) {
    return <Navigate to="/landing" replace />;
  }

  // Still loading org data
  if (orgLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Has org - redirect to org-scoped home using slug (orgCode)
  if (currentOrg) {
    return <Navigate to={`/org/${currentOrg.slug}`} replace />;
  }

  // No org - go to signup to create one
  return <Navigate to="/signup" replace />;
};

export default RootRedirect;
