import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pencil, FolderKanban, Plus, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { icons } from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface EditProjectsDialogProps {
  employeeId: string;
  onSuccess: () => void;
}

const ICON_OPTIONS = [
  "folder", "briefcase", "rocket", "target", "zap", "star", "heart", "flag",
  "globe", "layers", "box", "package", "database", "cloud", "code", "terminal",
  "cpu", "smartphone", "monitor", "camera", "music", "video", "image", "file-text",
  "users", "building", "home", "map", "compass", "calendar", "clock", "bell"
];

const COLOR_OPTIONS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#f59e0b", 
  "#84cc16", "#22c55e", "#14b8a6", "#06b6d4", "#6366f1", "#a855f7"
];

const DynamicIcon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => {
  const IconComponent = (icons as any)[name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())] || icons.Folder;
  return <IconComponent className={className} style={style} />;
};

export const EditProjectsDialog = ({
  employeeId,
  onSuccess,
}: EditProjectsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [assignedProjectIds, setAssignedProjectIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectIcon, setNewProjectIcon] = useState("folder");
  const [newProjectColor, setNewProjectColor] = useState("#3b82f6");
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const { currentOrg } = useOrganization();

  useEffect(() => {
    if (open && currentOrg?.id) {
      loadProjects();
      loadAssignedProjects();
    }
  }, [open, currentOrg?.id]);

  const loadProjects = async () => {
    const { data } = await supabase
      .from("projects")
      .select("id, name, icon, color")
      .eq("organization_id", currentOrg?.id)
      .order("name");
    
    if (data) setProjects(data);
  };

  const loadAssignedProjects = async () => {
    const { data } = await supabase
      .from("employee_projects")
      .select("project_id")
      .eq("employee_id", employeeId);
    
    if (data) setAssignedProjectIds(data.map(ep => ep.project_id));
  };

  const toggleProject = (projectId: string) => {
    setAssignedProjectIds(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !currentOrg?.id) return;
    
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: newProjectName.trim(),
          icon: newProjectIcon,
          color: newProjectColor,
          organization_id: currentOrg.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Add new project to list and auto-select it
      setProjects(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setAssignedProjectIds(prev => [...prev, data.id]);
      
      // Reset form
      setNewProjectName("");
      setNewProjectIcon("folder");
      setNewProjectColor("#3b82f6");
      setShowCreateForm(false);
      
      toast({ title: "Project created successfully" });
    } catch (error: any) {
      toast({
        title: "Failed to create project",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Delete all existing assignments
      await supabase
        .from("employee_projects")
        .delete()
        .eq("employee_id", employeeId);

      // Insert new assignments
      if (assignedProjectIds.length > 0) {
        const { error } = await supabase
          .from("employee_projects")
          .insert(
            assignedProjectIds.map(projectId => ({
              employee_id: employeeId,
              project_id: projectId,
              organization_id: currentOrg?.id,
            }))
          );
        
        if (error) throw error;
      }

      toast({ title: "Projects updated successfully" });
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Projects</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {/* Create New Project Section */}
          {!showCreateForm ? (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="h-4 w-4" />
              Create New Project
            </Button>
          ) : (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter project name"
                />
              </div>
              
              <div className="flex gap-3">
                {/* Icon Picker */}
                <div className="space-y-2 flex-1">
                  <Label>Icon</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <DynamicIcon name={newProjectIcon} className="h-4 w-4" style={{ color: newProjectColor }} />
                          <span className="capitalize text-sm">{newProjectIcon}</span>
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                      <div className="grid grid-cols-8 gap-1">
                        {ICON_OPTIONS.map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            className={cn(
                              "p-2 rounded hover:bg-muted transition-colors",
                              newProjectIcon === icon && "bg-primary/10 ring-1 ring-primary"
                            )}
                            onClick={() => setNewProjectIcon(icon)}
                          >
                            <DynamicIcon name={icon} className="h-4 w-4" style={{ color: newProjectColor }} />
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                
                {/* Color Picker */}
                <div className="space-y-2 flex-1">
                  <Label>Color</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <div className="h-4 w-4 rounded" style={{ backgroundColor: newProjectColor }} />
                          <span className="text-sm">{newProjectColor}</span>
                        </span>
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="start">
                      <div className="grid grid-cols-6 gap-1">
                        {COLOR_OPTIONS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={cn(
                              "h-7 w-7 rounded transition-transform hover:scale-110",
                              newProjectColor === color && "ring-2 ring-primary ring-offset-2"
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => setNewProjectColor(color)}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewProjectName("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim() || creating}
                >
                  {creating ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          )}

          {/* Projects List */}
          {projects.length === 0 && !showCreateForm ? (
            <div className="text-center py-6 text-muted-foreground">
              <FolderKanban className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No projects created yet.</p>
              <p className="text-sm">Click above to create your first project.</p>
            </div>
          ) : projects.length > 0 && (
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                    assignedProjectIds.includes(project.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
                  onClick={() => toggleProject(project.id)}
                >
                  <Checkbox
                    checked={assignedProjectIds.includes(project.id)}
                    onCheckedChange={() => toggleProject(project.id)}
                  />
                  <DynamicIcon 
                    name={project.icon} 
                    className="h-5 w-5" 
                    style={{ color: project.color }} 
                  />
                  <span className="font-medium">{project.name}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
