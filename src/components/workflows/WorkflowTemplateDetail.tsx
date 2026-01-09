import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Zap,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  MoveUp,
  MoveDown,
  GripVertical,
} from "lucide-react";
import { useOrgNavigation } from "@/hooks/useOrgNavigation";
import { useWorkflowTemplates, useWorkflowStages, useWorkflowTemplateTasks, useWorkflowTriggers, useDeleteWorkflowTask, useUpdateWorkflowTemplateTask } from "@/services/useWorkflows";
import { 
  useUpdateWorkflowTemplate, 
  useDeleteWorkflowTemplate,
  useAddWorkflowStage,
  useUpdateWorkflowStage,
  useDeleteWorkflowStage,
  useReorderWorkflowStages,
  useToggleWorkflowTrigger,
} from "@/services/useWorkflowMutations";
import { EditTriggerDialog } from "./EditTriggerDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { WorkflowStage, WorkflowTrigger } from "@/types/workflow";

interface WorkflowTemplateDetailProps {
  organizationId: string;
  templateId: string;
}

const TASK_CATEGORIES = [
  { value: 'documentation', label: 'Documentation' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'training', label: 'Training' },
  { value: 'access', label: 'System Access' },
  { value: 'exit_interview', label: 'Exit Interview' },
  { value: 'asset_return', label: 'Asset Return' },
  { value: 'knowledge_transfer', label: 'Knowledge Transfer' },
];

const ASSIGNEE_TYPES = [
  { value: 'employee', label: 'Employee' },
  { value: 'manager', label: 'Manager' },
  { value: 'hr', label: 'HR' },
  { value: 'it', label: 'IT' },
];

const STAGE_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F43F5E', 
  '#F97316', '#EAB308', '#22C55E', '#14B8A6',
  '#06B6D4', '#3B82F6', '#6B7280', '#1F2937'
];

export function WorkflowTemplateDetail({ organizationId, templateId }: WorkflowTemplateDetailProps) {
  const navigate = useNavigate();
  const { orgCode } = useOrgNavigation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: templates } = useWorkflowTemplates();
  const template = templates?.find(t => t.id === templateId);
  const { data: stages = [] } = useWorkflowStages(templateId);
  const { data: tasks = [] } = useWorkflowTemplateTasks(templateId);
  const { data: allTriggers = [] } = useWorkflowTriggers();
  
  const trigger = allTriggers.find(t => t.workflow_type === template?.type);
  
  const deleteTemplate = useDeleteWorkflowTemplate();
  const updateTemplate = useUpdateWorkflowTemplate();
  const addStage = useAddWorkflowStage();
  const updateStage = useUpdateWorkflowStage();
  const deleteStage = useDeleteWorkflowStage();
  const reorderStages = useReorderWorkflowStages();
  const toggleTrigger = useToggleWorkflowTrigger();
  const deleteTask = useDeleteWorkflowTask();
  const updateTask = useUpdateWorkflowTemplateTask();
  
  // UI State
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [editTriggerOpen, setEditTriggerOpen] = useState(false);
  const [addStageOpen, setAddStageOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<WorkflowStage | null>(null);
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [addTaskToStageId, setAddTaskToStageId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<any>(null);
  
  // Form states
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState(STAGE_COLORS[0]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'documentation',
    assignee_type: 'hr',
    due_days_offset: 0,
    is_required: true,
    stage_id: '',
  });

  // Group tasks by stage
  const groupedTasks = useMemo(() => {
    const groups: Record<string, typeof tasks> = {};
    stages.forEach(s => { groups[s.id] = []; });
    groups['uncategorized'] = [];
    
    tasks.forEach(task => {
      const key = task.stage_id || 'uncategorized';
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    
    return groups;
  }, [stages, tasks]);

  const toggleStage = (stageId: string) => {
    setExpandedStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const handleAddStage = () => {
    if (!newStageName.trim()) return;
    
    addStage.mutate({
      templateId,
      organizationId,
      name: newStageName.trim(),
      color: newStageColor,
      sortOrder: stages.length + 1,
    }, {
      onSuccess: () => {
        setAddStageOpen(false);
        setNewStageName("");
        setNewStageColor(STAGE_COLORS[0]);
      }
    });
  };

  const handleUpdateStage = () => {
    if (!editingStage || !newStageName.trim()) return;
    
    updateStage.mutate({
      stageId: editingStage.id,
      updates: { name: newStageName.trim(), color: newStageColor }
    }, {
      onSuccess: () => {
        setEditingStage(null);
        setNewStageName("");
      }
    });
  };

  const handleDeleteStage = (stageId: string) => {
    if (confirm("Delete this stage? Tasks will be moved to Uncategorized.")) {
      deleteStage.mutate(stageId);
    }
  };

  const handleMoveStage = (stageId: string, direction: 'up' | 'down') => {
    const idx = stages.findIndex(s => s.id === stageId);
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === stages.length - 1)) return;
    
    const newStages = [...stages];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    [newStages[idx], newStages[swapIdx]] = [newStages[swapIdx], newStages[idx]];
    
    reorderStages.mutate(newStages.map((s, i) => ({ id: s.id, sort_order: i + 1 })));
  };

  const handleAddTask = async () => {
    if (!template || !organizationId) return;
    
    const { error } = await supabase.from('workflow_template_tasks').insert({
      template_id: templateId,
      organization_id: organizationId,
      title: newTask.title,
      description: newTask.description || null,
      category: newTask.category,
      assignee_type: newTask.assignee_type,
      due_days_offset: newTask.due_days_offset,
      is_required: newTask.is_required,
      stage_id: newTask.stage_id || addTaskToStageId || null,
      sort_order: (tasks?.length || 0) + 1,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Task added" });
      setAddTaskOpen(false);
      setAddTaskToStageId(null);
      setNewTask({ title: '', description: '', category: 'documentation', assignee_type: 'hr', due_days_offset: 0, is_required: true, stage_id: '' });
      queryClient.invalidateQueries({ queryKey: ['workflow-template-tasks'] });
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;
    
    updateTask.mutate({
      taskId: editingTask.id,
      updates: {
        title: editingTask.title,
        description: editingTask.description,
        category: editingTask.category,
        assignee_type: editingTask.assignee_type,
        due_days_offset: editingTask.due_days_offset,
        is_required: editingTask.is_required,
        stage_id: editingTask.stage_id || null,
      },
    }, {
      onSuccess: () => setEditingTask(null),
    });
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Delete this task from the template?')) {
      deleteTask.mutate(taskId);
    }
  };

  const handleDeleteTemplate = () => {
    if (confirm("Delete this workflow template? This cannot be undone.")) {
      deleteTemplate.mutate(templateId, {
        onSuccess: () => navigate(`/org/${orgCode}/settings`),
      });
    }
  };

  const openAddTaskToStage = (stageId: string | null) => {
    setAddTaskToStageId(stageId);
    setNewTask(prev => ({ ...prev, stage_id: stageId || '' }));
    setAddTaskOpen(true);
  };

  if (!template) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading workflow template...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/org/${orgCode}/settings`)}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>{template.name}</CardTitle>
                {template.is_default && (
                  <Badge variant="secondary">Default</Badge>
                )}
              </div>
              <CardDescription className="mt-1">
                {template.description || `${template.type} workflow template`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDeleteTemplate}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Trigger Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Trigger
            </CardTitle>
            {trigger && (
              <div className="flex items-center gap-2">
                <Switch 
                  checked={trigger.is_enabled} 
                  onCheckedChange={(checked) => toggleTrigger.mutate({ triggerId: trigger.id, isEnabled: checked })}
                />
                <Button variant="ghost" size="sm" onClick={() => setEditTriggerOpen(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {trigger ? (
            <div className="text-sm">
              <span className="text-muted-foreground">Automatically starts when: </span>
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                {trigger.trigger_field} {trigger.trigger_condition} {trigger.trigger_value || ''}
              </code>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No trigger configured for this workflow type.</p>
          )}
        </CardContent>
      </Card>

      {/* Stages & Tasks Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Stages & Tasks</CardTitle>
            <Button size="sm" onClick={() => setAddStageOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Stage
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {stages.length === 0 && tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No stages or tasks configured yet.</p>
              <p className="text-sm mt-1">Add stages to organize your workflow tasks.</p>
            </div>
          ) : (
            <>
              {stages.map((stage, idx) => (
                <div key={stage.id} className="border rounded-lg">
                  <div 
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleStage(stage.id)}
                  >
                    {expandedStages[stage.id] ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: stage.color || '#6366F1' }}
                    />
                    <span className="font-medium flex-1">{stage.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {groupedTasks[stage.id]?.length || 0} tasks
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          setEditingStage(stage);
                          setNewStageName(stage.name);
                          setNewStageColor(stage.color || STAGE_COLORS[0]);
                        }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Stage
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openAddTaskToStage(stage.id); }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Task
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {idx > 0 && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleMoveStage(stage.id, 'up'); }}>
                            <MoveUp className="h-4 w-4 mr-2" />
                            Move Up
                          </DropdownMenuItem>
                        )}
                        {idx < stages.length - 1 && (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleMoveStage(stage.id, 'down'); }}>
                            <MoveDown className="h-4 w-4 mr-2" />
                            Move Down
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDeleteStage(stage.id); }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Stage
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {expandedStages[stage.id] && (
                    <div className="px-3 pb-3 space-y-2">
                      {groupedTasks[stage.id]?.map(task => (
                        <div 
                          key={task.id}
                          className="flex items-center gap-3 p-2 rounded-md bg-muted/30 ml-6"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{task.title}</span>
                              {task.is_required && (
                                <Badge variant="secondary" className="text-xs">Required</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-xs">
                                {TASK_CATEGORIES.find(c => c.value === task.category)?.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {ASSIGNEE_TYPES.find(a => a.value === task.assignee_type)?.label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {task.due_days_offset === 0 ? 'Same day' : 
                                  task.due_days_offset > 0 ? `+${task.due_days_offset}d` : `${task.due_days_offset}d`}
                              </span>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingTask(task)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteTask(task.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" className="ml-6 text-muted-foreground" onClick={() => openAddTaskToStage(stage.id)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add Task
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              
              {/* Uncategorized tasks */}
              {groupedTasks['uncategorized']?.length > 0 && (
                <div className="border rounded-lg">
                  <div 
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleStage('uncategorized')}
                  >
                    {expandedStages['uncategorized'] ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div className="w-3 h-3 rounded-full bg-gray-400" />
                    <span className="font-medium flex-1 text-muted-foreground">Uncategorized</span>
                    <span className="text-sm text-muted-foreground">
                      {groupedTasks['uncategorized'].length} tasks
                    </span>
                  </div>
                  {expandedStages['uncategorized'] && (
                    <div className="px-3 pb-3 space-y-2">
                      {groupedTasks['uncategorized'].map(task => (
                        <div 
                          key={task.id}
                          className="flex items-center gap-3 p-2 rounded-md bg-muted/30 ml-6"
                        >
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{task.title}</span>
                              {task.is_required && (
                                <Badge variant="secondary" className="text-xs">Required</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-xs">
                                {TASK_CATEGORIES.find(c => c.value === task.category)?.label}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {ASSIGNEE_TYPES.find(a => a.value === task.assignee_type)?.label}
                              </span>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingTask(task)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteTask(task.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          
          <Button variant="outline" className="w-full" onClick={() => openAddTaskToStage(null)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Task
          </Button>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EditTriggerDialog open={editTriggerOpen} onOpenChange={setEditTriggerOpen} trigger={trigger || null} />
      
      {/* Add Stage Dialog */}
      <Dialog open={addStageOpen} onOpenChange={setAddStageOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Stage Name</Label>
              <Input 
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                placeholder="e.g., First Week"
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {STAGE_COLORS.map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${newStageColor === color ? 'border-foreground' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewStageColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStageOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStage} disabled={!newStageName.trim()}>Add Stage</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stage Dialog */}
      <Dialog open={!!editingStage} onOpenChange={(open) => !open && setEditingStage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Stage Name</Label>
              <Input 
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {STAGE_COLORS.map(color => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${newStageColor === color ? 'border-foreground' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewStageColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStage(null)}>Cancel</Button>
            <Button onClick={handleUpdateStage} disabled={!newStageName.trim()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={addTaskOpen} onOpenChange={(open) => { setAddTaskOpen(open); if (!open) setAddTaskToStageId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input 
                value={newTask.title} 
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="e.g., Complete IT setup"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={newTask.description} 
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Optional details"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select value={newTask.stage_id} onValueChange={(v) => setNewTask({ ...newTask, stage_id: v })}>
                  <SelectTrigger><SelectValue placeholder="(No Stage)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Stage</SelectItem>
                    {stages.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color || '#6366F1' }} />
                          {stage.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newTask.category} onValueChange={(v) => setNewTask({ ...newTask, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assign To</Label>
                <Select value={newTask.assignee_type} onValueChange={(v) => setNewTask({ ...newTask, assignee_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ASSIGNEE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Days</Label>
                <Input 
                  type="number"
                  value={newTask.due_days_offset} 
                  onChange={(e) => setNewTask({ ...newTask, due_days_offset: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="is_required_new"
                checked={newTask.is_required}
                onChange={(e) => setNewTask({ ...newTask, is_required: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="is_required_new">Required task</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTaskOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTask} disabled={!newTask.title}>Add Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          {editingTask && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input 
                  value={editingTask.title} 
                  onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea 
                  value={editingTask.description || ''} 
                  onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select value={editingTask.stage_id || ''} onValueChange={(v) => setEditingTask({ ...editingTask, stage_id: v })}>
                    <SelectTrigger><SelectValue placeholder="(No Stage)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Stage</SelectItem>
                      {stages.map(stage => (
                        <SelectItem key={stage.id} value={stage.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color || '#6366F1' }} />
                            {stage.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={editingTask.category} onValueChange={(v) => setEditingTask({ ...editingTask, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select value={editingTask.assignee_type} onValueChange={(v) => setEditingTask({ ...editingTask, assignee_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASSIGNEE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Days</Label>
                  <Input 
                    type="number"
                    value={editingTask.due_days_offset} 
                    onChange={(e) => setEditingTask({ ...editingTask, due_days_offset: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="is_required_edit"
                  checked={editingTask.is_required}
                  onChange={(e) => setEditingTask({ ...editingTask, is_required: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="is_required_edit">Required task</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
            <Button onClick={handleUpdateTask} disabled={!editingTask?.title}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
