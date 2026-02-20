import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAccountingSetup } from '@/hooks/useAccountingSetup';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

interface OfficeSelectorProps {
  value: string | 'all';
  onChange: (officeId: string | 'all') => void;
}

export const OfficeSelector = ({ value, onChange }: OfficeSelectorProps) => {
  const { currentOrg } = useOrganization();
  const { setup, setupOfficeIds } = useAccountingSetup();

  const { data: offices = [] } = useQuery({
    queryKey: ['offices-for-accounting', currentOrg?.id, setup?.scope_type],
    queryFn: async () => {
      let query = supabase
        .from('offices')
        .select('id, name')
        .eq('organization_id', currentOrg!.id)
        .order('name');

      // If not ORG_WIDE, filter to only setup offices
      if (setup?.scope_type !== 'ORG_WIDE' && setupOfficeIds.length > 0) {
        query = query.in('id', setupOfficeIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id && !!setup,
    staleTime: 5 * 60 * 1000,
  });

  if (offices.length <= 1) return null;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="All Offices" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Offices (Consolidated)</SelectItem>
        {offices.map((office) => (
          <SelectItem key={office.id} value={office.id}>
            {office.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
