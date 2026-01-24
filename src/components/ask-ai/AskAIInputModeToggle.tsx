import { MessageSquare, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";

export type InputMode = "message" | "note";

interface AskAIInputModeToggleProps {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  disabled?: boolean;
  className?: string;
}

export const AskAIInputModeToggle = ({
  mode,
  onModeChange,
  disabled,
  className,
}: AskAIInputModeToggleProps) => {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border bg-muted/30 p-0.5",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onModeChange("message")}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
          mode === "message"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Message
      </button>
      <button
        type="button"
        onClick={() => onModeChange("note")}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
          mode === "note"
            ? "bg-warning/20 shadow-sm text-warning"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <StickyNote className="h-3.5 w-3.5" />
        Note
      </button>
    </div>
  );
};
