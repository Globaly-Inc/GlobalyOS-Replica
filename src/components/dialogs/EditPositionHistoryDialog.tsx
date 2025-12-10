import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const positionHistorySchema = z.object({
  position: z.string().min(1, "Position is required"),
  department: z.string().min(1, "Department is required"),
  salary: z.string().optional(),
  effective_date: z.string().min(1, "Effective date is required"),
  end_date: z.string().optional(),
  change_type: z.enum(["promotion", "lateral_move", "salary_increase", "manager_change", "initial"]),
  notes: z.string().optional(),
});

interface PositionHistoryEntry {
  id: string;
  position: string;
  department: string;
  salary: number | null;
  effective_date: string;
  end_date: string | null;
  change_type: string;
  notes: string | null;
}

interface EditPositionHistoryDialogProps {
  entry: PositionHistoryEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const EditPositionHistoryDialog = ({ 
  entry, 
  open, 
  onOpenChange, 
  onSuccess 
}: EditPositionHistoryDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    position: "",
    department: "",
    salary: "",
    effective_date: "",
    end_date: "",
    change_type: "promotion" as const,
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (entry) {
      setFormData({
        position: entry.position || "",
        department: entry.department || "",
        salary: entry.salary?.toString() || "",
        effective_date: entry.effective_date || "",
        end_date: entry.end_date || "",
        change_type: (entry.change_type as any) || "promotion",
        notes: entry.notes || "",
      });
    }
  }, [entry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entry) return;
    
    setLoading(true);
    setErrors({});

    try {
      const validated = positionHistorySchema.parse(formData);

      const historyData: any = {
        position: validated.position,
        department: validated.department,
        effective_date: validated.effective_date,
        change_type: validated.change_type,
        notes: validated.notes || null,
        end_date: validated.end_date || null,
        salary: validated.salary ? parseFloat(validated.salary) : null,
      };

      const { error } = await supabase
        .from("position_history")
        .update(historyData)
        .eq("id", entry.id);

      if (error) throw error;

      toast.success("Position history updated successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        console.error("Error updating position history:", error);
        toast.error(error.message || "Failed to update position history");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Position History</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-position">Position *</Label>
              <Input
                id="edit-position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="e.g., Senior Developer"
              />
              {errors.position && <p className="text-sm text-destructive mt-1">{errors.position}</p>}
            </div>

            <div>
              <Label htmlFor="edit-department">Department *</Label>
              <Input
                id="edit-department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Engineering"
              />
              {errors.department && <p className="text-sm text-destructive mt-1">{errors.department}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-salary">Salary (USD)</Label>
              <Input
                id="edit-salary"
                type="number"
                step="0.01"
                value={formData.salary}
                onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                placeholder="e.g., 85000"
              />
              {errors.salary && <p className="text-sm text-destructive mt-1">{errors.salary}</p>}
            </div>

            <div>
              <Label htmlFor="edit-change_type">Change Type *</Label>
              <Select
                value={formData.change_type}
                onValueChange={(value: any) => setFormData({ ...formData, change_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial">Joined Company</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="lateral_move">Lateral Move</SelectItem>
                  <SelectItem value="salary_increase">Salary Increase</SelectItem>
                  <SelectItem value="manager_change">Manager Change</SelectItem>
                </SelectContent>
              </Select>
              {errors.change_type && <p className="text-sm text-destructive mt-1">{errors.change_type}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-effective_date">Effective Date *</Label>
              <Input
                id="edit-effective_date"
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
              />
              {errors.effective_date && <p className="text-sm text-destructive mt-1">{errors.effective_date}</p>}
            </div>

            <div>
              <Label htmlFor="edit-end_date">End Date (optional)</Label>
              <Input
                id="edit-end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
              {errors.end_date && <p className="text-sm text-destructive mt-1">{errors.end_date}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="edit-notes">Notes (optional)</Label>
            <Textarea
              id="edit-notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional context about this change..."
              rows={3}
            />
            {errors.notes && <p className="text-sm text-destructive mt-1">{errors.notes}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
