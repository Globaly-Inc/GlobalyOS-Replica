import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Building, Plus, Pencil, Trash2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";

interface Department {
  id: string;
  name: string;
  description: string | null;
  count: number;
}

export const DepartmentsSettings = () => {
  const { currentOrg } = useOrganization();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentName, setDepartmentName] = useState("");
  const [departmentDescription, setDepartmentDescription] = useState("");

  // Delete confirmation state
  const [deleteDepartment, setDeleteDepartment] = useState<Department | null>(null);

  useEffect(() => {
    if (currentOrg) {
      loadData();
    }
  }, [currentOrg]);

  const loadData = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      // Load departments from the departments table (single source of truth)
      const { data: departmentsData, error: deptError } = await supabase
        .from("departments")
        .select("id, name, description")
        .eq("organization_id", currentOrg.id)
        .order("name");

      if (deptError) throw deptError;

      // Get employee counts per department using department_id
      const { data: employeeCounts, error: countError } = await supabase
        .from("employees")
        .select("department_id")
        .eq("organization_id", currentOrg.id)
        .eq("status", "active")
        .not("department_id", "is", null);

      if (countError) throw countError;

      // Count employees per department
      const deptCounts: Record<string, number> = {};
      employeeCounts?.forEach((emp) => {
        if (emp.department_id) {
          deptCounts[emp.department_id] = (deptCounts[emp.department_id] || 0) + 1;
        }
      });

      const deptList: Department[] = (departmentsData || []).map((dept) => ({
        id: dept.id,
        name: dept.name,
        description: dept.description,
        count: deptCounts[dept.id] || 0,
      }));

      setDepartments(deptList);
    } catch (error: any) {
      toast.error("Error loading departments: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDepartment = async () => {
    if (!currentOrg || !departmentName.trim()) return;
    setSaving(true);
    try {
      if (editingDepartment) {
        // Update existing department
        const { error } = await supabase
          .from("departments")
          .update({ 
            name: departmentName.trim(),
            description: departmentDescription.trim() || null
          })
          .eq("id", editingDepartment.id);

        if (error) throw error;

        // Also update legacy text fields in employees and positions for backward compatibility
        await Promise.all([
          supabase
            .from("employees")
            .update({ department: departmentName.trim() })
            .eq("department_id", editingDepartment.id),
          supabase
            .from("positions")
            .update({ department: departmentName.trim() })
            .eq("department_id", editingDepartment.id),
          supabase
            .from("position_history")
            .update({ department: departmentName.trim() })
            .eq("organization_id", currentOrg.id)
            .eq("department", editingDepartment.name)
        ]);

        toast.success("Department updated");
      } else {
        // Create new department
        const { error } = await supabase
          .from("departments")
          .insert({
            organization_id: currentOrg.id,
            name: departmentName.trim(),
            description: departmentDescription.trim() || null
          });

        if (error) {
          if (error.code === '23505') {
            toast.error("A department with this name already exists");
            return;
          }
          throw error;
        }

        toast.success("Department created");
      }

      setDialogOpen(false);
      setEditingDepartment(null);
      setDepartmentName("");
      setDepartmentDescription("");
      loadData();
    } catch (error: any) {
      toast.error("Error saving department: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!deleteDepartment || !currentOrg) return;
    setSaving(true);
    try {
      // Clear department_id from employees
      await supabase
        .from("employees")
        .update({ department_id: null, department: "" })
        .eq("department_id", deleteDepartment.id);

      // Clear department_id from positions
      await supabase
        .from("positions")
        .update({ department_id: null, department: "" })
        .eq("department_id", deleteDepartment.id);

      // Delete the department
      const { error } = await supabase
        .from("departments")
        .delete()
        .eq("id", deleteDepartment.id);

      if (error) throw error;
      
      toast.success("Department deleted");
      setDeleteDepartment(null);
      loadData();
    } catch (error: any) {
      toast.error("Error deleting department: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const openEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setDepartmentName(department.name);
    setDepartmentDescription(department.description || "");
    setDialogOpen(true);
  };

  const openNewDepartment = () => {
    setEditingDepartment(null);
    setDepartmentName("");
    setDepartmentDescription("");
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Departments
            </CardTitle>
            <CardDescription>
              Manage departments in your organization
            </CardDescription>
          </div>
          <Button onClick={openNewDepartment} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No departments yet</p>
              <p className="text-sm">Add a department to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{dept.name}</span>
                        {dept.description && (
                          <p className="text-sm text-muted-foreground">{dept.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        {dept.count}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDepartment(dept)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteDepartment(dept)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Department Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? "Edit Department" : "Add Department"}
            </DialogTitle>
            <DialogDescription>
              {editingDepartment
                ? "Update this department. All employees and positions will be updated."
                : "Add a new department to your organization."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="departmentName">Department Name</Label>
              <Input
                id="departmentName"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                placeholder="e.g., Engineering, Marketing, Sales"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="departmentDescription">Description (Optional)</Label>
              <Input
                id="departmentDescription"
                value={departmentDescription}
                onChange={(e) => setDepartmentDescription(e.target.value)}
                placeholder="Brief description of this department"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDepartment} disabled={saving || !departmentName.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingDepartment ? "Save Changes" : "Add Department"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteDepartment}
        onOpenChange={() => setDeleteDepartment(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{deleteDepartment?.name}" and unassign all employees from this department. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDepartment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
