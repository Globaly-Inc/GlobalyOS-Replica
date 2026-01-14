import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorUtils";
import { FileText, Plus, Trash2, Users, Send, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPITemplatesDialogProps {
  children: React.ReactNode;
}

const getCurrentQuarter = () => Math.floor(new Date().getMonth() / 3) + 1;
const getCurrentYear = () => new Date().getFullYear();

export const KPITemplatesDialog = ({ children }: KPITemplatesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"list" | "create" | "assign">("list");
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [quarter, setQuarter] = useState(getCurrentQuarter());
  const [year, setYear] = useState(getCurrentYear());
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    target_value: "",
    unit: "",
    category: "",
  });

  const { currentOrg } = useOrganization();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get current employee
  const { data: currentEmployee } = useQuery({
    queryKey: ["current-employee", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["kpi-templates", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("kpi_templates")
        .select("*")
        .eq("organization_id", currentOrg.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id && open,
  });

  // Fetch employees for assignment
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-kpi", currentOrg?.id],
    queryFn: async () => {
      if (!currentOrg?.id) return [];
      const { data, error } = await supabase
        .from("employees")
        .select("id, position, department, profiles(full_name, avatar_url)")
        .eq("organization_id", currentOrg.id)
        .eq("status", "active")
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg?.id && view === "assign",
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!currentOrg?.id || !currentEmployee?.id) throw new Error("Missing org or employee");
      const { error } = await supabase.from("kpi_templates").insert({
        organization_id: currentOrg.id,
        created_by: currentEmployee.id,
        title: data.title,
        description: data.description || null,
        target_value: data.target_value ? parseFloat(data.target_value) : null,
        unit: data.unit || null,
        category: data.category || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-templates"] });
      toast.success("Template created");
      resetForm();
      setView("list");
    },
    onError: (error) => showErrorToast(error, "Failed to create template", {
      componentName: "KPITemplatesDialog",
      actionAttempted: "Create KPI template",
      errorType: "database",
    }),
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("kpi_templates")
        .update({
          title: data.title,
          description: data.description || null,
          target_value: data.target_value ? parseFloat(data.target_value) : null,
          unit: data.unit || null,
          category: data.category || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-templates"] });
      toast.success("Template updated");
      resetForm();
      setView("list");
    },
    onError: (error) => showErrorToast(error, "Failed to update template", {
      componentName: "KPITemplatesDialog",
      actionAttempted: "Update KPI template",
      errorType: "database",
    }),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kpi_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-templates"] });
      toast.success("Template deleted");
    },
    onError: (error) => showErrorToast(error, "Failed to delete template", {
      componentName: "KPITemplatesDialog",
      actionAttempted: "Delete KPI template",
      errorType: "database",
    }),
  });

  const assignKPIsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate || !currentOrg?.id || selectedEmployees.length === 0) {
        throw new Error("Missing data");
      }
      
      const kpisToInsert = selectedEmployees.map((empId) => ({
        employee_id: empId,
        organization_id: currentOrg.id,
        title: selectedTemplate.title,
        description: selectedTemplate.description,
        target_value: selectedTemplate.target_value,
        unit: selectedTemplate.unit,
        quarter,
        year,
        status: "on_track",
        current_value: 0,
      }));

      const { error } = await supabase.from("kpis").insert(kpisToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis"] });
      queryClient.invalidateQueries({ queryKey: ["team-kpis"] });
      toast.success(`KPI assigned to ${selectedEmployees.length} employee(s)`);
      setSelectedEmployees([]);
      setSelectedTemplate(null);
      setView("list");
    },
    onError: (error) => showErrorToast(error, "Failed to assign KPIs", {
      componentName: "KPITemplatesDialog",
      actionAttempted: "Assign KPI to employees",
      errorType: "database",
    }),
  });

  const resetForm = () => {
    setFormData({ title: "", description: "", target_value: "", unit: "", category: "" });
    setEditingTemplate(null);
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      description: template.description || "",
      target_value: template.target_value?.toString() || "",
      unit: template.unit || "",
      category: template.category || "",
    });
    setView("create");
  };

  const handleAssign = (template: any) => {
    setSelectedTemplate(template);
    setSelectedEmployees([]);
    setView("assign");
  };

  const toggleEmployee = (empId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const selectAllEmployees = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map((e) => e.id));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setView("list"); resetForm(); } }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {view === "list" && "KPI Templates"}
            {view === "create" && (editingTemplate ? "Edit Template" : "Create Template")}
            {view === "assign" && "Assign KPI to Employees"}
          </DialogTitle>
        </DialogHeader>

        {view === "list" && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex justify-end mb-4">
              <Button onClick={() => { resetForm(); setView("create"); }} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Template
              </Button>
            </div>

            <ScrollArea className="flex-1">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No templates yet</p>
                  <p className="text-xs">Create a template to quickly assign KPIs</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="p-3 border rounded-lg flex items-center justify-between hover:bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{template.title}</p>
                          {template.category && (
                            <Badge variant="secondary" className="text-xs">{template.category}</Badge>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                        )}
                        {template.target_value && (
                          <p className="text-xs text-muted-foreground">
                            Target: {template.target_value}{template.unit && ` ${template.unit}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAssign(template)}>
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(template)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteTemplateMutation.mutate(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {view === "create" && (
          <div className="space-y-4">
            <div className="grid gap-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g., Complete 10 sales calls per week"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Optional details about this KPI"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Target Value</Label>
                  <Input
                    type="number"
                    value={formData.target_value}
                    onChange={(e) => setFormData((p) => ({ ...p, target_value: e.target.value }))}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Input
                    value={formData.unit}
                    onChange={(e) => setFormData((p) => ({ ...p, unit: e.target.value }))}
                    placeholder="%, calls, $"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                    placeholder="Sales, Support"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { resetForm(); setView("list"); }}>Cancel</Button>
              <Button
                onClick={() => editingTemplate
                  ? updateTemplateMutation.mutate({ id: editingTemplate.id, data: formData })
                  : createTemplateMutation.mutate(formData)
                }
                disabled={!formData.title || createTemplateMutation.isPending || updateTemplateMutation.isPending}
              >
                {editingTemplate ? "Update" : "Create"} Template
              </Button>
            </div>
          </div>
        )}

        {view === "assign" && selectedTemplate && (
          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="font-medium text-sm">{selectedTemplate.title}</p>
              {selectedTemplate.target_value && (
                <p className="text-xs text-muted-foreground">
                  Target: {selectedTemplate.target_value}{selectedTemplate.unit && ` ${selectedTemplate.unit}`}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quarter</Label>
                <Select value={quarter.toString()} onValueChange={(v) => setQuarter(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((q) => (
                      <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[getCurrentYear() - 1, getCurrentYear(), getCurrentYear() + 1].map((y) => (
                      <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Select Employees ({selectedEmployees.length} selected)
              </Label>
              <Button variant="ghost" size="sm" onClick={selectAllEmployees}>
                {selectedEmployees.length === employees.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-2 space-y-1">
                {employees.map((emp) => (
                  <div
                    key={emp.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50",
                      selectedEmployees.includes(emp.id) && "bg-primary/10"
                    )}
                    onClick={() => toggleEmployee(emp.id)}
                  >
                    <Checkbox checked={selectedEmployees.includes(emp.id)} />
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={(emp.profiles as any)?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {(emp.profiles as any)?.full_name?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{(emp.profiles as any)?.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.position} • {emp.department}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setSelectedTemplate(null); setView("list"); }}>
                Cancel
              </Button>
              <Button
                onClick={() => assignKPIsMutation.mutate()}
                disabled={selectedEmployees.length === 0 || assignKPIsMutation.isPending}
              >
                <Send className="h-4 w-4 mr-1" />
                Assign to {selectedEmployees.length} Employee{selectedEmployees.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};