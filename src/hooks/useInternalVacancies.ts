import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

export interface InternalVacancy {
  id: string;
  title: string;
  slug: string | null;
  employment_type: string | null;
  work_model: string | null;
  location: string | null;
  published_at: string | null;
  department: { name: string } | null;
  office: { name: string; city: string | null } | null;
}

export const useInternalVacancies = () => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;

  const { data: vacancies = [], isLoading } = useQuery({
    queryKey: ['internal-vacancies', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, slug, employment_type, work_model, location, published_at, department:departments(name), office:offices(name, city)')
        .eq('organization_id', orgId)
        .eq('status', 'open')
        .eq('is_internal_visible', true)
        .order('published_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching internal vacancies:', error);
        return [];
      }
      return (data ?? []) as unknown as InternalVacancy[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  return { vacancies, isLoading };
};
