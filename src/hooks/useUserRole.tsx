import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "./useOrganization";

export type UserRole = 'owner' | 'admin' | 'hr' | 'member' | null;

const fetchUserRole = async (orgId: string): Promise<UserRole> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', orgId)
    .order('role', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking role:', error);
    return 'member';
  }
  
  return (data?.role as UserRole) || 'member';
};

export const useUserRole = () => {
  const { currentOrg } = useOrganization();
  const queryClient = useQueryClient();

  const { data: role = null, isLoading: loading } = useQuery({
    queryKey: ['user-role', currentOrg?.id],
    queryFn: () => fetchUserRole(currentOrg!.id),
    enabled: !!currentOrg?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes - role rarely changes
    gcTime: 10 * 60 * 1000,
  });

  // Role hierarchy: owner > admin > hr > member
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || role === 'owner';
  const isHR = role === 'hr' || role === 'admin' || role === 'owner';
  
  const hasRole = (checkRole: UserRole) => {
    if (checkRole === 'owner') return role === 'owner';
    if (checkRole === 'admin') return role === 'admin' || role === 'owner';
    if (checkRole === 'hr') return role === 'hr' || role === 'admin' || role === 'owner';
    if (checkRole === 'member') return true;
    return true;
  };

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ['user-role', currentOrg?.id] });
  };

  return { role, loading, isOwner, isAdmin, isHR, hasRole, refetch };
};
