import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, Diamond } from 'lucide-react';
import type { KpiMilestone } from '@/types/kpi';

interface KpiMilestoneProgressProps {
  progress: number;
  milestones?: KpiMilestone[];
  currentValue: number | null;
  targetValue: number | null;
  unit?: string | null;
}

export const KpiMilestoneProgress = ({
  progress,
  milestones,
  currentValue,
  targetValue,
  unit,
}: KpiMilestoneProgressProps) => {
  const defaultMilestones: KpiMilestone[] = [
    { percent: 25, label: 'Getting Started', reached: false, reached_at: null },
    { percent: 50, label: 'Halfway There', reached: false, reached_at: null },
    { percent: 75, label: 'Almost Done', reached: false, reached_at: null },
    { percent: 100, label: 'Goal Achieved!', reached: false, reached_at: null },
  ];

  const activeMilestones = milestones || defaultMilestones;

  // Calculate which milestones are reached based on progress
  const milestonesWithStatus = activeMilestones.map(m => ({
    ...m,
    reached: progress >= m.percent,
  }));

  return (
    <div className="space-y-4">
      {/* Progress bar with milestone markers */}
      <div className="relative">
        <Progress value={progress} className="h-3" />
        
        {/* Milestone markers */}
        <TooltipProvider>
          <div className="absolute inset-0 pointer-events-none">
            {milestonesWithStatus.map((milestone, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer"
                    style={{ left: `${milestone.percent}%`, transform: `translate(-50%, -50%)` }}
                  >
                    <div
                      className={`relative flex items-center justify-center w-5 h-5 rounded-full border-2 transition-all ${
                        milestone.reached
                          ? 'bg-primary border-primary text-primary-foreground'
                          : progress >= milestone.percent - 5
                          ? 'bg-primary/20 border-primary animate-pulse'
                          : 'bg-background border-muted-foreground/30'
                      }`}
                    >
                      {milestone.reached ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Diamond className="h-2 w-2" />
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-center">
                  <p className="font-medium">{milestone.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {milestone.percent}% • {milestone.reached ? '✓ Reached' : 'In Progress'}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </div>

      {/* Values display */}
      <div className="flex justify-between text-sm">
        <div>
          <span className="text-muted-foreground">Current: </span>
          <span className="font-medium">
            {currentValue ?? 0} {unit || ''}
          </span>
        </div>
        <div className="text-2xl font-bold">{progress}%</div>
        <div>
          <span className="text-muted-foreground">Target: </span>
          <span className="font-medium">
            {targetValue ?? 0} {unit || ''}
          </span>
        </div>
      </div>

      {/* Milestone badges */}
      <div className="flex flex-wrap gap-2">
        {milestonesWithStatus.filter(m => m.reached).map((milestone, index) => (
          <div
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
          >
            <Check className="h-3 w-3" />
            {milestone.label}
          </div>
        ))}
      </div>
    </div>
  );
};
