import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useIsEmployeeExempt = (employeeId?: string) => {
  return useQuery({
    queryKey: ['employee-exempt', employeeId],
    queryFn: async () => {
      const { data } = await supabase
        .from('office_attendance_exemptions')
        .select('id')
        .eq('employee_id', employeeId!)
        .limit(1);
      return (data?.length ?? 0) > 0;
    },
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
  });
};
