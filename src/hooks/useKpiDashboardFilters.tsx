import { usePersistedFilters } from "./usePersistedFilters";

const getCurrentQuarter = () => Math.floor(new Date().getMonth() / 3) + 1;
const getCurrentYear = () => new Date().getFullYear();

export interface KpiDashboardFilters {
  viewMode: "quarterly" | "annual";
  quarter: number;
  year: number;
  departmentFilter: string;
  projectFilter: string;
  officeFilter: string;
}

const DEFAULT_FILTERS: KpiDashboardFilters = {
  viewMode: "quarterly",
  quarter: getCurrentQuarter(),
  year: getCurrentYear(),
  departmentFilter: "all",
  projectFilter: "all",
  officeFilter: "all",
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
    viewMode: filters.viewMode,
    quarter: filters.quarter,
    year: filters.year,
    departmentFilter: filters.departmentFilter,
    projectFilter: filters.projectFilter,
    officeFilter: filters.officeFilter,
    // Setters
    setViewMode: (value: "quarterly" | "annual") => setFilter("viewMode", value),
    setQuarter: (value: number) => setFilter("quarter", value),
    setYear: (value: number) => setFilter("year", value),
    setDepartmentFilter: (value: string) => setFilter("departmentFilter", value),
    setProjectFilter: (value: string) => setFilter("projectFilter", value),
    setOfficeFilter: (value: string) => setFilter("officeFilter", value),
    clearFilters,
    isLoaded,
  };
};
