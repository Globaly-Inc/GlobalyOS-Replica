import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'admin' | 'hr' | 'user' | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
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
        .order('role', { ascending: true }) // admin < hr < user alphabetically
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking role:', error);
      }

      if (data) {
        setRole(data.role as UserRole);
      } else {
        setRole('user'); // Default to user if no role assigned
      }
    } catch (error) {
      console.error('Error in checkUserRole:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = role === 'admin';
  const isHR = role === 'hr' || role === 'admin'; // Admins have HR privileges
  const hasRole = (checkRole: UserRole) => {
    if (checkRole === 'admin') return role === 'admin';
    if (checkRole === 'hr') return role === 'hr' || role === 'admin';
    return true; // Everyone is at least a user
  };

  return { role, loading, isAdmin, isHR, hasRole, refetch: checkUserRole };
};
