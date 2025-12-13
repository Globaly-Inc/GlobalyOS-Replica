import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useSuperAdmin = () => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSuperAdmin();
  }, []);

  const checkSuperAdmin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'super_admin')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking super admin:', error);
      }

      setIsSuperAdmin(!!data);
    } catch (error) {
      console.error('Error in checkSuperAdmin:', error);
    } finally {
      setLoading(false);
    }
  };

  return { isSuperAdmin, loading, refetch: checkSuperAdmin };
};
