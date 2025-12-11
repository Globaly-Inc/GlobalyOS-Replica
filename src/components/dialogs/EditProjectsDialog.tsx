import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Pencil, FolderKanban, Plus } from "lucide-react";
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Projects</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          {projects.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FolderKanban className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No projects created yet.</p>
              <p className="text-sm">Create projects in Settings to assign them to employees.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
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
            <Button onClick={handleSave} disabled={loading || projects.length === 0}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
