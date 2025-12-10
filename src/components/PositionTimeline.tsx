import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TrendingUp, ArrowRight, DollarSign, UserCheck, Pencil } from "lucide-react";
import { format } from "date-fns";
import { EditPositionHistoryDialog } from "@/components/dialogs/EditPositionHistoryDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  currentSalary: number | null;
  employeeId?: string;
  canEdit?: boolean;
  onRefresh?: () => void;
}

const changeTypeConfig: Record<string, { label: string; color: string; icon: any }> = {
  promotion: { label: "Promotion", color: "bg-green-500", icon: TrendingUp },
  lateral_move: { label: "Lateral Move", color: "bg-blue-500", icon: ArrowRight },
  salary_increase: { label: "Salary Increase", color: "bg-purple-500", icon: DollarSign },
  manager_change: { label: "Manager Change", color: "bg-orange-500", icon: UserCheck },
  initial: { label: "Joined", color: "bg-gray-500", icon: UserCheck },
};

export const PositionTimeline = ({ 
  entries, 
  currentPosition, 
  currentDepartment,
  currentSalary,
  employeeId,
  canEdit = false,
  onRefresh
}: PositionTimelineProps) => {
  const [editingEntry, setEditingEntry] = useState<TimelineEntry | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentEditOpen, setCurrentEditOpen] = useState(false);
  const [currentEditLoading, setCurrentEditLoading] = useState(false);
  const [currentEditData, setCurrentEditData] = useState({
    position: currentPosition,
    department: currentDepartment,
    salary: currentSalary?.toString() || "",
  });

  // Sort entries by effective_date descending (most recent first)
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime()
  );

  const formatSalary = (salary: number | null) => {
    if (!salary) return "N/A";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(salary);
  };

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
    });
    setCurrentEditOpen(true);
  };

  const handleCurrentEditSave = async () => {
    if (!employeeId) return;
    setCurrentEditLoading(true);

    try {
      const { error } = await supabase
        .from("employees")
        .update({
          position: currentEditData.position,
          department: currentEditData.department,
          salary: currentEditData.salary ? parseFloat(currentEditData.salary) : null,
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
      <Card>
        <CardContent className="pt-6">
          {/* Current Position */}
          <div className="mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20 group relative">
            <div className="flex items-center justify-between mb-2">
              <Badge variant="default">Current</Badge>
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
            <h3 className="font-semibold text-lg">{currentPosition}</h3>
            <p className="text-sm text-muted-foreground">{currentDepartment}</p>
            {currentSalary && (
              <p className="text-sm font-medium mt-1">{formatSalary(currentSalary)}</p>
            )}
          </div>

          {/* Timeline */}
          {sortedEntries.length > 0 && (
            <div className="space-y-4">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                {sortedEntries.map((entry, index) => {
                  const config = changeTypeConfig[entry.change_type] || changeTypeConfig.initial;
                  const Icon = config.icon;
                  const isLast = index === sortedEntries.length - 1;

                  return (
                    <div key={entry.id} className="relative pl-12 pb-6 last:pb-0 group">
                      {/* Timeline dot */}
                      <div className={`absolute left-2 top-1 w-4 h-4 rounded-full ${config.color} border-4 border-background`} />

                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                <Icon className="h-3 w-3 mr-1" />
                                {config.label}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(entry.effective_date), 'MMM d, yyyy')}
                                {entry.end_date && !isLast && (
                                  <> - {format(new Date(entry.end_date), 'MMM d, yyyy')}</>
                                )}
                              </span>
                            </div>
                            <h4 className="font-semibold">{entry.position}</h4>
                            <p className="text-sm text-muted-foreground">{entry.department}</p>
                            
                            {entry.salary && (
                              <p className="text-sm font-medium mt-1">
                                {formatSalary(entry.salary)}
                              </p>
                            )}
                            
                            {entry.manager && (
                              <p className="text-sm text-muted-foreground mt-1">
                                Manager: {entry.manager.profiles.full_name}
                              </p>
                            )}

                            {entry.notes && (
                              <p className="text-sm text-muted-foreground mt-2 italic">
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
            </div>
          )}
        </CardContent>
      </Card>

      <EditPositionHistoryDialog
        entry={editingEntry}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
      />

      {/* Edit Current Position Dialog */}
      <Dialog open={currentEditOpen} onOpenChange={setCurrentEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Current Position</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="current-position">Position</Label>
              <Input
                id="current-position"
                value={currentEditData.position}
                onChange={(e) => setCurrentEditData({ ...currentEditData, position: e.target.value })}
                placeholder="e.g., Senior Developer"
              />
            </div>
            <div>
              <Label htmlFor="current-department">Department</Label>
              <Input
                id="current-department"
                value={currentEditData.department}
                onChange={(e) => setCurrentEditData({ ...currentEditData, department: e.target.value })}
                placeholder="e.g., Engineering"
              />
            </div>
            <div>
              <Label htmlFor="current-salary">Salary (USD)</Label>
              <Input
                id="current-salary"
                type="number"
                value={currentEditData.salary}
                onChange={(e) => setCurrentEditData({ ...currentEditData, salary: e.target.value })}
                placeholder="e.g., 85000"
              />
            </div>
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
