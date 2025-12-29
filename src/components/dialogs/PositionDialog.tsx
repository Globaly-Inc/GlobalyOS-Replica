import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { z } from "zod";
import { useOrganization } from "@/hooks/useOrganization";
import { useEmploymentTypes } from "@/hooks/useEmploymentTypes";
import { formatDate } from "@/lib/utils";

const positionSchema = z.object({
  position: z.string().min(1, "Position is required"),
  department: z.string().min(1, "Department is required"),
  salary: z.string().optional(),
  currency: z.string().optional(),
  paymentFrequency: z.string().optional(),
  effective_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
  is_current: z.boolean(),
  change_type: z.enum(["promotion", "lateral_move", "salary_increase", "manager_change", "initial"]),
  notes: z.string().optional(),
  employment_type: z.string().optional(),
});

const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "NPR", symbol: "रू", name: "Nepalese Rupee" },
];

const paymentFrequencies = [
  { value: "weekly", label: "Weekly", multiplier: 52 },
  { value: "monthly", label: "Monthly", multiplier: 12 },
  { value: "annual", label: "Annual", multiplier: 1 },
];

export interface PositionEntry {
  id: string;
  position: string;
  department: string;
  salary: number | null;
  effective_date: string;
  end_date: string | null;
  change_type: string;
  notes: string | null;
  employment_type?: string | null;
  is_current?: boolean;
}

interface PositionDialogProps {
  employeeId: string;
  entry?: PositionEntry | null;
  existingPositions: PositionEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const PositionDialog = ({
  employeeId,
  entry,
  existingPositions,
  open,
  onOpenChange,
  onSuccess,
}: PositionDialogProps) => {
  const isEditing = !!entry;
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [showNewDepartment, setShowNewDepartment] = useState(false);
  const [showNewPosition, setShowNewPosition] = useState(false);
  const [newDepartment, setNewDepartment] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const { currentOrg } = useOrganization();
  const { data: employmentTypes = [] } = useEmploymentTypes();

  const currentPosition = existingPositions.find(p => p.is_current);

  const [formData, setFormData] = useState({
    position: "",
    department: "",
    salary: "",
    currency: "USD",
    paymentFrequency: "annual",
    effective_date: "",
    end_date: "",
    is_current: false,
    change_type: "promotion" as const,
    notes: "",
    employment_type: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (entry) {
        // Editing existing entry
        setFormData({
          position: entry.position || "",
          department: entry.department || "",
          salary: entry.salary?.toString() || "",
          currency: "USD",
          paymentFrequency: "annual",
          effective_date: entry.effective_date || "",
          end_date: entry.end_date || "",
          is_current: entry.is_current ?? (entry.end_date === null),
          change_type: (entry.change_type as any) || "promotion",
          notes: entry.notes || "",
          employment_type: entry.employment_type || "",
        });
      } else {
        // Adding new entry
        setFormData({
          position: "",
          department: "",
          salary: "",
          currency: "USD",
          paymentFrequency: "annual",
          effective_date: new Date().toISOString().split('T')[0],
          end_date: "",
          is_current: false,
          change_type: "promotion",
          notes: "",
          employment_type: "",
        });
      }
      setErrors({});
      loadData();
    }
  }, [open, entry]);

  const loadData = async () => {
    if (!currentOrg) return;
    const { data } = await supabase
      .from("employees")
      .select("department, position")
      .eq("organization_id", currentOrg.id);

    if (data) {
      const uniqueDepts = [...new Set(data.map(e => e.department).filter(Boolean))].sort();
      const uniquePositions = [...new Set(data.map(e => e.position).filter(Boolean))].sort();
      setDepartments(uniqueDepts);
      setPositions(uniquePositions);
    }
  };

  const handleDepartmentChange = (value: string) => {
    if (value === "__new__") {
      setShowNewDepartment(true);
    } else {
      setFormData({ ...formData, department: value });
    }
  };

  const handlePositionChange = (value: string) => {
    if (value === "__new__") {
      setShowNewPosition(true);
    } else {
      setFormData({ ...formData, position: value });
    }
  };

  const addNewDepartment = () => {
    if (newDepartment.trim()) {
      setDepartments(prev => [...new Set([...prev, newDepartment.trim()])].sort());
      setFormData({ ...formData, department: newDepartment.trim() });
      setNewDepartment("");
      setShowNewDepartment(false);
    }
  };

  const addNewPosition = () => {
    if (newPosition.trim()) {
      setPositions(prev => [...new Set([...prev, newPosition.trim()])].sort());
      setFormData({ ...formData, position: newPosition.trim() });
      setNewPosition("");
      setShowNewPosition(false);
    }
  };

  const formatSalary = (salary: number, currency: string = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(salary);
  };

  const annualPay = useMemo(() => {
    const amount = parseFloat(formData.salary) || 0;
    const frequency = paymentFrequencies.find(f => f.value === formData.paymentFrequency);
    return amount * (frequency?.multiplier || 1);
  }, [formData.salary, formData.paymentFrequency]);

  // Check for overlapping dates
  const checkOverlap = (startDate: string, endDate: string | null, excludeId?: string): PositionEntry | null => {
    const newStart = new Date(startDate);
    const newEnd = endDate ? new Date(endDate) : new Date('9999-12-31');

    for (const pos of existingPositions) {
      if (excludeId && pos.id === excludeId) continue;

      const posStart = new Date(pos.effective_date);
      const posEnd = pos.end_date ? new Date(pos.end_date) : new Date('9999-12-31');

      // Check if ranges overlap
      if (!(newEnd < posStart || newStart > posEnd)) {
        return pos;
      }
    }
    return null;
  };

  const handleSubmit = async (e?: React.FormEvent, skipConfirmation = false) => {
    e?.preventDefault();
    setErrors({});

    try {
      const validated = positionSchema.parse(formData);

      // Check for overlaps
      const endDateToCheck = validated.is_current ? null : validated.end_date || null;
      const overlap = checkOverlap(validated.effective_date, endDateToCheck, entry?.id);
      
      if (overlap) {
        const overlapEndStr = overlap.end_date ? formatDate(overlap.end_date) : "Present";
        setErrors({ 
          effective_date: `This position's dates overlap with "${overlap.position}" (${formatDate(overlap.effective_date)} - ${overlapEndStr})` 
        });
        return;
      }

      // If marking as current and there's an existing current position, show confirmation
      if (validated.is_current && currentPosition && currentPosition.id !== entry?.id && !skipConfirmation) {
        setPendingSubmit(true);
        setConfirmDialogOpen(true);
        return;
      }

      await savePosition(validated);
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
        console.error("Error saving position:", error);
        toast.error(error.message || "Failed to save position");
      }
    }
  };

  const savePosition = async (validated: z.infer<typeof positionSchema>) => {
    setLoading(true);

    try {
      // Calculate annual salary
      const amount = parseFloat(validated.salary || "0");
      const frequency = paymentFrequencies.find(f => f.value === validated.paymentFrequency);
      const annualSalary = amount * (frequency?.multiplier || 1);

      const historyData: any = {
        employee_id: employeeId,
        position: validated.position,
        department: validated.department,
        effective_date: validated.effective_date,
        change_type: validated.change_type,
        notes: validated.notes || null,
        end_date: validated.is_current ? null : (validated.end_date || null),
        employment_type: validated.employment_type || null,
        is_current: validated.is_current,
        salary: validated.salary ? annualSalary : null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("position_history")
          .update(historyData)
          .eq("id", entry!.id);

        if (error) throw error;
        toast.success("Position updated successfully");
      } else {
        const { error } = await supabase
          .from("position_history")
          .insert(historyData);

        if (error) throw error;
        toast.success("Position added successfully");
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error saving position:", error);
      toast.error(error.message || "Failed to save position");
    } finally {
      setLoading(false);
      setPendingSubmit(false);
    }
  };

  const handleConfirmReplace = async () => {
    setConfirmDialogOpen(false);
    const validated = positionSchema.parse(formData);
    await savePosition(validated);
  };

  const handleCurrentToggle = (checked: boolean) => {
    setFormData({ 
      ...formData, 
      is_current: checked,
      end_date: checked ? "" : formData.end_date 
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => {
        if (!loading) {
          onOpenChange(o);
          if (!o) {
            setShowNewDepartment(false);
            setShowNewPosition(false);
            setNewDepartment("");
            setNewPosition("");
          }
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Position" : "Add Position"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="position">Position *</Label>
                {showNewPosition ? (
                  <div className="flex gap-2">
                    <Input
                      value={newPosition}
                      onChange={(e) => setNewPosition(e.target.value)}
                      placeholder="Enter new position"
                      autoFocus
                    />
                    <Button type="button" size="sm" onClick={addNewPosition}>Add</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewPosition(false)}>Cancel</Button>
                  </div>
                ) : (
                  <Select value={formData.position} onValueChange={handlePositionChange}>
                    <SelectTrigger id="position">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="__new__" className="text-primary font-medium">
                        <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> Create new position</span>
                      </SelectItem>
                      {positions.map((pos) => (
                        <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.position && <p className="text-sm text-destructive mt-1">{errors.position}</p>}
              </div>

              <div>
                <Label htmlFor="department">Department *</Label>
                {showNewDepartment ? (
                  <div className="flex gap-2">
                    <Input
                      value={newDepartment}
                      onChange={(e) => setNewDepartment(e.target.value)}
                      placeholder="Enter new department"
                      autoFocus
                    />
                    <Button type="button" size="sm" onClick={addNewDepartment}>Add</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowNewDepartment(false)}>Cancel</Button>
                  </div>
                ) : (
                  <Select value={formData.department} onValueChange={handleDepartmentChange}>
                    <SelectTrigger id="department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="__new__" className="text-primary font-medium">
                        <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> Create new department</span>
                      </SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.department && <p className="text-sm text-destructive mt-1">{errors.department}</p>}
              </div>
            </div>

            {/* Employment Type Selector */}
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <div className="flex flex-wrap gap-2">
                {employmentTypes.map((type) => (
                  <Button
                    key={type.id}
                    type="button"
                    size="sm"
                    variant={formData.employment_type === type.name ? "default" : "outline"}
                    onClick={() => setFormData({ ...formData, employment_type: type.name })}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Salary</Label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="currency" className="text-xs text-muted-foreground">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {currencies.map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} {currency.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="salary" className="text-xs text-muted-foreground">Amount</Label>
                  <Input
                    id="salary"
                    type="number"
                    step="0.01"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    placeholder="e.g., 85000"
                  />
                  {errors.salary && <p className="text-sm text-destructive mt-1">{errors.salary}</p>}
                </div>
                <div>
                  <Label htmlFor="paymentFrequency" className="text-xs text-muted-foreground">Frequency</Label>
                  <Select
                    value={formData.paymentFrequency}
                    onValueChange={(value) => setFormData({ ...formData, paymentFrequency: value })}
                  >
                    <SelectTrigger id="paymentFrequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {paymentFrequencies.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.salary && (
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Annual Pay</p>
                  <p className="text-lg font-semibold text-primary">
                    {formatSalary(annualPay, formData.currency)}
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="change_type">Change Type *</Label>
              <Select
                value={formData.change_type}
                onValueChange={(value: any) => setFormData({ ...formData, change_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="initial">Joined Company</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                  <SelectItem value="lateral_move">Lateral Move</SelectItem>
                  <SelectItem value="salary_increase">Salary Increase</SelectItem>
                  <SelectItem value="manager_change">Manager Change</SelectItem>
                </SelectContent>
              </Select>
              {errors.change_type && <p className="text-sm text-destructive mt-1">{errors.change_type}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="effective_date">Start Date *</Label>
                <Input
                  id="effective_date"
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                />
                {errors.effective_date && <p className="text-sm text-destructive mt-1">{errors.effective_date}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="end_date">End Date</Label>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="is_current"
                      checked={formData.is_current}
                      onCheckedChange={handleCurrentToggle}
                    />
                    <Label htmlFor="is_current" className="text-sm font-normal cursor-pointer">
                      Present (Current)
                    </Label>
                  </div>
                </div>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  disabled={formData.is_current}
                  className={formData.is_current ? "opacity-50" : ""}
                />
                {errors.end_date && <p className="text-sm text-destructive mt-1">{errors.end_date}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional context about this position change..."
                rows={3}
              />
              {errors.notes && <p className="text-sm text-destructive mt-1">{errors.notes}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : isEditing ? "Save Changes" : "Add Position"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for replacing current position */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace Current Position?</AlertDialogTitle>
            <AlertDialogDescription>
              This will close the current position "{currentPosition?.position}" with an end date of{" "}
              {formData.effective_date ? formatDate(new Date(new Date(formData.effective_date).getTime() - 86400000).toISOString().split('T')[0]) : "the day before"}.
              <br /><br />
              Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingSubmit(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReplace}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
