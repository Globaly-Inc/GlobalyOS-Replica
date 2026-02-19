import { Eye, PenLine } from 'lucide-react';

interface CollisionIndicatorProps {
  viewingAgents: { user_id: string; user_name: string }[];
  typingAgents: { user_id: string; user_name: string }[];
}

export const CollisionIndicator = ({ viewingAgents, typingAgents }: CollisionIndicatorProps) => {
  if (viewingAgents.length === 0 && typingAgents.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 text-xs text-muted-foreground bg-muted/40 border-b border-border">
      {typingAgents.length > 0 && (
        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
          <PenLine className="h-3 w-3" />
          {typingAgents.length === 1
            ? `${typingAgents[0].user_name || 'An agent'} is typing...`
            : `${typingAgents.length} agents are typing...`}
        </span>
      )}
      {viewingAgents.length > 0 && (
        <span className="flex items-center gap-1">
          <Eye className="h-3 w-3" />
          {viewingAgents.length === 1
            ? `${viewingAgents[0].user_name || 'An agent'} is viewing`
            : `${viewingAgents.length} agents viewing`}
        </span>
      )}
    </div>
  );
};
