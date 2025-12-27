import { usePersistedFilters } from "./usePersistedFilters";

type StatusFilter = "all" | "active" | "invited" | "inactive";
type OnlineFilter = "all" | "online" | "offline";
type ViewMode = "cards" | "orgchart";

interface TeamFilters {
  statusFilter: StatusFilter;
  onlineFilter: OnlineFilter;
  projectFilter: string;
  viewMode: ViewMode;
}

const DEFAULT_FILTERS: TeamFilters = {
  statusFilter: "active",
  onlineFilter: "all",
  projectFilter: "all",
  viewMode: "cards",
};

export const useTeamFilters = () => {
  const { filters, setFilter, setFilters, clearFilters, isLoaded } =
    usePersistedFilters<TeamFilters>({
      pageKey: "team_directory",
      defaultFilters: DEFAULT_FILTERS,
    });

  return {
    // Filter values
    statusFilter: filters.statusFilter,
    onlineFilter: filters.onlineFilter,
    projectFilter: filters.projectFilter,
    viewMode: filters.viewMode,
    // Setters
    setStatusFilter: (value: StatusFilter) => setFilter("statusFilter", value),
    setOnlineFilter: (value: OnlineFilter) => setFilter("onlineFilter", value),
    setProjectFilter: (value: string) => setFilter("projectFilter", value),
    setViewMode: (value: ViewMode) => setFilter("viewMode", value),
    clearFilters,
    isLoaded,
  };
};
