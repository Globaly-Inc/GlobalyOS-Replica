import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Building2,
  MapPin,
  Calendar,
  Users,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  route?: string;
  completed: boolean;
}

const GuidedTour = () => {
  const { currentOrg } = useOrganization();
  const { isAdmin, isHR } = useUserRole();
  const { orgCode } = useOrgNavigation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);

  const ownerSteps: Omit<OnboardingStep, "completed">[] = [
    {
      id: "company_setup",
      title: "Set Up Your Company",
      description: "Add your company logo, name, and timezone to personalize your workspace.",
      icon: <Building2 className="h-8 w-8 text-primary" />,
      action: "Go to Settings",
      route: "/settings",
    },
    {
      id: "office_setup",
      title: "Configure Offices",
      description: "Add your office locations and set up attendance tracking with QR codes.",
      icon: <MapPin className="h-8 w-8 text-primary" />,
      action: "Manage Offices",
      route: "/settings?tab=attendance",
    },
    {
      id: "leave_policy",
      title: "Set Up Leave Policies",
      description: "Configure leave types, default allocations, and approval workflows.",
      icon: <Calendar className="h-8 w-8 text-primary" />,
      action: "Configure Leave",
      route: "/settings?tab=leave",
    },
    {
      id: "invite_team",
      title: "Invite Your Team",
      description: "Add team members individually or import them in bulk via CSV.",
      icon: <Users className="h-8 w-8 text-primary" />,
      action: "Add Team Members",
      route: orgCode ? `/org/${orgCode}/team` : "/team",
    },
    {
      id: "feature_tour",
      title: "Explore Features",
      description: "Discover Wiki, Chat, KPIs, and AI-powered insights for your team.",
      icon: <Sparkles className="h-8 w-8 text-primary" />,
      action: "Start Exploring",
      route: orgCode ? `/org/${orgCode}` : "/",
    },
  ];

  const memberSteps: Omit<OnboardingStep, "completed">[] = [
    {
      id: "complete_profile",
      title: "Complete Your Profile",
      description: "Add your photo, contact info, and superpowers to help your team know you.",
      icon: <Users className="h-8 w-8 text-primary" />,
      action: "Edit Profile",
      route: orgCode ? `/org/${orgCode}/team` : "/team",
    },
    {
      id: "quick_tour",
      title: "Take a Quick Tour",
      description: "Learn how to check in, request leave, and collaborate with your team.",
      icon: <Sparkles className="h-8 w-8 text-primary" />,
      action: "Start Tour",
      route: orgCode ? `/org/${orgCode}` : "/",
    },
  ];

  useEffect(() => {
    if (!currentOrg?.id) return;

    const fetchOnboardingProgress = async () => {
      setLoading(true);
      const { data: progress } = await supabase
        .from("onboarding_progress")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .single();

      const baseSteps = isAdmin || isHR ? ownerSteps : memberSteps;

      if (progress) {
        const completedSteps = progress.completed_steps as string[] || [];
        const stepsWithProgress = baseSteps.map((step) => ({
          ...step,
          completed: completedSteps.includes(step.id),
        }));
        setSteps(stepsWithProgress);

        // Show tour if not all steps completed and not dismissed
        if (!progress.tour_completed && completedSteps.length < baseSteps.length) {
          setOpen(true);
        }
      } else {
        setSteps(baseSteps.map((step) => ({ ...step, completed: false })));
        setOpen(true);
      }
      setLoading(false);
    };

    fetchOnboardingProgress();
  }, [currentOrg?.id, isAdmin, isHR, orgCode]);

  const markStepComplete = async (stepId: string) => {
    if (!currentOrg?.id) return;

    const { data: progress } = await supabase
      .from("onboarding_progress")
      .select("completed_steps")
      .eq("organization_id", currentOrg.id)
      .single();

    const currentSteps = (progress?.completed_steps as string[]) || [];
    if (!currentSteps.includes(stepId)) {
      const newSteps = [...currentSteps, stepId];
      await supabase
        .from("onboarding_progress")
        .update({ completed_steps: newSteps, updated_at: new Date().toISOString() })
        .eq("organization_id", currentOrg.id);

      setSteps((prev) =>
        prev.map((s) => (s.id === stepId ? { ...s, completed: true } : s))
      );
    }
  };

  const handleAction = async () => {
    const step = steps[currentStep];
    if (!step) return;

    await markStepComplete(step.id);

    if (step.route) {
      setOpen(false);
      navigate(step.route);
    }
  };

  const handleSkip = async () => {
    if (!currentOrg?.id) return;

    await supabase
      .from("onboarding_progress")
      .update({ tour_completed: true, updated_at: new Date().toISOString() })
      .eq("organization_id", currentOrg.id);

    setOpen(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (loading || steps.length === 0) return null;

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = (completedCount / steps.length) * 100;
  const currentStepData = steps[currentStep];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSkip} className="text-xs">
              Skip Tour
            </Button>
          </div>
          <Progress value={progressPercent} className="h-1 mb-4" />
          <div className="flex justify-center py-4">
            {currentStepData?.completed ? (
              <div className="relative">
                {currentStepData.icon}
                <CheckCircle2 className="h-4 w-4 text-green-500 absolute -top-1 -right-1" />
              </div>
            ) : (
              currentStepData?.icon
            )}
          </div>
          <DialogTitle className="text-center">{currentStepData?.title}</DialogTitle>
          <DialogDescription className="text-center">
            {currentStepData?.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={handleAction} className="w-full gap-2">
            {currentStepData?.action}
            <ArrowRight className="h-4 w-4" />
          </Button>

          <div className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={currentStep === steps.length - 1}
              className="gap-1"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-1.5 mt-4">
          {steps.map((step, idx) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(idx)}
              className={`h-2 w-2 rounded-full transition-colors ${
                idx === currentStep
                  ? "bg-primary"
                  : step.completed
                  ? "bg-green-500"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GuidedTour;
