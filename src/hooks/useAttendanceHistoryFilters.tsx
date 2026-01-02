import { usePersistedFilters } from "./usePersistedFilters";

type DateRangeOption = "today" | "last7days" | "last14days" | "last30days" | "thisMonth" | "lastMonth" | "custom";
type AttendanceHistoryTab = "analytics" | "records" | "not-checked-in";

interface AttendanceHistoryFilters {
  activeTab: AttendanceHistoryTab;
  dateRangeFilter: DateRangeOption;
  statusFilter: string;
  departmentFilter: string;
  workStatusFilter: string;
  officeFilter: string;
  projectFilter: string;
  selectedEmployees: string[];
  notCheckedInSelectedEmployees: string[];
}

const DEFAULT_FILTERS: AttendanceHistoryFilters = {
  activeTab: "records",
  dateRangeFilter: "last7days",
  statusFilter: "all",
  departmentFilter: "all",
  workStatusFilter: "all",
  officeFilter: "all",
  projectFilter: "all",
  selectedEmployees: [],
  notCheckedInSelectedEmployees: [],
};

export const useAttendanceHistoryFilters = () => {
  const { filters, setFilter, setFilters, clearFilters, isLoaded } =
    usePersistedFilters<AttendanceHistoryFilters>({
      pageKey: "attendance_history_v3",
      defaultFilters: DEFAULT_FILTERS,
    });

  return {
    // Filter values
    activeTab: filters.activeTab,
    dateRangeFilter: filters.dateRangeFilter,
    statusFilter: filters.statusFilter,
    departmentFilter: filters.departmentFilter,
    workStatusFilter: filters.workStatusFilter,
    officeFilter: filters.officeFilter,
    projectFilter: filters.projectFilter,
    selectedEmployees: filters.selectedEmployees,
    notCheckedInSelectedEmployees: filters.notCheckedInSelectedEmployees,
    // Setters
    setActiveTab: (value: AttendanceHistoryTab) => setFilter("activeTab", value),
    setDateRangeFilter: (value: DateRangeOption) => setFilter("dateRangeFilter", value),
    setStatusFilter: (value: string) => setFilter("statusFilter", value),
    setDepartmentFilter: (value: string) => setFilter("departmentFilter", value),
    setWorkStatusFilter: (value: string) => setFilter("workStatusFilter", value),
    setOfficeFilter: (value: string) => setFilter("officeFilter", value),
    setProjectFilter: (value: string) => setFilter("projectFilter", value),
    setSelectedEmployees: (value: string[]) => setFilter("selectedEmployees", value),
    setNotCheckedInSelectedEmployees: (value: string[]) => setFilter("notCheckedInSelectedEmployees", value),
    clearFilters,
    isLoaded,
  };
};

export type { AttendanceHistoryTab };
