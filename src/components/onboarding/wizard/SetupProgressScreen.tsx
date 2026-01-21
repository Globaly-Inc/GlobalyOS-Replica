/**
 * Organization Onboarding - Animated Setup Progress Screen
 * Shows progress through setup tasks with animated checkmarks and progress bar
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, Building2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SetupTask {
  id: string;
  label: string;
  action?: () => Promise<void>;
}

interface Office {
  id?: string;
  name: string;
  public_holidays_enabled?: boolean;
  address_components?: {
    country_code?: string;
  };
}

interface TeamMember {
  email: string;
  full_name: string;
  position?: string;
  department?: string;
  role?: string;
  office_id?: string;
}

interface OwnerProfile {
  office_id?: string;
}

interface SetupProgressScreenProps {
  orgName: string;
  teamMembersCount: number;
  organizationId: string;
  teamMembers: TeamMember[];
  offices?: Office[];
  employeeId?: string;
  ownerProfile?: OwnerProfile;
  onComplete: () => void;
}

export function SetupProgressScreen({
  orgName,
  teamMembersCount,
  organizationId,
  teamMembers,
  offices = [],
  employeeId,
  ownerProfile,
  onComplete,
}: SetupProgressScreenProps) {
  const { user } = useAuth();
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [resolvedEmployeeId, setResolvedEmployeeId] = useState<string | null>(employeeId || null);
  const [isReady, setIsReady] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Check if any offices have public holidays enabled
  const officesWithHolidays = offices.filter(o => o.public_holidays_enabled && o.address_components?.country_code);
  const hasOfficesWithPublicHolidays = officesWithHolidays.length > 0;
  
  // Include owner in schedule setup if they have an office assigned
  const ownerAsTeamMember = ownerProfile?.office_id && user?.email ? {
    email: user.email,
    office_id: ownerProfile.office_id,
  } : null;
  
  // Combine owner + team members for schedule assignment
  const allMembersWithOffice = [
    ...(ownerAsTeamMember ? [ownerAsTeamMember] : []),
    ...teamMembers.filter(m => m.office_id),
  ];
  const hasAnyMembersWithOffice = allMembersWithOffice.length > 0;

  // Fetch employee ID if not provided as prop
  useEffect(() => {
    if (resolvedEmployeeId) {
      setIsReady(true);
      return;
    }
    if (!user?.id || !organizationId) return;

    const fetchEmployeeId = async () => {
      console.log('Fetching employee ID for user:', user.id);
      const { data, error } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .single();
      
      if (error) {
        console.error('Failed to fetch employee ID:', error);
      }
      
      if (data?.id) {
        console.log('Resolved employee ID:', data.id);
        setResolvedEmployeeId(data.id);
      }
      setIsReady(true);
    };
    
    fetchEmployeeId();
  }, [user?.id, organizationId, resolvedEmployeeId, employeeId]);

  // Setup public holidays for offices with retry logic
  const setupPublicHolidays = useCallback(async () => {
    if (!hasOfficesWithPublicHolidays || !resolvedEmployeeId) return;

    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const { error } = await supabase.functions.invoke('setup-public-holidays', {
          body: {
            organizationId,
            offices: officesWithHolidays.map(o => ({
              id: o.id,
              countryCode: o.address_components?.country_code,
            })),
            createdBy: resolvedEmployeeId,
          },
        });
        if (error) throw error;
        return;
      } catch (err) {
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000));
      }
    }
  }, [organizationId, officesWithHolidays, resolvedEmployeeId, hasOfficesWithPublicHolidays]);

  // Setup employee schedules
  const setupEmployeeSchedules = useCallback(async () => {
    if (!hasAnyMembersWithOffice) return;

    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const { error } = await supabase.functions.invoke('setup-employee-schedules', {
          body: {
            organizationId,
            teamMembers: allMembersWithOffice.map(m => ({
              email: m.email,
              officeId: m.office_id,
            })),
          },
        });
        if (error) throw error;
        return;
      } catch (err) {
        if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000));
      }
    }
  }, [organizationId, allMembersWithOffice, hasAnyMembersWithOffice]);

  // Generate AI descriptions for positions
  const generatePositionDescriptions = useCallback(async () => {
    try {
      await supabase.functions.invoke('bulk-generate-position-descriptions', {
        body: { organizationId },
      });
    } catch (err) {
      console.error('Failed to generate position descriptions:', err);
    }
  }, [organizationId]);

  // Generate AI descriptions for employment types
  const generateEmploymentTypeDescriptions = useCallback(async () => {
    try {
      await supabase.functions.invoke('bulk-generate-employment-type-descriptions', {
        body: { organizationId },
      });
    } catch (err) {
      console.error('Failed to generate employment type descriptions:', err);
    }
  }, [organizationId]);

  // Create team member accounts
  const createTeamMembers = useCallback(async () => {
    if (teamMembers.length === 0) return;

    for (const member of teamMembers) {
      try {
        const nameParts = (member.full_name || '').trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        await supabase.functions.invoke('invite-team-member', {
          body: {
            email: member.email,
            fullName: member.full_name,
            firstName,
            lastName,
            position: member.position || 'Team Member',
            department: member.department || 'General',
            role: member.role || 'member',
            officeId: member.office_id || null,
            organizationId,
            employmentType: 'employee',
            skipEmail: true,
          },
        });
      } catch (err) {
        console.error(`Error creating ${member.email}:`, err);
      }
    }
  }, [organizationId, teamMembers]);

  // Send invitation emails
  const sendInvitations = useCallback(async () => {
    if (teamMembers.length === 0) return;
    
    try {
      await supabase.functions.invoke('send-pending-invitations', {
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
    } catch (err) {
      console.error('Failed to send invitation emails:', err);
    }
  }, [organizationId, teamMembers]);

  // Define tasks dynamically
  const tasks: SetupTask[] = [
    { id: 'org', label: 'Finalizing organization settings' },
    { id: 'depts', label: 'Configuring departments and roles' },
    { id: 'positions', label: 'Generating AI position descriptions', action: generatePositionDescriptions },
    { id: 'employment-types', label: 'Generating employment type descriptions', action: generateEmploymentTypeDescriptions },
    { id: 'offices', label: 'Setting up offices' },
    ...(hasOfficesWithPublicHolidays ? [{ id: 'holidays', label: 'Setting up public holidays', action: setupPublicHolidays }] : []),
    ...(teamMembersCount > 0 ? [{ id: 'accounts', label: `Creating ${teamMembersCount} team account${teamMembersCount > 1 ? 's' : ''}`, action: createTeamMembers }] : []),
    ...(hasAnyMembersWithOffice ? [{ id: 'schedules', label: 'Assigning work schedules', action: setupEmployeeSchedules }] : []),
    ...(teamMembersCount > 0 ? [{ id: 'invites', label: `Sending ${teamMembersCount} invitation${teamMembersCount > 1 ? 's' : ''}`, action: sendInvitations }] : []),
    { id: 'dashboard', label: 'Preparing your dashboard' },
  ];

  // Calculate minimum duration per task for ~10 second experience
  const minTotalDuration = 10000;
  const minPerTask = Math.max(800, minTotalDuration / tasks.length);

  // Animate through tasks sequentially
  useEffect(() => {
    if (!isReady) return;

    let cancelled = false;

    const runTasks = async () => {
      for (let i = 0; i < tasks.length; i++) {
        if (cancelled) return;
        
        const task = tasks[i];
        setCurrentTask(task.id);
        
        const progressPerTask = 100 / tasks.length;
        const startProgress = i * progressPerTask;
        setProgress(startProgress);
        
        if (task.action) {
          await task.action();
        }
        
        // Ensure minimum duration per task for smooth experience
        await new Promise(resolve => setTimeout(resolve, minPerTask + Math.random() * 200));
        
        if (cancelled) return;
        
        setCompletedTasks(prev => [...prev, task.id]);
        setProgress(startProgress + progressPerTask);
      }
      
      setCurrentTask(null);
      setProgress(100);
      setIsComplete(true);
      
      // Show completion state briefly before redirect
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      if (!cancelled) {
        onComplete();
      }
    };

    runTasks();

    return () => {
      cancelled = true;
    };
  }, [isReady, resolvedEmployeeId]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[10%] w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-[10%] w-40 h-40 bg-accent/10 rounded-full blur-3xl animate-float-particle" />
        <div className="absolute top-1/2 left-[20%] w-24 h-24 bg-success/10 rounded-full blur-2xl animate-twinkle" />
        <div className="absolute top-[30%] right-[25%] w-20 h-20 bg-primary/5 rounded-full blur-2xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      {/* Main content card */}
      <Card className="relative w-full max-w-lg border-0 shadow-2xl bg-card/95 backdrop-blur-sm animate-scale-in">
        <CardHeader className="text-center pb-2 pt-8">
          {/* Animated logo with pulsing rings */}
          <div className="relative mx-auto mb-6 h-20 w-20">
            {/* Outer pulsing rings */}
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-2 rounded-full bg-primary/15 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.3s' }} />
            
            {/* Gradient spinning border */}
            <div 
              className="absolute inset-0 rounded-full p-[3px] animate-spin"
              style={{ 
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))',
                animationDuration: '3s'
              }}
            >
              <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
            </div>
          </div>

          <CardTitle className="text-2xl font-semibold tracking-tight">
            Setting up {orgName}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            <span className="inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Configuring your workspace
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pb-8">
          {/* Task list with animations */}
          <div className="space-y-2">
            {tasks.map((task, index) => {
              const isCompleted = completedTasks.includes(task.id);
              const isCurrent = currentTask === task.id;
              const isPending = !isCompleted && !isCurrent;
              
              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ease-out",
                    isCurrent && "bg-primary/5 border border-primary/20 shadow-sm scale-[1.02]",
                    isCompleted && "opacity-80",
                    isPending && "opacity-40"
                  )}
                  style={{
                    transitionDelay: `${index * 30}ms`,
                  }}
                >
                  {/* Animated status icon */}
                  <div className="relative h-5 w-5 flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 animate-scale-in" />
                    ) : isCurrent ? (
                      <div className="relative h-5 w-5">
                        <div className="absolute inset-0 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                      </div>
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/30" />
                    )}
                  </div>
                  
                  <span
                    className={cn(
                      "text-sm transition-all duration-300 flex-1",
                      isCompleted && "text-muted-foreground",
                      isCurrent && "text-foreground font-medium",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {task.label}
                  </span>

                  {/* Completion indicator */}
                  {isCompleted && (
                    <span className="text-xs text-green-600 font-medium animate-fade-in">Done</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Enhanced progress bar */}
          <div className="space-y-3 pt-2">
            <div className="relative h-2.5 w-full bg-muted rounded-full overflow-hidden">
              {/* Progress fill with gradient */}
              <div 
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                style={{ 
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))',
                }}
              />
              {/* Shimmer effect */}
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-marquee"
                style={{ width: '200%' }}
              />
            </div>
            
            {/* Progress stats */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {completedTasks.length} of {tasks.length} tasks complete
              </span>
              <span className="font-medium text-primary">
                {Math.round(progress)}%
              </span>
            </div>
          </div>
        </CardContent>

        {/* Completion overlay */}
        {isComplete && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/95 backdrop-blur-sm rounded-lg animate-fade-in z-10">
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center animate-scale-in">
                <Sparkles className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-semibold">All set!</p>
                <p className="text-sm text-muted-foreground">Redirecting to your dashboard...</p>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
