import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserCheck, Plus, Pencil, Trash2, Loader2, Globe } from "lucide-react";
import { toast } from "sonner";
import { COUNTRIES } from "@/lib/countries";

interface TemplateEmploymentType {
  id: string;
  country_code: string | null;
  name: string;
  label: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export const TemplateEmploymentTypesTab = () => {
  const queryClient = useQueryClient();
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<TemplateEmploymentType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    country_code: "" as string | null,
    name: "",
    label: "",
    description: "",
    sort_order: 0,
    is_active: true,
  });

  const { data: employmentTypes = [], isLoading } = useQuery({
    queryKey: ["template-employment-types", countryFilter],
    queryFn: async () => {
      let query = supabase
        .from("template_employment_types")
        .select("*")
        .order("country_code", { nullsFirst: true })
        .order("sort_order");

      if (countryFilter !== "all") {
        if (countryFilter === "global") {
          query = query.is("country_code", null);
        } else {
          query = query.eq("country_code", countryFilter);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TemplateEmploymentType[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload = {
        ...data,
        country_code: data.country_code || null,
        name: data.name.toLowerCase().replace(/\s+/g, '_'),
      };

      if (data.id) {
        const { error } = await supabase
          .from("template_employment_types")
          .update(payload)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("template_employment_types")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-employment-types"] });
      toast.success(editingType ? "Employment type updated" : "Employment type created");
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error("Error saving employment type: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("template_employment_types")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["template-employment-types"] });
      toast.success("Employment type deleted");
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error("Error deleting employment type: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      country_code: null,
      name: "",
      label: "",
      description: "",
      sort_order: 0,
      is_active: true,
    });
    setEditingType(null);
  };

  const openEdit = (type: TemplateEmploymentType) => {
    setEditingType(type);
    setFormData({
      country_code: type.country_code,
      name: type.name,
      label: type.label,
      description: type.description || "",
      sort_order: type.sort_order,
      is_active: type.is_active,
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.label.trim()) {
      toast.error("Label is required");
      return;
    }
    // Auto-generate name from label if empty
    const name = formData.name || formData.label.toLowerCase().replace(/\s+/g, '_');
    saveMutation.mutate({ ...formData, name, id: editingType?.id });
  };

  // Get unique countries from data
  const countriesInData = [...new Set(employmentTypes.map(t => t.country_code).filter(Boolean))] as string[];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Template Employment Types
            </CardTitle>
            <CardDescription>
              Manage employment type templates used during organization onboarding
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="global">
                  <span className="flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Global
                  </span>
                </SelectItem>
                {countriesInData.map(code => {
                  const country = COUNTRIES.find(c => c.code === code);
                  return (
                    <SelectItem key={code} value={code}>
                      {country?.name || code}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employment Type
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : employmentTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No employment types found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Name (Internal)</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employmentTypes.map((type) => {
                  const country = type.country_code
                    ? COUNTRIES.find(c => c.code === type.country_code)?.name || type.country_code
                    : "Global";
                  return (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.label}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {type.name}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.country_code ? "outline" : "secondary"}>
                          {type.country_code ? country : (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" /> Global
                            </span>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground truncate max-w-[200px] block">
                          {type.description || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={type.is_active ? "default" : "secondary"}>
                          {type.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(type)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(type.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? "Edit Employment Type" : "Add Employment Type"}
            </DialogTitle>
            <DialogDescription>
              Configure employment type template settings
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={formData.country_code || "global"}
                onValueChange={(v) => setFormData({ ...formData, country_code: v === "global" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">
                    <span className="flex items-center gap-2">
                      <Globe className="h-4 w-4" /> Global (All Countries)
                    </span>
                  </SelectItem>
                  {COUNTRIES.map(country => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Label (Display Name) *</Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Full-time Employee"
              />
            </div>

            <div className="space-y-2">
              <Label>Internal Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Auto-generated from label if empty"
              />
              <p className="text-xs text-muted-foreground">
                Used in code and database. Lowercase with underscores.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this employment type..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                  min={0}
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingType ? "Save Changes" : "Create Employment Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employment Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this employment type template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
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
