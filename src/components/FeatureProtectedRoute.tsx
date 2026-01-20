import { Navigate } from 'react-router-dom';
import { useFeatureFlags, FeatureName } from '@/hooks/useFeatureFlags';
import { useOrgNavigation } from '@/hooks/useOrgNavigation';

interface FeatureProtectedRouteProps {
  feature: FeatureName;
  children: React.ReactNode;
}

/**
 * Wrapper component that protects routes based on feature flags.
 * Redirects to the org home page if the feature is not enabled.
 */
export const FeatureProtectedRoute = ({ feature, children }: FeatureProtectedRouteProps) => {
  const { isEnabled, loading } = useFeatureFlags();
  const { orgCode } = useOrgNavigation();

  // Show nothing while loading to prevent flash
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to org home if feature is disabled
  if (!isEnabled(feature)) {
    return <Navigate to={`/org/${orgCode}`} replace />;
  }

  return <>{children}</>;
};
