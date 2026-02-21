import { Navigate, useParams } from 'react-router-dom';
import { usePortalAuth } from '@/hooks/usePortalAuth';

interface PortalProtectedRouteProps {
  children: React.ReactNode;
}

export const PortalProtectedRoute = ({ children }: PortalProtectedRouteProps) => {
  const { isAuthenticated, loading } = usePortalAuth();
  const { orgCode } = useParams<{ orgCode: string }>();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/org/${orgCode}/portal/login`} replace />;
  }

  return <>{children}</>;
};
