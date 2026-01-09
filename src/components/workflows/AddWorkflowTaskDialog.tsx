import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Loader2, Circle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { WorkflowTaskCategory } from "@/types/workflow";

interface AddWorkflowTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    description?: string;
    category: WorkflowTaskCategory;
    assigneeId?: string;
    dueDate?: string;
    isRequired: boolean;
    stageId: string;
  }) => void;
  isLoading?: boolean;
  stageId: string | null;
  stageName: string;
  organizationId: string;
  templateId?: string;
  stages?: Array<{ id: string; name: string; color?: string | null }>;
}

const CATEGORY_OPTIONS: { value: WorkflowTaskCategory; label: string }[] = [
  { value: "documentation", label: "Documentation" },
  { value: "equipment", label: "Equipment" },
  { value: "training", label: "Training" },
  { value: "access", label: "Access & Permissions" },
  { value: "exit_interview", label: "Exit Interview" },
  { value: "asset_return", label: "Asset Return" },
  { value: "knowledge_transfer", label: "Knowledge Transfer" },
  { value: "other", label: "Other" },
];

export function AddWorkflowTaskDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  stageId: initialStageId,
  stageName,
  organizationId,
  templateId,
  stages: providedStages,
}: AddWorkflowTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<WorkflowTaskCategory>("other");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isRequired, setIsRequired] = useState(true);
  const [selectedStageId, setSelectedStageId] = useState<string>("");

  // Set initial stage when dialog opens
  useEffect(() => {
    if (open && initialStageId) {
      setSelectedStageId(initialStageId);
    } else if (open && providedStages && providedStages.length > 0 && !selectedStageId) {
      setSelectedStageId(providedStages[0].id);
    }
  }, [open, initialStageId, providedStages, selectedStageId]);

  // Fetch stages if not provided
  const { data: fetchedStages = [] } = useQuery({
    queryKey: ["workflow-stages-for-add", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data, error } = await supabase
        .from("workflow_stages")
        .select("id, name, color")
        .eq("template_id", templateId)
        .order("sort_order");

      if (error) throw error;
      return data;
    },
    enabled: !!templateId && !providedStages && open,
  });

  const stages = providedStages || fetchedStages;

  // Fetch employees for assignee selection
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-task", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, profiles!inner(full_name, avatar_url)")
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .order("created_at");

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId && open,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedStageId) return;

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      assigneeId: assigneeId && assigneeId !== "__none__" ? assigneeId : undefined,
      dueDate: dueDate?.toISOString(),
      isRequired,
      stageId: selectedStageId,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setCategory("other");
    setAssigneeId("");
    setDueDate(undefined);
    setIsRequired(true);
    setSelectedStageId(initialStageId || "");
  };

  const selectedStageName = stages.find(s => s.id === selectedStageId)?.name || stageName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
          <DialogDescription>
            Add a new task to the "{selectedStageName}" stage
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stage Selection - show if we have stages and no fixed stageId */}
          {stages.length > 0 && (
            <div className="space-y-2">
              <Label>Stage *</Label>
              <Select value={selectedStageId} onValueChange={setSelectedStageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <Circle 
                          className="h-3 w-3" 
                          style={{ 
                            fill: stage.color || 'currentColor',
                            color: stage.color || 'currentColor'
                          }} 
                        />
                        {stage.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional task description"
              rows={2}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as WorkflowTaskCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select value={assigneeId || "__none__"} onValueChange={setAssigneeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select assignee (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No assignee</SelectItem>
                {employees.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={emp.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {emp.profiles?.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {emp.profiles?.full_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <Label>Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Select due date (optional)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Is Required */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isRequired"
              checked={isRequired}
              onCheckedChange={(checked) => setIsRequired(!!checked)}
            />
            <Label htmlFor="isRequired" className="text-sm font-normal cursor-pointer">
              This task is required
            </Label>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !selectedStageId || isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Task
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
