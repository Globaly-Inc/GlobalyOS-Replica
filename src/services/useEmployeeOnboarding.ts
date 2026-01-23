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

/**
 * Base steps that are always shown (without conditional feature guides)
 */
const BASE_EMPLOYEE_ONBOARDING_STEPS = [
  'welcome',
  'complete-profile',
  'timezone-setup',
  'profile-guide',
  'directory-wiki-guide',
  'social-feed-guide',
  'complete',
] as const;

/**
 * All possible step names (for type safety)
 */
const ALL_EMPLOYEE_ONBOARDING_STEPS = [
  'welcome',
  'complete-profile',
  'timezone-setup',
  'profile-guide',
  'directory-wiki-guide',
  'social-feed-guide',
  'checkin-guide',
  'leave-guide',
  'complete',
] as const;

export type EmployeeOnboardingStep = typeof ALL_EMPLOYEE_ONBOARDING_STEPS[number];

/**
 * Get dynamic onboarding steps based on enabled features
 * Conditionally adds checkin-guide and leave-guide before 'complete'
 */
export const getEmployeeOnboardingSteps = (enabledFeatures: string[]): EmployeeOnboardingStep[] => {
  const steps: EmployeeOnboardingStep[] = [
    'welcome',
    'complete-profile',
    'timezone-setup',
    'profile-guide',
    'directory-wiki-guide',
    'social-feed-guide',
  ];

  // Add conditional steps before 'complete'
  if (enabledFeatures.includes('attendance')) {
    steps.push('checkin-guide');
  }
  if (enabledFeatures.includes('leave')) {
    steps.push('leave-guide');
  }

  steps.push('complete');
  return steps;
};

/**
 * Legacy constant for backwards compatibility (assumes all features enabled)
 */
export const TOTAL_EMPLOYEE_STEPS = BASE_EMPLOYEE_ONBOARDING_STEPS.length + 2; // +2 for attendance & leave

/**
 * Get step index from step name (dynamic based on enabled features)
 */
export const getEmployeeStepIndex = (step: EmployeeOnboardingStep, enabledFeatures: string[] = ['attendance', 'leave']): number => {
  const steps = getEmployeeOnboardingSteps(enabledFeatures);
  return steps.indexOf(step);
};

/**
 * Get step name from index (dynamic based on enabled features)
 */
export const getEmployeeStepName = (index: number, enabledFeatures: string[] = ['attendance', 'leave']): EmployeeOnboardingStep => {
  const steps = getEmployeeOnboardingSteps(enabledFeatures);
  return steps[index] || 'welcome';
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
 * Save step data and set explicit step (or optionally advance)
 * Using explicit toStep prevents race conditions and step-skipping bugs
 */
export function useSaveEmployeeOnboardingStep() {
  const queryClient = useQueryClient();
  const { data: employeeId } = useCurrentEmployeeId();

  return useMutation({
    mutationFn: async ({
      stepData,
      toStep,
      advanceStep = false,
    }: {
      stepData: Partial<EmployeeOnboardingData>;
      toStep?: number; // Explicit step to set (preferred)
      advanceStep?: boolean; // Legacy: increment from current DB step
    }) => {
      if (!employeeId) throw new Error('No employee found');

      let nextStep: number;

      if (toStep !== undefined) {
        // Use explicit step (clamped to valid range)
        nextStep = Math.max(1, Math.min(toStep, TOTAL_EMPLOYEE_STEPS));
      } else if (advanceStep) {
        // Legacy: read current and increment (less safe, can cause skipping)
        const { data: current } = await supabase
          .from('employee_onboarding_data')
          .select('current_step')
          .eq('employee_id', employeeId)
          .single();
        nextStep = (current?.current_step || 0) + 1;
      } else {
        // No change requested, keep current
        const { data: current } = await supabase
          .from('employee_onboarding_data')
          .select('current_step')
          .eq('employee_id', employeeId)
          .single();
        nextStep = current?.current_step || 1;
      }

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

      return data as EmployeeOnboardingData;
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
 * Complete employee onboarding with verification
 * Ensures both employee_onboarding_data and employees tables are updated atomically
 */
export function useCompleteEmployeeOnboarding() {
  const queryClient = useQueryClient();
  const { data: employeeId } = useCurrentEmployeeId();

  return useMutation({
    mutationFn: async (skipped: boolean = false) => {
      // Capture employeeId at mutation start to prevent race conditions
      const currentEmployeeId = employeeId;
      if (!currentEmployeeId) throw new Error('No employee found');

      const completedAt = new Date().toISOString();

      // Step 1: Update employee_onboarding_data
      const { error: dataError } = await supabase
        .from('employee_onboarding_data')
        .update({
          completed_at: completedAt,
          skipped,
          current_step: TOTAL_EMPLOYEE_STEPS,
        })
        .eq('employee_id', currentEmployeeId);

      if (dataError) {
        console.error('[useCompleteEmployeeOnboarding] Failed to update onboarding data:', dataError);
        throw dataError;
      }

      // Step 2: Update employees table with explicit verification
      const { error: empError, data: empData } = await supabase
        .from('employees')
        .update({
          employee_onboarding_completed: true,
          employee_onboarding_step: TOTAL_EMPLOYEE_STEPS,
        })
        .eq('id', currentEmployeeId)
        .select('id, employee_onboarding_completed, employee_onboarding_step')
        .single();

      if (empError) {
        console.error('[useCompleteEmployeeOnboarding] Failed to update employee:', empError);
        throw empError;
      }

      // Step 3: Verify the update actually succeeded
      if (!empData || empData.employee_onboarding_completed !== true) {
        console.error('[useCompleteEmployeeOnboarding] Verification failed - employee not marked complete:', empData);
        
        // Retry the update once
        const { error: retryError, data: retryData } = await supabase
          .from('employees')
          .update({
            employee_onboarding_completed: true,
            employee_onboarding_step: TOTAL_EMPLOYEE_STEPS,
          })
          .eq('id', currentEmployeeId)
          .select('id, employee_onboarding_completed')
          .single();
        
        if (retryError || !retryData?.employee_onboarding_completed) {
          throw new Error('Failed to verify employee onboarding completion after retry');
        }
      }

      console.log('[useCompleteEmployeeOnboarding] Successfully completed onboarding for employee:', currentEmployeeId);
      
      // Trigger notification emails (fire-and-forget, don't block completion)
      supabase.functions.invoke('send-onboarding-complete-email', {
        body: { employeeId: currentEmployeeId }
      }).catch(err => console.error('Failed to send completion email:', err));

      supabase.functions.invoke('notify-team-onboarding-complete', {
        body: { employeeId: currentEmployeeId }
      }).catch(err => console.error('Failed to notify team:', err));

      return { success: true, employeeId: currentEmployeeId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-onboarding-data'] });
      queryClient.invalidateQueries({ queryKey: ['employee-onboarding-status'] });
      queryClient.invalidateQueries({ queryKey: ['employee-onboarding-check'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      
      toast({
        title: 'Welcome aboard!',
        description: 'You\'re all set to start using GlobalyOS.',
      });
    },
    onError: (error) => {
      console.error('[useCompleteEmployeeOnboarding] Error:', error);
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
