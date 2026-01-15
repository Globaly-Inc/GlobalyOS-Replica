/**
 * Organization Onboarding Wizard
 * Guides new organization owners through initial setup
 * Supports resume from where user left off
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/hooks/useAuth';
import {
  useOrgOnboardingData,
  useInitOrgOnboarding,
  useSaveOrgOnboardingStep,
  useGoBackStep,
  useCompleteOrgOnboarding,
  getStepName,
} from '@/services/useOrgOnboarding';
import { OnboardingHeader } from '@/components/onboarding/wizard/OnboardingHeader';
import { OrgWelcomeStep } from '@/components/onboarding/wizard/OrgWelcomeStep';
import { OrgInfoStep } from '@/components/onboarding/wizard/OrgInfoStep';
import { OfficesStep } from '@/components/onboarding/wizard/OfficesStep';
import { TeamSeedingStep } from '@/components/onboarding/wizard/TeamSeedingStep';
import { FeatureSelectionStep } from '@/components/onboarding/wizard/FeatureSelectionStep';
import { HrSettingsStep } from '@/components/onboarding/wizard/HrSettingsStep';
import { OrgCompleteStep } from '@/components/onboarding/wizard/OrgCompleteStep';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const TOTAL_STEPS = 7;
const STEP_NAMES = [
  'Welcome',
  'Organization',
  'Offices',
  'Team',
  'Features',
  'HR Settings',
  'Complete'
];

export default function OrgOnboardingWizard() {
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();
  const { session, loading: authLoading } = useAuth();
  const { data: onboardingData, isLoading: dataLoading } = useOrgOnboardingData();
  const initOnboarding = useInitOrgOnboarding();
  const saveStep = useSaveOrgOnboardingStep();
  const goBack = useGoBackStep();
  const completeOnboarding = useCompleteOrgOnboarding();
  
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Initialize onboarding data on mount
  useEffect(() => {
    if (currentOrg?.id && session && !dataLoading && !onboardingData) {
      initOnboarding.mutate();
    }
  }, [currentOrg?.id, session, dataLoading, onboardingData]);

  // Sync current step from data (resume functionality)
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
          <p className="mt-4 text-muted-foreground">Setting up your workspace...</p>
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

  const handleBack = async () => {
    if (currentStep <= 1) return;
    await goBack.mutateAsync();
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSkip = async () => {
    await completeOnboarding.mutateAsync(true);
    navigate(`/org/${currentOrg?.slug}`);
  };


  const stepName = getStepName(currentStep - 1);

  const renderStep = () => {
    switch (stepName) {
      case 'welcome':
        return (
          <OrgWelcomeStep
            ownerName={session?.user?.user_metadata?.full_name || 'there'}
            orgName={currentOrg?.name || 'your organization'}
            onContinue={() => handleNext()}
          />
        );
      case 'organization-info':
        return (
          <OrgInfoStep
            initialData={onboardingData?.organization_info}
            onSave={(data) => handleNext({ organization_info: data })}
            onBack={handleBack}
            isSaving={saveStep.isPending}
          />
        );
      case 'offices':
        return (
          <OfficesStep
            initialOffices={onboardingData?.offices || []}
            onSave={(offices) => handleNext({ offices })}
            onBack={handleBack}
            isSaving={saveStep.isPending}
          />
        );
      case 'team-members':
        return (
          <TeamSeedingStep
            initialMembers={onboardingData?.team_members || []}
            onSave={(team_members) => handleNext({ team_members })}
            onBack={handleBack}
            onSkip={() => handleNext({ team_members: [] })}
            isSaving={saveStep.isPending}
            organizationId={currentOrg?.id || ''}
          />
        );
      case 'features':
        return (
          <FeatureSelectionStep
            initialFeatures={onboardingData?.enabled_features || ['hr', 'leave', 'feed', 'wiki', 'chat']}
            onSave={(enabled_features) => handleNext({ enabled_features })}
            onBack={handleBack}
            isSaving={saveStep.isPending}
          />
        );
      case 'hr-settings':
        return (
          <HrSettingsStep
            initialSettings={onboardingData?.hr_settings}
            onSave={(hr_settings) => handleNext({ hr_settings })}
            onBack={handleBack}
            isSaving={saveStep.isPending}
          />
        );
      case 'complete':
        return (
          <OrgCompleteStep
            orgName={currentOrg?.name || 'Your organization'}
            teamMembersCount={onboardingData?.team_members?.length || 0}
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
      {/* Header with progress indicator */}
      <OnboardingHeader
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        stepNames={STEP_NAMES}
        onSkip={() => setShowSkipDialog(true)}
      />

      {/* Main content - adjust top padding for fixed header */}
      <main className="pt-32 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          {renderStep()}
        </div>
      </main>

      {/* Skip confirmation dialog */}
      <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip setup?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress is automatically saved. You can continue setup anytime from Settings → Organization Setup. Some features may not work optimally until setup is complete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue setup</AlertDialogCancel>
            <AlertDialogAction onClick={handleSkip}>
              Skip for now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
