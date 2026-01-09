import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Pencil, Zap, UserPlus, UserMinus, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkflowTriggers, useWorkflowTemplates } from "@/services/useWorkflows";
import { useUpdateWorkflowTrigger, useToggleWorkflowTrigger } from "@/services/useWorkflowMutations";
import type { WorkflowTrigger, TriggerCondition } from "@/types/workflow";

interface WorkflowTriggerSettingsProps {
  organizationId: string | undefined;
}

const TRIGGER_FIELDS = [
  { value: "is_new_hire", label: "Is New Hire" },
  { value: "last_working_day", label: "Last Working Day" },
  { value: "status", label: "Employment Status" },
  { value: "department_id", label: "Department" },
  { value: "position", label: "Position" },
];

const TRIGGER_CONDITIONS: { value: TriggerCondition; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "is_set", label: "Is Set (any value)" },
  { value: "is_not_null", label: "Is Not Empty" },
  { value: "changed_to", label: "Changed To" },
];

export function WorkflowTriggerSettings({ organizationId }: WorkflowTriggerSettingsProps) {
  const [editingTrigger, setEditingTrigger] = useState<WorkflowTrigger | null>(null);
  
  const { data: triggers, isLoading } = useWorkflowTriggers();
  const { data: templates } = useWorkflowTemplates();
  
  const updateTrigger = useUpdateWorkflowTrigger();
  const toggleTrigger = useToggleWorkflowTrigger();

  const getWorkflowIcon = (type: string) => {
    switch (type) {
      case "onboarding":
        return <UserPlus className="h-5 w-5 text-primary" />;
      case "offboarding":
        return <UserMinus className="h-5 w-5 text-destructive" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  const getWorkflowLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getConditionDescription = (trigger: WorkflowTrigger) => {
    const field = TRIGGER_FIELDS.find(f => f.value === trigger.trigger_field)?.label || trigger.trigger_field;
    const condition = TRIGGER_CONDITIONS.find(c => c.value === trigger.trigger_condition)?.label || trigger.trigger_condition;
    
    if (trigger.trigger_condition === "is_not_null" || trigger.trigger_condition === "is_set") {
      return `${field} ${condition.toLowerCase()}`;
    }
    return `${field} ${condition.toLowerCase()} "${trigger.trigger_value}"`;
  };

  const getTemplateForType = (type: string) => {
    return templates?.find(t => t.type === type && t.is_default);
  };

  const handleToggle = (triggerId: string, currentValue: boolean) => {
    toggleTrigger.mutate({ triggerId, isEnabled: !currentValue });
  };

  const handleUpdateTrigger = () => {
    if (!editingTrigger) return;
    
    updateTrigger.mutate({
      triggerId: editingTrigger.id,
      updates: {
        trigger_field: editingTrigger.trigger_field,
        trigger_condition: editingTrigger.trigger_condition,
        trigger_value: editingTrigger.trigger_value,
      },
    }, {
      onSuccess: () => setEditingTrigger(null)
    });
  };

  if (!organizationId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Workflow Triggers
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure when workflows are automatically created for employees
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading triggers...</div>
      ) : triggers?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No triggers configured. Triggers will be created when you set up workflow templates.
        </div>
      ) : (
        <div className="space-y-4">
          {triggers?.map((trigger) => {
            const template = getTemplateForType(trigger.workflow_type);
            
            return (
              <Card key={trigger.id} className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-muted rounded-lg">
                    {getWorkflowIcon(trigger.workflow_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{getWorkflowLabel(trigger.workflow_type)}</h4>
                      <Badge variant={trigger.is_enabled ? "default" : "secondary"}>
                        {trigger.is_enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="flex items-center gap-2">
                        <span className="text-foreground">Triggers when:</span>
                        {getConditionDescription(trigger)}
                      </p>
                      
                      {template && (
                        <p className="flex items-center gap-2">
                          <ArrowRight className="h-3 w-3" />
                          Uses template: <span className="text-foreground">{template.name}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={trigger.is_enabled}
                      onCheckedChange={() => handleToggle(trigger.id, trigger.is_enabled)}
                    />
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => setEditingTrigger(trigger)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Trigger Dialog */}
      <Dialog open={!!editingTrigger} onOpenChange={(open) => !open && setEditingTrigger(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Trigger</DialogTitle>
            <DialogDescription>
              Configure when this workflow is automatically created
            </DialogDescription>
          </DialogHeader>
          {editingTrigger && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  {getWorkflowLabel(editingTrigger.workflow_type)} Workflow
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Trigger Field</Label>
                <Select 
                  value={editingTrigger.trigger_field} 
                  onValueChange={(v) => setEditingTrigger({ ...editingTrigger, trigger_field: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_FIELDS.map(field => (
                      <SelectItem key={field.value} value={field.value}>{field.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Condition</Label>
                <Select 
                  value={editingTrigger.trigger_condition} 
                  onValueChange={(v) => setEditingTrigger({ 
                    ...editingTrigger, 
                    trigger_condition: v as TriggerCondition 
                  })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_CONDITIONS.map(cond => (
                      <SelectItem key={cond.value} value={cond.value}>{cond.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(editingTrigger.trigger_condition === "equals" || editingTrigger.trigger_condition === "changed_to") && (
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input 
                    value={editingTrigger.trigger_value || ""} 
                    onChange={(e) => setEditingTrigger({ ...editingTrigger, trigger_value: e.target.value })}
                    placeholder="e.g., true, active"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTrigger(null)}>Cancel</Button>
            <Button onClick={handleUpdateTrigger} disabled={updateTrigger.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
