import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Plus, MoreVertical, Pencil, Trash2, ChevronDown, ChevronRight, Circle } from "lucide-react";
import {
  useWorkflowTaskStatuses,
  useAddWorkflowTaskStatus,
  useUpdateWorkflowTaskStatus,
  useDeleteWorkflowTaskStatus,
  type ParentTaskStatus,
  type WorkflowTaskStatusCustom,
} from "@/services/useWorkflowStatusCategories";

interface TaskStatusManagementProps {
  templateId: string;
  organizationId: string;
}

const PARENT_STATUSES: { value: ParentTaskStatus; label: string; color: string }[] = [
  { value: "not_started", label: "Not Started", color: "#6B7280" },
  { value: "in_progress", label: "In Progress", color: "#3B82F6" },
  { value: "completed", label: "Completed", color: "#22C55E" },
  { value: "on_hold", label: "On Hold", color: "#F97316" },
];

const STATUS_COLORS = [
  "#6B7280", "#3B82F6", "#22C55E", "#F97316", 
  "#EAB308", "#EC4899", "#8B5CF6", "#14B8A6"
];

export function TaskStatusManagement({ templateId, organizationId }: TaskStatusManagementProps) {
  const { data: statuses = [], isLoading } = useWorkflowTaskStatuses(templateId);
  const addStatus = useAddWorkflowTaskStatus();
  const updateStatus = useUpdateWorkflowTaskStatus();
  const deleteStatus = useDeleteWorkflowTaskStatus();

  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({
    not_started: true,
    in_progress: true,
    completed: true,
    on_hold: true,
  });
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<WorkflowTaskStatusCustom | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    parentStatus: "not_started" as ParentTaskStatus,
    color: STATUS_COLORS[0],
  });

  const groupedStatuses = useMemo(() => {
    const groups: Record<ParentTaskStatus, WorkflowTaskStatusCustom[]> = {
      not_started: [],
      in_progress: [],
      completed: [],
      on_hold: [],
    };
    
    statuses.forEach((s) => {
      if (groups[s.parent_status]) {
        groups[s.parent_status].push(s);
      }
    });
    
    return groups;
  }, [statuses]);

  const toggleParent = (parent: string) => {
    setExpandedParents((prev) => ({ ...prev, [parent]: !prev[parent] }));
  };

  const handleOpenAdd = (parentStatus?: ParentTaskStatus) => {
    setFormData({
      name: "",
      parentStatus: parentStatus || "not_started",
      color: STATUS_COLORS[0],
    });
    setAddDialogOpen(true);
  };

  const handleOpenEdit = (status: WorkflowTaskStatusCustom) => {
    setEditingStatus(status);
    setFormData({
      name: status.name,
      parentStatus: status.parent_status,
      color: status.color || STATUS_COLORS[0],
    });
  };

  const handleAdd = () => {
    if (!formData.name.trim()) return;
    addStatus.mutate(
      {
        templateId,
        organizationId,
        name: formData.name.trim(),
        parentStatus: formData.parentStatus,
        color: formData.color,
      },
      { onSuccess: () => setAddDialogOpen(false) }
    );
  };

  const handleUpdate = () => {
    if (!editingStatus || !formData.name.trim()) return;
    updateStatus.mutate(
      {
        statusId: editingStatus.id,
        templateId,
        updates: {
          name: formData.name.trim(),
          parent_status: formData.parentStatus,
          color: formData.color,
        },
      },
      { onSuccess: () => setEditingStatus(null) }
    );
  };

  const handleDelete = (status: WorkflowTaskStatusCustom) => {
    if (status.is_default) {
      return;
    }
    if (confirm(`Delete status "${status.name}"?`)) {
      deleteStatus.mutate({ statusId: status.id, templateId });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground">
          Loading statuses...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Task Statuses</CardTitle>
            <Button size="sm" onClick={() => handleOpenAdd()}>
              <Plus className="h-4 w-4 mr-1" />
              Add Status
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {PARENT_STATUSES.map((parent) => (
            <Collapsible
              key={parent.value}
              open={expandedParents[parent.value]}
              onOpenChange={() => toggleParent(parent.value)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                  {expandedParents[parent.value] ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: parent.color }}
                  />
                  <span className="font-medium flex-1">{parent.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {groupedStatuses[parent.value].length} statuses
                  </span>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-8 space-y-1">
                {groupedStatuses[parent.value].map((status) => (
                  <div
                    key={status.id}
                    className="flex items-center gap-2 p-2 rounded-md bg-muted/30"
                  >
                    <Circle
                      className="h-3 w-3"
                      style={{ color: status.color || parent.color }}
                      fill={status.color || parent.color}
                    />
                    <span className="flex-1 text-sm">{status.name}</span>
                    {status.is_default && (
                      <Badge variant="secondary" className="text-xs">
                        Default
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(status)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {!status.is_default && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(status)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => handleOpenAdd(parent.value)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Status
                </Button>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* Add Status Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Waiting for Approval"
              />
            </div>
            <div className="space-y-2">
              <Label>Parent Status</Label>
              <Select
                value={formData.parentStatus}
                onValueChange={(v) =>
                  setFormData({ ...formData, parentStatus: v as ParentTaskStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARENT_STATUSES.map((ps) => (
                    <SelectItem key={ps.value} value={ps.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: ps.color }}
                        />
                        {ps.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {STATUS_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? "border-foreground" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!formData.name.trim() || addStatus.isPending}>
              Add Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Status Dialog */}
      <Dialog open={!!editingStatus} onOpenChange={(open) => !open && setEditingStatus(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Parent Status</Label>
              <Select
                value={formData.parentStatus}
                onValueChange={(v) =>
                  setFormData({ ...formData, parentStatus: v as ParentTaskStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PARENT_STATUSES.map((ps) => (
                    <SelectItem key={ps.value} value={ps.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: ps.color }}
                        />
                        {ps.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color (optional)</Label>
              <div className="flex flex-wrap gap-2">
                {STATUS_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color ? "border-foreground" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData({ ...formData, color })}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingStatus(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.name.trim() || updateStatus.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
