/**
 * Wizard Progress Bar Component
 * Shows current step progress in the onboarding wizard
 */

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function WizardProgress({ currentStep, totalSteps, className }: WizardProgressProps) {
  // Clamp values to prevent overflow display issues
  const displayStep = Math.min(currentStep, totalSteps);
  const progress = Math.min(((displayStep - 1) / (totalSteps - 1)) * 100, 100);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Step {displayStep} of {totalSteps}
        </span>
        <span className="text-muted-foreground">
          {Math.round(progress)}% complete
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-between">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div
              key={index}
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-all',
                isCompleted && 'bg-primary text-primary-foreground',
                isCurrent && 'bg-primary/20 text-primary ring-2 ring-primary ring-offset-2',
                !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
              )}
            >
              {isCompleted ? (
                <Check className="h-3 w-3" />
              ) : (
                stepNumber
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
