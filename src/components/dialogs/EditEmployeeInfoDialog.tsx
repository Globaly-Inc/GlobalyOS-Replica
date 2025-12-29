import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";

const EMPLOYMENT_TYPES = [
  { value: 'trainee', label: 'Trainee' },
  { value: 'intern', label: 'Intern' },
  { value: 'contract', label: 'Contract' },
  { value: 'employee', label: 'Employee' },
] as const;

interface EditEmployeeInfoDialogProps {
  employeeId: string;
  currentPosition: string;
  currentDepartment: string;
  currentEmploymentType?: string;
  onSuccess: () => void;
}

export const EditEmployeeInfoDialog = ({
  employeeId,
  currentPosition,
  currentDepartment,
  currentEmploymentType = 'employee',
  onSuccess,
}: EditEmployeeInfoDialogProps) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(currentPosition);
  const [department, setDepartment] = useState(currentDepartment);
  const [employmentType, setEmploymentType] = useState(currentEmploymentType);
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [showNewPosition, setShowNewPosition] = useState(false);
  const [showNewDepartment, setShowNewDepartment] = useState(false);
  const [newPosition, setNewPosition] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const { toast } = useToast();
  const { currentOrg } = useOrganization();

  useEffect(() => {
    if (open && currentOrg?.id) {
      loadPositionsAndDepartments();
    }
  }, [open, currentOrg?.id]);

  const loadPositionsAndDepartments = async () => {
    // Get unique positions and departments from employees
    const { data: employees } = await supabase
      .from("employees")
      .select("position, department")
      .eq("organization_id", currentOrg?.id);

    if (employees) {
      const uniquePositions = [...new Set(employees.map(e => e.position).filter(Boolean))];
      const uniqueDepartments = [...new Set(employees.map(e => e.department).filter(Boolean))];
      setPositions(uniquePositions);
      setDepartments(uniqueDepartments);
    }
  };

  const handleSave = async () => {
    const finalPosition = showNewPosition ? newPosition : position;
    const finalDepartment = showNewDepartment ? newDepartment : department;

    if (!finalPosition || !finalDepartment) {
      toast({
        title: "Validation error",
        description: "Position and department are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("employees")
        .update({ 
          position: finalPosition, 
          department: finalDepartment,
          employment_type: employmentType,
        })
        .eq("id", employeeId);
      
      if (error) throw error;

      toast({ title: "Employee info updated successfully" });
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
          <DialogTitle>Edit Position & Department</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Position</Label>
            {showNewPosition ? (
              <div className="flex gap-2">
                <Input
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  placeholder="Enter new position"
                />
                <Button variant="outline" size="sm" onClick={() => setShowNewPosition(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setShowNewPosition(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Department</Label>
            {showNewDepartment ? (
              <div className="flex gap-2">
                <Input
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  placeholder="Enter new department"
                />
                <Button variant="outline" size="sm" onClick={() => setShowNewDepartment(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setShowNewDepartment(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Employment Type</Label>
            <Select value={employmentType} onValueChange={setEmploymentType}>
              <SelectTrigger>
                <SelectValue placeholder="Select employment type" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
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
