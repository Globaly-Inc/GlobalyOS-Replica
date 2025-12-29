import { usePersistedFilters } from "./usePersistedFilters";

const getCurrentQuarter = () => Math.floor(new Date().getMonth() / 3) + 1;
const getCurrentYear = () => new Date().getFullYear();

export interface KpiDashboardFilters {
  quarter: number; // 0 = All quarters (annual view), 1-4 = specific quarter
  year: number;
  departmentFilter: string;
  projectFilter: string;
  officeFilter: string;
  selectedEmployees: string[];
}

const DEFAULT_FILTERS: KpiDashboardFilters = {
  quarter: getCurrentQuarter(),
  year: getCurrentYear(),
  departmentFilter: "all",
  projectFilter: "all",
  officeFilter: "all",
  selectedEmployees: [],
};

export const useKpiDashboardFilters = () => {
  const { filters, setFilter, clearFilters, isLoaded } =
    usePersistedFilters<KpiDashboardFilters>({
      pageKey: "kpi_dashboard",
      defaultFilters: DEFAULT_FILTERS,
      dynamicDefaults: () => ({
        quarter: getCurrentQuarter(),
        year: getCurrentYear(),
      }),
    });

  return {
    // Filter values
    quarter: filters.quarter,
    year: filters.year,
    departmentFilter: filters.departmentFilter,
    projectFilter: filters.projectFilter,
    officeFilter: filters.officeFilter,
    selectedEmployees: filters.selectedEmployees,
    // Setters
    setQuarter: (value: number) => setFilter("quarter", value),
    setYear: (value: number) => setFilter("year", value),
    setDepartmentFilter: (value: string) => setFilter("departmentFilter", value),
    setProjectFilter: (value: string) => setFilter("projectFilter", value),
    setOfficeFilter: (value: string) => setFilter("officeFilter", value),
    setSelectedEmployees: (value: string[]) => setFilter("selectedEmployees", value),
    clearFilters,
    isLoaded,
  };
};
