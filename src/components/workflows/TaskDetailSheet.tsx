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
  SkipForward
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WorkflowTaskCategory, WorkflowTaskStatus } from "@/types/workflow";
import MentionAutocomplete from "@/components/chat/MentionAutocomplete";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";
import { toast } from "sonner";

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

export function TaskDetailSheet({
  open,
  onOpenChange,
  task,
  organizationId,
  onTaskUpdate,
}: TaskDetailSheetProps) {
  const queryClient = useQueryClient();
  const { data: currentEmployee } = useCurrentEmployee();
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Form state
  const [status, setStatus] = useState<WorkflowTaskStatus>("pending");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<WorkflowTaskCategory>("other");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isRequired, setIsRequired] = useState(true);
  
  // Comment state
  const [comment, setComment] = useState("");
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [mentionState, setMentionState] = useState({
    isOpen: false,
    searchText: "",
    triggerIndex: -1,
  });

  // Populate form when task changes
  useEffect(() => {
    if (task) {
      setStatus((task.status as WorkflowTaskStatus) || "pending");
      setDescription(task.description || "");
      setCategory((task.category as WorkflowTaskCategory) || "other");
      setAssigneeId(task.assignee_id || "");
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setIsRequired(task.is_required ?? true);
    }
  }, [task]);

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

  // Update task mutation
  const updateTask = useMutation({
    mutationFn: async (data: {
      status: WorkflowTaskStatus;
      description?: string | null;
      category: WorkflowTaskCategory;
      assigneeId?: string | null;
      dueDate?: string | null;
      isRequired: boolean;
    }) => {
      if (!task?.id || !currentEmployee) return;
      
      const updateData: Record<string, unknown> = {
        description: data.description,
        category: data.category,
        assignee_id: data.assigneeId,
        due_date: data.dueDate,
        is_required: data.isRequired,
        status: data.status,
        updated_at: new Date().toISOString(),
      };

      if (data.status === "completed") {
        updateData.completed_by = currentEmployee.id;
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("employee_workflow_tasks")
        .update(updateData)
        .eq("id", task.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-workflow-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-detail"] });
      queryClient.invalidateQueries({ queryKey: ["all-workflows"] });
      toast.success("Task updated");
      onTaskUpdate?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update task");
    },
  });

  // Add comment mutation
  const addComment = useMutation({
    mutationFn: async ({ content, mentions }: { content: string; mentions: string[] }) => {
      if (!task?.id || !currentEmployee) return;
      
      // Insert comment
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

      // Insert mentions if any
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

  const handleSave = () => {
    updateTask.mutate({
      status,
      description: description.trim() || null,
      category,
      assigneeId: assigneeId && assigneeId !== "__none__" ? assigneeId : null,
      dueDate: dueDate?.toISOString() || null,
      isRequired,
    });
  };

  const handleAddComment = () => {
    if (!comment.trim()) return;
    addComment.mutate({ content: comment.trim(), mentions: mentionIds });
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

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[70vw] w-[70vw] h-[80vh] max-h-[80vh] p-0 overflow-hidden">
        <div className="flex h-full">
          {/* Left panel - Task info (2/3) */}
          <div className="w-2/3 flex flex-col border-r">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle className="text-xl">{task.title}</DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="flex-1 px-6 py-4">
              <div className="space-y-5">
                {/* Status */}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as WorkflowTaskStatus)}>
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

                {/* Assignee */}
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Select value={assigneeId || "__none__"} onValueChange={setAssigneeId}>
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
                        {dueDate ? format(dueDate, "PPP") : "Select due date"}
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

                {/* Is Required */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="detail-isRequired"
                    checked={isRequired}
                    onCheckedChange={(checked) => setIsRequired(!!checked)}
                  />
                  <Label htmlFor="detail-isRequired" className="text-sm font-normal cursor-pointer">
                    This task is required
                  </Label>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Task description..."
                    rows={4}
                  />
                </div>

                {/* Task metadata */}
                {task.completed_at && task.completed_by_employee && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Completed by {task.completed_by_employee.profiles?.full_name} on{" "}
                      {format(new Date(task.completed_at), "PPP 'at' p")}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Save button */}
            <div className="px-6 py-4 border-t">
              <Button 
                onClick={handleSave} 
                disabled={updateTask.isPending}
                className="w-full"
              >
                {updateTask.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
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
