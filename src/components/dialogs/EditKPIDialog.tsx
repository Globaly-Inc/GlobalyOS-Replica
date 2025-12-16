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
import { Kpi, KpiStatus } from "@/types/kpi";
import { useUpdateKpiProgress } from "@/services/useKpi";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface EditKPIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi: Kpi | null;
}

export function EditKPIDialog({ open, onOpenChange, kpi }: EditKPIDialogProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [unit, setUnit] = useState("");
  const [status, setStatus] = useState<KpiStatus>("on_track");

  useEffect(() => {
    if (kpi) {
      setTitle(kpi.title);
      setDescription(kpi.description || "");
      setTargetValue(kpi.target_value?.toString() || "");
      setCurrentValue(kpi.current_value?.toString() || "");
      setUnit(kpi.unit || "");
      setStatus(kpi.status);
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["employee-kpis"] });
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
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
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
