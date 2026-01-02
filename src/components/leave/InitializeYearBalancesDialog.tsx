/**
 * Dialog for initializing leave balances for selected employees
 * Shows detailed breakdown of year allocation and carry forward amounts
 */

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  CheckCircle2,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EmployeeMissingBalance, MissingLeaveType } from "@/services/useLeaveBalanceMissing";

interface InitializeYearBalancesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  missingEmployees: EmployeeMissingBalance[];
  isLoading?: boolean;
  onInitialize: (employeeIds: string[]) => Promise<void>;
  isPending?: boolean;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const CarryForwardBadge = ({ amount }: { amount: number }) => {
  if (amount === 0) {
    return (
      <Badge variant="secondary" className="text-xs font-normal">
        <Minus className="h-3 w-3 mr-1" />
        No carry forward
      </Badge>
    );
  }
  
  if (amount > 0) {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs font-normal">
        <TrendingUp className="h-3 w-3 mr-1" />
        +{amount} CF
      </Badge>
    );
  }
  
  return (
    <Badge variant="destructive" className="text-xs font-normal">
      <TrendingDown className="h-3 w-3 mr-1" />
      {amount} CF
    </Badge>
  );
};

const AllocationBadge = ({ amount }: { amount: number }) => {
  if (amount === 0) return null;
  
  return (
    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-normal">
      <Calendar className="h-3 w-3 mr-1" />
      {amount} alloc
    </Badge>
  );
};

const LeaveTypeBreakdown = ({ types, year }: { types: MissingLeaveType[]; year: number }) => {
  return (
    <div className="space-y-2 pt-2 pl-12 pb-2">
      {types.map((lt) => (
        <div
          key={lt.leave_type_id}
          className="flex flex-col gap-1 text-sm py-2 px-3 rounded-md bg-muted/50"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">{lt.leave_type_name}</span>
            <span className="font-bold text-primary">
              = {lt.projected_balance} days
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {(lt.default_days || 0) > 0 && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-blue-500" />
                <span className="text-blue-600 dark:text-blue-400">+{lt.default_days} allocation</span>
              </span>
            )}
            {lt.carry_forward_amount !== 0 && (
              <>
                {(lt.default_days || 0) > 0 && <span>•</span>}
                <span className="flex items-center gap-1">
                  <ArrowRight className="h-3 w-3 text-green-500" />
                  <span className={cn(
                    lt.carry_forward_amount > 0 ? "text-green-600 dark:text-green-400" : "text-destructive"
                  )}>
                    {lt.carry_forward_amount > 0 ? '+' : ''}{lt.carry_forward_amount} from {year - 1}
                  </span>
                </span>
              </>
            )}
            {lt.previous_balance !== null && lt.carry_forward_mode !== 'none' && lt.carry_forward_amount === 0 && (
              <>
                {(lt.default_days || 0) > 0 && <span>•</span>}
                <span className="text-muted-foreground/70">
                  (prev: {lt.previous_balance}, mode: {lt.carry_forward_mode})
                </span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export const InitializeYearBalancesDialog = ({
  open,
  onOpenChange,
  year,
  missingEmployees,
  isLoading = false,
  onInitialize,
  isPending = false,
}: InitializeYearBalancesDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Filter employees by search
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return missingEmployees;
    const query = searchQuery.toLowerCase();
    return missingEmployees.filter(
      (e) =>
        e.full_name.toLowerCase().includes(query) ||
        e.position?.toLowerCase().includes(query)
    );
  }, [missingEmployees, searchQuery]);

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredEmployees.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmployees.map((e) => e.employee_id)));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleInitialize = async () => {
    if (selectedIds.size === 0) return;
    await onInitialize(Array.from(selectedIds));
    // Clear selection after successful initialization
    setSelectedIds(new Set());
  };

  const allSelected = filteredEmployees.length > 0 && selectedIds.size === filteredEmployees.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredEmployees.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Initialize {year} Leave Balances
          </DialogTitle>
          <DialogDescription>
            {missingEmployees.length} employee{missingEmployees.length !== 1 ? "s are" : " is"} missing leave balances for {year}.
            Each employee will receive their year allocation and any carry forward from {year - 1}.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Select All Header */}
        {!isLoading && filteredEmployees.length > 0 && (
          <div className="flex items-center gap-3 py-2 px-1 border-b">
            <Checkbox
              checked={allSelected}
              ref={(el) => {
                if (el) {
                  (el as unknown as HTMLInputElement).indeterminate = someSelected;
                }
              }}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all"
            />
            <span className="text-sm font-medium">
              {selectedIds.size > 0
                ? `${selectedIds.size} of ${filteredEmployees.length} selected`
                : `Select all (${filteredEmployees.length})`}
            </span>
          </div>
        )}

        {/* Employee List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-1 py-2">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))
            ) : filteredEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mb-3 text-green-500" />
                <p className="font-medium">All employees have balances</p>
                <p className="text-sm">No initialization needed for {year}</p>
              </div>
            ) : (
              filteredEmployees.map((employee) => {
                const isSelected = selectedIds.has(employee.employee_id);
                const isExpanded = expandedIds.has(employee.employee_id);

                return (
                  <Collapsible
                    key={employee.employee_id}
                    open={isExpanded}
                    onOpenChange={() => toggleExpand(employee.employee_id)}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg transition-colors",
                        isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(employee.employee_id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${employee.full_name}`}
                      />
                      
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={employee.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(employee.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{employee.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {employee.position || "No position"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Badge variant="outline" className="text-xs">
                          {employee.missing_leave_types.length} type{employee.missing_leave_types.length !== 1 ? "s" : ""}
                        </Badge>
                        <AllocationBadge amount={employee.total_allocation} />
                        <CarryForwardBadge amount={employee.total_carry_forward} />
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>

                    <CollapsibleContent>
                      <LeaveTypeBreakdown types={employee.missing_leave_types} year={year} />
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleInitialize}
            disabled={selectedIds.size === 0 || isPending}
          >
            {isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Initialize Selected ({selectedIds.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
