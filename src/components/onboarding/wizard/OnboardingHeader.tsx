/**
 * Organization Onboarding - Header with Progress Indicator
 * Shows segmented phase progress bar with grouped steps
 */

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import globalyosIcon from '@/assets/globalyos-icon.png';

// Phase groupings for 12 steps
const PHASES = [
  { label: 'Setup', steps: [1, 2, 3, 4] },
  { label: 'Profile & Team', steps: [5, 6] },
  { label: 'Guides', steps: [7, 8, 9, 10, 11] },
  { label: 'Complete', steps: [12] },
];

interface OnboardingHeaderProps {
  currentStep: number;
  totalSteps: number;
  stepNames: string[];
  onSkip: () => void;
}

export function OnboardingHeader({ 
  currentStep, 
  totalSteps, 
  stepNames,
  onSkip 
}: OnboardingHeaderProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b">
      <div className="max-w-6xl mx-auto px-4 py-3">
        {/* Top row: Logo */}
        <div className="flex items-center justify-center mt-4 mb-4">
          <div className="flex items-center gap-3">
            <img 
              src={globalyosIcon} 
              alt="GlobalyOS" 
              className="h-10 w-10 rounded-lg"
            />
            <span className="font-semibold text-lg text-foreground">GlobalyOS Setup</span>
          </div>
        </div>
        
        {/* Segmented phase progress indicator */}
        <div className="flex flex-col items-center w-full px-2">
          {/* Phase segments row */}
          <div className="flex items-center justify-center gap-2">
            {PHASES.map((phase, phaseIndex) => {
              const isPhaseCompleted = phase.steps.every(s => s < currentStep);
              const isPhaseActive = phase.steps.includes(currentStep);
              const isPhaseUpcoming = phase.steps.every(s => s > currentStep);
              
              return (
                <div key={phaseIndex} className="flex items-center">
                  {/* Phase segment */}
                  <div
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                      isPhaseCompleted && 'bg-primary/10 text-primary',
                      isPhaseActive && 'bg-primary text-primary-foreground',
                      isPhaseUpcoming && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {/* Phase label with checkmark for completed phases */}
                    {isPhaseCompleted && phase.label !== 'Complete' && (
                      <Check className="h-3 w-3" />
                    )}
                    <span>{phase.label}</span>
                    
                    {/* Mini dots for steps in this phase */}
                    <div className="flex items-center gap-0.5 ml-1">
                      {phase.steps.map((stepNum) => {
                        const isDotCompleted = stepNum < currentStep;
                        const isDotCurrent = stepNum === currentStep;
                        
                        return (
                          <div
                            key={stepNum}
                            className={cn(
                              'rounded-full transition-all',
                              isDotCompleted && 'w-1.5 h-1.5 bg-primary',
                              isDotCurrent && 'w-2 h-2 bg-primary-foreground',
                              !isDotCompleted && !isDotCurrent && 'w-1.5 h-1.5 bg-current opacity-30'
                            )}
                          />
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Arrow connector between phases */}
                  {phaseIndex < PHASES.length - 1 && (
                    <div className={cn(
                      'mx-1 text-xs',
                      isPhaseCompleted ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      →
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Current step indicator text */}
          <div className="mt-3 text-sm text-muted-foreground">
            Step {currentStep} of {totalSteps}: <span className="font-medium text-foreground">{stepNames[currentStep - 1]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
