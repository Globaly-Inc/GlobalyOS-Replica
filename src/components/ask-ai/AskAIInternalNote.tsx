import { StickyNote } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MentionedEmployee {
  id: string;
  profiles: {
    full_name: string;
  };
}

export interface InternalNote {
  id: string;
  conversation_id: string;
  content: string;
  mentioned_employee_ids: string[];
  created_at: string;
  author?: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
  mentioned_employees?: MentionedEmployee[];
}

interface AskAIInternalNoteProps {
  note: InternalNote;
  className?: string;
}

export const AskAIInternalNote = ({ note, className }: AskAIInternalNoteProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Parse content to highlight mentions
  const renderContent = (content: string) => {
    // Match @Name patterns
    const mentionRegex = /@([A-Za-z\s]+?)(?=\s|$|@|[.,!?])/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before the mention
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // Add the mention with styling
      parts.push(
        <span
          key={match.index}
          className="text-primary font-medium bg-primary/10 px-1 rounded"
        >
          @{match[1]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  const authorName = note.author?.profiles.full_name || "Unknown";

  return (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-lg border-l-4 border-l-warning bg-warning/10",
        className
      )}
    >
      {/* Note Icon / Avatar */}
      <div className="flex-shrink-0">
        <Avatar className="h-8 w-8 border border-warning/30">
          <AvatarImage src={note.author?.profiles.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-warning/20 text-warning-foreground">
            {getInitials(authorName)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Header */}
        <div className="flex items-center gap-2 text-xs">
          <StickyNote className="h-3 w-3 text-warning" />
          <span className="font-medium text-warning">
            Internal Note
          </span>
          <span className="text-muted-foreground">from</span>
          <span className="font-medium">{authorName}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">
            {formatRelativeTime(note.created_at)}
          </span>
        </div>

        {/* Note Content */}
        <p className="text-sm text-foreground/90 whitespace-pre-wrap">
          {renderContent(note.content)}
        </p>

        {/* Footer hint */}
        <p className="text-[10px] text-muted-foreground italic">
          This note is only visible to team members, not sent to AI
        </p>
      </div>
    </div>
  );
};
