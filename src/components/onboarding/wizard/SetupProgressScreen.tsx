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

interface SetupProgressScreenProps {
  orgName: string;
  teamMembersCount: number;
  organizationId: string;
  teamMembers: TeamMember[];
  offices?: Office[];
  employeeId?: string;
  onComplete: () => void;
}

export function SetupProgressScreen({
  orgName,
  teamMembersCount,
  organizationId,
  teamMembers,
  offices = [],
  employeeId,
  onComplete,
}: SetupProgressScreenProps) {
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Check if any offices have public holidays enabled
  const officesWithHolidays = offices.filter(o => o.public_holidays_enabled && o.address_components?.country_code);
  const hasOfficesWithPublicHolidays = officesWithHolidays.length > 0;
  
  // Check if any team members have an office assigned (for schedule assignment)
  const teamMembersWithOffice = teamMembers.filter(m => m.office_id);
  const hasTeamMembersWithOffice = teamMembersWithOffice.length > 0;

  // Setup public holidays for offices
  const setupPublicHolidays = useCallback(async () => {
    if (!hasOfficesWithPublicHolidays || !employeeId) return;

    try {
      console.log(`Setting up public holidays for ${officesWithHolidays.length} offices...`);
      const { data, error } = await supabase.functions.invoke('setup-public-holidays', {
        body: {
          organizationId,
          offices: officesWithHolidays.map(o => ({
            id: o.id,
            countryCode: o.address_components?.country_code,
          })),
          createdBy: employeeId,
        },
      });

      if (error) {
        console.error('Failed to setup public holidays:', error);
      } else {
        console.log('Public holidays setup result:', data);
      }
    } catch (err) {
      console.error('Failed to setup public holidays:', err);
      // Non-blocking - continue with setup
    }
  }, [organizationId, officesWithHolidays, employeeId, hasOfficesWithPublicHolidays]);

  // Setup employee schedules based on office schedules
  const setupEmployeeSchedules = useCallback(async () => {
    if (!hasTeamMembersWithOffice) return;

    try {
      console.log(`Setting up schedules for ${teamMembersWithOffice.length} team members...`);
      const { data, error } = await supabase.functions.invoke('setup-employee-schedules', {
        body: {
          organizationId,
          teamMembers: teamMembersWithOffice.map(m => ({
            email: m.email,
            officeId: m.office_id,
          })),
        },
      });

      if (error) {
        console.error('Failed to setup employee schedules:', error);
      } else {
        console.log('Employee schedules setup result:', data);
      }
    } catch (err) {
      console.error('Failed to setup employee schedules:', err);
      // Non-blocking - continue with setup
    }
  }, [organizationId, teamMembersWithOffice, hasTeamMembersWithOffice]);

  // Generate AI descriptions for all positions
  const generatePositionDescriptions = useCallback(async () => {
    try {
      console.log('Generating AI descriptions for positions...');
      const { data, error } = await supabase.functions.invoke('bulk-generate-position-descriptions', {
        body: { organizationId },
      });

      if (error) {
        console.error('Failed to generate position descriptions:', error);
      } else {
        console.log('Position descriptions result:', data);
      }
    } catch (err) {
      console.error('Failed to generate position descriptions:', err);
      // Non-blocking - continue with setup
    }
  }, [organizationId]);

  // Generate AI descriptions for employment types
  const generateEmploymentTypeDescriptions = useCallback(async () => {
    try {
      console.log('Generating AI descriptions for employment types...');
      const { data, error } = await supabase.functions.invoke('bulk-generate-employment-type-descriptions', {
        body: { organizationId },
      });

      if (error) {
        console.error('Failed to generate employment type descriptions:', error);
      } else {
        console.log('Employment type descriptions result:', data);
      }
    } catch (err) {
      console.error('Failed to generate employment type descriptions:', err);
      // Non-blocking - continue with setup
    }
  }, [organizationId]);

  // Create team member accounts (auth.users, profiles, employees, etc.)
  const createTeamMembers = useCallback(async () => {
    if (teamMembers.length === 0) return;

    console.log(`Creating ${teamMembers.length} team member accounts...`);

    for (const member of teamMembers) {
      try {
        // Split full name for firstName/lastName
        const nameParts = (member.full_name || '').trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const { data, error } = await supabase.functions.invoke('invite-team-member', {
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
            skipEmail: true, // Emails sent separately via send-pending-invitations
          },
        });

        if (error) {
          // Check for 409 (user exists) - skip gracefully
          const errorContext = data?.error?.context || data?.context;
          if (error.message?.includes('409') || errorContext?.code === 'USER_EXISTS') {
            console.log(`User ${member.email} already exists, skipping`);
          } else {
            console.error(`Failed to create ${member.email}:`, error);
          }
        } else {
          console.log(`Created account for ${member.email}`);
        }
      } catch (err) {
        console.error(`Error creating ${member.email}:`, err);
      }
    }
  }, [organizationId, teamMembers]);

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

  // Define tasks dynamically based on configuration
  const tasks: SetupTask[] = [
    { id: 'org', label: 'Finalizing organization settings' },
    { id: 'depts', label: 'Configuring departments and roles' },
    { 
      id: 'positions', 
      label: 'Generating AI position descriptions',
      action: generatePositionDescriptions,
    },
    {
      id: 'employment-types',
      label: 'Generating employment type descriptions',
      action: generateEmploymentTypeDescriptions,
    },
    { id: 'offices', label: 'Setting up offices' },
    ...(hasOfficesWithPublicHolidays
      ? [{
          id: 'holidays',
          label: 'Setting up public holidays',
          action: setupPublicHolidays,
        }]
      : []),
    // Create team member accounts BEFORE schedules and invitations
    ...(teamMembersCount > 0
      ? [{
          id: 'accounts',
          label: `Creating ${teamMembersCount} team account${teamMembersCount > 1 ? 's' : ''}`,
          action: createTeamMembers,
        }]
      : []),
    ...(hasTeamMembersWithOffice
      ? [{
          id: 'schedules',
          label: 'Assigning work schedules',
          action: setupEmployeeSchedules,
        }]
      : []),
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
