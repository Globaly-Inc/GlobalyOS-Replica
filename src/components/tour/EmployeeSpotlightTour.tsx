/**
 * Employee Spotlight Tour Component
 * Shows a guided tour for new employees after completing onboarding
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Joyride, { CallBackProps, STATUS, EVENTS, Step } from 'react-joyride';
import { useOrganization } from '@/hooks/useOrganization';
import { useCompleteTour } from '@/services/useEmployeeOnboarding';
import { getEmployeeTourSteps } from './EmployeeTourSteps';

interface TourStep extends Step {
  requiredRoute?: string;
}

interface EmployeeSpotlightTourProps {
  run: boolean;
  onComplete?: () => void;
}

export const EmployeeSpotlightTour = ({ run, onComplete }: EmployeeSpotlightTourProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentOrg } = useOrganization();
  const completeTour = useCompleteTour();

  const [steps, setSteps] = useState<TourStep[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Build steps when org is available
  useEffect(() => {
    if (currentOrg?.slug) {
      setSteps(getEmployeeTourSteps(currentOrg.slug));
    }
  }, [currentOrg?.slug]);

  // Start tour when run prop changes
  useEffect(() => {
    if (run && steps.length > 0 && !isMobile) {
      setIsRunning(true);
      setStepIndex(0);
    }
  }, [run, steps.length, isMobile]);

  // Check if target exists
  const checkTargetExists = useCallback((target: string): boolean => {
    if (typeof target !== 'string') return true;
    const element = document.querySelector(target);
    return !!element;
  }, []);

  // Navigate to step route if needed
  const navigateToStepRoute = useCallback((step: TourStep): boolean => {
    if (step.requiredRoute && location.pathname !== step.requiredRoute) {
      navigate(step.requiredRoute);
      return true;
    }
    return false;
  }, [location.pathname, navigate]);

  // Handle Joyride callbacks
  const handleCallback = useCallback((data: CallBackProps) => {
    const { status, type, index, action } = data;

    // Handle tour completion
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setIsRunning(false);
      completeTour.mutate();
      onComplete?.();
      return;
    }

    // Handle step changes
    if (type === EVENTS.STEP_AFTER) {
      const nextIndex = action === 'prev' ? index - 1 : index + 1;
      
      if (nextIndex >= 0 && nextIndex < steps.length) {
        const nextStep = steps[nextIndex];
        
        // Navigate if step requires different route
        if (navigateToStepRoute(nextStep)) {
          // Wait for navigation then continue
          setTimeout(() => {
            setStepIndex(nextIndex);
          }, 300);
        } else {
          setStepIndex(nextIndex);
        }
      }
    }

    // Handle target not found
    if (type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + 1;
      if (nextIndex < steps.length) {
        setStepIndex(nextIndex);
      } else {
        setIsRunning(false);
        completeTour.mutate();
        onComplete?.();
      }
    }
  }, [steps, navigateToStepRoute, completeTour, onComplete]);

  // Don't render on mobile or if no steps
  if (isMobile || steps.length === 0) {
    return null;
  }

  // Check if current step target exists
  const currentStep = steps[stepIndex];
  const targetExists = currentStep && typeof currentStep.target === 'string' 
    ? checkTargetExists(currentStep.target) 
    : true;

  return (
    <Joyride
      steps={steps}
      stepIndex={stepIndex}
      run={isRunning && targetExists}
      continuous
      showSkipButton
      showProgress
      scrollToFirstStep
      scrollOffset={100}
      disableOverlayClose
      spotlightClicks
      callback={handleCallback}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: 'hsl(var(--primary))',
          backgroundColor: 'hsl(var(--background))',
          textColor: 'hsl(var(--foreground))',
          arrowColor: 'hsl(var(--background))',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
        },
        tooltip: {
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
        },
        tooltipTitle: {
          fontSize: '16px',
          fontWeight: 600,
          marginBottom: '8px',
        },
        tooltipContent: {
          fontSize: '14px',
          lineHeight: 1.5,
          padding: '8px 0',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 500,
          padding: '8px 16px',
        },
        buttonBack: {
          color: 'hsl(var(--muted-foreground))',
          marginRight: '8px',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
        },
        spotlight: {
          borderRadius: '8px',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  );
};
