import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OrgLink } from '@/components/OrgLink';
import { useUpdateApplicationStage } from '@/services/useHiringMutations';
import { useOrganization } from '@/hooks/useOrganization';
import { supabase } from '@/integrations/supabase/client';
import { 
  ApplicationStage, 
  APPLICATION_STAGE_LABELS,
  APPLICATION_STAGE_COLORS,
  CandidateApplicationWithRelations,
  JobStage 
} from '@/types/hiring';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface HiringKanbanBoardProps {
  jobId: string;
  applications: CandidateApplicationWithRelations[];
  stages: JobStage[];
  onStageChange?: (stage: ApplicationStage) => void;
}

function useOrgMemberEmails() {
  const { currentOrg } = useOrganization();
  return useQuery({
    queryKey: ['org-member-emails', currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_directory')
        .select('email, status')
        .eq('organization_id', currentOrg!.id);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const emp of data || []) {
        if (emp.email) map[emp.email.toLowerCase()] = emp.status;
      }
      return map;
    },
    enabled: !!currentOrg?.id,
    staleTime: 5 * 60 * 1000,
  });
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

export function HiringKanbanBoard({ jobId, applications, stages, onStageChange }: HiringKanbanBoardProps) {
  const updateStage = useUpdateApplicationStage();
  const { data: memberEmailMap } = useOrgMemberEmails();
  const [draggedApp, setDraggedApp] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const displayStages = stages.length > 0 
    ? stages.map(s => s.stage_key)
    : DEFAULT_STAGES;

  // Default selected stage: first stage with candidates, or 'applied'
  const firstWithCandidates = displayStages.find(
    s => applications.some(a => a.stage === s)
  );
  const [selectedStage, setSelectedStage] = useState<ApplicationStage>(
    (firstWithCandidates as ApplicationStage) || 'applied'
  );

  const handleStageChange = (stage: ApplicationStage) => {
    setSelectedStage(stage);
    onStageChange?.(stage);
  };

  const applicationsByStage = displayStages.reduce((acc, stage) => {
    acc[stage] = applications.filter(app => app.stage === stage);
    return acc;
  }, {} as Record<string, CandidateApplicationWithRelations[]>);

  const selectedApplications = applicationsByStage[selectedStage] || [];

  // Drag handlers for candidate cards
  const handleDragStart = (e: React.DragEvent, applicationId: string) => {
    setDraggedApp(applicationId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedApp(null);
    setDropTarget(null);
  };

  // Drop handlers for stage sidebar rows
  const handleStageDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(stage);
  };

  const handleStageDragLeave = () => {
    setDropTarget(null);
  };

  const handleStageDrop = async (e: React.DragEvent, newStage: ApplicationStage) => {
    e.preventDefault();
    setDropTarget(null);
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
      handleStageChange(newStage);
    } catch (error) {
      toast.error('Failed to update stage');
    }
    setDraggedApp(null);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* Left Panel: Stage Sidebar */}
      <div className="md:w-56 shrink-0 space-y-1">
        {displayStages.map((stage) => {
          const count = applicationsByStage[stage]?.length || 0;
          const isActive = selectedStage === stage;
          const isDropHover = dropTarget === stage;
          const borderColor = APPLICATION_STAGE_COLORS[stage] || 'hsl(var(--border))';

          return (
            <div
              key={stage}
              className={`
                flex items-center justify-between px-3 py-2.5 rounded-md cursor-pointer
                border-l-[3px] transition-all text-sm
                ${isActive ? 'bg-muted font-medium' : 'hover:bg-muted/50'}
                ${isDropHover && draggedApp ? 'ring-2 ring-primary ring-inset bg-primary/5' : ''}
              `}
              style={{ borderLeftColor: borderColor }}
              onClick={() => handleStageChange(stage as ApplicationStage)}
              onDragOver={(e) => handleStageDragOver(e, stage)}
              onDragLeave={handleStageDragLeave}
              onDrop={(e) => handleStageDrop(e, stage as ApplicationStage)}
            >
              <span className="truncate">{APPLICATION_STAGE_LABELS[stage] || stage}</span>
              <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                {count}
              </Badge>
            </div>
          );
        })}
      </div>

      {/* Right Panel: Candidate Grid */}
      <div className="flex-1 min-w-0">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-muted-foreground">
            {APPLICATION_STAGE_LABELS[selectedStage] || selectedStage} — {selectedApplications.length} candidate{selectedApplications.length !== 1 ? 's' : ''}
          </h3>
        </div>

        {selectedApplications.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedApplications.map((app) => {
              const name = app.candidate?.name || 'Unknown';
              const email = app.candidate?.email || '';
              const phone = app.candidate?.phone || '';
              const contactLine = [email, phone].filter(Boolean).join(' · ');
              const memberStatus = email ? memberEmailMap?.[email.toLowerCase()] : undefined;

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
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <OrgLink
                        to={`/hiring/applications/${app.id}`}
                        className="font-medium text-sm hover:text-primary truncate"
                      >
                        {name}
                      </OrgLink>
                      {(memberStatus === 'active' || memberStatus === 'invited') && (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                          Internal
                        </Badge>
                      )}
                      {memberStatus === 'inactive' && (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
                          Past Member
                        </Badge>
                      )}
                    </div>
                    {contactLine && (
                      <p className="text-xs text-muted-foreground truncate">
                        {contactLine}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Applied {format(new Date(app.created_at), 'd MMM yyyy, h:mm a')}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground border border-dashed rounded-lg">
            No candidates in this stage
          </div>
        )}
      </div>
    </div>
  );
}
