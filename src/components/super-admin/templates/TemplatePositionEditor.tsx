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
import { Pencil, Trash2, Loader2, Users, CheckCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface TemplatePosition {
  id: string;
  business_category: string;
  department_name: string;
  name: string;
  description: string | null;
  responsibilities: string[] | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TemplateDepartment {
  id: string;
  business_category: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

interface TemplatePositionEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position: TemplatePosition | null;
  selectedCategory: string | null;
  positions: TemplatePosition[];
  departments: TemplateDepartment[];
  onEdit: (pos: TemplatePosition) => void;
}

export function TemplatePositionEditor({
  open,
  onOpenChange,
  position,
  selectedCategory,
  positions,
  departments,
  onEdit,
}: TemplatePositionEditorProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    business_category: "",
    department_name: "",
    name: "",
    description: "",
    responsibilities: "",
    sort_order: 0,
  });
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Get unique departments for the selected category
  const categoryDepartments = selectedCategory
    ? departments.filter((d) => d.business_category === selectedCategory)
    : departments;

  useEffect(() => {
    if (position) {
      setFormData({
        business_category: position.business_category,
        department_name: position.department_name,
        name: position.name,
        description: position.description || "",
        responsibilities: position.responsibilities?.join("\n") || "",
        sort_order: position.sort_order,
      });
    } else {
      setFormData({
        business_category: selectedCategory || "",
        department_name: "",
        name: "",
        description: "",
        responsibilities: "",
        sort_order: positions.length,
      });
    }
  }, [position, selectedCategory, positions.length]);

  const generateWithAI = async () => {
    if (!formData.name.trim()) {
      toast.error("Position name is required for AI generation");
      return;
    }

    setIsGeneratingAI(true);
    try {
      // Use a system org ID for super admin AI calls
      const { data, error } = await supabase.functions.invoke('generate-position-description', {
        body: {
          positionName: formData.name.trim(),
          department: formData.department_name || null,
          keywords: [],
          organizationId: "00000000-0000-0000-0000-000000000000", // System org for templates
          forceRegenerate: true,
          mode: "generate",
          business_category: formData.business_category, // Pass business category as industry context
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setFormData(prev => ({
        ...prev,
        description: data.description || "",
        responsibilities: data.responsibilities?.join("\n") || "",
      }));

      toast.success("AI description generated!");
    } catch (error: any) {
      console.error("AI generation error:", error);
      toast.error("Failed to generate AI description: " + error.message);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const responsibilities = data.responsibilities
        .split("\n")
        .map((r) => r.trim())
        .filter((r) => r.length > 0);

      if (position) {
        const { error } = await supabase
          .from("template_positions")
          .update({
            department_name: data.department_name,
            name: data.name,
            description: data.description || null,
            responsibilities: responsibilities.length > 0 ? responsibilities : null,
            sort_order: data.sort_order,
          })
          .eq("id", position.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("template_positions")
          .insert({
            business_category: data.business_category,
            department_name: data.department_name,
            name: data.name,
            description: data.description || null,
            responsibilities: responsibilities.length > 0 ? responsibilities : null,
            sort_order: data.sort_order,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-positions"] });
      toast.success(position ? "Position updated" : "Position created");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("template_positions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-positions"] });
      toast.success("Position deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.business_category || !formData.department_name || !formData.name) {
      toast.error("Category, department, and name are required");
      return;
    }
    saveMutation.mutate(formData);
  };

  // Group positions by department
  const groupedPositions = positions.reduce((acc, pos) => {
    if (!acc[pos.department_name]) {
      acc[pos.department_name] = [];
    }
    acc[pos.department_name].push(pos);
    return acc;
  }, {} as Record<string, TemplatePosition[]>);

  return (
    <>
      {/* Position List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {selectedCategory ? `Positions for ${selectedCategory}` : "All Positions"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No positions found. Add one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {!selectedCategory && <TableHead>Category</TableHead>}
                  <TableHead>Department</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Responsibilities</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((pos) => (
                  <TableRow key={pos.id}>
                    {!selectedCategory && (
                      <TableCell>
                        <Badge variant="outline">{pos.business_category}</Badge>
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="secondary">{pos.department_name}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{pos.name}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {pos.description ? (
                        <span className="text-sm">{pos.description}</span>
                      ) : (
                        <span className="text-muted-foreground italic text-sm">
                          No description
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {pos.responsibilities && pos.responsibilities.length > 0 ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {pos.responsibilities.length} items
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground italic text-sm">
                          None
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(pos)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Delete this position?")) {
                              deleteMutation.mutate(pos.id);
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {position ? "Edit Position" : "Add Position"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Business Category</Label>
                <Select
                  value={formData.business_category}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      business_category: value,
                      department_name: "",
                    }))
                  }
                  disabled={!!position}
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
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.department_name}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, department_name: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments
                      .filter(
                        (d) =>
                          !formData.business_category ||
                          d.business_category === formData.business_category
                      )
                      .map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Position Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Software Engineer"
              />
            </div>

            {/* AI Generate Button */}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={generateWithAI}
                disabled={isGeneratingAI || !formData.name.trim()}
              >
                {isGeneratingAI ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate with AI
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Brief description of this position..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsibilities">
                Responsibilities (one per line)
              </Label>
              <Textarea
                id="responsibilities"
                value={formData.responsibilities}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    responsibilities: e.target.value,
                  }))
                }
                placeholder="Enter each responsibility on a new line..."
                rows={5}
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
                className="w-24"
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
                {position ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
