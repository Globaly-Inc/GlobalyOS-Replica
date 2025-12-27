import { usePersistedFilters } from "./usePersistedFilters";

interface LeaveHistoryFilters {
  statusFilter: string;
  leaveTypeFilter: string;
  transactionTypeFilter: string;
  yearFilter: string;
}

const DEFAULT_FILTERS: LeaveHistoryFilters = {
  statusFilter: "all",
  leaveTypeFilter: "all",
  transactionTypeFilter: "all",
  yearFilter: new Date().getFullYear().toString(),
};

export const useLeaveHistoryFilters = () => {
  const { filters, setFilter, setFilters, clearFilters, isLoaded } =
    usePersistedFilters<LeaveHistoryFilters>({
      pageKey: "leave_history",
      defaultFilters: DEFAULT_FILTERS,
      dynamicDefaults: () => ({
        yearFilter: new Date().getFullYear().toString(),
      }),
    });

  return {
    // Filter values
    statusFilter: filters.statusFilter,
    leaveTypeFilter: filters.leaveTypeFilter,
    transactionTypeFilter: filters.transactionTypeFilter,
    yearFilter: filters.yearFilter,
    // Setters
    setStatusFilter: (value: string) => setFilter("statusFilter", value),
    setLeaveTypeFilter: (value: string) => setFilter("leaveTypeFilter", value),
    setTransactionTypeFilter: (value: string) => setFilter("transactionTypeFilter", value),
    setYearFilter: (value: string) => setFilter("yearFilter", value),
    clearFilters,
    isLoaded,
  };
};
