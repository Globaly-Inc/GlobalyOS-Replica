/**
 * KPI Generation Progress Indicator
 * Shows a floating indicator when bulk KPI generation is in progress
 */

import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Sparkles, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";

interface KpiGenerationProgressProps {
  organizationId?: string;
}

// Store generation state in a simple global store for cross-component access
interface GenerationState {
  isGenerating: boolean;
  progress: number;
  totalKpis: number;
  createdKpis: number;
  failedKpis: number;
  currentItem: string;
  completed: boolean;
  errors: string[];
  jobId?: string; // Track the current job ID for navigation
}

// Simple event emitter for generation state
const listeners = new Set<(state: GenerationState) => void>();
let globalState: GenerationState = {
  isGenerating: false,
  progress: 0,
  totalKpis: 0,
  createdKpis: 0,
  failedKpis: 0,
  currentItem: "",
  completed: false,
  errors: [],
  jobId: undefined,
};

export const updateKpiGenerationState = (updates: Partial<GenerationState>) => {
  globalState = { ...globalState, ...updates };
  listeners.forEach(listener => listener(globalState));
};

export const resetKpiGenerationState = () => {
  globalState = {
    isGenerating: false,
    progress: 0,
    totalKpis: 0,
    createdKpis: 0,
    failedKpis: 0,
    currentItem: "",
    completed: false,
    errors: [],
    jobId: undefined,
  };
  listeners.forEach(listener => listener(globalState));
};

export const useKpiGenerationState = () => {
  const [state, setState] = useState<GenerationState>(globalState);

  useEffect(() => {
    const listener = (newState: GenerationState) => setState(newState);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return state;
};

export const KpiGenerationProgress = ({ organizationId }: KpiGenerationProgressProps) => {
  const location = useLocation();
  const { buildOrgPath } = useOrgNavigation();
  const navigate = useNavigate();
  const state = useKpiGenerationState();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if on the bulk create page itself
  const isOnBulkCreatePage = location.pathname.includes("/kpi/bulk-create");

  // Don't show if not generating, completed and dismissed, or on bulk create page
  if (!state.isGenerating && !state.completed) return null;
  if (isOnBulkCreatePage) return null;
  if (state.completed && dismissed) return null;

  const handleViewDetails = () => {
    // Navigate to job history page with the current job ID if available
    if (state.jobId) {
      navigate(buildOrgPath(`/kpi/generation-history?jobId=${state.jobId}`));
    } else {
      navigate(buildOrgPath("/kpi/generation-history"));
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (state.completed) {
      resetKpiGenerationState();
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-50 animate-in slide-in-from-right-5 duration-300">
      <div className={cn(
        "bg-card border rounded-lg shadow-lg p-3 min-w-[280px] max-w-[320px]",
        state.completed && state.failedKpis === 0 && "border-green-500/50",
        state.completed && state.failedKpis > 0 && "border-amber-500/50"
      )}>
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={cn(
            "flex-shrink-0 p-2 rounded-lg",
            state.isGenerating && "bg-primary/10",
            state.completed && state.failedKpis === 0 && "bg-green-500/10",
            state.completed && state.failedKpis > 0 && "bg-amber-500/10"
          )}>
            {state.isGenerating ? (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            ) : state.completed && state.failedKpis === 0 ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : state.completed && state.failedKpis > 0 ? (
              <XCircle className="h-5 w-5 text-amber-600" />
            ) : (
              <Sparkles className="h-5 w-5 text-primary" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h4 className="text-sm font-medium truncate">
                {state.isGenerating 
                  ? "Creating KPIs..." 
                  : state.completed 
                    ? state.failedKpis === 0 
                      ? "KPIs Created!" 
                      : "Creation Complete"
                    : "KPI Generation"
                }
              </h4>
              <Badge variant="outline" className="text-xs shrink-0">
                {state.createdKpis}/{state.totalKpis}
              </Badge>
            </div>

            {state.isGenerating && (
              <>
                <Progress value={state.progress} className="h-1.5 mb-1.5" />
                <p className="text-xs text-muted-foreground truncate">
                  {state.currentItem || "Processing..."}
                </p>
              </>
            )}

            {state.completed && (
              <p className="text-xs text-muted-foreground">
                {state.createdKpis} created
                {state.failedKpis > 0 && `, ${state.failedKpis} failed`}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs px-2"
                onClick={handleViewDetails}
              >
                View Details
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
              {state.completed && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs px-2"
                  onClick={handleDismiss}
                >
                  Dismiss
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
