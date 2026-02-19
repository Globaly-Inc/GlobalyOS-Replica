import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";

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
  is_internal_apply: boolean;
}

export type AppliedJobsMap = Record<string, { appliedAt: string }>;

export const useInternalVacancies = () => {
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id;
  const { data: employee } = useCurrentEmployee();
  const employeeId = employee?.id;

  const { data: vacancies = [], isLoading } = useQuery({
    queryKey: ['internal-vacancies', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, slug, employment_type, work_model, location, published_at, is_internal_apply, department:departments(name), office:offices(name, city)')
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

  // Fetch jobs the current employee has already applied to, with application date
  const { data: appliedJobsMap = {} } = useQuery<AppliedJobsMap>({
    queryKey: ['internal-vacancies-applied', orgId, employeeId],
    queryFn: async () => {
      if (!orgId || !employeeId) return {};
      const { data, error } = await supabase
        .from('candidate_applications')
        .select('job_id, created_at, candidates!inner(employee_id)')
        .eq('organization_id', orgId)
        .eq('candidates.employee_id', employeeId);

      if (error) {
        console.error('Error fetching applied jobs:', error);
        return {};
      }
      return (data ?? []).reduce<AppliedJobsMap>((acc, row: any) => {
        acc[row.job_id as string] = { appliedAt: row.created_at as string };
        return acc;
      }, {});
    },
    enabled: !!orgId && !!employeeId,
    staleTime: 2 * 60 * 1000,
  });

  return { vacancies, isLoading, appliedJobsMap };
};
