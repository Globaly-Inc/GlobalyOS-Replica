/**
 * Organization Onboarding Wizard
 * Guides new organization owners through initial setup
 * New step order: Welcome, Org, Offices, Depts/Roles, Profile, Team, Features, Complete
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/hooks/useOrganization';
import { cn } from '@/lib/utils';
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
import { OwnerProfileStep } from '@/components/onboarding/wizard/OwnerProfileStep';
import { OrgInfoStep } from '@/components/onboarding/wizard/OrgInfoStep';
import { OfficesStep } from '@/components/onboarding/wizard/OfficesStep';
import { DepartmentsRolesStep } from '@/components/onboarding/wizard/DepartmentsRolesStep';
import { TeamSeedingStep } from '@/components/onboarding/wizard/TeamSeedingStep';
import { FeatureSelectionStep } from '@/components/onboarding/wizard/FeatureSelectionStep';
import { OrgCompleteStep } from '@/components/onboarding/wizard/OrgCompleteStep';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const TOTAL_STEPS = 8;
const STEP_NAMES = [
  'Welcome',
  'Organization',
  'Offices',
  'Departments & Roles',
  'Your Profile',
  'Team',
  'Features',
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayStep, setDisplayStep] = useState(1);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Redirect GlobalyHub demo org away from onboarding
  useEffect(() => {
    if (currentOrg?.slug === 'globalyhub') {
      navigate(`/org/${currentOrg.slug}`, { replace: true });
    }
  }, [currentOrg?.slug, navigate]);

  // Initialize onboarding data on mount (skip for demo org)
  useEffect(() => {
    if (currentOrg?.id && currentOrg?.slug !== 'globalyhub' && session && !dataLoading && !onboardingData) {
      initOnboarding.mutate();
    }
  }, [currentOrg?.id, currentOrg?.slug, session, dataLoading, onboardingData]);

  // Sync current step from data (resume functionality)
  useEffect(() => {
    if (onboardingData?.current_step) {
      setCurrentStep(onboardingData.current_step);
      setDisplayStep(onboardingData.current_step);
    }
  }, [onboardingData?.current_step]);

  // Handle step transition animations
  useEffect(() => {
    if (currentStep !== displayStep) {
      // Clear any existing timeout
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
      
      // Start exit animation
      setIsTransitioning(true);
      
      // After exit animation, update display step and start enter animation
      transitionTimeoutRef.current = setTimeout(() => {
        setDisplayStep(currentStep);
        setIsTransitioning(false);
      }, 150);
    }
    
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, [currentStep, displayStep]);

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
    // Prevent duplicate advancement from double-clicks
    if (isAdvancing || saveStep.isPending || completeOnboarding.isPending) return;

    setIsAdvancing(true);

    try {
      if (currentStep >= TOTAL_STEPS) {
        // Complete onboarding - pass navigation as callback
        await completeOnboarding.mutateAsync({
          skipped: false,
          onComplete: () => navigate(`/org/${currentOrg?.slug}`),
        });
        return;
      }

      // Save step data and advance
      await saveStep.mutateAsync({
        stepData: stepData || {},
        advanceStep: true,
      });
      
      setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleBack = async () => {
    if (currentStep <= 1) return;
    await goBack.mutateAsync();
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSkip = async () => {
    await completeOnboarding.mutateAsync({
      skipped: true,
      onComplete: () => navigate(`/org/${currentOrg?.slug}`),
    });
  };

  const renderStep = (step: number) => {
    const stepName = getStepName(step - 1);
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
            signupData={{
              country: currentOrg?.country || undefined,
              industry: currentOrg?.industry || undefined,
              company_size: currentOrg?.company_size || undefined,
            }}
            onSave={(data) => handleNext({ organization_info: data })}
            onBack={handleBack}
            isSaving={saveStep.isPending || isAdvancing}
          />
        );
      case 'offices':
        return (
          <OfficesStep
            organizationId={currentOrg?.id || ''}
            organizationInfo={onboardingData?.organization_info}
            initialOffices={onboardingData?.offices || []}
            onSave={(offices) => handleNext({ offices })}
            onBack={handleBack}
            isSaving={saveStep.isPending || isAdvancing}
          />
        );
      case 'departments-roles':
        return (
          <DepartmentsRolesStep
            organizationId={currentOrg?.id || ''}
            industry={onboardingData?.organization_info?.industry}
            companySize={onboardingData?.organization_info?.company_size}
            initialData={onboardingData?.departments_roles}
            onSave={(data) => handleNext({ departments_roles: data })}
            onBack={handleBack}
            isSaving={saveStep.isPending || isAdvancing}
          />
        );
      case 'owner-profile':
        return (
          <OwnerProfileStep
            organizationId={currentOrg?.id || ''}
            departmentsRoles={onboardingData?.departments_roles}
            initialData={onboardingData?.owner_profile}
            onSave={(data) => handleNext({ owner_profile: data })}
            onBack={handleBack}
            isSaving={saveStep.isPending || isAdvancing}
          />
        );
      case 'team-members':
        return (
          <TeamSeedingStep
            initialMembers={onboardingData?.team_members || []}
            departmentsRoles={onboardingData?.departments_roles}
            ownerProfile={onboardingData?.owner_profile}
            ownerName={session?.user?.user_metadata?.full_name || ''}
            ownerEmail={session?.user?.email || ''}
            onSave={(team_members) => handleNext({ team_members })}
            onBack={handleBack}
            onSkip={() => handleNext({ team_members: [] })}
            isSaving={saveStep.isPending || isAdvancing}
            organizationId={currentOrg?.id || ''}
          />
        );
      case 'features':
        return (
          <FeatureSelectionStep
            initialFeatures={onboardingData?.enabled_features || ['hr', 'feed', 'attendance', 'leave', 'wiki', 'tasks', 'kpi']}
            onSave={(enabled_features) => handleNext({ enabled_features })}
            onBack={handleBack}
            isSaving={saveStep.isPending || isAdvancing}
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
      <main className="pt-48 pb-16 px-4">
        <div className={cn(
          "mx-auto",
          getStepName(displayStep - 1) === 'team-members' ? 'max-w-5xl' : 'max-w-2xl'
        )}>
          <div
            className={cn(
              "transition-all duration-300 ease-out",
              isTransitioning 
                ? "opacity-0 translate-y-2" 
                : "opacity-100 translate-y-0"
            )}
          >
            {renderStep(displayStep)}
          </div>
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
