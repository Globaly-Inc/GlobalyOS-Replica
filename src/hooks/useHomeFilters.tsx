import { usePersistedFilters } from "./usePersistedFilters";

type DateFilter = "all" | "today" | "week" | "month";

interface HomeFilters {
  feedFilter: string;
  dateFilter: DateFilter;
}

const DEFAULT_FILTERS: HomeFilters = {
  feedFilter: "all",
  dateFilter: "all",
};

export const useHomeFilters = () => {
  const { filters, setFilter, setFilters, clearFilters, isLoaded } =
    usePersistedFilters<HomeFilters>({
      pageKey: "home",
      defaultFilters: DEFAULT_FILTERS,
    });

  return {
    // Filter values
    feedFilter: filters.feedFilter,
    dateFilter: filters.dateFilter,
    // Setters
    setFeedFilter: (value: string) => setFilter("feedFilter", value),
    setDateFilter: (value: DateFilter) => setFilter("dateFilter", value),
    clearFilters,
    isLoaded,
  };
};
