import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Plus, Trash2, Pencil } from "lucide-react";
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

const iconOptions = [
  "folder", "briefcase", "rocket", "zap", "star", "heart", "target", "flag",
  "layers", "box", "database", "cloud", "globe", "shield", "lock", "key",
  "users", "building", "home", "truck", "plane", "ship", "car", "bike"
];

const colorOptions = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", 
  "#06b6d4", "#84cc16", "#f97316", "#6366f1", "#14b8a6", "#a855f7"
];

const DynamicIcon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => {
  const IconComponent = (icons as any)[name.charAt(0).toUpperCase() + name.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase())] || icons.Folder;
  return <IconComponent className={className} style={style} />;
};

export const ManageProjectsDialog = () => {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({ name: "", icon: "folder", color: "#3b82f6" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { currentOrg } = useOrganization();

  useEffect(() => {
    if (open && currentOrg?.id) {
      loadProjects();
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

  const handleAddProject = async () => {
    if (!newProject.name.trim()) {
      toast({ title: "Please enter a project name", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("projects").insert({
        name: newProject.name,
        icon: newProject.icon,
        color: newProject.color,
        organization_id: currentOrg?.id,
      });

      if (error) throw error;

      toast({ title: "Project created successfully" });
      setNewProject({ name: "", icon: "folder", color: "#3b82f6" });
      setShowAddForm(false);
      loadProjects();
    } catch (error: any) {
      toast({ title: "Failed to create project", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          name: editingProject.name,
          icon: editingProject.icon,
          color: editingProject.color,
        })
        .eq("id", editingProject.id);

      if (error) throw error;

      toast({ title: "Project updated successfully" });
      setEditingProject(null);
      loadProjects();
    } catch (error: any) {
      toast({ title: "Failed to update project", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project? This will remove it from all employees.")) return;

    try {
      const { error } = await supabase.from("projects").delete().eq("id", projectId);
      if (error) throw error;

      toast({ title: "Project deleted successfully" });
      loadProjects();
    } catch (error: any) {
      toast({ title: "Failed to delete project", description: error.message, variant: "destructive" });
    }
  };

  const ProjectForm = ({ 
    project, 
    onChange, 
    onSave, 
    onCancel,
    saveLabel 
  }: { 
    project: { name: string; icon: string; color: string }; 
    onChange: (p: { name: string; icon: string; color: string }) => void;
    onSave: () => void;
    onCancel: () => void;
    saveLabel: string;
  }) => (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="space-y-2">
        <Label>Project Name</Label>
        <Input
          value={project.name}
          onChange={(e) => onChange({ ...project, name: e.target.value })}
          placeholder="Enter project name"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Icon</Label>
          <Select value={project.icon} onValueChange={(v) => onChange({ ...project, icon: v })}>
            <SelectTrigger>
              <SelectValue>
                <div className="flex items-center gap-2">
                  <DynamicIcon name={project.icon} className="h-4 w-4" />
                  <span className="capitalize">{project.icon}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {iconOptions.map((icon) => (
                <SelectItem key={icon} value={icon}>
                  <div className="flex items-center gap-2">
                    <DynamicIcon name={icon} className="h-4 w-4" />
                    <span className="capitalize">{icon}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((color) => (
              <button
                key={color}
                className={cn(
                  "w-6 h-6 rounded-full border-2 transition-all",
                  project.color === color ? "border-foreground scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: color }}
                onClick={() => onChange({ ...project, color })}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={onSave} disabled={loading}>{saveLabel}</Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Manage Projects
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Projects</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {!showAddForm && !editingProject && (
            <Button onClick={() => setShowAddForm(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add New Project
            </Button>
          )}

          {showAddForm && (
            <ProjectForm
              project={newProject}
              onChange={setNewProject}
              onSave={handleAddProject}
              onCancel={() => setShowAddForm(false)}
              saveLabel={loading ? "Creating..." : "Create Project"}
            />
          )}

          {editingProject && (
            <ProjectForm
              project={editingProject}
              onChange={(p) => setEditingProject({ ...editingProject, ...p })}
              onSave={handleUpdateProject}
              onCancel={() => setEditingProject(null)}
              saveLabel={loading ? "Saving..." : "Save Changes"}
            />
          )}

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  <DynamicIcon 
                    name={project.icon} 
                    className="h-5 w-5" 
                    style={{ color: project.color }} 
                  />
                  <span className="font-medium">{project.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingProject(project)}
                    disabled={!!editingProject || showAddForm}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteProject(project.id)}
                    disabled={!!editingProject || showAddForm}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {projects.length === 0 && !showAddForm && (
              <p className="text-center text-muted-foreground py-4">
                No projects yet. Create your first project above.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
