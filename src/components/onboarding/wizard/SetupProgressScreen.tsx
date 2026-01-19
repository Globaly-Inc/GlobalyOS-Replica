/**
 * Organization Onboarding - Animated Setup Progress Screen
 * Shows progress through setup tasks with animated checkmarks and progress bar
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Loader2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface SetupTask {
  id: string;
  label: string;
  action?: () => Promise<void>;
}

interface SetupProgressScreenProps {
  orgName: string;
  teamMembersCount: number;
  organizationId: string;
  teamMembers: Array<{
    email: string;
    full_name: string;
    position?: string;
    department?: string;
    role?: string;
  }>;
  onComplete: () => void;
}

export function SetupProgressScreen({
  orgName,
  teamMembersCount,
  organizationId,
  teamMembers,
  onComplete,
}: SetupProgressScreenProps) {
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Send invitation emails
  const sendInvitations = useCallback(async () => {
    if (teamMembers.length === 0) return;
    
    try {
      console.log(`Sending invitation emails to ${teamMembers.length} team members...`);
      const { data, error } = await supabase.functions.invoke('send-pending-invitations', {
        body: {
          organizationId,
          teamMembers: teamMembers.map(m => ({
            email: m.email,
            fullName: m.full_name,
            position: m.position,
            department: m.department,
            role: m.role,
          })),
        },
      });

      if (error) {
        console.error('Failed to send invitation emails:', error);
      } else {
        console.log('Invitation emails result:', data);
      }
    } catch (err) {
      console.error('Failed to send invitation emails:', err);
      // Don't fail setup if emails fail
    }
  }, [organizationId, teamMembers]);

  // Define tasks dynamically based on teamMembersCount
  const tasks: SetupTask[] = [
    { id: 'org', label: 'Finalizing organization settings' },
    { id: 'depts', label: 'Configuring departments and roles' },
    { id: 'offices', label: 'Setting up offices' },
    ...(teamMembersCount > 0
      ? [{
          id: 'invites',
          label: `Sending ${teamMembersCount} invitation${teamMembersCount > 1 ? 's' : ''}`,
          action: sendInvitations,
        }]
      : []),
    { id: 'dashboard', label: 'Preparing your dashboard' },
  ];

  // Animate through tasks sequentially
  useEffect(() => {
    let cancelled = false;
    let taskIndex = 0;

    const runTasks = async () => {
      for (let i = 0; i < tasks.length; i++) {
        if (cancelled) return;
        
        const task = tasks[i];
        setCurrentTask(task.id);
        
        // Update progress smoothly during task
        const progressPerTask = 100 / tasks.length;
        const startProgress = i * progressPerTask;
        
        // Animate progress during task execution
        setProgress(startProgress);
        
        // Execute task action if exists
        if (task.action) {
          await task.action();
        }
        
        // Simulate minimum task duration for visual effect
        await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));
        
        if (cancelled) return;
        
        // Mark task complete
        setCompletedTasks(prev => [...prev, task.id]);
        setProgress(startProgress + progressPerTask);
        
        taskIndex = i + 1;
      }
      
      // All tasks complete
      setCurrentTask(null);
      setProgress(100);
      
      // Brief pause at 100% before redirect
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (!cancelled) {
        onComplete();
      }
    };

    runTasks();

    return () => {
      cancelled = true;
    };
  }, []); // Run once on mount

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md border-0 shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <CardTitle className="text-xl">{orgName}</CardTitle>
          <CardDescription className="text-base">
            Operating System is setting up...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Task list with animated checkmarks */}
          <div className="space-y-3">
            {tasks.map((task) => {
              const isCompleted = completedTasks.includes(task.id);
              const isCurrent = currentTask === task.id;
              
              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 transition-all duration-300",
                    isCompleted && "animate-fade-in"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 animate-scale-in" />
                  ) : isCurrent ? (
                    <Loader2 className="h-5 w-5 text-primary flex-shrink-0 animate-spin" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />
                  )}
                  <span
                    className={cn(
                      "text-sm transition-colors duration-300",
                      isCompleted
                        ? "text-foreground"
                        : isCurrent
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {task.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-center text-sm text-muted-foreground">
              {Math.round(progress)}% complete
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
