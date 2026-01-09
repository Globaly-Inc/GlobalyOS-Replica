import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CalendarIcon, Loader2, Search, User } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAddWorkflowTask, useWorkflowStages } from "@/services/useWorkflows";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface AddTaskToWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_OPTIONS = [
  { value: "documentation", label: "Documentation" },
  { value: "training", label: "Training" },
  { value: "setup", label: "Setup" },
  { value: "introduction", label: "Introduction" },
  { value: "compliance", label: "Compliance" },
  { value: "it", label: "IT" },
  { value: "hr", label: "HR" },
  { value: "other", label: "Other" },
];

interface ActiveWorkflow {
  id: string;
  type: string;
  template_id: string;
  employee_id: string;
  employee: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export function AddTaskToWorkflowDialog({ open, onOpenChange }: AddTaskToWorkflowDialogProps) {
  const { currentOrg } = useOrganization();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isRequired, setIsRequired] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);

  const addTaskMutation = useAddWorkflowTask();

  // Fetch active workflows with employee details
  const { data: activeWorkflows = [], isLoading: loadingWorkflows } = useQuery({
    queryKey: ["active-workflows-for-task", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      
      const { data, error } = await supabase
        .from("employee_workflows")
        .select(`
          id,
          type,
          template_id,
          employee_id,
          employee:employees!employee_workflows_employee_id_fkey(
            id,
            profiles!inner(full_name, avatar_url)
          )
        `)
        .eq("organization_id", currentOrg.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return (data || []) as ActiveWorkflow[];
    },
    enabled: !!currentOrg?.id && open,
  });

  // Get unique employees with active workflows
  const employeesWithWorkflows = activeWorkflows.reduce((acc, workflow) => {
    if (!acc.find(e => e.id === workflow.employee_id)) {
      acc.push({
        id: workflow.employee_id,
        full_name: workflow.employee?.profiles?.full_name || "Unknown",
        avatar_url: workflow.employee?.profiles?.avatar_url,
      });
    }
    return acc;
  }, [] as { id: string; full_name: string; avatar_url: string | null }[]);

  // Filter employees by search
  const filteredEmployees = employeesWithWorkflows.filter(e =>
    e.full_name.toLowerCase().includes(employeeSearch.toLowerCase())
  );

  // Get workflows for selected employee
  const employeeWorkflows = activeWorkflows.filter(w => w.employee_id === selectedEmployeeId);

  // Get selected workflow
  const selectedWorkflow = activeWorkflows.find(w => w.id === selectedWorkflowId);

  // Fetch stages for selected workflow's template
  const { data: stages = [] } = useWorkflowStages(selectedWorkflow?.template_id);

  // Fetch employees for assignee selection
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-task-assignment", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      
      const { data, error } = await supabase
        .from("employees")
        .select("id, profiles!inner(full_name, avatar_url)")
        .eq("organization_id", currentOrg.id)
        .eq("status", "active");
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrg?.id && open,
  });

  // Auto-select workflow when employee is selected and has only one
  useEffect(() => {
    if (selectedEmployeeId && employeeWorkflows.length === 1) {
      setSelectedWorkflowId(employeeWorkflows[0].id);
    } else if (!selectedEmployeeId) {
      setSelectedWorkflowId("");
    }
  }, [selectedEmployeeId, employeeWorkflows]);

  // Reset stage when workflow changes
  useEffect(() => {
    setSelectedStageId("");
  }, [selectedWorkflowId]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedEmployeeId("");
      setSelectedWorkflowId("");
      setSelectedStageId("");
      setTitle("");
      setDescription("");
      setCategory("");
      setAssigneeId("");
      setDueDate(undefined);
      setIsRequired(false);
      setEmployeeSearch("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!title.trim() || !selectedWorkflowId || !selectedStageId || !selectedWorkflow) return;

    // Get the employee for this workflow
    const workflow = activeWorkflows.find(w => w.id === selectedWorkflowId);
    if (!workflow || !currentOrg?.id) return;

    try {
      await addTaskMutation.mutateAsync({
        workflowId: selectedWorkflowId,
        employeeId: workflow.employee_id,
        organizationId: currentOrg.id,
        stageId: selectedStageId,
        title: title.trim(),
        description: description.trim() || undefined,
        category: category || "other",
        assigneeId: assigneeId || undefined,
        dueDate: dueDate ? format(dueDate, "yyyy-MM-dd") : undefined,
        isRequired,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to add task:", error);
    }
  };

  const selectedEmployee = employeesWithWorkflows.find(e => e.id === selectedEmployeeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Task to Workflow</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>Employee *</Label>
            <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-start"
                  disabled={loadingWorkflows}
                >
                  {loadingWorkflows ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : selectedEmployee ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={selectedEmployee.avatar_url || undefined} />
                        <AvatarFallback>
                          {selectedEmployee.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{selectedEmployee.full_name}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Search className="h-4 w-4" />
                      <span>Select employee with active workflow...</span>
                    </div>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search employees..."
                    value={employeeSearch}
                    onValueChange={setEmployeeSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No employees with active workflows found.</CommandEmpty>
                    <CommandGroup>
                      {filteredEmployees.map((employee) => (
                        <CommandItem
                          key={employee.id}
                          value={employee.full_name}
                          onSelect={() => {
                            setSelectedEmployeeId(employee.id);
                            setEmployeePopoverOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={employee.avatar_url || undefined} />
                              <AvatarFallback>
                                {employee.full_name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{employee.full_name}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Workflow and Stage Selection */}
          {selectedEmployeeId && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Workflow *</Label>
                <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select workflow" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeWorkflows.map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.type.charAt(0).toUpperCase() + workflow.type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Stage *</Label>
                <Select 
                  value={selectedStageId} 
                  onValueChange={setSelectedStageId}
                  disabled={!selectedWorkflowId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedWorkflowId ? "Select stage" : "Select workflow first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: stage.color || "#6b7280" }}
                          />
                          {stage.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
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
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
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

          {/* Assignee and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={emp.profiles?.avatar_url} />
                          <AvatarFallback>
                            <User className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{emp.profiles?.full_name}</span>
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
          </div>

          {/* Required Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="required"
              checked={isRequired}
              onCheckedChange={(checked) => setIsRequired(checked === true)}
            />
            <Label htmlFor="required" className="text-sm font-normal">
              This task is required
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || !selectedWorkflowId || !selectedStageId || addTaskMutation.isPending}
          >
            {addTaskMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
