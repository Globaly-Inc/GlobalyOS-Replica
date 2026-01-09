import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, GripVertical, Pencil, Trash2, UserPlus, UserMinus, CheckCircle2 } from "lucide-react";
import { useWorkflowTemplates, useWorkflowTemplateTasks, useUpdateWorkflowTemplateTask, useDeleteWorkflowTask } from "@/services/useWorkflows";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface WorkflowsSettingsProps {
  organizationId: string | undefined;
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

export function WorkflowsSettings({ organizationId }: WorkflowsSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'onboarding' | 'offboarding'>('onboarding');
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  
  const { data: templates, isLoading: templatesLoading } = useWorkflowTemplates(activeTab);
  const activeTemplate = templates?.find(t => t.is_default);
  const { data: tasks, isLoading: tasksLoading } = useWorkflowTemplateTasks(activeTemplate?.id);
  
  const updateTask = useUpdateWorkflowTemplateTask();
  const deleteTask = useDeleteWorkflowTask();

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'documentation',
    assignee_type: 'hr',
    due_days_offset: 0,
    is_required: true,
  });

  const handleAddTask = async () => {
    if (!activeTemplate || !organizationId) return;
    
    const { error } = await supabase.from('workflow_template_tasks').insert({
      template_id: activeTemplate.id,
      organization_id: organizationId,
      title: newTask.title,
      description: newTask.description || null,
      category: newTask.category,
      assignee_type: newTask.assignee_type,
      due_days_offset: newTask.due_days_offset,
      is_required: newTask.is_required,
      sort_order: (tasks?.length || 0) + 1,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Task added" });
      setAddTaskOpen(false);
      setNewTask({ title: '', description: '', category: 'documentation', assignee_type: 'hr', due_days_offset: 0, is_required: true });
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
      },
    }, {
      onSuccess: () => {
        setEditingTask(null);
      }
    });
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('Delete this task from the template?')) {
      deleteTask.mutate(taskId);
    }
  };

  if (!organizationId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Workflow Templates
        </CardTitle>
        <CardDescription>
          Configure onboarding and offboarding checklists for new and departing employees
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="onboarding" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Onboarding
            </TabsTrigger>
            <TabsTrigger value="offboarding" className="gap-2">
              <UserMinus className="h-4 w-4" />
              Offboarding
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{activeTab === 'onboarding' ? 'Onboarding' : 'Offboarding'} Tasks</h3>
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'onboarding' 
                    ? 'Tasks assigned when a new hire joins' 
                    : 'Tasks assigned when an employee departs'}
                </p>
              </div>
              <Button size="sm" onClick={() => setAddTaskOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </div>

            {tasksLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : tasks?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tasks configured yet. Add your first task to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {tasks?.map((task, index) => (
                  <div 
                    key={task.id} 
                    className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{task.title}</span>
                        {task.is_required && (
                          <Badge variant="secondary" className="text-xs">Required</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {TASK_CATEGORIES.find(c => c.value === task.category)?.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Assigned to: {ASSIGNEE_TYPES.find(a => a.value === task.assignee_type)?.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Due: {task.due_days_offset === 0 ? 'Same day' : 
                                task.due_days_offset > 0 ? `+${task.due_days_offset} days` : 
                                `${task.due_days_offset} days`}
                        </span>
                      </div>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8"
                      onClick={() => setEditingTask(task)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Add Task Dialog */}
        <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Task</DialogTitle>
              <DialogDescription>
                Add a new task to the {activeTab} template
              </DialogDescription>
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
                  placeholder="Optional details about this task"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Days Offset</Label>
                  <Input 
                    type="number"
                    value={newTask.due_days_offset} 
                    onChange={(e) => setNewTask({ ...newTask, due_days_offset: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {activeTab === 'onboarding' ? 'Days after join date' : 'Days before last day (use negative)'}
                  </p>
                </div>
                <div className="space-y-2 flex items-center gap-2 pt-6">
                  <input 
                    type="checkbox" 
                    id="is_required"
                    checked={newTask.is_required}
                    onChange={(e) => setNewTask({ ...newTask, is_required: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="is_required">Required task</Label>
                </div>
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
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Due Days Offset</Label>
                    <Input 
                      type="number"
                      value={editingTask.due_days_offset} 
                      onChange={(e) => setEditingTask({ ...editingTask, due_days_offset: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2 flex items-center gap-2 pt-6">
                    <input 
                      type="checkbox" 
                      id="edit_is_required"
                      checked={editingTask.is_required}
                      onChange={(e) => setEditingTask({ ...editingTask, is_required: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="edit_is_required">Required task</Label>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
              <Button onClick={handleUpdateTask} disabled={!editingTask?.title}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
