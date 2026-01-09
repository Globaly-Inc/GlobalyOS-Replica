import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUpdateWorkflowTrigger } from "@/services/useWorkflowMutations";
import type { TriggerCondition, WorkflowTrigger } from "@/types/workflow";

interface EditTriggerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: WorkflowTrigger | null;
}

const TRIGGER_FIELDS = [
  { value: 'is_new_hire', label: 'Is New Hire' },
  { value: 'last_working_day', label: 'Last Working Day' },
  { value: 'status', label: 'Status' },
  { value: 'department_id', label: 'Department' },
  { value: 'position', label: 'Position' },
];

const TRIGGER_CONDITIONS: { value: TriggerCondition; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'is_set', label: 'Is Set' },
  { value: 'is_not_null', label: 'Is Not Null' },
  { value: 'changed_to', label: 'Changed To' },
];

export function EditTriggerDialog({ open, onOpenChange, trigger }: EditTriggerDialogProps) {
  const [field, setField] = useState("");
  const [condition, setCondition] = useState<TriggerCondition>("equals");
  const [value, setValue] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  
  const updateTrigger = useUpdateWorkflowTrigger();

  useEffect(() => {
    if (trigger) {
      setField(trigger.trigger_field);
      setCondition(trigger.trigger_condition as TriggerCondition);
      setValue(trigger.trigger_value || "");
      setIsEnabled(trigger.is_enabled);
    }
  }, [trigger]);

  const handleSubmit = () => {
    if (!trigger) return;
    
    updateTrigger.mutate({
      triggerId: trigger.id,
      updates: {
        trigger_field: field,
        trigger_condition: condition,
        trigger_value: value || null,
        is_enabled: isEnabled,
      },
    }, {
      onSuccess: () => {
        onOpenChange(false);
      }
    });
  };

  const showValueInput = condition === 'equals' || condition === 'changed_to';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Trigger</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Trigger Enabled</Label>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>
          <div className="space-y-2">
            <Label>Trigger Field</Label>
            <Select value={field} onValueChange={setField}>
              <SelectTrigger>
                <SelectValue placeholder="Select field" />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_FIELDS.map(f => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Condition</Label>
            <Select value={condition} onValueChange={(v) => setCondition(v as TriggerCondition)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGER_CONDITIONS.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showValueInput && (
            <div className="space-y-2">
              <Label>Value</Label>
              <Input 
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g., true, active"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={updateTrigger.isPending}>
            {updateTrigger.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
