import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export type UserRole = 'owner' | 'admin' | 'hr' | 'user' | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const { currentOrg } = useOrganization();

  useEffect(() => {
    if (currentOrg) {
      checkUserRole();
    }
  }, [currentOrg?.id]);

  const checkUserRole = async () => {
    if (!currentOrg) {
      setLoading(false);
      return;
    }

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
        .eq('organization_id', currentOrg.id)
        .order('role', { ascending: true }) // admin < hr < owner < user alphabetically
        .limit(1)
        .maybeSingle();

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

  // Role hierarchy: owner > admin > hr > user
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || role === 'owner'; // Owner has admin privileges
  const isHR = role === 'hr' || role === 'admin' || role === 'owner'; // Owner and Admin have HR privileges
  
  const hasRole = (checkRole: UserRole) => {
    if (checkRole === 'owner') return role === 'owner';
    if (checkRole === 'admin') return role === 'admin' || role === 'owner';
    if (checkRole === 'hr') return role === 'hr' || role === 'admin' || role === 'owner';
    return true; // Everyone is at least a user
  };

  return { role, loading, isOwner, isAdmin, isHR, hasRole, refetch: checkUserRole };
};
