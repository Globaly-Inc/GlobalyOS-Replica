import { Navigate, useParams } from 'react-router-dom';
import { useAgentAuth } from '@/hooks/useAgentAuth';

interface AgentProtectedRouteProps {
  children: React.ReactNode;
}

export const AgentProtectedRoute = ({ children }: AgentProtectedRouteProps) => {
  const { isAuthenticated, loading } = useAgentAuth();
  const { orgCode } = useParams<{ orgCode: string }>();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/agent/${orgCode}/login`} replace />;
  }

  return <>{children}</>;
};
