import { useState } from "react";
import { format, differenceInYears } from "date-fns";
import { CalendarIcon, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface EditableDateFieldProps {
  icon?: React.ReactNode;
  label: string;
  value: string | null | undefined;
  onSave: (value: string) => Promise<void>;
  placeholder?: string;
  canEdit?: boolean;
  className?: string;
  showAge?: boolean;
}

export const EditableDateField = ({
  icon,
  label,
  value,
  onSave,
  placeholder = "Not specified",
  canEdit = true,
  className,
  showAge = false,
}: EditableDateFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editDate, setEditDate] = useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [isHovered, setIsHovered] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!editDate) {
      setIsEditing(false);
      return;
    }
    const newValue = format(editDate, "yyyy-MM-dd");
    if (newValue === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(newValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditDate(value ? new Date(value) : undefined);
    setIsEditing(false);
  };

  const displayValue = value
    ? format(new Date(value), "MMMM d, yyyy")
    : null;

  const age = value ? differenceInYears(new Date(), new Date(value)) : null;

  return (
    <div
      className={cn("flex items-start gap-3 group", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {icon && (
        <div className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">{label}</p>
          {canEdit && !isEditing && isHovered && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2 mt-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-8 justify-start text-left font-normal text-sm",
                    !editDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {editDate ? format(editDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={editDate}
                  onSelect={setEditDate}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <div className="flex gap-1 flex-shrink-0">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="p-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="p-1.5 rounded bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm font-medium text-foreground">
            {displayValue ? (
              <>
                {displayValue}
                {showAge && age !== null && (
                  <span className="ml-2 text-muted-foreground">({age} years old)</span>
                )}
              </>
            ) : (
              <span className="text-muted-foreground italic">{placeholder}</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
};
