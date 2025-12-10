import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [hasOrg, setHasOrg] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const checkAccess = async (currentSession: Session | null) => {
      if (!currentSession) {
        setHasOrg(null);
        setLoading(false);
        return;
      }

      // Check if user has any organization membership
      const { data: orgMembers } = await supabase
        .from("organization_members")
        .select("id")
        .eq("user_id", currentSession.user.id)
        .limit(1);

      setHasOrg(orgMembers && orgMembers.length > 0);
      setLoading(false);
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session) {
          // Use setTimeout to avoid potential deadlock
          setTimeout(() => checkAccess(session), 0);
        } else {
          setHasOrg(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkAccess(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/landing" replace />;
  }

  // Allow onboarding page even without org
  if (location.pathname === "/onboarding") {
    return <>{children}</>;
  }

  // Redirect to onboarding if no organization
  if (hasOrg === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};
