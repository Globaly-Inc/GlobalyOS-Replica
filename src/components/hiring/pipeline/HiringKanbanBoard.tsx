import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { OrgLink } from '@/components/OrgLink';
import { useUpdateApplicationStage } from '@/services/useHiringMutations';
import { 
  ApplicationStage, 
  APPLICATION_STAGE_LABELS,
  CandidateApplicationWithRelations,
  JobStage 
} from '@/types/hiring';
import { 
  User, 
  MoreHorizontal,
  Mail,
  FileText,
  Calendar,
  GripVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface HiringKanbanBoardProps {
  jobId: string;
  applications: CandidateApplicationWithRelations[];
  stages: JobStage[];
}

const DEFAULT_STAGES: ApplicationStage[] = [
  'applied',
  'screening',
  'assignment',
  'interview_1',
  'interview_2',
  'interview_3',
  'offer',
  'hired',
];

const STAGE_COLORS: Record<ApplicationStage, string> = {
  applied: 'bg-slate-100 border-slate-300 dark:bg-slate-900 dark:border-slate-700',
  screening: 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
  assignment: 'bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800',
  interview_1: 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800',
  interview_2: 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800',
  interview_3: 'bg-pink-50 border-pink-200 dark:bg-pink-950 dark:border-pink-800',
  offer: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
  hired: 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950 dark:border-emerald-700',
  rejected: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
};

export function HiringKanbanBoard({ jobId, applications, stages }: HiringKanbanBoardProps) {
  const updateStage = useUpdateApplicationStage();
  const [draggedApp, setDraggedApp] = useState<string | null>(null);

  // Use custom stages if defined, otherwise use defaults
  const displayStages = stages.length > 0 
    ? stages.map(s => s.stage_key)
    : DEFAULT_STAGES;

  const applicationsByStage = displayStages.reduce((acc, stage) => {
    acc[stage] = applications.filter(app => app.stage === stage);
    return acc;
  }, {} as Record<string, CandidateApplicationWithRelations[]>);

  const handleDragStart = (e: React.DragEvent, applicationId: string) => {
    setDraggedApp(applicationId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, newStage: ApplicationStage) => {
    e.preventDefault();
    if (!draggedApp) return;

    const application = applications.find(a => a.id === draggedApp);
    if (!application || application.stage === newStage) {
      setDraggedApp(null);
      return;
    }

    try {
      await updateStage.mutateAsync({
        applicationId: draggedApp,
        stage: newStage,
      });
      toast.success(`Moved to ${APPLICATION_STAGE_LABELS[newStage]}`);
    } catch (error) {
      toast.error('Failed to update stage');
    }
    setDraggedApp(null);
  };

  const handleDragEnd = () => {
    setDraggedApp(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-4 pb-4">
        {displayStages.map((stage) => (
          <div
            key={stage}
            className={`flex-shrink-0 w-72 rounded-lg border-2 ${STAGE_COLORS[stage] || 'bg-muted'}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage)}
          >
            {/* Column Header */}
            <div className="p-3 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">
                  {APPLICATION_STAGE_LABELS[stage] || stage}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {applicationsByStage[stage]?.length || 0}
                </Badge>
              </div>
            </div>

            {/* Cards */}
            <div className="p-2 space-y-2 min-h-[200px]">
              {applicationsByStage[stage]?.map((app) => {
                const candidateName = app.candidate?.name || 'Unknown';
                const candidateEmail = app.candidate?.email || '';
                const avatarUrl = app.candidate?.avatar_url;
                
                return (
                  <Card
                    key={app.id}
                    className={`cursor-grab active:cursor-grabbing transition-all ${
                      draggedApp === app.id ? 'opacity-50 scale-95' : 'hover:shadow-md'
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, app.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage src={avatarUrl || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(candidateName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <OrgLink
                              to={`/hiring/applications/${app.id}`}
                              className="font-medium text-sm hover:text-primary truncate block"
                            >
                              {candidateName}
                            </OrgLink>
                            <p className="text-xs text-muted-foreground truncate">
                              {candidateEmail}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <OrgLink to={`/hiring/applications/${app.id}`}>
                                <User className="h-4 w-4 mr-2" />
                                View Application
                              </OrgLink>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="h-4 w-4 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="h-4 w-4 mr-2" />
                              Assign Task
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Calendar className="h-4 w-4 mr-2" />
                              Schedule Interview
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                updateStage.mutate({
                                  applicationId: app.id,
                                  stage: 'rejected',
                                });
                              }}
                            >
                              Reject Candidate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {app.is_internal && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Internal
                          </Badge>
                        )}
                        {app.rating && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            ★ {app.rating}
                          </Badge>
                        )}
                      </div>

                      {/* Date */}
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Applied {format(new Date(app.created_at), 'MMM d')}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Empty state */}
              {(!applicationsByStage[stage] || applicationsByStage[stage].length === 0) && (
                <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                  Drop candidates here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
