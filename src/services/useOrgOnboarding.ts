/**
 * Organization Onboarding Service
 * Handles wizard data persistence and completion logic
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { DEFAULT_LEAVE_TYPES } from '@/constants/defaultLeaveTypes';

export interface OrgOnboardingData {
  id: string;
  organization_id: string;
  owner_user_id: string | null;
  current_step: number;
  owner_profile?: {
    position?: string;
    department?: string;
    join_date?: string;
    date_of_birth?: string | null;
    avatar_url?: string;
    office_id?: string;
  };
  organization_info: {
    name?: string;
    logo_url?: string;
    country?: string;
    timezone?: string;
    currency?: string;
    website?: string;
    industry?: string;
    company_size?: string;
    business_address?: string;
    business_address_components?: { [key: string]: string | number | boolean | null } | null;
    legal_business_name?: string;
    business_registration_number?: string;
  };
  offices: Array<{
    id?: string;
    name: string;
    address: string;
    address_components?: {
      country?: string;
      country_code?: string;
      city?: string;
      postal_code?: string;
      lat?: number;
      lng?: number;
    };
  }>;
  departments_roles?: {
    departments: string[];
    positions: Array<{ name: string; department: string }>;
  };
  team_members: Array<{
    email: string;
    full_name: string;
    office_id?: string;
    department?: string;
    position?: string;
    role: 'admin' | 'hr' | 'manager' | 'member';
  }>;
  enabled_features: string[];
  hr_settings: {
    work_week_days?: string[];
    working_hours_per_day?: number;
    default_leave_policy?: string;
    default_onboarding_workflow?: string;
  };
  skipped: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// New step order: Welcome+Features, Org, Offices, Depts/Roles, Profile, Team, Guides, Complete
const ORG_ONBOARDING_STEPS = [
  'welcome',
  'organization-info',
  'offices',
  'departments-roles',
  'owner-profile',
  'team-members',
  'profile-guide',
  'directory-wiki-guide',
  'social-feed-guide',
  'checkin-guide',
  'leave-guide',
  'complete',
] as const;

export type OrgOnboardingStep = typeof ORG_ONBOARDING_STEPS[number];

export const getStepIndex = (step: OrgOnboardingStep): number => {
  return ORG_ONBOARDING_STEPS.indexOf(step);
};

export const getStepName = (index: number): OrgOnboardingStep => {
  return ORG_ONBOARDING_STEPS[index] || 'welcome';
};

/**
 * Fetch current org onboarding data
 */
export function useOrgOnboardingData() {
  const { currentOrg } = useOrganization();
  const { session } = useAuth();

  return useQuery({
    queryKey: ['org-onboarding-data', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      const { data, error } = await supabase
        .from('org_onboarding_data')
        .select('*')
        .eq('organization_id', currentOrg.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as OrgOnboardingData | null;
    },
    enabled: !!currentOrg?.id && !!session,
  });
}

/**
 * Check if org onboarding is completed
 */
export function useOrgOnboardingStatus() {
  const { currentOrg } = useOrganization();
  const { session } = useAuth();

  return useQuery({
    queryKey: ['org-onboarding-status', currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return { completed: true };

      const { data, error } = await supabase
        .from('organizations')
        .select('org_onboarding_completed, org_onboarding_step')
        .eq('id', currentOrg.id)
        .single();

      if (error) throw error;

      return {
        completed: data?.org_onboarding_completed ?? true,
        currentStep: data?.org_onboarding_step ?? 0,
      };
    },
    enabled: !!currentOrg?.id && !!session,
  });
}

/**
 * Initialize org onboarding data
 */
export function useInitOrgOnboarding() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!currentOrg?.id || !session?.user?.id) {
        throw new Error('Missing organization or user');
      }

      // Check if data already exists
      const { data: existing } = await supabase
        .from('org_onboarding_data')
        .select('id')
        .eq('organization_id', currentOrg.id)
        .maybeSingle();

      if (existing) return existing;

      // Create new onboarding data with pre-filled signup data
      const { data, error } = await supabase
        .from('org_onboarding_data')
        .insert({
          organization_id: currentOrg.id,
          owner_user_id: session.user.id,
          current_step: 1,
          organization_info: { 
            name: currentOrg.name,
            country: (currentOrg as any).country || undefined,
            industry: (currentOrg as any).industry || undefined,
            company_size: (currentOrg as any).company_size || undefined,
            business_address: (currentOrg as any).business_address || undefined,
            business_address_components: (currentOrg as any).business_address_components || undefined,
          },
          offices: [],
          team_members: [],
          enabled_features: ['hr', 'feed', 'attendance', 'leave', 'wiki', 'tasks', 'kpi'],
          hr_settings: {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-onboarding-data'] });
    },
  });
}

/**
 * Save step data and optionally advance to next step
 */
export function useSaveOrgOnboardingStep() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async ({
      stepData,
      advanceStep = true,
    }: {
      stepData: Partial<OrgOnboardingData>;
      advanceStep?: boolean;
    }) => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      // Get current data to determine next step
      const { data: current } = await supabase
        .from('org_onboarding_data')
        .select('current_step')
        .eq('organization_id', currentOrg.id)
        .single();

      const nextStep = advanceStep ? (current?.current_step || 0) + 1 : current?.current_step;

      const { data, error } = await supabase
        .from('org_onboarding_data')
        .update({
          ...stepData,
          current_step: nextStep,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', currentOrg.id)
        .select()
        .single();

      if (error) throw error;

      // Also update the org's step tracker
      await supabase
        .from('organizations')
        .update({ org_onboarding_step: nextStep })
        .eq('id', currentOrg.id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-onboarding-data'] });
      queryClient.invalidateQueries({ queryKey: ['org-onboarding-status'] });
    },
  });
}

/**
 * Go back to previous step
 */
export function useGoBackStep() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async () => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      const { data: current } = await supabase
        .from('org_onboarding_data')
        .select('current_step')
        .eq('organization_id', currentOrg.id)
        .single();

      const prevStep = Math.max(1, (current?.current_step || 1) - 1);

      const { data, error } = await supabase
        .from('org_onboarding_data')
        .update({
          current_step: prevStep,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', currentOrg.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-onboarding-data'] });
    },
  });
}

/**
 * Complete org onboarding
 */
export function useCompleteOrgOnboarding() {
  const queryClient = useQueryClient();
  const { currentOrg, refreshOrganizations } = useOrganization();

  return useMutation({
    mutationFn: async ({ skipped = false, onComplete }: { 
      skipped?: boolean; 
      onComplete?: () => void;
    }) => {
      if (!currentOrg?.id) throw new Error('No organization selected');

      // Get pending team members and enabled features from onboarding data
      const { data: onboardingData } = await supabase
        .from('org_onboarding_data')
        .select('team_members, enabled_features, offices')
        .eq('organization_id', currentOrg.id)
        .single();

      const teamMembers = (onboardingData?.team_members as Array<{
        email: string;
        full_name: string;
        position?: string;
        department?: string;
        role?: string;
      }>) || [];
      
      const enabledFeatures = (onboardingData?.enabled_features as string[]) || [];
      const offices = (onboardingData?.offices as Array<{ id?: string }>) || [];

      // Seed default leave types if Leave feature is enabled
      if (!skipped && enabledFeatures.includes('leave')) {
        try {
          console.log('Seeding default leave types for organization...');
          
          // Check if leave types already exist
          const { data: existingTypes } = await supabase
            .from('leave_types')
            .select('id')
            .eq('organization_id', currentOrg.id)
            .limit(1);
          
          // Only seed if no leave types exist yet
          if (!existingTypes || existingTypes.length === 0) {
            const leaveTypesToInsert = DEFAULT_LEAVE_TYPES.map(lt => ({
              organization_id: currentOrg.id,
              name: lt.name,
              category: lt.category,
              description: lt.description,
              default_days: lt.default_days,
              min_days_advance: lt.min_days_advance,
              applies_to_all_offices: lt.applies_to_all_offices,
              applies_to_employment_types: lt.applies_to_employment_types,
              applies_to_gender: lt.applies_to_gender,
              max_negative_days: lt.max_negative_days,
              is_system: lt.is_system,
              is_active: lt.is_active,
            }));

            const { data: insertedTypes, error: leaveError } = await supabase
              .from('leave_types')
              .insert(leaveTypesToInsert)
              .select('id');

            if (leaveError) {
              console.error('Failed to seed leave types:', leaveError);
            } else {
              console.log(`Seeded ${insertedTypes?.length || 0} default leave types`);
              
              // Link leave types to all offices if not applies_to_all_offices
              // For now, all default types apply to all offices, so we don't need office links
            }
          } else {
            console.log('Leave types already exist, skipping seed');
          }
        } catch (leaveErr) {
          console.error('Failed to seed leave types:', leaveErr);
          // Don't fail onboarding if leave type seeding fails
        }
      }

      // Sync organization_info to the organizations table
      const { data: fullOnboardingData } = await supabase
        .from('org_onboarding_data')
        .select('organization_info')
        .eq('organization_id', currentOrg.id)
        .single();

      const orgInfo = fullOnboardingData?.organization_info as OrgOnboardingData['organization_info'] | undefined;
      if (orgInfo) {
        const syncPayload: Record<string, unknown> = {
          name: orgInfo.name || currentOrg.name,
          logo_url: orgInfo.logo_url || null,
          legal_business_name: orgInfo.legal_business_name || null,
          business_address: orgInfo.business_address || null,
          business_address_components: orgInfo.business_address_components || null,
          business_registration_number: orgInfo.business_registration_number || null,
          website: orgInfo.website || null,
          industry: orgInfo.industry || null,
          country: orgInfo.business_address_components?.country as string || null,
        };

        const { error: syncError } = await supabase
          .from('organizations')
          .update(syncPayload)
          .eq('id', currentOrg.id);

        if (syncError) {
          console.error('Failed to sync organization info to organizations table:', syncError);
        } else {
          console.log('Successfully synced organization info to organizations table');
        }
      }

      // Mark onboarding data as complete
      const { error: dataError } = await supabase
        .from('org_onboarding_data')
        .update({
          completed_at: new Date().toISOString(),
          skipped,
          current_step: 12,
        })
        .eq('organization_id', currentOrg.id);

      if (dataError) throw dataError;

      // Mark organization as onboarding complete
      const { error: orgError } = await supabase
        .from('organizations')
        .update({
          org_onboarding_completed: true,
          org_onboarding_step: 12,
        })
        .eq('id', currentOrg.id);

      if (orgError) throw orgError;

      // Note: Invitation emails are now sent from SetupProgressScreen component
      // during the animated setup process, not here

      return { success: true, skipped, onComplete, teamMembersCount: teamMembers.length };
    },
    onSuccess: async (result) => {
      // Invalidate all queries first and wait for them
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['org-onboarding-data'] }),
        queryClient.invalidateQueries({ queryKey: ['org-onboarding-status'] }),
        queryClient.invalidateQueries({ queryKey: ['org-onboarding-check'] }),
        queryClient.invalidateQueries({ queryKey: ['organizations'] }),
      ]);
      
      refreshOrganizations();
      
      toast({
        title: result.skipped ? 'Setup skipped' : 'Setup complete!',
        description: result.skipped 
          ? 'You can complete setup anytime from Settings.' 
          : 'Your organization is ready to use.',
      });

      // Call navigation callback AFTER queries are invalidated
      result.onComplete?.();
    },
    onError: (error) => {
      console.error('Failed to complete org onboarding:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete setup. Please try again.',
        variant: 'destructive',
      });
    },
  });
}
