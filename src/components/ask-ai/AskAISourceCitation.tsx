import { FileText, Users, Calendar, Megaphone, BookOpen, Clock, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface Source {
  type: string;
  title?: string;
  similarity?: number;
}

interface AskAISourceCitationProps {
  sources: Source[];
  className?: string;
}

const SOURCE_ICONS: Record<string, typeof FileText> = {
  wiki_page: BookOpen,
  team_member: Users,
  calendar_event: Calendar,
  announcement: Megaphone,
  leave_record: Clock,
  attendance: Clock,
  kpi: Target,
  document: FileText,
  conversation_history: FileText,
};

const SOURCE_LABELS: Record<string, string> = {
  wiki_page: "Wiki",
  team_member: "Team",
  calendar_event: "Calendar",
  announcement: "Announcement",
  leave_record: "Leave",
  attendance: "Attendance",
  kpi: "KPI",
  document: "Document",
  conversation_history: "History",
};

export const AskAISourceCitation = ({ sources, className }: AskAISourceCitationProps) => {
  if (!sources || sources.length === 0) return null;

  // Group by type
  const groupedSources = sources.reduce((acc, source) => {
    if (!acc[source.type]) {
      acc[source.type] = [];
    }
    acc[source.type].push(source);
    return acc;
  }, {} as Record<string, Source[]>);

  return (
    <div className={cn("mt-3 pt-3 border-t border-dashed", className)}>
      <p className="text-xs text-muted-foreground mb-2 font-medium">Sources used:</p>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(groupedSources).map(([type, typeSources]) => {
          const Icon = SOURCE_ICONS[type] || FileText;
          const label = SOURCE_LABELS[type] || type;
          
          // If there are multiple of the same type, show count
          const displayLabel = typeSources.length > 1 
            ? `${label} (${typeSources.length})` 
            : typeSources[0].title || label;

          return (
            <div
              key={type}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 text-xs text-muted-foreground hover:bg-muted transition-colors cursor-default"
              title={typeSources.map(s => s.title || type).join(", ")}
            >
              <Icon className="h-3 w-3" />
              <span className="max-w-[150px] truncate">{displayLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
