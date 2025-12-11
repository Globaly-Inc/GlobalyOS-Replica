import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Lock } from "lucide-react";

const Signup = () => {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-dark to-primary p-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-muted to-muted/80 mb-4">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Sign Up Disabled</h1>
          <p className="text-muted-foreground mt-2">
            New account registration is currently disabled.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            If you already have an account, please sign in below.
          </p>
          
          <Button asChild className="w-full">
            <Link to="/auth">Sign In</Link>
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Need access? Contact your administrator.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Signup;
