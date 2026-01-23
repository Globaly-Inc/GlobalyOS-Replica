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
  name: string;
  count: number;
}

export const DepartmentsSettings = () => {
  const { currentOrg } = useOrganization();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<string | null>(null);
  const [departmentName, setDepartmentName] = useState("");
  const [originalDepartmentName, setOriginalDepartmentName] = useState("");

  // Delete confirmation state
  const [deleteDepartmentName, setDeleteDepartmentName] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrg) {
      loadData();
    }
  }, [currentOrg]);

  const loadData = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      // Get unique departments from positions
      const { data: positionsData } = await supabase
        .from("positions")
        .select("department")
        .eq("organization_id", currentOrg.id);

      const positionDepts = new Set<string>();
      positionsData?.forEach((pos) => {
        if (pos.department) {
          positionDepts.add(pos.department);
        }
      });

      // Load departments from employees table for employee counts
      const { data: employeesData } = await supabase
        .from("employees")
        .select("department")
        .eq("organization_id", currentOrg.id)
        .eq("status", "active");

      // Count employees per department
      const deptCounts: Record<string, number> = {};
      employeesData?.forEach((emp) => {
        if (emp.department) {
          deptCounts[emp.department] = (deptCounts[emp.department] || 0) + 1;
        }
      });

      // Merge: all departments from positions + any additional from employees
      const allDepts = new Set([...positionDepts, ...Object.keys(deptCounts)]);

      const deptList: Department[] = Array.from(allDepts)
        .map((name) => ({ name, count: deptCounts[name] || 0 }))
        .sort((a, b) => a.name.localeCompare(b.name));

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
        // Update all employees with this department name
        const { error } = await supabase
          .from("employees")
          .update({ department: departmentName.trim() })
          .eq("organization_id", currentOrg.id)
          .eq("department", originalDepartmentName);

        if (error) throw error;

        // Also update positions with this department
        await supabase
          .from("positions")
          .update({ department: departmentName.trim() })
          .eq("organization_id", currentOrg.id)
          .eq("department", originalDepartmentName);

        // Update position_history as well
        await supabase
          .from("position_history")
          .update({ department: departmentName.trim() })
          .eq("organization_id", currentOrg.id)
          .eq("department", originalDepartmentName);

        toast.success("Department renamed");
      } else {
        toast.success("Department created. It will appear when employees are assigned to it.");
      }

      setDialogOpen(false);
      setEditingDepartment(null);
      setDepartmentName("");
      setOriginalDepartmentName("");
      loadData();
    } catch (error: any) {
      toast.error("Error saving department: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDepartment = async () => {
    if (!deleteDepartmentName || !currentOrg) return;
    setSaving(true);
    try {
      // Set department to null for all employees with this department
      const { error } = await supabase
        .from("employees")
        .update({ department: "" })
        .eq("organization_id", currentOrg.id)
        .eq("department", deleteDepartmentName);

      if (error) throw error;
      toast.success("Department removed from all employees");
      setDeleteDepartmentName(null);
      loadData();
    } catch (error: any) {
      toast.error("Error deleting department: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const openEditDepartment = (department: Department) => {
    setEditingDepartment(department.name);
    setOriginalDepartmentName(department.name);
    setDepartmentName(department.name);
    setDialogOpen(true);
  };

  const openNewDepartment = () => {
    setEditingDepartment(null);
    setDepartmentName("");
    setOriginalDepartmentName("");
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
              <p className="text-sm">Add a department or assign employees to departments</p>
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
                  <TableRow key={dept.name}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
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
                          onClick={() => setDeleteDepartmentName(dept.name)}
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
                ? "Rename this department. All employees and positions will be updated."
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
        open={!!deleteDepartmentName}
        onOpenChange={() => setDeleteDepartmentName(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove "{deleteDepartmentName}" from all employees. This action cannot be undone.
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
