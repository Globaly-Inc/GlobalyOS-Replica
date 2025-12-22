import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
import { 
  List, 
  Briefcase, 
  Building, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Calendar,
  Sparkles,
  Wand2,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { LeaveSettings } from "./LeaveSettings";

interface Position {
  id: string;
  name: string;
  department: string | null;
  description: string | null;
  responsibilities: string[] | null;
  ai_generated_at: string | null;
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
  const [leaveTypesCount, setLeaveTypesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Position dialog state
  const [positionDialogOpen, setPositionDialogOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [positionName, setPositionName] = useState("");
  const [positionDepartment, setPositionDepartment] = useState("");
  const [positionDescription, setPositionDescription] = useState("");
  const [positionResponsibilities, setPositionResponsibilities] = useState<string[]>([]);
  const [keywords, setKeywords] = useState("");
  const [generatingAI, setGeneratingAI] = useState(false);

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
      // Load positions with description fields
      const { data: positionsData, error: positionsError } = await supabase
        .from("positions")
        .select("id, name, department, description, responsibilities, ai_generated_at, created_at")
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

      // Load leave types count
      const { count: leaveCount, error: leaveError } = await supabase
        .from("leave_types")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", currentOrg.id);

      if (!leaveError) {
        setLeaveTypesCount(leaveCount || 0);
      }
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

  // AI generation function
  const handleGenerateDescription = async (mode: "generate" | "improve" = "generate") => {
    if (!currentOrg || !positionName.trim()) {
      toast({
        title: "Position name required",
        description: "Please enter a position name before generating.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingAI(true);
    try {
      const keywordsArray = keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      const { data, error } = await supabase.functions.invoke('generate-position-description', {
        body: {
          positionId: editingPosition?.id,
          positionName: positionName.trim(),
          department: positionDepartment.trim() || null,
          keywords: keywordsArray,
          organizationId: currentOrg.id,
          forceRegenerate: true,
          mode,
          existingDescription: mode === "improve" ? positionDescription : undefined,
          existingResponsibilities: mode === "improve" ? positionResponsibilities : undefined,
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setPositionDescription(data.description || "");
      setPositionResponsibilities(data.responsibilities || []);
      
      toast({
        title: mode === "improve" ? "Description improved" : "Description generated",
        description: "AI has created content for this position.",
      });
    } catch (error: any) {
      console.error("Error generating description:", error);
      toast({
        title: "Error generating description",
        description: error.message || "Failed to generate AI content",
        variant: "destructive",
      });
    } finally {
      setGeneratingAI(false);
    }
  };

  // Position CRUD operations
  const handleSavePosition = async () => {
    if (!currentOrg || !positionName.trim()) return;
    setSaving(true);
    try {
      const positionData = {
        name: positionName.trim(),
        department: positionDepartment.trim() || null,
        description: positionDescription.trim() || null,
        responsibilities: positionResponsibilities.filter(r => r.trim()),
        ai_generated_at: positionDescription ? new Date().toISOString() : null,
      };

      if (editingPosition) {
        // Update existing position
        const { error } = await supabase
          .from("positions")
          .update(positionData)
          .eq("id", editingPosition.id);

        if (error) throw error;
        toast({ title: "Position updated" });
      } else {
        // Create new position
        const { error } = await supabase.from("positions").insert({
          ...positionData,
          organization_id: currentOrg.id,
        });

        if (error) throw error;
        toast({ title: "Position created" });
      }

      resetPositionDialog();
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

  // Responsibility management
  const handleAddResponsibility = () => {
    setPositionResponsibilities([...positionResponsibilities, ""]);
  };

  const handleRemoveResponsibility = (index: number) => {
    setPositionResponsibilities(positionResponsibilities.filter((_, i) => i !== index));
  };

  const handleResponsibilityChange = (index: number, value: string) => {
    const updated = [...positionResponsibilities];
    updated[index] = value;
    setPositionResponsibilities(updated);
  };

  const resetPositionDialog = () => {
    setPositionDialogOpen(false);
    setEditingPosition(null);
    setPositionName("");
    setPositionDepartment("");
    setPositionDescription("");
    setPositionResponsibilities([]);
    setKeywords("");
  };

  const openEditPosition = (position: Position) => {
    setEditingPosition(position);
    setPositionName(position.name);
    setPositionDepartment(position.department || "");
    setPositionDescription(position.description || "");
    setPositionResponsibilities(position.responsibilities || []);
    setKeywords("");
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
    setPositionDescription("");
    setPositionResponsibilities([]);
    setKeywords("");
    setPositionDialogOpen(true);
  };

  const openNewDepartment = () => {
    setEditingDepartment(null);
    setDepartmentName("");
    setOriginalDepartmentName("");
    setDepartmentDialogOpen(true);
  };

  // Word count helper
  const getWordCount = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
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
                <Badge variant="secondary" className="ml-1">{leaveTypesCount}</Badge>
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
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {positions.map((position) => (
                      <TableRow key={position.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {position.name}
                            {position.ai_generated_at && (
                              <Sparkles className="h-3.5 w-3.5 text-primary" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {position.department ? (
                            <Badge variant="outline">{position.department}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {position.description ? (
                            <span className="text-sm text-muted-foreground truncate block">
                              {position.description.slice(0, 50)}...
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">No description</span>
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
      <Dialog open={positionDialogOpen} onOpenChange={(open) => !open && resetPositionDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="positionName">Position Name *</Label>
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

            <Separator />

            {/* AI Description Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="positionDescription" className="text-base font-medium">
                  Description
                </Label>
                <div className="flex gap-2">
                  {!positionDescription && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateDescription("generate")}
                      disabled={generatingAI || !positionName.trim()}
                      className="gap-2"
                    >
                      {generatingAI ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      Generate with AI
                    </Button>
                  )}
                  {positionDescription && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateDescription("improve")}
                      disabled={generatingAI || !positionName.trim()}
                      className="gap-2"
                    >
                      {generatingAI ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="h-4 w-4" />
                      )}
                      Improve
                    </Button>
                  )}
                </div>
              </div>
              
              <Textarea
                id="positionDescription"
                value={positionDescription}
                onChange={(e) => setPositionDescription(e.target.value)}
                placeholder="Describe the role's purpose, scope, and key responsibilities..."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {getWordCount(positionDescription)} words
              </p>

              {/* Keywords Input */}
              <div className="space-y-2">
                <Label htmlFor="keywords" className="text-sm">
                  Keywords for AI (Optional)
                </Label>
                <Input
                  id="keywords"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="e.g., leadership, data analysis, customer relations"
                />
                <p className="text-xs text-muted-foreground">
                  Comma-separated keywords to guide AI generation
                </p>
              </div>
            </div>

            <Separator />

            {/* Responsibilities Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Key Responsibilities</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddResponsibility}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>

              {positionResponsibilities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
                  No responsibilities added. Click "Add" or use AI to generate.
                </p>
              ) : (
                <div className="space-y-2">
                  {positionResponsibilities.map((resp, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground w-6 flex-shrink-0">
                        {index + 1}.
                      </span>
                      <Input
                        value={resp}
                        onChange={(e) => handleResponsibilityChange(index, e.target.value)}
                        placeholder="Enter responsibility..."
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveResponsibility(index)}
                        className="flex-shrink-0"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetPositionDialog}>
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
