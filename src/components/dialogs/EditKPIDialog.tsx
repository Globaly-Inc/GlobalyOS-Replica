import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Kpi, KpiStatus, KpiScopeType } from "@/types/kpi";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOrganization } from "@/hooks/useOrganization";
import { useCurrentEmployee } from "@/services/useCurrentEmployee";

interface EditKPIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi: Kpi | null;
}

const currentYear = new Date().getFullYear();
const yearOptions = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

export function EditKPIDialog({ open, onOpenChange, kpi }: EditKPIDialogProps) {
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const { data: currentEmployee } = useCurrentEmployee();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [unit, setUnit] = useState("");
  const [status, setStatus] = useState<KpiStatus>("on_track");
  const [scopeType, setScopeType] = useState<KpiScopeType>("individual");
  const [quarter, setQuarter] = useState<number>(1);
  const [year, setYear] = useState<number>(currentYear);

  useEffect(() => {
    if (kpi) {
      setTitle(kpi.title);
      setDescription(kpi.description || "");
      setTargetValue(kpi.target_value?.toString() || "");
      setCurrentValue(kpi.current_value?.toString() || "");
      setUnit(kpi.unit || "");
      setStatus(kpi.status);
      setScopeType(kpi.scope_type || "individual");
      setQuarter(kpi.quarter || 1);
      setYear(kpi.year || currentYear);
    }
  }, [kpi]);

  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      title: string;
      description: string | null;
      target_value: number | null;
      current_value: number | null;
      unit: string | null;
      status: KpiStatus;
      scope_type: KpiScopeType;
      quarter: number;
      year: number;
      oldValues: Record<string, unknown>;
    }) => {
      const { error } = await supabase
        .from("kpis")
        .update({
          title: data.title,
          description: data.description,
          target_value: data.target_value,
          current_value: data.current_value,
          unit: data.unit,
          status: data.status,
          scope_type: data.scope_type,
          quarter: data.quarter,
          year: data.year,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);

      if (error) throw error;

      // Log the activity
      if (currentOrg?.id && currentEmployee?.id) {
        const changedFields: string[] = [];
        if (data.oldValues.title !== data.title) changedFields.push('title');
        if (data.oldValues.description !== data.description) changedFields.push('description');
        if (data.oldValues.target_value !== data.target_value) changedFields.push('target value');
        if (data.oldValues.current_value !== data.current_value) changedFields.push('current value');
        if (data.oldValues.unit !== data.unit) changedFields.push('unit');
        if (data.oldValues.status !== data.status) changedFields.push('status');
        if (data.oldValues.scope_type !== data.scope_type) changedFields.push('scope');
        if (data.oldValues.quarter !== data.quarter) changedFields.push('quarter');
        if (data.oldValues.year !== data.year) changedFields.push('year');

        if (changedFields.length > 0) {
          await supabase.from("kpi_activity_logs").insert([{
            kpi_id: data.id,
            employee_id: currentEmployee.id,
            organization_id: currentOrg.id,
            action_type: "updated",
            description: `Updated ${changedFields.join(", ")}`,
            old_value: JSON.parse(JSON.stringify(data.oldValues)),
            new_value: JSON.parse(JSON.stringify({
              title: data.title,
              description: data.description,
              target_value: data.target_value,
              current_value: data.current_value,
              unit: data.unit,
              status: data.status,
              scope_type: data.scope_type,
              quarter: data.quarter,
              year: data.year,
            })),
          }]);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["employee-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["group-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["organization-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-detail"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-activity-logs"] });
      toast.success("KPI updated successfully");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to update KPI");
      console.error(error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpi) return;

    updateMutation.mutate({
      id: kpi.id,
      title,
      description: description || null,
      target_value: targetValue ? parseFloat(targetValue) : null,
      current_value: currentValue ? parseFloat(currentValue) : null,
      unit: unit || null,
      status,
      scope_type: scopeType,
      quarter,
      year,
      oldValues: {
        title: kpi.title,
        description: kpi.description,
        target_value: kpi.target_value,
        current_value: kpi.current_value,
        unit: kpi.unit,
        status: kpi.status,
        scope_type: kpi.scope_type,
        quarter: kpi.quarter,
        year: kpi.year,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Edit KPI</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scopeType">Scope</Label>
              <Select value={scopeType} onValueChange={(v) => setScopeType(v as KpiScopeType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quarter">Quarter</Label>
              <Select value={quarter.toString()} onValueChange={(v) => setQuarter(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Q1</SelectItem>
                  <SelectItem value="2">Q2</SelectItem>
                  <SelectItem value="3">Q3</SelectItem>
                  <SelectItem value="4">Q4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetValue">Target Value</Label>
              <Input
                id="targetValue"
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currentValue">Current Value</Label>
              <Input
                id="currentValue"
                type="number"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g., %, $, units"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as KpiStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on_track">On Track</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="behind">Behind</SelectItem>
                  <SelectItem value="achieved">Achieved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
