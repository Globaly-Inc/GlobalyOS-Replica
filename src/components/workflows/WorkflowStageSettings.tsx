import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, GripVertical, Pencil, Trash2, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkflowTemplates, useWorkflowStages, useWorkflowTemplateTasks } from "@/services/useWorkflows";
import { useAddWorkflowStage, useUpdateWorkflowStage, useDeleteWorkflowStage } from "@/services/useWorkflowMutations";
import type { WorkflowStage } from "@/types/workflow";

interface WorkflowStageSettingsProps {
  organizationId: string | undefined;
}

const STAGE_COLORS = [
  { value: "#3B82F6", label: "Blue" },
  { value: "#10B981", label: "Green" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#EF4444", label: "Red" },
  { value: "#EC4899", label: "Pink" },
  { value: "#6366F1", label: "Indigo" },
  { value: "#14B8A6", label: "Teal" },
];

export function WorkflowStageSettings({ organizationId }: WorkflowStageSettingsProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<WorkflowStage | null>(null);
  
  const { data: templates, isLoading: templatesLoading } = useWorkflowTemplates();
  const { data: stages, isLoading: stagesLoading } = useWorkflowStages(selectedTemplateId || undefined);
  const { data: tasks } = useWorkflowTemplateTasks(selectedTemplateId || undefined);
  
  const addStage = useAddWorkflowStage();
  const updateStage = useUpdateWorkflowStage();
  const deleteStage = useDeleteWorkflowStage();

  const [newStage, setNewStage] = useState({
    name: "",
    description: "",
    color: "#6366F1",
  });

  // Auto-select first template when loaded
  if (templates?.length && !selectedTemplateId) {
    setSelectedTemplateId(templates[0].id);
  }

  const getTaskCountForStage = (stageId: string) => {
    return tasks?.filter(t => t.stage_id === stageId).length || 0;
  };

  const handleAddStage = () => {
    if (!selectedTemplateId || !organizationId) return;
    
    addStage.mutate({
      templateId: selectedTemplateId,
      organizationId,
      name: newStage.name,
      description: newStage.description || undefined,
      color: newStage.color,
      sortOrder: (stages?.length || 0) + 1,
    }, {
      onSuccess: () => {
        setAddStageOpen(false);
        setNewStage({ name: "", description: "", color: "#6366F1" });
      }
    });
  };

  const handleUpdateStage = () => {
    if (!editingStage) return;
    
    updateStage.mutate({
      stageId: editingStage.id,
      updates: {
        name: editingStage.name,
        description: editingStage.description || undefined,
        color: editingStage.color || undefined,
      },
    }, {
      onSuccess: () => setEditingStage(null)
    });
  };

  const handleDeleteStage = (stageId: string, stageName: string) => {
    const taskCount = getTaskCountForStage(stageId);
    const message = taskCount > 0 
      ? `Delete "${stageName}"? ${taskCount} task(s) will be moved to "Uncategorized".`
      : `Delete "${stageName}"?`;
    
    if (confirm(message)) {
      deleteStage.mutate(stageId);
    }
  };

  if (!organizationId) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Workflow Stages
          </h3>
          <p className="text-sm text-muted-foreground">
            Group tasks into phases for better organization and progress tracking
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-64">
          <Label className="text-sm text-muted-foreground mb-2 block">Select Template</Label>
          <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates?.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                  {template.is_default && <Badge variant="secondary" className="ml-2 text-xs">Default</Badge>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setAddStageOpen(true)} disabled={!selectedTemplateId}>
          <Plus className="h-4 w-4 mr-1" />
          Add Stage
        </Button>
      </div>

      {stagesLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading stages...</div>
      ) : !selectedTemplateId ? (
        <div className="text-center py-8 text-muted-foreground">
          Select a template to manage its stages
        </div>
      ) : stages?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No stages configured. Add stages to organize tasks into phases.
        </div>
      ) : (
        <div className="space-y-2">
          {stages?.map((stage) => (
            <div 
              key={stage.id} 
              className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: stage.color || "#6366F1" }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{stage.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {getTaskCountForStage(stage.id)} tasks
                  </Badge>
                </div>
                {stage.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{stage.description}</p>
                )}
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8"
                onClick={() => setEditingStage(stage)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-8 w-8 text-destructive"
                onClick={() => handleDeleteStage(stage.id, stage.name)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Stage Dialog */}
      <Dialog open={addStageOpen} onOpenChange={setAddStageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input 
                value={newStage.name} 
                onChange={(e) => setNewStage({ ...newStage, name: e.target.value })}
                placeholder="e.g., First Week"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={newStage.description} 
                onChange={(e) => setNewStage({ ...newStage, description: e.target.value })}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {STAGE_COLORS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      newStage.color === color.value ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setNewStage({ ...newStage, color: color.value })}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStageOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStage} disabled={!newStage.name || addStage.isPending}>
              Add Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stage Dialog */}
      <Dialog open={!!editingStage} onOpenChange={(open) => !open && setEditingStage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stage</DialogTitle>
          </DialogHeader>
          {editingStage && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input 
                  value={editingStage.name} 
                  onChange={(e) => setEditingStage({ ...editingStage, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  value={editingStage.description || ""} 
                  onChange={(e) => setEditingStage({ ...editingStage, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {STAGE_COLORS.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        editingStage.color === color.value ? "border-foreground scale-110" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setEditingStage({ ...editingStage, color: color.value })}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStage(null)}>Cancel</Button>
            <Button onClick={handleUpdateStage} disabled={!editingStage?.name || updateStage.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
