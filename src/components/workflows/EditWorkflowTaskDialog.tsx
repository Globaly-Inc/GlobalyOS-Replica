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

interface EditWorkflowTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    taskId: string;
    title: string;
    description?: string | null;
    category: WorkflowTaskCategory;
    assigneeId?: string | null;
    dueDate?: string | null;
    isRequired: boolean;
    stageId: string;
    workflowId?: string;
    employeeId?: string;
  }) => void;
  isLoading?: boolean;
  organizationId: string;
  workflowId: string;
  templateId?: string;
  task: {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    assignee_id?: string | null;
    due_date?: string | null;
    is_required?: boolean;
    stage_id: string;
    workflow_id?: string;
  } | null;
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

export function EditWorkflowTaskDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  organizationId,
  workflowId,
  templateId,
  task,
}: EditWorkflowTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<WorkflowTaskCategory>("other");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isRequired, setIsRequired] = useState(true);
  const [stageId, setStageId] = useState<string>("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");

  // Populate form with task data when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setCategory((task.category as WorkflowTaskCategory) || "other");
      setAssigneeId(task.assignee_id || "");
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setIsRequired(task.is_required ?? true);
      setStageId(task.stage_id || "");
      setSelectedWorkflowId(task.workflow_id || workflowId);
    }
  }, [task, workflowId]);

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

  // Fetch active workflows for this organization
  const { data: workflows = [] } = useQuery({
    queryKey: ["active-workflows-for-edit", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_workflows")
        .select(`
          id,
          type,
          template_id,
          employee_id,
          employee:employees!employee_workflows_employee_id_fkey(
            id,
            profiles!inner(full_name)
          )
        `)
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!organizationId && open,
  });

  // Get the selected workflow's template_id
  const selectedWorkflow = workflows.find(w => w.id === selectedWorkflowId);
  const selectedTemplateId = selectedWorkflow?.template_id || templateId;

  // Fetch stages for the selected workflow's template
  const { data: stages = [] } = useQuery({
    queryKey: ["workflow-stages-for-edit", selectedTemplateId],
    queryFn: async () => {
      if (!selectedTemplateId) return [];
      const { data, error } = await supabase
        .from("workflow_stages")
        .select("*")
        .eq("template_id", selectedTemplateId)
        .order("sort_order");

      if (error) throw error;
      return data;
    },
    enabled: !!selectedTemplateId && open,
  });

  // Reset stage when workflow changes
  useEffect(() => {
    if (selectedWorkflowId && selectedWorkflowId !== task?.workflow_id) {
      // Only reset if workflow changed and stages are loaded
      if (stages.length > 0) {
        setStageId(stages[0].id);
      }
    }
  }, [selectedWorkflowId, task?.workflow_id, stages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !task || !stageId) return;

    const workflowChanged = selectedWorkflowId !== task.workflow_id;
    const newWorkflow = workflowChanged ? workflows.find(w => w.id === selectedWorkflowId) : null;

    onSubmit({
      taskId: task.id,
      title: title.trim(),
      description: description.trim() || null,
      category,
      assigneeId: assigneeId && assigneeId !== "__none__" ? assigneeId : null,
      dueDate: dueDate?.toISOString() || null,
      isRequired,
      stageId,
      workflowId: workflowChanged ? selectedWorkflowId : undefined,
      employeeId: newWorkflow?.employee_id || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update the task details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Workflow */}
          <div className="space-y-2">
            <Label>Workflow *</Label>
            <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
              <SelectTrigger>
                <SelectValue placeholder="Select workflow" />
              </SelectTrigger>
              <SelectContent>
                {workflows.map((wf: any) => (
                  <SelectItem key={wf.id} value={wf.id}>
                    <span className="capitalize">
                      {wf.employee?.profiles?.full_name} - {wf.type}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stage */}
          <div className="space-y-2">
            <Label>Stage *</Label>
            <Select value={stageId} onValueChange={setStageId}>
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage: any) => (
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

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
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
              id="edit-isRequired"
              checked={isRequired}
              onCheckedChange={(checked) => setIsRequired(!!checked)}
            />
            <Label htmlFor="edit-isRequired" className="text-sm font-normal cursor-pointer">
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
            <Button type="submit" disabled={!title.trim() || !stageId || isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
