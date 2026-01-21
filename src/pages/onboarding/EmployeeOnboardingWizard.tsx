/**
 * Employee Onboarding Wizard
 * Guides new team members through personalized 9-step onboarding
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import globalyosIcon from '@/assets/globalyos-icon.png';
import {
  useEmployeeOnboardingData,
  useInitEmployeeOnboarding,
  useSaveEmployeeOnboardingStep,
  useCompleteEmployeeOnboarding,
  useCurrentEmployeeId,
  useSaveEmployeeProfile,
  useSaveEmployeeTimezone,
  getEmployeeStepName,
  getEmployeeOnboardingSteps,
} from '@/services/useEmployeeOnboarding';
import { WizardProgress } from '@/components/onboarding/wizard/WizardProgress';
import {
  EmployeeWelcomeStep,
  CompleteProfileStep,
  TimezoneSetupStep,
  CheckInGuideStep,
  LeaveGuideStep,
  ProfileGuideStep,
  SocialFeedGuideStep,
  DirectoryWikiGuideStep,
  MobileAppComingSoonStep,
  type ProfileFormData,
} from '@/components/onboarding/employee';

export default function EmployeeOnboardingWizard() {
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();
  const { session, loading: authLoading, signOut } = useAuth();
  const { data: employeeId } = useCurrentEmployeeId();
  const { data: onboardingData, isLoading: dataLoading } = useEmployeeOnboardingData();
  const initOnboarding = useInitEmployeeOnboarding();
  const saveStep = useSaveEmployeeOnboardingStep();
  const saveProfile = useSaveEmployeeProfile();
  const saveTimezone = useSaveEmployeeTimezone();
  const completeOnboarding = useCompleteEmployeeOnboarding();

  const [currentStep, setCurrentStep] = useState(1);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Synchronous navigation lock to prevent double-clicks
  const navLockRef = useRef(false);

  // Combined busy state for all async operations
  const isBusy = isNavigating || 
    navLockRef.current ||
    saveStep.isPending || 
    saveProfile.isPending || 
    saveTimezone.isPending || 
    completeOnboarding.isPending;

  // Type for employee data
  interface EmployeeForOnboarding {
    id: string;
    user_id: string | null;
    position: string | null;
    department: string | null;
    personal_email: string | null;
    office_id: string | null;
    offices: { name: string | null; city: string | null; country: string | null } | null;
    full_name: string;
    avatar_url: string | null;
  }

  // Fetch employee data for welcome screen
  const { data: employee } = useQuery<EmployeeForOnboarding | null>({
    queryKey: ['employee-for-onboarding', employeeId],
    queryFn: async (): Promise<EmployeeForOnboarding | null> => {
      if (!employeeId) return null;
      
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select(`
          id,
          user_id,
          position,
          department,
          personal_email,
          office_id,
          offices (name, city, country)
        `)
        .eq('id', employeeId)
        .maybeSingle();
      
      if (empError) throw empError;
      if (!empData) return null;
      
      let fullName = '';
      let avatarUrl: string | null = null;
      if (empData.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', empData.user_id)
          .maybeSingle();
        
        if (profileData) {
          fullName = profileData.full_name || '';
          avatarUrl = profileData.avatar_url;
        }
      }
      
      const offices = empData.offices as { name: string | null; city: string | null; country: string | null } | null;
      
      return {
        id: empData.id,
        user_id: empData.user_id,
        position: empData.position,
        department: empData.department,
        personal_email: empData.personal_email,
        office_id: empData.office_id,
        offices,
        full_name: fullName,
        avatar_url: avatarUrl,
      };
    },
    enabled: !!employeeId,
  });

  // Fetch owner name for welcome step
  // Fetch owner name for welcome step
  const { data: ownerName } = useQuery<string | null>({
    queryKey: ['org-owner-name', currentOrg?.id],
    queryFn: async (): Promise<string | null> => {
      if (!currentOrg?.id) return null;
      
      // Query user_roles table (role column is on user_roles, not employees)
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .match({ organization_id: currentOrg.id, role: 'owner' })
        .maybeSingle();
      
      if (error || !data?.user_id) return null;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', data.user_id)
        .maybeSingle();
        
      return profile?.full_name || null;
    },
    enabled: !!currentOrg?.id,
  });

  // Fetch organization's enabled features for conditional steps
  const { data: enabledFeatures = [] } = useQuery<string[]>({
    queryKey: ['org-enabled-features', currentOrg?.id],
    queryFn: async (): Promise<string[]> => {
      if (!currentOrg?.id) return [];
      
      const { data, error } = await supabase
        .from('org_onboarding_data')
        .select('enabled_features')
        .eq('organization_id', currentOrg.id)
        .maybeSingle();
      
      if (error || !data?.enabled_features) return [];
      return (data.enabled_features as string[]) || [];
    },
    enabled: !!currentOrg?.id,
  });

  // Compute dynamic steps and total based on enabled features
  const dynamicSteps = getEmployeeOnboardingSteps(enabledFeatures);
  const totalSteps = dynamicSteps.length;

  useEffect(() => {
    if (employeeId && currentOrg?.id && !dataLoading && !onboardingData) {
      initOnboarding.mutate();
    }
  }, [employeeId, currentOrg?.id, dataLoading, onboardingData]);

  // Sync UI step from DB only on initial load or when not navigating
  // This prevents the UI from jumping during in-flight mutations
  useEffect(() => {
    if (onboardingData?.current_step && !navLockRef.current && !isNavigating) {
      setCurrentStep(onboardingData.current_step);
    }
  }, [onboardingData?.current_step, isNavigating]);

  // Navigate to next step with explicit step targeting (prevents race conditions)
  const handleNext = useCallback(async (stepData?: Record<string, unknown>) => {
    // Synchronous lock check - prevents double-click issues
    if (navLockRef.current || isNavigating || isBusy) return;
    
    navLockRef.current = true;
    setIsNavigating(true);
    
    try {
      // Final step: complete onboarding
      if (currentStep >= totalSteps) {
        await completeOnboarding.mutateAsync(false);
        navigate(`/org/${currentOrg?.slug}`);
        return;
      }

      // Calculate explicit next step from UI state (not DB state)
      const nextStep = Math.min(currentStep + 1, totalSteps);
      
      // Save with explicit toStep to prevent DB race conditions
      const result = await saveStep.mutateAsync({ 
        stepData: stepData || {}, 
        toStep: nextStep,
      });
      
      // Update UI from mutation result for consistency
      if (result?.current_step) {
        setCurrentStep(result.current_step);
      } else {
        setCurrentStep(nextStep);
      }
    } finally {
      navLockRef.current = false;
      setIsNavigating(false);
    }
  }, [currentStep, isNavigating, isBusy, completeOnboarding, saveStep, navigate, currentOrg?.slug, totalSteps]);

  // Navigate back with explicit step targeting (keeps UI and DB in sync)
  const handleBack = useCallback(async () => {
    if (navLockRef.current || isNavigating || currentStep <= 1) return;
    
    navLockRef.current = true;
    setIsNavigating(true);
    
    try {
      const prevStep = Math.max(currentStep - 1, 1);
      
      // Persist the step change to prevent skipping on next Continue
      const result = await saveStep.mutateAsync({ 
        stepData: {}, 
        toStep: prevStep,
      });
      
      if (result?.current_step) {
        setCurrentStep(result.current_step);
      } else {
        setCurrentStep(prevStep);
      }
    } finally {
      navLockRef.current = false;
      setIsNavigating(false);
    }
  }, [currentStep, isNavigating, saveStep]);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  // Early returns after all hooks
  if (authLoading || dataLoading || initOnboarding.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Preparing your onboarding...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    navigate('/auth');
    return null;
  }

  const handleProfileSave = async (data: ProfileFormData) => {
    await saveProfile.mutateAsync({
      avatar_url: data.avatar_url,
      personal_email: data.personal_email,
      phone: data.phone,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      street: data.street,
      city: data.city,
      state: data.state,
      postcode: data.postcode,
      country: data.country,
      emergency_contact_name: data.emergency_contact_name,
      emergency_contact_relationship: data.emergency_contact_relationship,
      emergency_contact_phone: data.emergency_contact_phone,
      linkedin_url: data.linkedin_url,
    });
    
    await handleNext({
      personal_info: {
        personal_email: data.personal_email,
        phone: data.phone,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
        address: { street: data.street, city: data.city, state: data.state, postcode: data.postcode, country: data.country },
        emergency_contact: { name: data.emergency_contact_name, relationship: data.emergency_contact_relationship, phone: data.emergency_contact_phone },
        linkedin_url: data.linkedin_url,
      },
    });
  };

  const handleTimezoneSave = async (timezone: string) => {
    await saveTimezone.mutateAsync(timezone);
    await handleNext({ timezone_setup_completed: true });
  };

  const stepName = getEmployeeStepName(currentStep - 1, enabledFeatures);
  const firstName = employee?.full_name?.split(' ')[0] || 'there';
  const office = employee?.offices as { name?: string; city?: string; country?: string } | null;

  const renderStep = () => {
    switch (stepName) {
      case 'welcome':
        return (
          <EmployeeWelcomeStep
            employeeName={firstName}
            orgName={currentOrg?.name || 'the team'}
            orgLogo={currentOrg?.logo_url}
            ownerName={ownerName || undefined}
            position={employee?.position || undefined}
            department={employee?.department || undefined}
            officeName={office?.name}
            officeLocation={office?.city && office?.country ? `${office.city}, ${office.country}` : undefined}
            avatarUrl={employee?.avatar_url}
            onContinue={() => handleNext()}
            isNavigating={isBusy}
          />
        );
      case 'complete-profile':
        return (
          <CompleteProfileStep
            employeeId={employeeId!}
            userId={session?.user?.id || ''}
            initialData={{
              ...onboardingData?.personal_info,
              avatar_url: employee?.avatar_url || undefined,
            }}
            prefillData={{ full_name: employee?.full_name || '', email: employee?.personal_email || undefined }}
            onSave={handleProfileSave}
            onBack={handleBack}
            isSaving={isBusy}
          />
        );
      case 'timezone-setup':
        return (
          <TimezoneSetupStep 
            onSave={handleTimezoneSave} 
            onBack={handleBack}
            isSaving={isBusy} 
          />
        );
      case 'checkin-guide':
        return (
          <CheckInGuideStep 
            onContinue={() => handleNext()} 
            onBack={handleBack}
            isNavigating={isBusy}
          />
        );
      case 'leave-guide':
        return (
          <LeaveGuideStep 
            onContinue={() => handleNext()} 
            onBack={handleBack}
            isNavigating={isBusy}
          />
        );
      case 'profile-guide':
        return (
          <ProfileGuideStep 
            employeeName={firstName}
            avatarUrl={employee?.avatar_url}
            onContinue={() => handleNext()} 
            onBack={handleBack}
            isNavigating={isBusy}
          />
        );
      case 'social-feed-guide':
        return (
          <SocialFeedGuideStep 
            onContinue={() => handleNext()} 
            onBack={handleBack}
            isNavigating={isBusy}
          />
        );
      case 'directory-wiki-guide':
        return (
          <DirectoryWikiGuideStep 
            onContinue={() => handleNext()} 
            onBack={handleBack}
            isNavigating={isBusy}
          />
        );
      case 'complete':
        return (
          <MobileAppComingSoonStep
            employeeName={firstName}
            orgName={currentOrg?.name || 'the team'}
            onFinish={() => handleNext()}
            onBack={handleBack}
            isCompleting={isBusy}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left side: Org branding */}
          <div className="flex items-center gap-3">
            {currentOrg?.logo_url ? (
              <img src={currentOrg.logo_url} alt={currentOrg.name} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">{currentOrg?.name?.charAt(0) || 'G'}</span>
              </div>
            )}
            <span className="font-semibold text-foreground">Welcome to {currentOrg?.name || 'GlobalyOS'}</span>
          </div>

          {/* Right side: Onboarding label + GlobalyOS icon + Logout */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground font-medium hidden sm:inline">Onboarding</span>
            <img 
              src={globalyosIcon} 
              alt="GlobalyOS" 
              className="h-7 w-7 rounded-md"
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleLogout}
                    className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Logout</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <div className="fixed top-[57px] left-0 right-0 z-40 bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <WizardProgress currentStep={currentStep} totalSteps={totalSteps} />
        </div>
      </div>

      <main className="pt-48 pb-16 px-4">
        <div className="max-w-2xl mx-auto">{renderStep()}</div>
      </main>
    </div>
  );
}
