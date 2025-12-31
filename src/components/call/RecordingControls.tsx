import React from 'react';
import { Circle, Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  onStartRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onStopRecording: () => void;
  className?: string;
}

export const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  isPaused,
  duration,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  className,
}) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  if (!isRecording) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className={cn("h-10 w-10 rounded-full", className)}
              onClick={onStartRecording}
            >
              <Circle className="h-5 w-5 text-destructive" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Start recording</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        {/* Recording indicator */}
        <div className="flex items-center gap-2 bg-destructive/10 px-3 py-1.5 rounded-full">
          <Circle className={cn(
            "h-3 w-3 fill-destructive text-destructive",
            !isPaused && "animate-pulse"
          )} />
          <span className="text-sm font-medium text-destructive">
            {formatDuration(duration)}
          </span>
        </div>
        
        {/* Pause/Resume */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={isPaused ? onResumeRecording : onPauseRecording}
            >
              {isPaused ? (
                <Play className="h-4 w-4" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isPaused ? 'Resume' : 'Pause'}</TooltipContent>
        </Tooltip>
        
        {/* Stop */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={onStopRecording}
            >
              <Square className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Stop recording</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
