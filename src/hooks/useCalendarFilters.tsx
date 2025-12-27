import { usePersistedFilters } from "./usePersistedFilters";

type ViewMode = "month" | "week" | "day";
type DateRangeFilter = "7days" | "14days" | "30days" | "thisMonth" | "all";

interface CalendarFilters {
  viewMode: ViewMode;
  dateRangeFilter: DateRangeFilter;
  activeFilters: string[]; // Store as array for JSON serialization
}

const DEFAULT_FILTERS: CalendarFilters = {
  viewMode: "month",
  dateRangeFilter: "7days",
  activeFilters: [],
};

export const useCalendarFilters = () => {
  const { filters, setFilter, setFilters, clearFilters, isLoaded } =
    usePersistedFilters<CalendarFilters>({
      pageKey: "calendar",
      defaultFilters: DEFAULT_FILTERS,
    });

  // Convert array to Set for the component's expected interface
  const activeFiltersSet = new Set(filters.activeFilters);

  return {
    // Filter values
    viewMode: filters.viewMode,
    dateRangeFilter: filters.dateRangeFilter,
    activeFilters: activeFiltersSet,
    // Setters
    setViewMode: (value: ViewMode) => setFilter("viewMode", value),
    setDateRangeFilter: (value: DateRangeFilter) => setFilter("dateRangeFilter", value),
    setActiveFilters: (value: Set<string>) => setFilter("activeFilters", Array.from(value)),
    clearFilters,
    isLoaded,
  };
};
