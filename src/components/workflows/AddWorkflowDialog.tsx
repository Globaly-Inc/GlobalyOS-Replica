import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAddWorkflowTemplate } from "@/services/useWorkflowMutations";
import type { WorkflowType } from "@/types/workflow";

interface AddWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

const WORKFLOW_TYPES: { value: WorkflowType; label: string }[] = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'offboarding', label: 'Offboarding' },
  { value: 'recruiting', label: 'Recruiting' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'custom', label: 'Custom' },
];

export function AddWorkflowDialog({ open, onOpenChange, organizationId }: AddWorkflowDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<WorkflowType>("onboarding");
  const [description, setDescription] = useState("");
  
  const addTemplate = useAddWorkflowTemplate();

  const handleSubmit = () => {
    if (!name.trim()) return;
    
    addTemplate.mutate({
      organizationId,
      name: name.trim(),
      type,
      description: description.trim() || undefined,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setName("");
        setType("onboarding");
        setDescription("");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Workflow</DialogTitle>
          <DialogDescription>
            Create a workflow template to automate employee processes
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Workflow Name *</Label>
            <Input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Engineering Onboarding"
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as WorkflowType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORKFLOW_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of this workflow"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || addTemplate.isPending}>
            {addTemplate.isPending ? "Creating..." : "Create Workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
