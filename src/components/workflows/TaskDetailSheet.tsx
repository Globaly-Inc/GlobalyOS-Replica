import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  CalendarIcon, 
  Loader2, 
  Send, 
  MessageSquare, 
  UserCheck,
  Clock,
  CheckCircle2,
  SkipForward,
  Pencil,
  X,
  Check,
  Paperclip,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  Upload,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  Plus,
  Square,
  CheckSquare
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowTaskCategory, WorkflowTaskStatus, WorkflowStage } from "@/types/workflow";
import MentionAutocomplete from "@/components/chat/MentionAutocomplete";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { toast } from "sonner";
import {
  useWorkflowTaskAttachments,
  useUploadTaskAttachment,
  useDeleteTaskAttachment,
  useUpdateTaskTitle,
  useWorkflowStages,
  useMoveToNextStage,
  useTaskChecklists,
  useAddTaskChecklist,
  useUpdateTaskChecklist,
  useDeleteTaskChecklist,
} from "@/services/useWorkflows";
import { useAutoSaveTaskField } from "@/services/useAutoSaveTaskField";

interface TaskDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: {
    id: string;
    title: string;
    description?: string | null;
    category: string;
    assignee_id?: string | null;
    due_date?: string | null;
    is_required?: boolean;
    status: string;
    notes?: string | null;
    stage_id: string;
    workflow_id?: string;
    assignee?: {
      id: string;
      profiles?: {
        full_name: string;
        avatar_url?: string | null;
      };
    } | null;
    completed_at?: string | null;
    completed_by_employee?: {
      profiles?: {
        full_name: string;
      };
    } | null;
  } | null;
  organizationId: string;
  workflowId?: string;
  templateId?: string;
  onTaskUpdate?: () => void;
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

const STATUS_OPTIONS: { value: WorkflowTaskStatus; label: string; icon: React.ElementType }[] = [
  { value: "pending", label: "Pending", icon: Clock },
  { value: "completed", label: "Completed", icon: CheckCircle2 },
  { value: "skipped", label: "Skipped", icon: SkipForward },
];

const isImageFile = (fileType: string | null) => {
  return fileType?.startsWith('image/') || false;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export function TaskDetailSheet({
  open,
  onOpenChange,
  task,
  organizationId,
  workflowId: propWorkflowId,
  templateId: propTemplateId,
  onTaskUpdate,
}: TaskDetailSheetProps) {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [status, setStatus] = useState<WorkflowTaskStatus>("pending");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<WorkflowTaskCategory>("other");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isRequired, setIsRequired] = useState(true);
  
  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  
  // Comment state
  const [comment, setComment] = useState("");
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [mentionState, setMentionState] = useState({
    isOpen: false,
    searchText: "",
    triggerIndex: -1,
  });
  
  // Attachment state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Checklist state
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistTitle, setEditingChecklistTitle] = useState("");

  // Populate form when task changes
  useEffect(() => {
    if (task) {
      setStatus((task.status as WorkflowTaskStatus) || "pending");
      setDescription(task.description || "");
      setCategory((task.category as WorkflowTaskCategory) || "other");
      setAssigneeId(task.assignee_id || "");
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setIsRequired(task.is_required ?? true);
      setEditedTitle(task.title);
      setIsEditingTitle(false);
      setIsAddingChecklist(false);
      setNewChecklistTitle("");
    }
  }, [task]);

  // Fetch workflow details to get type and current stage
  const { data: workflowData } = useQuery({
    queryKey: ["workflow-for-task", task?.workflow_id || propWorkflowId],
    queryFn: async () => {
      const workflowId = task?.workflow_id || propWorkflowId;
      if (!workflowId) return null;
      
      const { data, error } = await supabase
        .from("employee_workflows")
        .select("id, type, current_stage_id, template_id, status")
        .eq("id", workflowId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!(task?.workflow_id || propWorkflowId) && open,
  });

  // Fetch stages for the workflow template
  const templateId = workflowData?.template_id || propTemplateId;
  const { data: stages = [] } = useWorkflowStages(templateId);

  // Find current stage and navigation info
  const currentStage = stages.find((s: WorkflowStage) => s.id === task?.stage_id);
  const currentStageIndex = stages.findIndex((s: WorkflowStage) => s.id === task?.stage_id);
  const previousStage = currentStageIndex > 0 ? stages[currentStageIndex - 1] : null;
  const nextStage = currentStageIndex >= 0 && currentStageIndex < stages.length - 1 
    ? stages[currentStageIndex + 1] 
    : null;
  const isLastStage = currentStageIndex === stages.length - 1;

  // Stage navigation mutation
  const moveToNextStage = useMoveToNextStage();

  // Fetch employees for assignee selection
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-task-detail", organizationId],
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

  // Fetch task comments
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["workflow-task-comments", task?.id],
    queryFn: async () => {
      if (!task?.id) return [];
      const { data, error } = await supabase
        .from("workflow_task_comments")
        .select(`
          *,
          employee:employees!workflow_task_comments_employee_id_fkey(
            id,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .eq("task_id", task.id)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!task?.id && open,
  });

  // Fetch attachments
  const { data: attachments = [], isLoading: attachmentsLoading } = useWorkflowTaskAttachments(task?.id || null);
  const uploadAttachment = useUploadTaskAttachment();
  const deleteAttachment = useDeleteTaskAttachment();
  const updateTitle = useUpdateTaskTitle();

  // Fetch checklists
  const { data: checklists = [], isLoading: checklistsLoading } = useTaskChecklists(task?.id || null);
  const addChecklist = useAddTaskChecklist();
  const updateChecklist = useUpdateTaskChecklist();
  const deleteChecklist = useDeleteTaskChecklist();

  // Auto-save mutation
  const autoSave = useAutoSaveTaskField(employees);

  // Add comment mutation
  const addComment = useMutation({
    mutationFn: async ({ content, mentions }: { content: string; mentions: string[] }) => {
      if (!task?.id || !currentEmployee) return;
      
      const { data: commentData, error: commentError } = await supabase
        .from("workflow_task_comments")
        .insert({
          task_id: task.id,
          organization_id: organizationId,
          employee_id: currentEmployee.id,
          content,
        })
        .select()
        .single();
      
      if (commentError) throw commentError;

      if (mentions.length > 0 && commentData) {
        const mentionInserts = mentions.map(empId => ({
          comment_id: commentData.id,
          mentioned_employee_id: empId,
          organization_id: organizationId,
        }));

        const { error: mentionError } = await supabase
          .from("workflow_task_comment_mentions")
          .insert(mentionInserts);
        
        if (mentionError) console.error("Failed to insert mentions:", mentionError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-task-comments", task?.id] });
      setComment("");
      setMentionIds([]);
      toast.success("Comment added");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add comment");
    },
  });

  // Auto-save handlers
  const handleAutoSave = (field: 'status' | 'description' | 'category' | 'assignee' | 'due_date' | 'is_required', oldValue: unknown, newValue: unknown) => {
    if (!task?.id || !workflowData?.id) return;
    autoSave.mutate({
      taskId: task.id,
      workflowId: workflowData.id,
      organizationId,
      employeeId: currentEmployee?.id,
      field,
      oldValue,
      newValue,
    });
  };

  const handleStatusChange = (newStatus: WorkflowTaskStatus) => {
    if (newStatus !== status) {
      const oldStatus = status;
      setStatus(newStatus);
      handleAutoSave('status', oldStatus, newStatus);
    }
  };

  const handleDescriptionBlur = () => {
    const newDesc = description.trim() || null;
    const oldDesc = task?.description || null;
    if (newDesc !== oldDesc) {
      handleAutoSave('description', oldDesc, newDesc);
    }
  };

  const handleCategoryChange = (newCategory: WorkflowTaskCategory) => {
    if (newCategory !== category) {
      const oldCategory = category;
      setCategory(newCategory);
      handleAutoSave('category', oldCategory, newCategory);
    }
  };

  const handleAssigneeChange = (newAssigneeId: string) => {
    const actualNewId = newAssigneeId === "__none__" ? null : newAssigneeId;
    const actualOldId = assigneeId === "__none__" ? null : (assigneeId || null);
    if (actualNewId !== actualOldId) {
      setAssigneeId(newAssigneeId);
      handleAutoSave('assignee', actualOldId, actualNewId);
    }
  };

  const handleDueDateChange = (newDate: Date | undefined) => {
    const newDateStr = newDate?.toISOString() || null;
    const oldDateStr = dueDate?.toISOString() || null;
    setDueDate(newDate);
    if (newDateStr !== oldDateStr) {
      handleAutoSave('due_date', oldDateStr, newDateStr);
    }
  };

  const handleIsRequiredChange = (checked: boolean) => {
    if (checked !== isRequired) {
      const oldValue = isRequired;
      setIsRequired(checked);
      handleAutoSave('is_required', oldValue, checked);
    }
  };

  const handleSaveTitle = () => {
    if (!editedTitle.trim() || !task?.id) return;
    updateTitle.mutate({ taskId: task.id, title: editedTitle.trim() });
    setIsEditingTitle(false);
  };

  const handleAddComment = () => {
    if (!comment.trim()) return;
    addComment.mutate({ content: comment.trim(), mentions: mentionIds });
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setSelectedFiles(prev => [...prev, ...newFiles]);
  };

  const handleUploadFiles = async () => {
    if (!task?.id || !currentEmployee || selectedFiles.length === 0) return;
    
    for (const file of selectedFiles) {
      await uploadAttachment.mutateAsync({
        taskId: task.id,
        file,
        organizationId,
        employeeId: currentEmployee.id,
      });
    }
    setSelectedFiles([]);
  };

  const handleDeleteAttachment = (attachmentId: string, filePath: string) => {
    if (!task?.id) return;
    deleteAttachment.mutate({ attachmentId, filePath, taskId: task.id });
  };

  const getAttachmentUrl = (filePath: string) => {
    const { data } = supabase.storage.from('workflow-task-attachments').getPublicUrl(filePath);
    return data.publicUrl;
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  // Checklist handlers
  const handleAddChecklist = () => {
    if (!newChecklistTitle.trim() || !task?.id) return;
    addChecklist.mutate({
      taskId: task.id,
      organizationId,
      title: newChecklistTitle.trim(),
    });
    setNewChecklistTitle("");
    setIsAddingChecklist(false);
  };

  const handleToggleChecklist = (checklistId: string, currentStatus: boolean) => {
    if (!task?.id) return;
    updateChecklist.mutate({
      checklistId,
      taskId: task.id,
      updates: { is_completed: !currentStatus },
    });
  };

  const handleUpdateChecklistTitle = () => {
    if (!editingChecklistId || !editingChecklistTitle.trim() || !task?.id) return;
    updateChecklist.mutate({
      checklistId: editingChecklistId,
      taskId: task.id,
      updates: { title: editingChecklistTitle.trim() },
    });
    setEditingChecklistId(null);
    setEditingChecklistTitle("");
  };

  const handleDeleteChecklist = (checklistId: string) => {
    if (!task?.id) return;
    deleteChecklist.mutate({ checklistId, taskId: task.id });
  };

  // Stage navigation handlers
  const handleMoveToPreviousStage = () => {
    if (!previousStage || !workflowData?.id) return;
    moveToNextStage.mutate({
      workflowId: workflowData.id,
      nextStageId: previousStage.id,
    });
  };

  const handleMoveToNextStage = () => {
    if (!workflowData?.id) return;
    moveToNextStage.mutate({
      workflowId: workflowData.id,
      nextStageId: nextStage?.id || null,
    });
  };

  // Mention handling
  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setComment(newValue);

    const textBeforeCursor = newValue.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const charBefore = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if (charBefore === ' ' || charBefore === '\n' || lastAtIndex === 0) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        if (!textAfterAt.includes(' ')) {
          setMentionState({
            isOpen: true,
            searchText: textAfterAt,
            triggerIndex: lastAtIndex,
          });
          return;
        }
      }
    }

    if (mentionState.isOpen) {
      setMentionState({ isOpen: false, searchText: '', triggerIndex: -1 });
    }
  }, [mentionState.isOpen]);

  const handleMentionSelect = useCallback((member: { id: string; name: string }) => {
    const { triggerIndex } = mentionState;
    const beforeAt = comment.slice(0, triggerIndex);
    const cursorPos = commentInputRef.current?.selectionStart || comment.length;
    const afterSearch = comment.slice(cursorPos);
    
    const newValue = `${beforeAt}@${member.name} ${afterSearch}`;
    setComment(newValue);
    setMentionIds(prev => [...prev, member.id]);
    setMentionState({ isOpen: false, searchText: '', triggerIndex: -1 });
  }, [comment, mentionState]);

  const closeMention = useCallback(() => {
    setMentionState({ isOpen: false, searchText: '', triggerIndex: -1 });
  }, []);

  const completedChecklistCount = checklists.filter((c: any) => c.is_completed).length;

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[70vw] w-[70vw] h-[80vh] max-h-[80vh] p-0 overflow-hidden">
        <div className="flex h-full">
          {/* Left panel - Task info (2/3) */}
          <div className="w-2/3 flex flex-col border-r">
            <DialogHeader className="px-6 py-4 border-b">
              {isEditingTitle ? (
                <div className="flex items-center gap-2">
                  <Input 
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle();
                      if (e.key === 'Escape') {
                        setEditedTitle(task.title);
                        setIsEditingTitle(false);
                      }
                    }}
                    autoFocus
                    className="text-xl font-semibold h-auto py-1"
                  />
                  <Button 
                    size="icon" 
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleSaveTitle}
                    disabled={updateTitle.isPending}
                  >
                    {updateTitle.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditedTitle(task.title);
                      setIsEditingTitle(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <DialogTitle 
                  className="text-xl cursor-pointer group flex items-center gap-2 hover:text-primary transition-colors"
                  onClick={() => setIsEditingTitle(true)}
                >
                  {task.title}
                  <Pencil className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
                </DialogTitle>
              )}
            </DialogHeader>
            
          <ScrollArea className="flex-1">
            <div className="px-6 py-4">
              <div className="space-y-5 px-0.5">
                {/* Description - Moved to top */}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={handleDescriptionBlur}
                    placeholder="Task description..."
                    rows={4}
                  />
                </div>

                {/* Workflow & Stage Row */}
                {workflowData && (
                  <div className="space-y-2">
                    <Label>Workflow & Stage</Label>
                    <div className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge variant={workflowData.type === 'onboarding' ? "default" : "secondary"}>
                          {workflowData.type === 'onboarding' ? 'Onboarding' : 'Offboarding'}
                        </Badge>
                        {currentStage && (
                          <Badge 
                            variant="outline"
                            style={{ 
                              borderColor: currentStage.color || undefined,
                              color: currentStage.color || undefined,
                              backgroundColor: currentStage.color ? `${currentStage.color}15` : undefined
                            }}
                          >
                            {currentStage.name}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleMoveToPreviousStage}
                          disabled={!previousStage || moveToNextStage.isPending || workflowData.status === 'completed'}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          variant={isLastStage ? "default" : "outline"}
                          onClick={handleMoveToNextStage}
                          disabled={moveToNextStage.isPending || workflowData.status === 'completed'}
                        >
                          {moveToNextStage.isPending ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : isLastStage ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Complete
                            </>
                          ) : (
                            <>
                              Next
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    {/* Is Required */}
                    <div className="flex items-center space-x-2 pt-1">
                      <Checkbox
                        id="detail-isRequired"
                        checked={isRequired}
                        onCheckedChange={(checked) => handleIsRequiredChange(!!checked)}
                      />
                      <Label htmlFor="detail-isRequired" className="text-sm font-normal cursor-pointer">
                        This task is required
                      </Label>
                    </div>
                  </div>
                )}

                {/* Row 1: Status + Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={(v) => handleStatusChange(v as WorkflowTaskStatus)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {opt.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={(v) => handleCategoryChange(v as WorkflowTaskCategory)}>
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
                </div>

                {/* Row 2: Assignee + Due Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Select value={assigneeId || "__none__"} onValueChange={handleAssigneeChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee" />
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
                          {dueDate ? format(dueDate, "d MMM yyyy") : "Select due date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dueDate}
                          onSelect={handleDueDateChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                {/* Attachments Section */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    Attachments {attachments.length > 0 && `(${attachments.length})`}
                  </Label>
                  
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-4 transition-colors",
                      isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    {attachmentsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <>
                        {/* Existing attachments */}
                        {attachments.length > 0 && (
                          <div className="space-y-2 mb-4">
                            {attachments.map((att: any) => (
                              <div 
                                key={att.id} 
                                className="flex items-center gap-3 p-2 bg-muted/50 rounded-md group"
                              >
                                <div className="flex-shrink-0 w-8 h-8 rounded bg-background flex items-center justify-center">
                                  {isImageFile(att.file_type) ? (
                                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{att.file_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(att.file_size)} • {att.employee?.profiles?.full_name}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => window.open(getAttachmentUrl(att.file_path), '_blank')}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteAttachment(att.id, att.file_path)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Selected files preview */}
                        {selectedFiles.length > 0 && (
                          <div className="space-y-2 mb-4">
                            <p className="text-xs text-muted-foreground font-medium">Ready to upload:</p>
                            {selectedFiles.map((file, index) => (
                              <div 
                                key={index} 
                                className="flex items-center gap-3 p-2 bg-primary/5 rounded-md border border-primary/20"
                              >
                                <div className="flex-shrink-0 w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                                  {file.type.startsWith('image/') ? (
                                    <ImageIcon className="h-4 w-4 text-primary" />
                                  ) : (
                                    <FileText className="h-4 w-4 text-primary" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ))}
                            <Button
                              size="sm"
                              onClick={handleUploadFiles}
                              disabled={uploadAttachment.isPending}
                              className="w-full"
                            >
                              {uploadAttachment.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4 mr-2" />
                              )}
                              Upload {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}
                            </Button>
                          </div>
                        )}

                        {/* Drop zone / Add button */}
                        <div className="text-center">
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFileSelect(e.target.files)}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Paperclip className="h-4 w-4 mr-2" />
                            Add Attachment
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2">
                            or drag and drop files here
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Checklists Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4" />
                      Checklists {checklists.length > 0 && `(${completedChecklistCount}/${checklists.length})`}
                    </Label>
                    {!isAddingChecklist && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsAddingChecklist(true)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {checklistsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Existing checklist items */}
                      {checklists.map((item: any) => (
                        <div 
                          key={item.id} 
                          className="flex items-center gap-3 p-2 bg-muted/30 rounded-md group"
                        >
                          <button
                            onClick={() => handleToggleChecklist(item.id, item.is_completed)}
                            className="flex-shrink-0"
                          >
                            {item.is_completed ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <Square className="h-5 w-5 text-muted-foreground hover:text-primary transition-colors" />
                            )}
                          </button>
                          
                          {editingChecklistId === item.id ? (
                            <div className="flex-1 flex items-center gap-2">
                              <Input
                                value={editingChecklistTitle}
                                onChange={(e) => setEditingChecklistTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleUpdateChecklistTitle();
                                  if (e.key === 'Escape') {
                                    setEditingChecklistId(null);
                                    setEditingChecklistTitle("");
                                  }
                                }}
                                autoFocus
                                className="h-7 text-sm"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={handleUpdateChecklistTitle}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => {
                                  setEditingChecklistId(null);
                                  setEditingChecklistTitle("");
                                }}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <span 
                                className={cn(
                                  "flex-1 text-sm cursor-pointer hover:text-primary transition-colors",
                                  item.is_completed && "line-through text-muted-foreground"
                                )}
                                onClick={() => {
                                  setEditingChecklistId(item.id);
                                  setEditingChecklistTitle(item.title);
                                }}
                              >
                                {item.title}
                              </span>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                onClick={() => handleDeleteChecklist(item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))}

                      {/* Add new checklist input */}
                      {isAddingChecklist && (
                        <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                          <Square className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <Input
                            value={newChecklistTitle}
                            onChange={(e) => setNewChecklistTitle(e.target.value)}
                            placeholder="Add checklist item..."
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleAddChecklist();
                              if (e.key === 'Escape') {
                                setIsAddingChecklist(false);
                                setNewChecklistTitle("");
                              }
                            }}
                            autoFocus
                            className="h-7 text-sm flex-1"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={handleAddChecklist}
                            disabled={!newChecklistTitle.trim() || addChecklist.isPending}
                          >
                            {addChecklist.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => {
                              setIsAddingChecklist(false);
                              setNewChecklistTitle("");
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}

                      {/* Empty state */}
                      {checklists.length === 0 && !isAddingChecklist && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAddingChecklist(true)}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Checklist Item
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Task metadata */}
                {task.completed_at && task.completed_by_employee && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Completed by {task.completed_by_employee.profiles?.full_name} on{" "}
                      {format(new Date(task.completed_at), "d MMM yyyy 'at' h:mm a")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          </div>

          {/* Right panel - Activity (1/3) */}
          <div className="w-1/3 flex flex-col bg-muted/30">
            <div className="px-4 py-4 border-b bg-background">
              <h3 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Activity
              </h3>
            </div>
            
            <ScrollArea className="flex-1 px-4 py-4">
              <div className="space-y-4">
                {/* Task created activity */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">Task created</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {task.title}
                    </p>
                  </div>
                </div>

                {/* Attachment activity */}
                {attachments.map((att: any) => (
                  <div key={`att-${att.id}`} className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Paperclip className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{att.employee?.profiles?.full_name}</span>
                        {" "}uploaded
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {att.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(att.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Completed activity */}
                {task.completed_at && task.completed_by_employee && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{task.completed_by_employee.profiles?.full_name}</span>
                        {" "}completed this task
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(task.completed_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Comments */}
                {commentsLoading ? (
                  <div className="text-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : (
                  comments.map((c: any) => (
                    <div key={c.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={c.employee?.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {c.employee?.profiles?.full_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {c.employee?.profiles?.full_name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">
                          {c.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Comment input */}
            <div className="p-4 border-t bg-background relative">
              <div className="relative">
                <Textarea
                  ref={commentInputRef}
                  placeholder="Write a comment... Use @ to mention"
                  value={comment}
                  onChange={handleCommentChange}
                  className="min-h-[80px] pr-10 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !mentionState.isOpen) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute bottom-2 right-2 h-7 w-7"
                  onClick={handleAddComment}
                  disabled={!comment.trim() || addComment.isPending}
                >
                  {addComment.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <MentionAutocomplete
                isOpen={mentionState.isOpen}
                searchText={mentionState.searchText}
                onSelect={handleMentionSelect}
                onClose={closeMention}
                anchorRef={commentInputRef as any}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
