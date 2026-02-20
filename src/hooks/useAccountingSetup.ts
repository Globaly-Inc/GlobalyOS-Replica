import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import type { AccountingSetup, AccountingLedger } from '@/types/accounting';

export const useAccountingSetup = () => {
  const { currentOrg } = useOrganization();

  const { data: setup, isLoading: setupLoading } = useQuery({
    queryKey: ['accounting-setup', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_setups')
        .select('*')
        .eq('organization_id', currentOrg!.id)
        .eq('status', 'active')
        .maybeSingle();
      if (error) throw error;
      return data as AccountingSetup | null;
    },
    enabled: !!currentOrg?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: ledger, isLoading: ledgerLoading } = useQuery({
    queryKey: ['accounting-ledger', setup?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_ledgers')
        .select('*')
        .eq('setup_id', setup!.id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data as AccountingLedger | null;
    },
    enabled: !!setup?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: setupOfficeIds = [] } = useQuery({
    queryKey: ['accounting-setup-offices', setup?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounting_setup_offices')
        .select('office_id')
        .eq('setup_id', setup!.id);
      if (error) throw error;
      return (data || []).map((r: { office_id: string }) => r.office_id);
    },
    enabled: !!setup?.id,
    staleTime: 5 * 60 * 1000,
  });

  const isSetupComplete = !!setup && setup.status === 'active' && !!ledger;
  const loading = setupLoading || ledgerLoading;

  return {
    setup,
    ledger,
    setupOfficeIds,
    isSetupComplete,
    loading,
  };
};
