import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, ArrowRight, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentOrg, refreshOrganizations } = useOrganization();
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);
      await refreshOrganizations();
    };
    getUser();
  }, [navigate, refreshOrganizations]);

  const handleSetupAsAdmin = async () => {
    if (!userId || !currentOrg) return;
    
    setLoading(true);
    try {
      // Get profile data
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userId)
        .single();

      // Create employee record
      const { data: employee, error: empError } = await supabase
        .from("employees")
        .insert({
          user_id: userId,
          organization_id: currentOrg.id,
          position: "Administrator",
          department: "Management",
          join_date: new Date().toISOString().split("T")[0],
          status: "active",
        })
        .select()
        .single();

      if (empError) throw empError;

      // Assign admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: userId,
          organization_id: currentOrg.id,
          role: "admin",
        });

      if (roleError) throw roleError;

      toast({
        title: "Setup complete!",
        description: "You're now set up as an admin.",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Setup failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary-dark to-primary p-4">
      <Card className="w-full max-w-lg p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark mb-4">
            <Users className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Welcome to TeamHub!</h1>
          <p className="text-muted-foreground mt-2">
            Your organization <strong>{currentOrg?.name}</strong> is ready.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Organization Created</p>
              <p className="text-sm text-muted-foreground">Your workspace is set up and ready to use.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Account Verified</p>
              <p className="text-sm text-muted-foreground">Your email has been verified successfully.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Complete your setup by adding yourself as the first administrator.
          </p>
          <Button 
            onClick={handleSetupAsAdmin} 
            className="w-full gap-2" 
            disabled={loading || !currentOrg}
          >
            {loading ? "Setting up..." : "Complete Setup"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Onboarding;
