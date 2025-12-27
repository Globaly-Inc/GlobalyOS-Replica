import { usePersistedFilters } from "./usePersistedFilters";

type DateRangeOption = "today" | "last7days" | "last14days" | "last30days" | "thisMonth" | "lastMonth" | "custom";

interface AttendanceHistoryFilters {
  dateRangeFilter: DateRangeOption;
  statusFilter: string;
  departmentFilter: string;
  workStatusFilter: string;
  officeFilter: string;
  projectFilter: string;
}

const DEFAULT_FILTERS: AttendanceHistoryFilters = {
  dateRangeFilter: "today",
  statusFilter: "all",
  departmentFilter: "all",
  workStatusFilter: "all",
  officeFilter: "all",
  projectFilter: "all",
};

export const useAttendanceHistoryFilters = () => {
  const { filters, setFilter, setFilters, clearFilters, isLoaded } =
    usePersistedFilters<AttendanceHistoryFilters>({
      pageKey: "attendance_history",
      defaultFilters: DEFAULT_FILTERS,
    });

  return {
    // Filter values
    dateRangeFilter: filters.dateRangeFilter,
    statusFilter: filters.statusFilter,
    departmentFilter: filters.departmentFilter,
    workStatusFilter: filters.workStatusFilter,
    officeFilter: filters.officeFilter,
    projectFilter: filters.projectFilter,
    // Setters
    setDateRangeFilter: (value: DateRangeOption) => setFilter("dateRangeFilter", value),
    setStatusFilter: (value: string) => setFilter("statusFilter", value),
    setDepartmentFilter: (value: string) => setFilter("departmentFilter", value),
    setWorkStatusFilter: (value: string) => setFilter("workStatusFilter", value),
    setOfficeFilter: (value: string) => setFilter("officeFilter", value),
    setProjectFilter: (value: string) => setFilter("projectFilter", value),
    clearFilters,
    isLoaded,
  };
};
