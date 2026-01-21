/**
 * Employee Onboarding Service
 * Handles wizard data persistence and completion logic for new team members
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface EmployeeOnboardingData {
  id: string;
  employee_id: string;
  organization_id: string;
  current_step: number;
  personal_info: {
    personal_email?: string;
    phone?: string;
    date_of_birth?: string;
    gender?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postcode?: string;
      country?: string;
    };
    emergency_contact?: {
      name?: string;
      relationship?: string;
      phone?: string;
    };
    skills?: string[];
    linkedin_url?: string;
  };
  timezone_setup_completed: boolean;
  guides_viewed: {
    checkin?: boolean;
    leave?: boolean;
    profile?: boolean;
    social_feed?: boolean;
    directory_wiki?: boolean;
  };
  completed_slides: boolean;
  tour_completed: boolean;
  skipped: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const EMPLOYEE_ONBOARDING_STEPS = [
  'welcome',
  'complete-profile',
  'timezone-setup',
  'checkin-guide',
  'leave-guide',
  'profile-guide',
  'social-feed-guide',
  'directory-wiki-guide',
  'complete',
] as const;

export const TOTAL_EMPLOYEE_STEPS = EMPLOYEE_ONBOARDING_STEPS.length;

export type EmployeeOnboardingStep = typeof EMPLOYEE_ONBOARDING_STEPS[number];

export const getEmployeeStepIndex = (step: EmployeeOnboardingStep): number => {
  return EMPLOYEE_ONBOARDING_STEPS.indexOf(step);
};

export const getEmployeeStepName = (index: number): EmployeeOnboardingStep => {
  return EMPLOYEE_ONBOARDING_STEPS[index] || 'welcome';
};

/**
 * Hook to get current employee ID
 */
export function useCurrentEmployeeId() {
  const { currentOrg } = useOrganization();
  const { session } = useAuth();

  return useQuery({
    queryKey: ['current-employee-id', currentOrg?.id, session?.user?.id],
    queryFn: async () => {
      if (!currentOrg?.id || !session?.user?.id) return null;

      const { data, error } = await supabase
        .from('employees')
        .select('id')
        .eq('organization_id', currentOrg.id)
        .eq('user_id', session.user.id)
        .single();

      if (error) return null;
      return data?.id;
    },
    enabled: !!currentOrg?.id && !!session?.user?.id,
  });
}

/**
 * Fetch current employee onboarding data
 */
export function useEmployeeOnboardingData() {
  const { currentOrg } = useOrganization();
  const { data: employeeId } = useCurrentEmployeeId();

  return useQuery({
    queryKey: ['employee-onboarding-data', employeeId],
    queryFn: async () => {
      if (!employeeId) throw new Error('No employee found');

      const { data, error } = await supabase
        .from('employee_onboarding_data')
        .select('*')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data as EmployeeOnboardingData | null;
    },
    enabled: !!employeeId && !!currentOrg?.id,
  });
}

/**
 * Check if employee onboarding is completed
 */
export function useEmployeeOnboardingStatus() {
  const { currentOrg } = useOrganization();
  const { data: employeeId } = useCurrentEmployeeId();

  return useQuery({
    queryKey: ['employee-onboarding-status', employeeId],
    queryFn: async () => {
      if (!employeeId) return { completed: true };

      const { data, error } = await supabase
        .from('employees')
        .select('employee_onboarding_completed, employee_onboarding_step')
        .eq('id', employeeId)
        .single();

      if (error) return { completed: true };

      return {
        completed: data?.employee_onboarding_completed ?? true,
        currentStep: data?.employee_onboarding_step ?? 0,
      };
    },
    enabled: !!employeeId && !!currentOrg?.id,
  });
}

/**
 * Initialize employee onboarding data
 */
export function useInitEmployeeOnboarding() {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: employeeId } = useCurrentEmployeeId();

  return useMutation({
    mutationFn: async () => {
      if (!employeeId || !currentOrg?.id) {
        throw new Error('Missing employee or organization');
      }

      // Check if data already exists
      const { data: existing } = await supabase
        .from('employee_onboarding_data')
        .select('id')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (existing) return existing;

      // Create new onboarding data
      const { data, error } = await supabase
        .from('employee_onboarding_data')
        .insert({
          employee_id: employeeId,
          organization_id: currentOrg.id,
          current_step: 1,
          personal_info: {},
          completed_slides: false,
          tour_completed: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-onboarding-data'] });
    },
  });
}

/**
 * Save step data and optionally advance to next step
 */
export function useSaveEmployeeOnboardingStep() {
  const queryClient = useQueryClient();
  const { data: employeeId } = useCurrentEmployeeId();

  return useMutation({
    mutationFn: async ({
      stepData,
      advanceStep = true,
    }: {
      stepData: Partial<EmployeeOnboardingData>;
      advanceStep?: boolean;
    }) => {
      if (!employeeId) throw new Error('No employee found');

      // Get current data to determine next step
      const { data: current } = await supabase
        .from('employee_onboarding_data')
        .select('current_step')
        .eq('employee_id', employeeId)
        .single();

      const nextStep = advanceStep ? (current?.current_step || 0) + 1 : current?.current_step;

      const { data, error } = await supabase
        .from('employee_onboarding_data')
        .update({
          ...stepData,
          current_step: nextStep,
          updated_at: new Date().toISOString(),
        })
        .eq('employee_id', employeeId)
        .select()
        .single();

      if (error) throw error;

      // Also update the employee's step tracker
      await supabase
        .from('employees')
        .update({ employee_onboarding_step: nextStep })
        .eq('id', employeeId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-onboarding-data'] });
      queryClient.invalidateQueries({ queryKey: ['employee-onboarding-status'] });
    },
  });
}

/**
 * Save employee profile data to employees table
 */
export function useSaveEmployeeProfile() {
  const queryClient = useQueryClient();
  const { data: employeeId } = useCurrentEmployeeId();

  return useMutation({
    mutationFn: async (profileData: {
      avatar_url?: string;
      personal_email?: string;
      phone?: string;
      date_of_birth?: string;
      gender?: string;
      street?: string;
      city?: string;
      state?: string;
      postcode?: string;
      country?: string;
      emergency_contact_name?: string;
      emergency_contact_relationship?: string;
      emergency_contact_phone?: string;
      linkedin_url?: string;
      superpowers?: string[];
    }) => {
      if (!employeeId) throw new Error('No employee found');

      // Update avatar in profiles table if provided
      if (profileData.avatar_url) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await supabase
            .from('profiles')
            .update({ avatar_url: profileData.avatar_url })
            .eq('id', user.id);
        }
      }

      const { error } = await supabase
        .from('employees')
        .update({
          personal_email: profileData.personal_email,
          phone: profileData.phone,
          date_of_birth: profileData.date_of_birth,
          gender: profileData.gender,
          street: profileData.street,
          city: profileData.city,
          state: profileData.state,
          postcode: profileData.postcode,
          country: profileData.country,
          emergency_contact_name: profileData.emergency_contact_name,
          emergency_contact_relationship: profileData.emergency_contact_relationship,
          emergency_contact_phone: profileData.emergency_contact_phone,
          linkedin_url: profileData.linkedin_url,
          superpowers: profileData.superpowers,
        })
        .eq('id', employeeId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}

/**
 * Save timezone to both profiles and employee_schedules
 */
export function useSaveEmployeeTimezone() {
  const queryClient = useQueryClient();
  const { data: employeeId } = useCurrentEmployeeId();
  const { session } = useAuth();
  const { currentOrg } = useOrganization();

  return useMutation({
    mutationFn: async (timezone: string) => {
      if (!employeeId || !session?.user?.id || !currentOrg?.id) {
        throw new Error('Missing required data');
      }

      // Save to profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ timezone })
        .eq('id', session.user.id);

      if (profileError) throw profileError;

      // Check if employee_schedule exists
      const { data: existingSchedule } = await supabase
        .from('employee_schedules')
        .select('id')
        .eq('employee_id', employeeId)
        .maybeSingle();

      if (existingSchedule) {
        // Update existing schedule
        await supabase
          .from('employee_schedules')
          .update({ timezone })
          .eq('employee_id', employeeId);
      } else {
        // Create new schedule with timezone
        await supabase
          .from('employee_schedules')
          .insert({
            employee_id: employeeId,
            organization_id: currentOrg.id,
            timezone,
          });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['employee-schedules'] });
    },
  });
}

/**
 * Complete employee onboarding
 */
export function useCompleteEmployeeOnboarding() {
  const queryClient = useQueryClient();
  const { data: employeeId } = useCurrentEmployeeId();

  return useMutation({
    mutationFn: async (skipped: boolean = false) => {
      if (!employeeId) throw new Error('No employee found');

      // Mark onboarding data as complete
      const { error: dataError } = await supabase
        .from('employee_onboarding_data')
        .update({
          completed_at: new Date().toISOString(),
          skipped,
          current_step: TOTAL_EMPLOYEE_STEPS,
        })
        .eq('employee_id', employeeId);

      if (dataError) throw dataError;

      // Mark employee as onboarding complete
      const { error: empError } = await supabase
        .from('employees')
        .update({
          employee_onboarding_completed: true,
          employee_onboarding_step: TOTAL_EMPLOYEE_STEPS,
        })
        .eq('id', employeeId);

      if (empError) throw empError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-onboarding-data'] });
      queryClient.invalidateQueries({ queryKey: ['employee-onboarding-status'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      
      toast({
        title: 'Welcome aboard!',
        description: 'You\'re all set to start using GlobalyOS.',
      });
    },
    onError: (error) => {
      console.error('Failed to complete employee onboarding:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete onboarding. Please try again.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mark guided tour as completed
 */
export function useCompleteTour() {
  const queryClient = useQueryClient();
  const { data: employeeId } = useCurrentEmployeeId();

  return useMutation({
    mutationFn: async () => {
      if (!employeeId) throw new Error('No employee found');

      const { error } = await supabase
        .from('employee_onboarding_data')
        .update({ tour_completed: true })
        .eq('employee_id', employeeId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-onboarding-data'] });
    },
  });
}
