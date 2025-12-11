import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
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
import { List, Briefcase, Building, Plus, Pencil, Trash2, Loader2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { LeaveSettings } from "./LeaveSettings";

interface Position {
  id: string;
  name: string;
  department: string | null;
  created_at: string;
}

interface Department {
  name: string;
  count: number;
}

export const FieldsSettings = () => {
  const { toast } = useToast();
  const { currentOrg } = useOrganization();
  const [positions, setPositions] = useState<Position[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Position dialog state
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [positionName, setPositionName] = useState("");
  const [positionDepartment, setPositionDepartment] = useState("");

  // Department dialog state
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<string | null>(null);
  const [departmentName, setDepartmentName] = useState("");
  const [originalDepartmentName, setOriginalDepartmentName] = useState("");

  // Delete confirmation state
  const [deletePositionId, setDeletePositionId] = useState<string | null>(null);
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
      // Load positions
      const { data: positionsData, error: positionsError } = await supabase
        .from("positions")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("name");

      if (positionsError) throw positionsError;
      setPositions(positionsData || []);

      // Load departments from employees table (unique values with count)
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("department")
        .eq("organization_id", currentOrg.id);

      if (employeesError) throw employeesError;

      // Count departments
      const deptCounts: Record<string, number> = {};
      employeesData?.forEach((emp) => {
        if (emp.department) {
          deptCounts[emp.department] = (deptCounts[emp.department] || 0) + 1;
        }
      });

      const deptList: Department[] = Object.entries(deptCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));

      setDepartments(deptList);
    } catch (error: any) {
      toast({
        title: "Error loading fields",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Position CRUD operations
  const handleSavePosition = async () => {
    if (!currentOrg || !positionName.trim()) return;
    setSaving(true);
    try {
      if (editingPosition) {
        // Update existing position
        const { error } = await supabase
          .from("positions")
          .update({
            name: positionName.trim(),
            department: positionDepartment.trim() || null,
          })
          .eq("id", editingPosition.id);

        if (error) throw error;
        toast({ title: "Position updated" });
      } else {
        // Create new position
        const { error } = await supabase.from("positions").insert({
          name: positionName.trim(),
          department: positionDepartment.trim() || null,
          organization_id: currentOrg.id,
        });

        if (error) throw error;
        toast({ title: "Position created" });
      }

      setPositionDialogOpen(false);
      setEditingPosition(null);
      setPositionName("");
      setPositionDepartment("");
      loadData();
    } catch (error: any) {
      toast({
        title: "Error saving position",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePosition = async () => {
    if (!deletePositionId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("positions")
        .delete()
        .eq("id", deletePositionId);

      if (error) throw error;
      toast({ title: "Position deleted" });
      setDeletePositionId(null);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error deleting position",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Department CRUD operations
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

        toast({ title: "Department renamed" });
      } else {
        // For creating a new department, we don't actually create anything
        // Departments are created when employees are assigned to them
        toast({ 
          title: "Department created",
          description: "The department will appear when employees are assigned to it.",
        });
      }

      setDepartmentDialogOpen(false);
      setEditingDepartment(null);
      setDepartmentName("");
      setOriginalDepartmentName("");
      loadData();
    } catch (error: any) {
      toast({
        title: "Error saving department",
        description: error.message,
        variant: "destructive",
      });
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
      toast({ title: "Department removed from all employees" });
      setDeleteDepartmentName(null);
      loadData();
    } catch (error: any) {
      toast({
        title: "Error deleting department",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openEditPosition = (position: Position) => {
    setEditingPosition(position);
    setPositionName(position.name);
    setPositionDepartment(position.department || "");
    setPositionDialogOpen(true);
  };

  const openEditDepartment = (department: Department) => {
    setEditingDepartment(department.name);
    setOriginalDepartmentName(department.name);
    setDepartmentName(department.name);
    setDepartmentDialogOpen(true);
  };

  const openNewPosition = () => {
    setEditingPosition(null);
    setPositionName("");
    setPositionDepartment("");
    setPositionDialogOpen(true);
  };

  const openNewDepartment = () => {
    setEditingDepartment(null);
    setDepartmentName("");
    setOriginalDepartmentName("");
    setDepartmentDialogOpen(true);
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Field Management
          </CardTitle>
          <CardDescription>
            Manage dropdown options used throughout the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="departments" className="space-y-4">
            <TabsList>
              <TabsTrigger value="departments" className="gap-2">
                <Building className="h-4 w-4" />
                Departments
                <Badge variant="secondary" className="ml-1">{departments.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="positions" className="gap-2">
                <Briefcase className="h-4 w-4" />
                Positions
                <Badge variant="secondary" className="ml-1">{positions.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="leave-types" className="gap-2">
                <Calendar className="h-4 w-4" />
                Leave Types
              </TabsTrigger>
            </TabsList>

            <TabsContent value="departments" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Departments are used to organize employees and positions.
                </p>
                <Button onClick={openNewDepartment} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Department
                </Button>
              </div>

              {departments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No departments found. Departments are created when employees are assigned to them.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Department Name</TableHead>
                      <TableHead className="text-center">Employees</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments.map((dept) => (
                      <TableRow key={dept.name}>
                        <TableCell className="font-medium">{dept.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline">{dept.count}</Badge>
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
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="positions" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Positions define job titles within your organization.
                </p>
                <Button onClick={openNewPosition} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Position
                </Button>
              </div>

              {positions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No positions found. Click "Add Position" to create one.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((position) => (
                      <TableRow key={position.id}>
                        <TableCell className="font-medium">{position.name}</TableCell>
                        <TableCell>
                          {position.department ? (
                            <Badge variant="outline">{position.department}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditPosition(position)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletePositionId(position.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="leave-types" className="space-y-4">
              <LeaveSettings embedded />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Position Dialog */}
      <Dialog open={positionDialogOpen} onOpenChange={setPositionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPosition ? "Edit Position" : "Add New Position"}
            </DialogTitle>
            <DialogDescription>
              {editingPosition
                ? "Update the position details below."
                : "Enter the details for the new position."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="positionName">Position Name</Label>
              <Input
                id="positionName"
                value={positionName}
                onChange={(e) => setPositionName(e.target.value)}
                placeholder="e.g., Software Engineer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="positionDepartment">Department (Optional)</Label>
              <Input
                id="positionDepartment"
                value={positionDepartment}
                onChange={(e) => setPositionDepartment(e.target.value)}
                placeholder="e.g., Engineering"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPositionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePosition} disabled={saving || !positionName.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingPosition ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department Dialog */}
      <Dialog open={departmentDialogOpen} onOpenChange={setDepartmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? "Rename Department" : "Add New Department"}
            </DialogTitle>
            <DialogDescription>
              {editingDepartment
                ? "This will rename the department for all employees and positions."
                : "Enter the name for the new department."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="departmentName">Department Name</Label>
              <Input
                id="departmentName"
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                placeholder="e.g., Engineering"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDepartmentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDepartment} disabled={saving || !departmentName.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingDepartment ? "Rename" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Position Confirmation */}
      <AlertDialog open={!!deletePositionId} onOpenChange={() => setDeletePositionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Position?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this position. Employees with this position will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePosition} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Department Confirmation */}
      <AlertDialog open={!!deleteDepartmentName} onOpenChange={() => setDeleteDepartmentName(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the department assignment from all {departments.find(d => d.name === deleteDepartmentName)?.count || 0} employees. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDepartment} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
