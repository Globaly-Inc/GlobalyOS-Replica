/**
 * Employee Onboarding Wizard
 * Guides new team members through personalized 9-step onboarding
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import {
  useEmployeeOnboardingData,
  useInitEmployeeOnboarding,
  useSaveEmployeeOnboardingStep,
  useCompleteEmployeeOnboarding,
  useCurrentEmployeeId,
  useSaveEmployeeProfile,
  useSaveEmployeeTimezone,
  getEmployeeStepName,
  TOTAL_EMPLOYEE_STEPS,
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
  const { session, loading: authLoading } = useAuth();
  const { data: employeeId } = useCurrentEmployeeId();
  const { data: onboardingData, isLoading: dataLoading } = useEmployeeOnboardingData();
  const initOnboarding = useInitEmployeeOnboarding();
  const saveStep = useSaveEmployeeOnboardingStep();
  const saveProfile = useSaveEmployeeProfile();
  const saveTimezone = useSaveEmployeeTimezone();
  const completeOnboarding = useCompleteEmployeeOnboarding();
  
  const [currentStep, setCurrentStep] = useState(1);

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
  const { data: ownerName } = useQuery<string | null>({
    queryKey: ['org-owner-name', currentOrg?.id],
    queryFn: async (): Promise<string | null> => {
      if (!currentOrg?.id) return null;
      
      // Use separate query to avoid deep type inference
      const { data, error } = await supabase
        .from('employees')
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

  useEffect(() => {
    if (employeeId && currentOrg?.id && !dataLoading && !onboardingData) {
      initOnboarding.mutate();
    }
  }, [employeeId, currentOrg?.id, dataLoading, onboardingData]);

  useEffect(() => {
    if (onboardingData?.current_step) {
      setCurrentStep(onboardingData.current_step);
    }
  }, [onboardingData?.current_step]);

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

  const handleNext = async (stepData?: Record<string, unknown>) => {
    if (currentStep >= TOTAL_EMPLOYEE_STEPS) {
      await completeOnboarding.mutateAsync(false);
      navigate(`/org/${currentOrg?.slug}`);
      return;
    }

    await saveStep.mutateAsync({ stepData: stepData || {}, advanceStep: true });
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_EMPLOYEE_STEPS));
  };

  const handleProfileSave = async (data: ProfileFormData) => {
    await saveProfile.mutateAsync({
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
        preferred_name: data.preferred_name,
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

  const stepName = getEmployeeStepName(currentStep - 1);
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
          />
        );
      case 'complete-profile':
        return (
          <CompleteProfileStep
            employeeId={employeeId!}
            initialData={onboardingData?.personal_info}
            prefillData={{ full_name: employee?.full_name || '', email: employee?.personal_email || undefined }}
            onSave={handleProfileSave}
            isSaving={saveStep.isPending || saveProfile.isPending}
          />
        );
      case 'timezone-setup':
        return <TimezoneSetupStep onSave={handleTimezoneSave} isSaving={saveStep.isPending || saveTimezone.isPending} />;
      case 'checkin-guide':
        return <CheckInGuideStep onContinue={() => handleNext()} />;
      case 'leave-guide':
        return <LeaveGuideStep onContinue={() => handleNext()} />;
      case 'profile-guide':
        return <ProfileGuideStep employeeName={firstName} onContinue={() => handleNext()} />;
      case 'social-feed-guide':
        return <SocialFeedGuideStep onContinue={() => handleNext()} />;
      case 'directory-wiki-guide':
        return <DirectoryWikiGuideStep onContinue={() => handleNext()} />;
      case 'complete':
        return (
          <MobileAppComingSoonStep
            employeeName={firstName}
            orgName={currentOrg?.name || 'the team'}
            onFinish={() => handleNext()}
            isCompleting={completeOnboarding.isPending}
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
        </div>
      </div>

      <div className="fixed top-[57px] left-0 right-0 z-40 bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <WizardProgress currentStep={currentStep} totalSteps={TOTAL_EMPLOYEE_STEPS} />
        </div>
      </div>

      <main className="pt-48 pb-16 px-4">
        <div className="max-w-2xl mx-auto">{renderStep()}</div>
      </main>
    </div>
  );
}
