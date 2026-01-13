/**
 * Employee Onboarding Wizard
 * Guides new team members through personalized onboarding
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
  getEmployeeStepName,
} from '@/services/useEmployeeOnboarding';
import { WizardProgress } from '@/components/onboarding/wizard/WizardProgress';
import { EmployeeWelcomeStep } from '@/components/onboarding/wizard/EmployeeWelcomeStep';
import { PersonalInfoStep } from '@/components/onboarding/wizard/PersonalInfoStep';
import { FeatureSlides } from '@/components/onboarding/wizard/FeatureSlides';
import { EmployeeCompleteStep } from '@/components/onboarding/wizard/EmployeeCompleteStep';

const TOTAL_STEPS = 4;

export default function EmployeeOnboardingWizard() {
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();
  const { session, loading: authLoading } = useAuth();
  const { data: employeeId } = useCurrentEmployeeId();
  const { data: onboardingData, isLoading: dataLoading } = useEmployeeOnboardingData();
  const initOnboarding = useInitEmployeeOnboarding();
  const saveStep = useSaveEmployeeOnboardingStep();
  const completeOnboarding = useCompleteEmployeeOnboarding();
  
  const [currentStep, setCurrentStep] = useState(1);

  // Fetch employee data for welcome screen (join with profiles for name/email)
  const { data: employee } = useQuery({
    queryKey: ['employee-for-onboarding', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      
      // First get employee with office
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select(`
          id,
          user_id,
          position,
          department,
          personal_email,
          office_id,
          offices (
            name,
            city,
            country
          )
        `)
        .eq('id', employeeId)
        .maybeSingle();
      
      if (empError) throw empError;
      if (!empData) return null;
      
      // Get profile info for name
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
      
      return {
        ...empData,
        full_name: fullName,
        avatar_url: avatarUrl,
      };
    },
    enabled: !!employeeId,
  });

  // Initialize onboarding data on mount
  useEffect(() => {
    if (employeeId && currentOrg?.id && !dataLoading && !onboardingData) {
      initOnboarding.mutate();
    }
  }, [employeeId, currentOrg?.id, dataLoading, onboardingData]);

  // Sync current step from data
  useEffect(() => {
    if (onboardingData?.current_step) {
      setCurrentStep(onboardingData.current_step);
    }
  }, [onboardingData?.current_step]);

  // Loading state
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

  // Not authenticated
  if (!session) {
    navigate('/auth');
    return null;
  }

  const handleNext = async (stepData?: Record<string, unknown>) => {
    if (currentStep >= TOTAL_STEPS) {
      // Complete onboarding
      await completeOnboarding.mutateAsync(false);
      navigate(`/org/${currentOrg?.slug}`);
      return;
    }

    // Save step data and advance
    await saveStep.mutateAsync({
      stepData: stepData || {},
      advanceStep: true,
    });
    
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
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
            position={employee?.position || undefined}
            department={employee?.department || undefined}
            officeName={office?.name}
            officeLocation={office?.city && office?.country 
              ? `${office.city}, ${office.country}` 
              : undefined}
            avatarUrl={employee?.avatar_url}
            onContinue={() => handleNext()}
          />
        );
      case 'personal-info':
        return (
          <PersonalInfoStep
            employeeId={employeeId!}
            initialData={onboardingData?.personal_info}
            prefillData={{
              full_name: employee?.full_name || '',
              email: employee?.personal_email || undefined,
            }}
            onSave={(personal_info) => handleNext({ personal_info })}
            isSaving={saveStep.isPending}
          />
        );
      case 'feature-slides':
        return (
          <FeatureSlides
            onComplete={() => handleNext({ completed_slides: true })}
          />
        );
      case 'complete':
        return (
          <EmployeeCompleteStep
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
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentOrg?.logo_url ? (
              <img 
                src={currentOrg.logo_url} 
                alt={currentOrg.name} 
                className="h-8 w-8 rounded-lg object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">
                  {currentOrg?.name?.charAt(0) || 'G'}
                </span>
              </div>
            )}
            <span className="font-semibold text-foreground">
              Welcome to {currentOrg?.name || 'GlobalyOS'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="fixed top-[57px] left-0 right-0 z-40 bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <WizardProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
        </div>
      </div>

      {/* Main content */}
      <main className="pt-32 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          {renderStep()}
        </div>
      </main>
    </div>
  );
}
