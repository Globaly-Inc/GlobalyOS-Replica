import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Target, Trash2, Pencil, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AIKPIAssist } from "@/components/AIKPIAssist";

interface ManageKPIsDialogProps {
  employeeId: string;
  organizationId: string;
  employeeRole?: string;
  department?: string;
}

interface KPI {
  id: string;
  title: string;
  description: string | null;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  status: string;
  quarter: number;
  year: number;
}

const getCurrentQuarter = () => Math.floor(new Date().getMonth() / 3) + 1;
const getCurrentYear = () => new Date().getFullYear();

const ManageKPIsDialog = ({ employeeId, organizationId, employeeRole, department }: ManageKPIsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [quarter, setQuarter] = useState(getCurrentQuarter());
  const [year, setYear] = useState(getCurrentYear());
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    target_value: "",
    current_value: "",
    unit: "",
    status: "on_track",
  });

  const queryClient = useQueryClient();

  const { data: kpis = [], isLoading } = useQuery({
    queryKey: ["kpis-manage", employeeId, quarter, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kpis")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("quarter", quarter)
        .eq("year", year)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as KPI[];
    },
    enabled: open,
  });

  const handleAISuggestion = (suggestion: {
    title?: string;
    description?: string;
    suggestedTarget?: number | null;
    suggestedUnit?: string | null;
  }) => {
    setFormData((prev) => ({
      ...prev,
      title: suggestion.title || prev.title,
      description: suggestion.description || prev.description,
      target_value: suggestion.suggestedTarget?.toString() || prev.target_value,
      unit: suggestion.suggestedUnit || prev.unit,
    }));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("kpis").insert({
        employee_id: employeeId,
        organization_id: organizationId,
        title: formData.title,
        description: formData.description || null,
        target_value: formData.target_value ? parseFloat(formData.target_value) : null,
        current_value: formData.current_value ? parseFloat(formData.current_value) : 0,
        unit: formData.unit || null,
        status: formData.status,
        quarter,
        year,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis-manage", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["kpis", employeeId] });
      resetForm();
      toast.success("KPI added");
    },
    onError: () => toast.error("Failed to add KPI"),
  });

  const updateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("kpis")
        .update({
          title: formData.title,
          description: formData.description || null,
          target_value: formData.target_value ? parseFloat(formData.target_value) : null,
          current_value: formData.current_value ? parseFloat(formData.current_value) : 0,
          unit: formData.unit || null,
          status: formData.status,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis-manage", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["kpis", employeeId] });
      setEditingId(null);
      resetForm();
      toast.success("KPI updated");
    },
    onError: () => toast.error("Failed to update KPI"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kpis").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpis-manage", employeeId] });
      queryClient.invalidateQueries({ queryKey: ["kpis", employeeId] });
      toast.success("KPI deleted");
    },
    onError: () => toast.error("Failed to delete KPI"),
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      target_value: "",
      current_value: "",
      unit: "",
      status: "on_track",
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const startEditing = (kpi: KPI) => {
    setFormData({
      title: kpi.title,
      description: kpi.description || "",
      target_value: kpi.target_value?.toString() || "",
      current_value: kpi.current_value?.toString() || "",
      unit: kpi.unit || "",
      status: kpi.status,
    });
    setEditingId(kpi.id);
    setIsAdding(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on_track":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "at_risk":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "behind":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Target className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Manage KPIs</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Manage KPIs & OKRs
          </DialogTitle>
        </DialogHeader>

        {/* Quarter/Year Selector */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Quarter:</Label>
            <Select value={quarter.toString()} onValueChange={(v) => setQuarter(parseInt(v))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map((q) => (
                  <SelectItem key={q} value={q.toString()}>Q{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">Year:</Label>
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[getCurrentYear() - 1, getCurrentYear(), getCurrentYear() + 1].map((y) => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1" />
          <Button size="sm" onClick={() => { resetForm(); setIsAdding(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Add KPI
          </Button>
        </div>

        {/* Add/Edit Form */}
        {(isAdding || editingId) && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <Label>Title *</Label>
                  <AIKPIAssist
                    type="individual"
                    field="both"
                    currentTitle={formData.title}
                    currentDescription={formData.description}
                    employeeRole={employeeRole}
                    department={department}
                    onSuggestion={handleAISuggestion}
                  />
                </div>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Increase sales by 20%"
                />
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <Label>Description</Label>
                  <AIKPIAssist
                    type="individual"
                    field="description"
                    currentTitle={formData.title}
                    currentDescription={formData.description}
                    employeeRole={employeeRole}
                    department={department}
                    onSuggestion={handleAISuggestion}
                  />
                </div>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional details about this KPI..."
                  rows={2}
                />
              </div>
              <div>
                <Label>Target Value</Label>
                <Input
                  type="number"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div>
                <Label>Current Value</Label>
                <Input
                  type="number"
                  value={formData.current_value}
                  onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Input
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., %, $, tasks"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_track">On Track</SelectItem>
                    <SelectItem value="at_risk">At Risk</SelectItem>
                    <SelectItem value="behind">Behind</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={resetForm}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => editingId ? updateMutation.mutate(editingId) : createMutation.mutate()}
                disabled={!formData.title || createMutation.isPending || updateMutation.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                {editingId ? "Update" : "Save"}
              </Button>
            </div>
          </div>
        )}

        {/* KPI List */}
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
          ) : kpis.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No KPIs for Q{quarter} {year}</p>
              <p className="text-xs">Click "Add KPI" to create one</p>
            </div>
          ) : (
            kpis.map((kpi) => {
              const progress = kpi.target_value ? Math.round(((kpi.current_value || 0) / kpi.target_value) * 100) : 0;
              return (
                <div
                  key={kpi.id}
                  className={cn(
                    "p-4 border rounded-lg",
                    editingId === kpi.id && "ring-2 ring-primary"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm">{kpi.title}</h4>
                        <Badge className={cn("text-xs", getStatusColor(kpi.status))}>
                          {kpi.status.replace("_", " ")}
                        </Badge>
                      </div>
                      {kpi.description && (
                        <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
                      )}
                      {kpi.target_value && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                progress >= 80 ? "bg-green-500" : progress >= 50 ? "bg-amber-500" : "bg-red-500"
                              )}
                              style={{ width: `${Math.min(progress, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {kpi.current_value || 0} / {kpi.target_value} {kpi.unit}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEditing(kpi)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteMutation.mutate(kpi.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManageKPIsDialog;
