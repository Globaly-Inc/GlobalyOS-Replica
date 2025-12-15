import { useState, useEffect, useCallback } from "react";
import Joyride, { CallBackProps, STATUS, EVENTS, Step } from "react-joyride";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/hooks/useOrganization";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { supabase } from "@/integrations/supabase/client";

// Map each step target to the route it requires
interface TourStep extends Step {
  requiredRoute?: string; // Route prefix where this element exists
}

// Tour step configurations for different roles
const getOwnerTourSteps = (orgCode: string): TourStep[] => [
  {
    target: ".tour-quick-actions",
    title: "Quick Actions",
    content: "Use these buttons to check-in, post updates, request leave, and access notifications quickly.",
    placement: "bottom",
    disableBeacon: true,
    requiredRoute: `/org/${orgCode}`,
  },
  {
    target: ".tour-settings-menu",
    title: "Company Settings",
    content: "Configure your company settings - add your logo, set timezone, and customize your workspace.",
    placement: "bottom",
    requiredRoute: `/org/${orgCode}/settings`,
  },
  {
    target: ".tour-offices-manage",
    title: "Office Setup",
    content: "Add your office locations and configure attendance tracking with QR codes for each location.",
    placement: "bottom",
    requiredRoute: `/org/${orgCode}/settings`,
  },
  {
    target: ".tour-add-team-member",
    title: "Invite Your Team",
    content: "Add team members individually or import them in bulk using CSV. They'll receive welcome emails automatically.",
    placement: "bottom",
    requiredRoute: `/org/${orgCode}/team`,
  },
  {
    target: ".tour-feature-overview",
    title: "Explore Features",
    content: "Discover Wiki for documentation, Chat for team communication, KPIs for performance tracking, and AI-powered insights!",
    placement: "center",
    requiredRoute: `/org/${orgCode}`,
  },
];

const getAdminHrTourSteps = (orgCode: string): TourStep[] => [
  {
    target: ".tour-profile-avatar",
    title: "Your Profile",
    content: "Click here to view and complete your profile. Add your photo and superpowers to help your team know you better.",
    placement: "bottom",
    disableBeacon: true,
    requiredRoute: `/org/${orgCode}`,
  },
  {
    target: ".tour-quick-actions",
    title: "Quick Actions",
    content: "Use these buttons to check-in, post updates, request leave, and access AI assistant quickly.",
    placement: "bottom",
    requiredRoute: `/org/${orgCode}`,
  },
];

const getMemberTourSteps = (orgCode: string): TourStep[] => [
  {
    target: ".tour-profile-avatar",
    title: "Your Profile",
    content: "Click here to view and complete your profile. Add your photo and superpowers!",
    placement: "bottom",
    disableBeacon: true,
    requiredRoute: `/org/${orgCode}`,
  },
  {
    target: ".tour-check-in",
    title: "Daily Check-In",
    content: "Scan the QR code to check in/out. Your work hours will be tracked automatically.",
    placement: "bottom",
    requiredRoute: `/org/${orgCode}`,
  },
];

interface SpotlightTourProps {
  run?: boolean;
  onComplete?: () => void;
}

export const SpotlightTour = ({ run: externalRun, onComplete }: SpotlightTourProps) => {
  const { user } = useAuth();
  const { isOwner, isAdmin, isHR } = useUserRole();
  const { currentOrg } = useOrganization();
  const { orgCode } = useOrgNavigation();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [surveyCompleted, setSurveyCompleted] = useState(false);
  const [waitingForNavigation, setWaitingForNavigation] = useState(false);

  // Owner is determined by actual owner role
  const isOwnerRole = isOwner;
  
  // Set up steps based on role
  useEffect(() => {
    if (!orgCode) return;
    
    if (isOwnerRole) {
      setSteps(getOwnerTourSteps(orgCode));
    } else if (isAdmin || isHR) {
      setSteps(getAdminHrTourSteps(orgCode));
    } else {
      setSteps(getMemberTourSteps(orgCode));
    }
  }, [isOwnerRole, isAdmin, isHR, orgCode]);

  // Check onboarding progress and determine if tour should run
  useEffect(() => {
    if (!user?.id || !currentOrg?.id) {
      setLoading(false);
      return;
    }

    // Only run tour for owners
    if (!isOwnerRole) {
      setLoading(false);
      return;
    }

    const checkOnboardingProgress = async () => {
      setLoading(true);
      
      const { data: progress } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("organization_id", currentOrg.id)
        .maybeSingle();

      if (!progress) {
        // Create new onboarding progress record for owner
        await supabase.from("onboarding_progress").insert({
          user_id: user.id,
          organization_id: currentOrg.id,
          role: "owner",
          current_step: 0,
          completed_steps: [],
          is_completed: false,
          tour_completed: false,
          survey_completed: false,
        });
        
        // Don't start tour yet - wait for survey
        setSurveyCompleted(false);
      } else {
        setSurveyCompleted(progress.survey_completed === true);
        
        // Only start tour if survey is completed and tour is not completed
        if (progress.survey_completed && !progress.tour_completed) {
          setStepIndex(progress.current_step || 0);
          // Delay to let UI settle
          setTimeout(() => setRun(true), 1000);
        }
      }
      
      setLoading(false);
    };

    checkOnboardingProgress();
  }, [user?.id, currentOrg?.id, isOwnerRole]);

  // Watch for survey completion changes
  useEffect(() => {
    if (!user?.id || !currentOrg?.id) return;

    const channel = supabase
      .channel("onboarding-survey-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "onboarding_progress",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as { survey_completed?: boolean; tour_completed?: boolean };
          if (newData.survey_completed && !newData.tour_completed) {
            setSurveyCompleted(true);
            // Start tour after survey completes
            setTimeout(() => setRun(true), 1000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, currentOrg?.id]);

  // Handle external run prop
  useEffect(() => {
    if (externalRun !== undefined) {
      setRun(externalRun);
      if (externalRun) {
        setStepIndex(0);
      }
    }
  }, [externalRun]);

  // When navigation completes, continue the tour
  useEffect(() => {
    if (!waitingForNavigation || !run) return;
    
    const currentStep = steps[stepIndex];
    if (!currentStep?.requiredRoute) {
      setWaitingForNavigation(false);
      return;
    }

    // Check if we're now on the correct route
    if (location.pathname.startsWith(currentStep.requiredRoute)) {
      // Wait for DOM to settle
      const timer = setTimeout(() => {
        setWaitingForNavigation(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, waitingForNavigation, run, stepIndex, steps]);

  // Persist progress to database
  const saveProgress = useCallback(async (step: number, completed: boolean) => {
    if (!user?.id || !currentOrg?.id) return;

    const { data: progress } = await supabase
      .from("onboarding_progress")
      .select("completed_steps")
      .eq("user_id", user.id)
      .eq("organization_id", currentOrg.id)
      .maybeSingle();

    const completedSteps = (progress?.completed_steps as string[]) || [];
    const stepId = steps[step]?.target?.toString() || `step-${step}`;
    
    if (!completedSteps.includes(stepId)) {
      completedSteps.push(stepId);
    }

    await supabase
      .from("onboarding_progress")
      .update({
        current_step: step,
        completed_steps: completedSteps,
        tour_completed: completed,
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("user_id", user.id)
      .eq("organization_id", currentOrg.id);
  }, [user?.id, currentOrg?.id, steps]);

  // Navigate to required route for step
  const navigateToStepRoute = useCallback((step: TourStep) => {
    if (!step.requiredRoute) return false;
    
    if (!location.pathname.startsWith(step.requiredRoute)) {
      setWaitingForNavigation(true);
      navigate(step.requiredRoute);
      return true;
    }
    return false;
  }, [location.pathname, navigate]);

  // Handle tour callbacks
  const handleCallback = useCallback((data: CallBackProps) => {
    const { status, type, index, action } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      saveProgress(index, true);
      onComplete?.();
    } else if (type === EVENTS.STEP_BEFORE) {
      // Before showing a step, check if we need to navigate
      const step = steps[index] as TourStep;
      if (step && navigateToStepRoute(step)) {
        // We're navigating, pause the tour temporarily
        return;
      }
    } else if (type === EVENTS.STEP_AFTER) {
      // Save progress after each step
      const nextIndex = action === "prev" ? index - 1 : index + 1;
      
      if (nextIndex >= 0 && nextIndex < steps.length) {
        const nextStep = steps[nextIndex] as TourStep;
        // Check if next step requires navigation
        if (nextStep?.requiredRoute && !location.pathname.startsWith(nextStep.requiredRoute)) {
          setStepIndex(nextIndex);
          saveProgress(nextIndex, false);
          navigateToStepRoute(nextStep);
          return;
        }
      }
      
      setStepIndex(nextIndex);
      saveProgress(nextIndex, false);
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      // Skip steps with missing targets
      const nextIndex = index + 1;
      if (nextIndex < steps.length) {
        setStepIndex(nextIndex);
      } else {
        // End tour if no more steps
        setRun(false);
        saveProgress(index, true);
        onComplete?.();
      }
    }
  }, [saveProgress, onComplete, steps, navigateToStepRoute, location.pathname]);

  // Check if current step's target element exists
  const currentStep = steps[stepIndex];
  const targetExists = currentStep?.target 
    ? document.querySelector(currentStep.target as string) !== null 
    : false;
  
  // Check if we're on the correct route for the current step
  const onCorrectRoute = currentStep?.requiredRoute 
    ? location.pathname.startsWith(currentStep.requiredRoute) 
    : true;

  // Don't render if loading, no steps, waiting for navigation, survey not completed, 
  // or if target doesn't exist when we're on the correct route
  if (loading || steps.length === 0 || waitingForNavigation || !surveyCompleted) return null;
  
  // Only run the tour if we're on the correct route and target exists
  const shouldRun = run && onCorrectRoute && targetExists;

  return (
    <Joyride
      steps={steps}
      run={shouldRun}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      spotlightClicks
      disableOverlayClose
      disableCloseOnEsc={false}
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: "hsl(262, 83%, 58%)",
          backgroundColor: "#ffffff",
          textColor: "#1f2937",
          overlayColor: "rgba(98, 0, 234, 0.75)",
          arrowColor: "#ffffff",
          zIndex: 10000,
        },
      }}
      locale={{
        back: "Previous",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip Tour",
      }}
      floaterProps={{
        disableAnimation: false,
      }}
    />
  );
};

export default SpotlightTour;
