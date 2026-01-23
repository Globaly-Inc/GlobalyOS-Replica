import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TeamMember {
  id: string;
  profiles: {
    full_name: string;
  };
}

interface EditManagerDialogProps {
  employeeId: string;
  currentManagerId: string | null;
  onSuccess: () => void;
}

/**
 * Recursively fetches all subordinate employee IDs for a given employee.
 * Used to prevent circular manager references.
 */
const getSubordinateIds = async (employeeId: string): Promise<string[]> => {
  const subordinateIds: string[] = [];
  
  const fetchSubordinates = async (managerId: string) => {
    const { data } = await supabase
      .from('employees')
      .select('id')
      .eq('manager_id', managerId);
    
    if (data) {
      for (const emp of data) {
        subordinateIds.push(emp.id);
        await fetchSubordinates(emp.id);
      }
    }
  };
  
  await fetchSubordinates(employeeId);
  return subordinateIds;
};

export const EditManagerDialog = ({ employeeId, currentManagerId, onSuccess }: EditManagerDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [managerId, setManagerId] = useState(currentManagerId || "none");
  const [subordinateIds, setSubordinateIds] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadTeamMembers();
      setManagerId(currentManagerId || "none");
    }
  }, [open, currentManagerId]);

  const loadTeamMembers = async () => {
    // First, get all subordinates to exclude (prevents circular references)
    const subIds = await getSubordinateIds(employeeId);
    setSubordinateIds(subIds);

    const { data } = await supabase
      .from("employees")
      .select(`
        id,
        profiles!inner(full_name)
      `)
      .neq("id", employeeId)
      .order("created_at");

    if (data) {
      // Filter out subordinates to prevent cycles
      const validManagers = data.filter(
        member => !subIds.includes(member.id)
      );
      setTeamMembers(validManagers as TeamMember[]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({ manager_id: managerId === "none" ? null : managerId })
        .eq("id", employeeId);

      if (error) {
        // Check for circular reference error from database trigger
        if (error.message?.includes('Circular manager reference') || 
            error.message?.includes('cannot be their own manager')) {
          throw new Error(error.message);
        }
        throw error;
      }

      toast({
        title: "Manager Updated",
        description: "The manager has been updated successfully.",
      });
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update manager",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2">
          <Edit2 className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Manager</DialogTitle>
          <DialogDescription>
            Select a manager for this team member. Employees who report to this person (directly or indirectly) are not shown.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Manager</Label>
            <Select value={managerId} onValueChange={setManagerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No manager</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.profiles.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {subordinateIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {subordinateIds.length} subordinate{subordinateIds.length !== 1 ? 's' : ''} excluded to prevent circular references.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
