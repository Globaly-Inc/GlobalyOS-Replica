import { useState, useEffect, useCallback } from "react";
import Joyride, { CallBackProps, STATUS, EVENTS, Step } from "react-joyride";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrganization } from "@/hooks/useOrganization";
import { supabase } from "@/integrations/supabase/client";

// Tour step configurations for different roles
const ownerTourSteps: Step[] = [
  {
    target: ".tour-settings-menu",
    title: "Company Settings",
    content: "Start by configuring your company settings - add your logo, set timezone, and customize your workspace.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: ".tour-offices-manage",
    title: "Office Setup",
    content: "Add your office locations and configure attendance tracking with QR codes for each location.",
    placement: "bottom",
  },
  {
    target: ".tour-leave-settings",
    title: "Leave Policies",
    content: "Set up leave types, default allocations, and approval workflows for your organization.",
    placement: "bottom",
  },
  {
    target: ".tour-add-team-member",
    title: "Invite Your Team",
    content: "Add team members individually or import them in bulk using CSV. They'll receive welcome emails automatically.",
    placement: "bottom",
  },
  {
    target: ".tour-feature-overview",
    title: "Explore Features",
    content: "Discover Wiki for documentation, Chat for team communication, KPIs for performance tracking, and AI-powered insights!",
    placement: "center",
  },
];

const adminHrTourSteps: Step[] = [
  {
    target: ".tour-profile-avatar",
    title: "Complete Your Profile",
    content: "Add your photo, contact details, and superpowers to help your team know you better.",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: ".tour-team-directory",
    title: "Team Directory",
    content: "View and manage your team members. As an admin, you can edit profiles, manage leave, and track attendance.",
    placement: "bottom",
  },
  {
    target: ".tour-quick-actions",
    title: "Quick Actions",
    content: "Use these buttons to check-in, post updates, request leave, and access AI assistant quickly.",
    placement: "bottom",
  },
];

const memberTourSteps: Step[] = [
  {
    target: ".tour-profile-avatar",
    title: "Your Profile",
    content: "Click here to view and complete your profile. Add your photo and superpowers!",
    placement: "bottom",
    disableBeacon: true,
  },
  {
    target: ".tour-check-in",
    title: "Daily Check-In",
    content: "Scan the QR code to check in/out. Your work hours will be tracked automatically.",
    placement: "bottom",
  },
];

interface SpotlightTourProps {
  run?: boolean;
  onComplete?: () => void;
}

export const SpotlightTour = ({ run: externalRun, onComplete }: SpotlightTourProps) => {
  const { user } = useAuth();
  const { isAdmin, isHR } = useUserRole();
  const { currentOrg } = useOrganization();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);

  // Determine which tour steps to use based on role
  // Owner is determined by being both admin and having created the org (first admin)
  const isOwnerRole = isAdmin;
  
  useEffect(() => {
    if (isOwnerRole) {
      setSteps(ownerTourSteps);
    } else if (isAdmin || isHR) {
      setSteps(adminHrTourSteps);
    } else {
      setSteps(memberTourSteps);
    }
  }, [isOwnerRole, isAdmin, isHR]);

  // Check onboarding progress and determine if tour should run
  useEffect(() => {
    if (!user?.id || !currentOrg?.id) {
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
        // Create new onboarding progress record
        const role = isOwnerRole ? "owner" : isHR ? "hr" : "member";
        await supabase.from("onboarding_progress").insert({
          user_id: user.id,
          organization_id: currentOrg.id,
          role,
          current_step: 0,
          completed_steps: [],
          is_completed: false,
          tour_completed: false,
        });
        
        // Start tour for new users after a delay for UI to load
        setTimeout(() => setRun(true), 1500);
      } else if (!progress.tour_completed) {
        // Resume from where user left off
        setStepIndex(progress.current_step || 0);
        setTimeout(() => setRun(true), 1500);
      }
      
      setLoading(false);
    };

    checkOnboardingProgress();
  }, [user?.id, currentOrg?.id, isOwnerRole, isAdmin, isHR]);

  // Handle external run prop
  useEffect(() => {
    if (externalRun !== undefined) {
      setRun(externalRun);
      if (externalRun) {
        setStepIndex(0);
      }
    }
  }, [externalRun]);

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

  // Handle tour callbacks
  const handleCallback = useCallback((data: CallBackProps) => {
    const { status, type, index, action } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      saveProgress(index, true);
      onComplete?.();
    } else if (type === EVENTS.STEP_AFTER) {
      // Save progress after each step
      const nextIndex = action === "prev" ? index - 1 : index + 1;
      setStepIndex(nextIndex);
      saveProgress(nextIndex, false);
    } else if (type === EVENTS.TARGET_NOT_FOUND) {
      // Skip steps with missing targets
      const nextIndex = index + 1;
      if (nextIndex < steps.length) {
        setStepIndex(nextIndex);
      }
    }
  }, [saveProgress, onComplete, steps.length]);

  if (loading || steps.length === 0) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
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
