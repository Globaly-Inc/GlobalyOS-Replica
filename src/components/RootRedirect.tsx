/**
 * Root path component
 * Shows Landing page for unauthenticated users
 * Redirects authenticated users to their organization (onboarding guard handles the rest)
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import Landing from '@/pages/Landing';

const RootRedirect = () => {
  const { session, loading: authLoading } = useAuth();
  const { currentOrg, loading: orgLoading } = useOrganization();
  
  // Still loading
  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  
  // Authenticated with org - redirect to org home (onboarding guard in OrgProtectedRoute handles the rest)
  if (session && currentOrg) {
    return <Navigate to={`/org/${currentOrg.slug}`} replace />;
  }
  
  // Not authenticated - show landing
  return <Landing />;
};

export default RootRedirect;
