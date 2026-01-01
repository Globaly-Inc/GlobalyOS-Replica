import { usePersistedFilters } from "./usePersistedFilters";
import { startOfDay, subDays, startOfMonth, endOfMonth, subMonths, differenceInDays } from "date-fns";

export type DateRangeOption = 
  | "today" 
  | "last7days" 
  | "last14days" 
  | "last30days" 
  | "thisMonth" 
  | "lastMonth" 
  | "thisYear" 
  | "lastYear"
  | "custom";

interface LeaveHistoryFilters {
  statusFilter: string;
  leaveTypeFilter: string;
  transactionTypeFilter: string;
  yearFilter: string;
  dateRangeFilter: DateRangeOption;
  selectedEmployees: string[];
  customStartDate: string | null;
  customEndDate: string | null;
}

const DEFAULT_FILTERS: LeaveHistoryFilters = {
  statusFilter: "all",
  leaveTypeFilter: "all",
  transactionTypeFilter: "all",
  yearFilter: new Date().getFullYear().toString(),
  dateRangeFilter: "last30days",
  selectedEmployees: [],
  customStartDate: null,
  customEndDate: null,
};

export const getDateRangeFromFilter = (
  dateRangeFilter: DateRangeOption,
  customStartDate: string | null,
  customEndDate: string | null
): { startDate: Date; endDate: Date } => {
  const today = startOfDay(new Date());
  const now = new Date();

  switch (dateRangeFilter) {
    case "today":
      return { startDate: today, endDate: now };
    case "last7days":
      return { startDate: subDays(today, 6), endDate: now };
    case "last14days":
      return { startDate: subDays(today, 13), endDate: now };
    case "last30days":
      return { startDate: subDays(today, 29), endDate: now };
    case "thisMonth":
      return { startDate: startOfMonth(today), endDate: now };
    case "lastMonth": {
      const lastMonth = subMonths(today, 1);
      return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
    }
    case "thisYear":
      return { startDate: new Date(today.getFullYear(), 0, 1), endDate: now };
    case "lastYear": {
      const lastYear = today.getFullYear() - 1;
      return { 
        startDate: new Date(lastYear, 0, 1), 
        endDate: new Date(lastYear, 11, 31, 23, 59, 59) 
      };
    }
    case "custom":
      return {
        startDate: customStartDate ? new Date(customStartDate) : subDays(today, 6),
        endDate: customEndDate ? new Date(customEndDate) : now,
      };
    default:
      return { startDate: subDays(today, 6), endDate: now };
  }
};

/**
 * Calculate the previous equivalent period based on the current date range.
 * For example, if current period is Dec 21-27, previous period is Dec 14-20.
 */
export const getPreviousPeriodRange = (
  dateRange: { startDate: Date; endDate: Date }
): { startDate: Date; endDate: Date } => {
  const { startDate, endDate } = dateRange;
  const daysDiff = differenceInDays(endDate, startDate) + 1;
  
  // Previous period ends the day before current period starts
  const prevEndDate = subDays(startDate, 1);
  const prevStartDate = subDays(prevEndDate, daysDiff - 1);
  
  return { startDate: prevStartDate, endDate: prevEndDate };
};

/**
 * Get a user-friendly label for the comparison period based on the date filter.
 */
export const getComparisonLabel = (dateRangeFilter: DateRangeOption): string => {
  switch (dateRangeFilter) {
    case "today":
      return "yesterday";
    case "last7days":
      return "previous 7 days";
    case "last14days":
      return "previous 14 days";
    case "last30days":
      return "previous 30 days";
    case "thisMonth":
      return "last month";
    case "lastMonth":
      return "2 months ago";
    case "thisYear":
      return "last year";
    case "lastYear":
      return "year before last";
    case "custom":
      return "previous period";
    default:
      return "previous period";
  }
};

export const DATE_RANGE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "last7days", label: "Last 7 days" },
  { value: "last14days", label: "Last 14 days" },
  { value: "last30days", label: "Last 30 days" },
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "thisYear", label: "This Year" },
  { value: "lastYear", label: "Last Year" },
  { value: "custom", label: "Custom" },
];

// Get display label for date range filter with dynamic year
export const getDateRangeDisplayLabel = (option: DateRangeOption): string => {
  const currentYear = new Date().getFullYear();
  switch (option) {
    case "thisYear":
      return `This Year (${currentYear})`;
    case "lastYear":
      return `Last Year (${currentYear - 1})`;
    default:
      return DATE_RANGE_OPTIONS.find(o => o.value === option)?.label || option;
  }
};

export const useLeaveHistoryFilters = () => {
  const { filters, setFilter, setFilters, clearFilters, isLoaded } =
    usePersistedFilters<LeaveHistoryFilters>({
      pageKey: "leave_history_v4", // Version bump to reset persisted filters to new defaults
      defaultFilters: DEFAULT_FILTERS,
      dynamicDefaults: () => ({
        yearFilter: new Date().getFullYear().toString(),
      }),
    });

  const dateRange = getDateRangeFromFilter(
    filters.dateRangeFilter,
    filters.customStartDate,
    filters.customEndDate
  );

  return {
    // Filter values
    statusFilter: filters.statusFilter,
    leaveTypeFilter: filters.leaveTypeFilter,
    transactionTypeFilter: filters.transactionTypeFilter,
    yearFilter: filters.yearFilter,
    dateRangeFilter: filters.dateRangeFilter,
    selectedEmployees: filters.selectedEmployees,
    customStartDate: filters.customStartDate,
    customEndDate: filters.customEndDate,
    // Computed
    dateRange,
    // Setters
    setStatusFilter: (value: string) => setFilter("statusFilter", value),
    setLeaveTypeFilter: (value: string) => setFilter("leaveTypeFilter", value),
    setTransactionTypeFilter: (value: string) => setFilter("transactionTypeFilter", value),
    setYearFilter: (value: string) => setFilter("yearFilter", value),
    setDateRangeFilter: (value: DateRangeOption) => setFilter("dateRangeFilter", value),
    setSelectedEmployees: (value: string[]) => setFilter("selectedEmployees", value),
    setCustomDateRange: (startDate: string | null, endDate: string | null) => {
      setFilters({ customStartDate: startDate, customEndDate: endDate });
    },
    clearFilters,
    isLoaded,
  };
};
