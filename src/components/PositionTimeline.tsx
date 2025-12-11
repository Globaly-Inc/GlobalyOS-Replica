import { useState, useMemo, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, ArrowRight, DollarSign, UserCheck, Pencil, Eye, EyeOff, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { EditPositionHistoryDialog } from "@/components/dialogs/EditPositionHistoryDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOrganization } from "@/hooks/useOrganization";

interface TimelineEntry {
  id: string;
  position: string;
  department: string;
  salary: number | null;
  manager_id: string | null;
  effective_date: string;
  end_date: string | null;
  change_type: string;
  notes: string | null;
  manager?: {
    profiles: {
      full_name: string;
    };
  };
}

interface PositionTimelineProps {
  entries: TimelineEntry[];
  currentPosition: string;
  currentDepartment: string;
  currentSalary?: number | null;
  currentCurrency?: string;
  employeeId?: string;
  canEdit?: boolean;
  showSalary?: boolean;
  onRefresh?: () => void;
}

const changeTypeConfig: Record<string, { label: string; color: string; icon: any }> = {
  promotion: { label: "Promotion", color: "bg-green-500", icon: TrendingUp },
  lateral_move: { label: "Lateral Move", color: "bg-blue-500", icon: ArrowRight },
  salary_increase: { label: "Salary Increase", color: "bg-purple-500", icon: DollarSign },
  manager_change: { label: "Manager Change", color: "bg-orange-500", icon: UserCheck },
  initial: { label: "Joined", color: "bg-gray-500", icon: UserCheck },
};

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

export const PositionTimeline = ({ 
  entries, 
  currentPosition, 
  currentDepartment,
  currentSalary,
  currentCurrency = "USD",
  employeeId,
  canEdit = false,
  showSalary = true,
  onRefresh
}: PositionTimelineProps) => {
  const [editingEntry, setEditingEntry] = useState<TimelineEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentEditOpen, setCurrentEditOpen] = useState(false);
  const [currentEditLoading, setCurrentEditLoading] = useState(false);
  const [revealedSalaries, setRevealedSalaries] = useState<Set<string>>(new Set());
  const [departments, setDepartments] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [showNewDepartment, setShowNewDepartment] = useState(false);
  const [showNewPosition, setShowNewPosition] = useState(false);
  const [newDepartment, setNewDepartment] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const { currentOrg } = useOrganization();
  const [currentEditData, setCurrentEditData] = useState({
    position: currentPosition,
    department: currentDepartment,
    salary: currentSalary?.toString() || "",
    currency: currentCurrency,
    paymentFrequency: "annual" as string,
  });

  // Load departments and positions when dialog opens
  useEffect(() => {
    if (currentEditOpen && currentOrg) {
      loadDepartmentsAndPositions();
    }
  }, [currentEditOpen, currentOrg]);

  const loadDepartmentsAndPositions = async () => {
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
      setCurrentEditData({ ...currentEditData, department: value });
    }
  };

  const handlePositionChange = (value: string) => {
    if (value === "__new__") {
      setShowNewPosition(true);
    } else {
      setCurrentEditData({ ...currentEditData, position: value });
    }
  };

  const addNewDepartment = () => {
    if (newDepartment.trim()) {
      setDepartments(prev => [...new Set([...prev, newDepartment.trim()])].sort());
      setCurrentEditData({ ...currentEditData, department: newDepartment.trim() });
      setNewDepartment("");
      setShowNewDepartment(false);
    }
  };

  const addNewPosition = () => {
    if (newPosition.trim()) {
      setPositions(prev => [...new Set([...prev, newPosition.trim()])].sort());
      setCurrentEditData({ ...currentEditData, position: newPosition.trim() });
      setNewPosition("");
      setShowNewPosition(false);
    }
  };

  // Sort entries by effective_date descending (most recent first)
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
  );

  const formatSalary = (salary: number | null, currency: string = "USD", showMonthly: boolean = true) => {
    if (!salary) return null;
    const annual = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(salary);
    
    if (showMonthly) {
      const monthly = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(salary / 12));
      return `${annual}/year (${monthly}/month)`;
    }
    return `${annual}/year`;
  };

  const salaryTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const toggleSalaryVisibility = (id: string) => {
    setRevealedSalaries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
        // Clear timer if hiding manually
        const timer = salaryTimers.current.get(id);
        if (timer) {
          clearTimeout(timer);
          salaryTimers.current.delete(id);
        }
      } else {
        newSet.add(id);
        // Auto-hide after 10 seconds
        const timer = setTimeout(() => {
          setRevealedSalaries(prev => {
            const updated = new Set(prev);
            updated.delete(id);
            return updated;
          });
          salaryTimers.current.delete(id);
        }, 10000);
        salaryTimers.current.set(id, timer);
      }
      return newSet;
    });
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      salaryTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  const annualPay = useMemo(() => {
    const amount = parseFloat(currentEditData.salary) || 0;
    const frequency = paymentFrequencies.find(f => f.value === currentEditData.paymentFrequency);
    return amount * (frequency?.multiplier || 1);
  }, [currentEditData.salary, currentEditData.paymentFrequency]);

  const handleEdit = (entry: TimelineEntry) => {
    setEditingEntry(entry);
    setEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    onRefresh?.();
  };

  const handleCurrentEditOpen = () => {
    setCurrentEditData({
      position: currentPosition,
      department: currentDepartment,
      salary: currentSalary?.toString() || "",
      currency: currentCurrency,
      paymentFrequency: "annual",
    });
    setCurrentEditOpen(true);
  };

  const handleCurrentEditSave = async () => {
    if (!employeeId) return;
    setCurrentEditLoading(true);

    try {
      // Calculate annual salary for storage
      const amount = parseFloat(currentEditData.salary) || 0;
      const frequency = paymentFrequencies.find(f => f.value === currentEditData.paymentFrequency);
      const annualSalary = amount * (frequency?.multiplier || 1);

      const { error } = await supabase
        .from("employees")
        .update({
          position: currentEditData.position,
          department: currentEditData.department,
          remuneration: annualSalary || null,
          remuneration_currency: currentEditData.currency,
        })
        .eq("id", employeeId);

      if (error) throw error;

      toast.success("Current position updated successfully");
      setCurrentEditOpen(false);
      onRefresh?.();
    } catch (error: any) {
      console.error("Error updating current position:", error);
      toast.error(error.message || "Failed to update current position");
    } finally {
      setCurrentEditLoading(false);
    }
  };

  return (
    <>
      <div className="relative pb-1">
        {/* Timeline line */}
        <div className="absolute left-[13px] top-0 bottom-0 w-0.5 bg-border" />

        {/* Current Position */}
        <div className="relative pl-12 pb-5 group">
          {/* Timeline dot - highlighted for current */}
          <div className="absolute left-1.5 top-1 w-4 h-4 rounded-full bg-primary border-2 border-background ring-2 ring-primary/30" />
          
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="default" className="text-xs px-2 py-0.5">
                    Current
                  </Badge>
                </div>
                <h4 className="font-medium text-sm">{currentPosition}</h4>
                <p className="text-sm text-muted-foreground">{currentDepartment}</p>
                
                {showSalary && currentSalary && (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm font-medium text-primary">
                      {revealedSalaries.has("current") ? formatSalary(currentSalary, currentCurrency) : "••••••••"}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => toggleSalaryVisibility("current")}
                    >
                      {revealedSalaries.has("current") ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
              
              {canEdit && employeeId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleCurrentEditOpen}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Position History */}
        {sortedEntries.map((entry, index) => {
          const config = changeTypeConfig[entry.change_type] || changeTypeConfig.initial;
          const Icon = config.icon;

          return (
            <div key={entry.id} className="relative pl-12 pb-5 last:pb-0 group">
              {/* Timeline dot */}
              <div className={`absolute left-1.5 top-1 w-4 h-4 rounded-full ${config.color} border-2 border-background`} />

              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs px-2 py-0.5">
                        <Icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(entry.effective_date)}
                        {entry.end_date && (
                          <> - {formatDate(entry.end_date)}</>
                        )}
                      </span>
                    </div>
                    <h4 className="font-medium text-sm">{entry.position}</h4>
                    <p className="text-sm text-muted-foreground">{entry.department}</p>
                    
                    {showSalary && entry.salary && (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-medium text-primary">
                          {revealedSalaries.has(entry.id) ? formatSalary(entry.salary, currentCurrency) : "••••••••"}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleSalaryVisibility(entry.id)}
                        >
                          {revealedSalaries.has(entry.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}
                    
                    {entry.manager && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Manager: {entry.manager.profiles.full_name}
                      </p>
                    )}

                    {entry.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                  
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleEdit(entry)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <EditPositionHistoryDialog
        entry={editingEntry}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
      />

      {/* Edit Current Position Dialog */}
      <Dialog open={currentEditOpen} onOpenChange={(open) => {
        setCurrentEditOpen(open);
        if (!open) {
          setShowNewDepartment(false);
          setShowNewPosition(false);
          setNewDepartment("");
          setNewPosition("");
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Current Position</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="current-position">Position *</Label>
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
                  <Select value={currentEditData.position} onValueChange={handlePositionChange}>
                    <SelectTrigger id="current-position">
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
              </div>

              <div>
                <Label htmlFor="current-department">Department *</Label>
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
                  <Select value={currentEditData.department} onValueChange={handleDepartmentChange}>
                    <SelectTrigger id="current-department">
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
              </div>
            </div>
            
            {showSalary && (
              <div className="space-y-3">
                <Label>Remuneration</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="current-currency" className="text-xs text-muted-foreground">Currency</Label>
                    <Select
                      value={currentEditData.currency}
                      onValueChange={(value) => setCurrentEditData({ ...currentEditData, currency: value })}
                    >
                      <SelectTrigger id="current-currency">
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
                    <Label htmlFor="current-salary" className="text-xs text-muted-foreground">Amount</Label>
                    <Input
                      id="current-salary"
                      type="number"
                      value={currentEditData.salary}
                      onChange={(e) => setCurrentEditData({ ...currentEditData, salary: e.target.value })}
                      placeholder="e.g., 85000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="current-frequency" className="text-xs text-muted-foreground">Frequency</Label>
                    <Select
                      value={currentEditData.paymentFrequency}
                      onValueChange={(value) => setCurrentEditData({ ...currentEditData, paymentFrequency: value })}
                    >
                      <SelectTrigger id="current-frequency">
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
                
                {/* Annual Pay Calculation */}
                {currentEditData.salary && (
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <p className="text-xs text-muted-foreground">Annual Pay</p>
                    <p className="text-lg font-semibold text-primary">
                      {formatSalary(annualPay, currentEditData.currency)}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setCurrentEditOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCurrentEditSave} disabled={currentEditLoading}>
                {currentEditLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
