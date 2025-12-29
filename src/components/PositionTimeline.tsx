import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, ArrowRight, DollarSign, UserCheck, Pencil, Eye, EyeOff, Plus, Calendar, Briefcase } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { PositionDialog, PositionEntry } from "@/components/dialogs/PositionDialog";
import { useEmploymentTypes } from "@/hooks/useEmploymentTypes";

interface PositionTimelineProps {
  entries: PositionEntry[];
  employeeId?: string;
  canEdit?: boolean;
  showSalary?: boolean;
  currency?: string;
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
  employeeId,
  canEdit = false,
  showSalary = true,
  currency = "USD",
  onRefresh
}: PositionTimelineProps) => {
  const [editingEntry, setEditingEntry] = useState<PositionEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isAddMode, setIsAddMode] = useState(false);
  const [revealedSalaries, setRevealedSalaries] = useState<Set<string>>(new Set());
  const { data: employmentTypes = [] } = useEmploymentTypes();

  const salaryTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Sort entries by effective_date descending (most recent first)
  // Current position (is_current=true or end_date=null) always at top
  const sortedEntries = [...entries].sort((a, b) => {
    // Current position always first
    const aIsCurrent = a.is_current || a.end_date === null;
    const bIsCurrent = b.is_current || b.end_date === null;
    
    if (aIsCurrent && !bIsCurrent) return -1;
    if (!aIsCurrent && bIsCurrent) return 1;
    
    // Then sort by effective_date descending
    return new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime();
  });

  const formatSalary = (salary: number | null, currencyCode: string = "USD", showMonthly: boolean = true) => {
    if (!salary) return null;
    const annual = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(salary);
    
    if (showMonthly) {
      const monthly = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(salary / 12));
      return `${annual}/year (${monthly}/month)`;
    }
    return `${annual}/year`;
  };

  const toggleSalaryVisibility = (id: string) => {
    setRevealedSalaries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
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

  const handleEdit = (entry: PositionEntry) => {
    setEditingEntry(entry);
    setIsAddMode(false);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingEntry(null);
    setIsAddMode(true);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    onRefresh?.();
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground mb-3">No position history recorded.</p>
        {canEdit && employeeId && (
          <Button size="sm" variant="outline" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Position
          </Button>
        )}
        
        <PositionDialog
          employeeId={employeeId || ""}
          entry={null}
          existingPositions={entries}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={handleDialogSuccess}
        />
      </div>
    );
  }

  return (
    <>
      <div className="relative pb-1">
        {/* Timeline line */}
        <div className="absolute left-[13px] top-0 bottom-0 w-0.5 bg-border" />

        {sortedEntries.map((entry, index) => {
          const isCurrent = entry.is_current || entry.end_date === null;
          const config = changeTypeConfig[entry.change_type] || changeTypeConfig.initial;
          const Icon = config.icon;

          return (
            <div key={entry.id} className="relative pl-12 pb-5 last:pb-0 group">
              {/* Timeline dot - highlighted for current */}
              <div 
                className={`absolute left-1.5 top-1 w-4 h-4 rounded-full border-2 border-background ${
                  isCurrent 
                    ? "bg-primary ring-2 ring-primary/30" 
                    : config.color
                }`} 
              />

              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {isCurrent ? (
                        <Badge variant="default" className="text-xs px-2 py-0.5">
                          Current
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(entry.effective_date)}
                        {entry.end_date ? (
                          <> - {formatDate(entry.end_date)}</>
                        ) : isCurrent ? (
                          <> - Present</>
                        ) : null}
                      </span>
                    </div>
                    <h4 className="font-medium text-sm">{entry.position}</h4>
                    <p className="text-sm text-muted-foreground">{entry.department}</p>

                    {entry.employment_type && (
                      <Badge variant="secondary" className="text-xs mt-1 gap-1">
                        <Briefcase className="h-3 w-3" />
                        {employmentTypes.find(t => t.name === entry.employment_type)?.label || entry.employment_type}
                      </Badge>
                    )}

                    {showSalary && entry.salary && (
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm font-medium text-primary">
                          {revealedSalaries.has(entry.id) ? formatSalary(entry.salary, currency) : "••••••••"}
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

      {canEdit && employeeId && (
        <PositionDialog
          employeeId={employeeId}
          entry={isAddMode ? null : editingEntry}
          existingPositions={entries}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSuccess={handleDialogSuccess}
        />
      )}
    </>
  );
};
