import { Search, Database, Sparkles, Check, BookOpen, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProcessingPhase = 
  | "analyzing" 
  | "fetching_context" 
  | "searching_wiki" 
  | "searching_team" 
  | "generating" 
  | "complete";

interface AskAITypingIndicatorProps {
  phase: ProcessingPhase;
  streamedContent?: string;
  className?: string;
}

const phases: Record<ProcessingPhase, { label: string; icon: typeof Search }> = {
  analyzing: { label: "Analyzing your question...", icon: Search },
  fetching_context: { label: "Fetching organization context...", icon: Building2 },
  searching_wiki: { label: "Searching knowledge base...", icon: BookOpen },
  searching_team: { label: "Looking up team data...", icon: Database },
  generating: { label: "Generating response...", icon: Sparkles },
  complete: { label: "Done", icon: Check },
};

export const AskAITypingIndicator = ({ 
  phase, 
  streamedContent,
  className 
}: AskAITypingIndicatorProps) => {
  const current = phases[phase];
  const Icon = current.icon;
  const isComplete = phase === "complete";
  
  return (
    <div className={cn("flex gap-3", className)}>
      {/* AI Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
        <Sparkles className="h-4 w-4 text-primary" />
      </div>
      
      <div className="flex-1 min-w-0">
        {/* Phase indicator */}
        <div className="flex items-center gap-2 mb-2">
          <Icon className={cn(
            "h-4 w-4 text-primary",
            !isComplete && "animate-pulse"
          )} />
          <span className="text-sm text-muted-foreground">{current.label}</span>
          {!isComplete && (
            <span className="flex gap-0.5 ml-1">
              <span 
                className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" 
                style={{ animationDelay: "0ms" }} 
              />
              <span 
                className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" 
                style={{ animationDelay: "150ms" }} 
              />
              <span 
                className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" 
                style={{ animationDelay: "300ms" }} 
              />
            </span>
          )}
        </div>
        
        {/* Streamed content preview */}
        {streamedContent && (
          <div className="text-sm text-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
            {streamedContent}
            <span className="inline-block w-2 h-4 bg-primary/60 ml-0.5 animate-pulse" />
          </div>
        )}
        
        {/* Progress bar */}
        {!isComplete && !streamedContent && (
          <div className="h-1 w-32 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary/60 rounded-full animate-progress-indeterminate" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AskAITypingIndicator;
