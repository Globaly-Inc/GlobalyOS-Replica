import { useState } from "react";
import { format, addDays } from "date-fns";
import { CalendarIcon, UserPlus, UserMinus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useWorkflowTemplates } from "@/services/useWorkflows";
import { useStartWorkflow } from "@/services/useWorkflowMutations";
import { useEmployees } from "@/services/useEmployees";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type WorkflowTypeOption = "onboarding" | "offboarding";

interface StartWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StartWorkflowDialog({ open, onOpenChange }: StartWorkflowDialogProps) {
  const [workflowType, setWorkflowType] = useState<WorkflowTypeOption>("onboarding");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [targetDate, setTargetDate] = useState<Date>(addDays(new Date(), 7));

  const { data: employeesData, isLoading: employeesLoading } = useEmployees({ status: "active" });
  const employees = (employeesData || []) as any[];
  const { data: templates, isLoading: templatesLoading } = useWorkflowTemplates(workflowType);
  const startWorkflow = useStartWorkflow();

  // Set default template when templates load
  const defaultTemplate = templates?.find(t => t.is_default) || templates?.[0];
  if (defaultTemplate && !selectedTemplateId && templates?.length) {
    setSelectedTemplateId(defaultTemplate.id);
  }

  const handleSubmit = async () => {
    if (!selectedEmployeeId || !selectedTemplateId) return;

    await startWorkflow.mutateAsync({
      employeeId: selectedEmployeeId,
      templateId: selectedTemplateId,
      targetDate: format(targetDate, "yyyy-MM-dd"),
      workflowType,
    });

    // Reset and close
    setSelectedEmployeeId("");
    setSelectedTemplateId("");
    setTargetDate(addDays(new Date(), 7));
    onOpenChange(false);
  };

  const handleTypeChange = (type: WorkflowTypeOption) => {
    setWorkflowType(type);
    setSelectedTemplateId(""); // Reset template when type changes
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Start Workflow</DialogTitle>
          <DialogDescription>
            Create a new onboarding or offboarding workflow for an employee
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Workflow Type */}
          <div className="space-y-2">
            <Label>Workflow Type</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={workflowType === "onboarding" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => handleTypeChange("onboarding")}
              >
                <UserPlus className="h-4 w-4" />
                Onboarding
              </Button>
              <Button
                type="button"
                variant={workflowType === "offboarding" ? "default" : "outline"}
                className="flex-1 gap-2"
                onClick={() => handleTypeChange("offboarding")}
              >
                <UserMinus className="h-4 w-4" />
                Offboarding
              </Button>
            </div>
          </div>

          {/* Employee Selection */}
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employeesLoading ? (
                  <div className="p-2 text-center text-muted-foreground">Loading...</div>
                ) : (
                  employees?.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={emp.profiles?.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {emp.profiles?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{emp.profiles?.full_name}</span>
                        {emp.position && (
                          <span className="text-muted-foreground">• {emp.position}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template" />
              </SelectTrigger>
              <SelectContent>
                {templatesLoading ? (
                  <div className="p-2 text-center text-muted-foreground">Loading...</div>
                ) : templates?.length === 0 ? (
                  <div className="p-2 text-center text-muted-foreground">
                    No {workflowType} templates found
                  </div>
                ) : (
                  templates?.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        {template.is_default && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Target Date */}
          <div className="space-y-2">
            <Label>
              {workflowType === "onboarding" ? "Start Date" : "Last Working Day"}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !targetDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {targetDate ? format(targetDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={targetDate}
                  onSelect={(date) => date && setTargetDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedEmployeeId || !selectedTemplateId || startWorkflow.isPending}
          >
            {startWorkflow.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
