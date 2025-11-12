import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield } from "lucide-react";

export const AdminSetup = () => {
  const [hasRole, setHasRole] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking role:', error);
      }

      setHasRole(!!data);
    } catch (error) {
      console.error('Error in checkUserRole:', error);
    }
  };

  const setupAsAdmin = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      // Try to insert admin role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: user.id, role: 'admin' });

      if (error) {
        console.error('Setup error:', error);
        toast.error("Failed to setup admin role. An admin may already exist.");
      } else {
        toast.success("Admin role assigned successfully!");
        setHasRole(true);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Don't show if user already has a role
  if (hasRole === true || hasRole === null) return null;

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          First Time Setup
        </CardTitle>
        <CardDescription>
          It looks like this is your first time here. Set yourself up as an administrator to manage the HR system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={setupAsAdmin} disabled={loading}>
          {loading ? "Setting up..." : "Become Admin"}
        </Button>
      </CardContent>
    </Card>
  );
};
