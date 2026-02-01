/**
 * Activity Timeline Item
 * Single event card for the activity timeline
 */

import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import { 
  UserCheck, 
  UserPlus, 
  Clock, 
  Calendar, 
  Target, 
  FileText, 
  Heart, 
  Trophy, 
  GraduationCap,
  TrendingUp,
  Workflow,
  CheckCircle2,
} from 'lucide-react';
import type { ActivityTimelineEvent, ActivityCategory } from '@/types/activity';

interface ActivityTimelineItemProps {
  event: ActivityTimelineEvent;
  showAccessLevel?: boolean;
}

// Icon mapping for event types
const getEventIcon = (eventType: string, category: ActivityCategory) => {
  const iconMap: Record<string, React.ElementType> = {
    profile_activated: UserCheck,
    joined_organization: UserPlus,
    position_changed: TrendingUp,
    department_changed: TrendingUp,
    manager_changed: UserCheck,
    attendance_checked_in: Clock,
    attendance_checked_out: Clock,
    attendance_adjusted: Clock,
    leave_requested: Calendar,
    leave_approved: CheckCircle2,
    leave_rejected: Calendar,
    leave_cancelled: Calendar,
    kpi_created: Target,
    kpi_updated: Target,
    kpi_milestone_reached: Trophy,
    review_started: Target,
    review_completed: CheckCircle2,
    document_uploaded: FileText,
    document_deleted: FileText,
    kudos_received: Heart,
    achievement_unlocked: Trophy,
    training_assigned: GraduationCap,
    training_completed: GraduationCap,
    certification_earned: GraduationCap,
    workflow_task_completed: Workflow,
    onboarding_completed: CheckCircle2,
  };

  return iconMap[eventType] || getDefaultIconForCategory(category);
};

const getDefaultIconForCategory = (category: ActivityCategory) => {
  const categoryIcons: Record<ActivityCategory, React.ElementType> = {
    profile: UserCheck,
    attendance: Clock,
    leave: Calendar,
    kpi: Target,
    documents: FileText,
    recognition: Heart,
    learning: GraduationCap,
    workflow: Workflow,
  };
  return categoryIcons[category] || FileText;
};

// Color mapping for categories
const getCategoryColor = (category: ActivityCategory): string => {
  const colorMap: Record<ActivityCategory, string> = {
    profile: 'bg-cyan-500',
    attendance: 'bg-blue-500',
    leave: 'bg-amber-500',
    kpi: 'bg-green-500',
    documents: 'bg-purple-500',
    recognition: 'bg-pink-500',
    learning: 'bg-indigo-500',
    workflow: 'bg-teal-500',
  };
  return colorMap[category] || 'bg-gray-500';
};

// Access level badge
const getAccessBadge = (accessLevel: string) => {
  switch (accessLevel) {
    case 'hr_admin':
      return <Badge variant="destructive" className="text-[10px] px-1">HR/Admin</Badge>;
    case 'manager':
      return <Badge variant="secondary" className="text-[10px] px-1">Manager+</Badge>;
    case 'self':
      return <Badge variant="outline" className="text-[10px] px-1">Self</Badge>;
    default:
      return null;
  }
};

export const ActivityTimelineItem = ({ event, showAccessLevel = false }: ActivityTimelineItemProps) => {
  const Icon = getEventIcon(event.event_type, event.event_category);
  const color = getCategoryColor(event.event_category);

  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div className={`absolute left-2 w-5 h-5 rounded-full ${color} flex items-center justify-center text-white`}>
        <Icon className="h-3 w-3" />
      </div>
      
      <div className="bg-card border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-foreground">{event.title}</h4>
            {event.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
            )}
            {event.actor_name && event.actor_id !== event.actor_id && (
              <p className="text-xs text-muted-foreground/70 mt-1">
                by {event.actor_name}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge variant="outline" className="text-[10px] capitalize">
              {event.event_category}
            </Badge>
            {showAccessLevel && getAccessBadge(event.access_level)}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {formatDateTime(event.event_timestamp)}
        </p>
      </div>
    </div>
  );
};
