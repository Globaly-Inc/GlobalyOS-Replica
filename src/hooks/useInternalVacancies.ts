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
  // Strategy: first get the candidate record for this employee, then fetch their applications
  const { data: appliedJobsMap = {} } = useQuery<AppliedJobsMap>({
    queryKey: ['internal-vacancies-applied', orgId, employeeId],
    queryFn: async () => {
      if (!orgId || !employeeId) return {};

      // Step 1: Find the candidate record linked to this employee
      const { data: candidateData, error: candError } = await supabase
        .from('candidates')
        .select('id')
        .eq('organization_id', orgId)
        .eq('employee_id', employeeId)
        .limit(1)
        .maybeSingle();

      if (candError) {
        console.error('Error fetching candidate record:', candError);
        return {};
      }
      if (!candidateData) return {};

      // Step 2: Fetch all applications for this candidate
      const { data, error } = await supabase
        .from('candidate_applications')
        .select('job_id, created_at')
        .eq('organization_id', orgId)
        .eq('candidate_id', candidateData.id);

      if (error) {
        console.error('Error fetching applied jobs:', error);
        return {};
      }
      return (data ?? []).reduce<AppliedJobsMap>((acc, row) => {
        acc[row.job_id] = { appliedAt: row.created_at ?? '' };
        return acc;
      }, {});
    },
    enabled: !!orgId && !!employeeId,
    staleTime: 2 * 60 * 1000,
  });

  return { vacancies, isLoading, appliedJobsMap };
};
