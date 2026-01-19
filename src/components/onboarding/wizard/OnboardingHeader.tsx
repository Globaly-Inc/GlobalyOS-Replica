/**
 * Organization Onboarding - Header with Progress Indicator
 * Shows step pills with completion status and skip option
 */

import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import globalyosIcon from '@/assets/globalyos-icon.png';

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
        <div className="flex items-center justify-center mt-4 mb-8">
          <div className="flex items-center gap-3">
            <img 
              src={globalyosIcon} 
              alt="GlobalyOS" 
              className="h-10 w-10 rounded-lg"
            />
            <span className="font-semibold text-lg text-foreground">GlobalyOS Setup</span>
          </div>
        </div>
        
        {/* Step indicator pills - centered with horizontal scroll */}
        <div className="flex justify-center">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none max-w-full">
            {stepNames.map((name, index) => {
              const stepNumber = index + 1;
              const isCompleted = stepNumber < currentStep;
              const isCurrent = stepNumber === currentStep;
              
              return (
                <div key={index} className="flex items-center flex-shrink-0">
                  <div
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                      isCompleted && 'bg-primary/10 text-primary',
                      isCurrent && 'bg-primary text-primary-foreground',
                      !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <span className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-xs',
                        isCurrent ? 'bg-primary-foreground/20' : 'bg-muted-foreground/20'
                      )}>
                        {stepNumber}
                      </span>
                    )}
                    <span className="hidden sm:inline">{name}</span>
                  </div>
                  
                  {index < stepNames.length - 1 && (
                    <div className={cn(
                      'w-4 h-0.5 mx-1 flex-shrink-0',
                      isCompleted ? 'bg-primary/50' : 'bg-muted'
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Progress text for mobile */}
        <div className="sm:hidden text-center text-xs text-muted-foreground mt-2">
          Step {currentStep} of {totalSteps}: {stepNames[currentStep - 1]}
        </div>
      </div>
    </div>
  );
}
