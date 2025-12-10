import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableFieldProps {
  icon?: React.ReactNode;
  label: string;
  value: string | null | undefined;
  onSave: (value: string) => Promise<void>;
  type?: "text" | "textarea";
  placeholder?: string;
  canEdit?: boolean;
  className?: string;
}

export const EditableField = ({
  icon,
  label,
  value,
  onSave,
  type = "text",
  placeholder = "Not specified",
  canEdit = true,
  className,
}: EditableFieldProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [isHovered, setIsHovered] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value || "");
  }, [value]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || "");
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && type === "text") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

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
          <div className="flex items-start gap-2 mt-1">
            {type === "textarea" ? (
              <Textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[80px] text-sm"
                placeholder={placeholder}
              />
            ) : (
              <Input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8 text-sm"
                placeholder={placeholder}
              />
            )}
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
            {value || <span className="text-muted-foreground italic">{placeholder}</span>}
          </p>
        )}
      </div>
    </div>
  );
};
