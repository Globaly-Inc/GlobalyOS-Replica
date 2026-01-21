import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BUSINESS_CATEGORIES } from "@/constants/businessCategories";
import { Pencil, Trash2, Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

interface TemplateDepartment {
  id: string;
  business_category: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TemplateDepartmentEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: TemplateDepartment | null;
  selectedCategory: string | null;
  departments: TemplateDepartment[];
  onEdit: (dept: TemplateDepartment) => void;
}

export function TemplateDepartmentEditor({
  open,
  onOpenChange,
  department,
  selectedCategory,
  departments,
  onEdit,
}: TemplateDepartmentEditorProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    business_category: "",
    name: "",
    description: "",
    sort_order: 0,
  });

  useEffect(() => {
    if (department) {
      setFormData({
        business_category: department.business_category,
        name: department.name,
        description: department.description || "",
        sort_order: department.sort_order,
      });
    } else {
      setFormData({
        business_category: selectedCategory || "",
        name: "",
        description: "",
        sort_order: departments.length,
      });
    }
  }, [department, selectedCategory, departments.length]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (department) {
        const { error } = await supabase
          .from("template_departments")
          .update({
            name: data.name,
            description: data.description || null,
            sort_order: data.sort_order,
          })
          .eq("id", department.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("template_departments")
          .insert({
            business_category: data.business_category,
            name: data.name,
            description: data.description || null,
            sort_order: data.sort_order,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-departments"] });
      toast.success(department ? "Department updated" : "Department created");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("template_departments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-departments"] });
      toast.success("Department deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.business_category || !formData.name) {
      toast.error("Category and name are required");
      return;
    }
    saveMutation.mutate(formData);
  };

  // Group departments by category
  const groupedDepartments = departments.reduce((acc, dept) => {
    if (!acc[dept.business_category]) {
      acc[dept.business_category] = [];
    }
    acc[dept.business_category].push(dept);
    return acc;
  }, {} as Record<string, TemplateDepartment[]>);

  return (
    <>
      {/* Department List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {selectedCategory ? `Departments for ${selectedCategory}` : "All Departments"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {departments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No departments found. Add one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {!selectedCategory && <TableHead>Category</TableHead>}
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    {!selectedCategory && (
                      <TableCell>
                        <Badge variant="outline">{dept.business_category}</Badge>
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="max-w-md truncate">
                      {dept.description || (
                        <span className="text-muted-foreground italic">No description</span>
                      )}
                    </TableCell>
                    <TableCell>{dept.sort_order}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(dept)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Delete this department?")) {
                              deleteMutation.mutate(dept.id);
                            }
                          }}
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
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {department ? "Edit Department" : "Add Department"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Business Category</Label>
              <Select
                value={formData.business_category}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, business_category: value }))
                }
                disabled={!!department}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Department Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Human Resources"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Brief description of this department..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sort_order: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {department ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
