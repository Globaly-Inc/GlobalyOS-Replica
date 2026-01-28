import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { UserPlus, UserMinus, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { WorkflowStatus, WorkflowType } from "@/types/workflow";

interface ApplicationCardProps {
  workflow: {
    id: string;
    type: WorkflowType;
    status: WorkflowStatus;
    start_date: string;
    target_date: string;
    completed_at: string | null;
    employee: {
      id: string;
      position: string | null;
      profiles: {
        full_name: string;
        avatar_url: string | null;
      };
    };
    template?: { name: string } | null;
    tasks: { id: string; status: string }[];
  };
  onClick?: () => void;
}

export function ApplicationCard({ workflow, onClick }: ApplicationCardProps) {
  const { isOnline } = useOnlineStatus(workflow.employee?.id);
  const completedTasks = workflow.tasks?.filter(t => t.status === 'completed').length ?? 0;
  const totalTasks = workflow.tasks?.length ?? 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const TypeIcon = workflow.type === 'onboarding' ? UserPlus : UserMinus;
  const typeColor = workflow.type === 'onboarding' ? 'text-blue-600 bg-blue-50' : 'text-orange-600 bg-orange-50';
  
  const daysInfo = getDaysInfo(workflow);
  
  return (
    <Card 
      className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarImage src={workflow.employee?.profiles?.avatar_url || undefined} />
            <AvatarFallback>
              {workflow.employee?.profiles?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
          )}
        </div>
        
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">
              {workflow.employee?.profiles?.full_name}
            </h3>
            <Badge variant="outline" className={`gap-1 shrink-0 ${typeColor}`}>
              <TypeIcon className="h-3 w-3" />
              {workflow.type === 'onboarding' ? 'Onboarding' : 'Offboarding'}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground truncate">
            {workflow.employee?.position || 'No position'}
          </p>
          
          <div className="flex items-center gap-4 mt-2">
            <span className="text-xs text-muted-foreground">
              {workflow.type === 'onboarding' ? 'Started' : 'Last Day'}:{' '}
              {format(new Date(workflow.target_date), 'dd MMM yyyy')}
            </span>
            
            <div className="flex-1 max-w-[200px]">
              <div className="flex items-center gap-2">
                <Progress value={progressPercent} className="h-1.5 flex-1" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {completedTasks}/{totalTasks}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right side info */}
        <div className="flex items-center gap-3 shrink-0">
          {daysInfo && (
            <span className={`text-sm ${daysInfo.urgent ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              {daysInfo.text}
            </span>
          )}
          
          <StatusBadge status={workflow.status} />
          
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: WorkflowStatus }) {
  switch (status) {
    case 'active':
      return (
        <Badge variant="outline" className="border-green-500 text-green-600 gap-1">
          <Clock className="h-3 w-3" />
          Active
        </Badge>
      );
    case 'completed':
      return (
        <Badge className="bg-green-600 gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Done
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge variant="secondary">Cancelled</Badge>
      );
    default:
      return null;
  }
}

function getDaysInfo(workflow: ApplicationCardProps['workflow']): { text: string; urgent: boolean } | null {
  if (workflow.status === 'completed') {
    if (workflow.completed_at) {
      const daysAgo = differenceInDays(new Date(), new Date(workflow.completed_at));
      return { text: `Completed ${daysAgo}d ago`, urgent: false };
    }
    return null;
  }
  
  if (workflow.status === 'cancelled') {
    return null;
  }
  
  const daysRemaining = differenceInDays(new Date(workflow.target_date), new Date());
  
  if (daysRemaining < 0) {
    return { text: `${Math.abs(daysRemaining)}d overdue`, urgent: true };
  }
  
  if (daysRemaining === 0) {
    return { text: 'Due today', urgent: true };
  }
  
  if (daysRemaining <= 3) {
    return { text: `${daysRemaining}d left`, urgent: true };
  }
  
  return { text: `${daysRemaining}d left`, urgent: false };
}
