import { useState, useEffect, useCallback } from "react";
import { useOrganization } from "@/hooks/useOrganization";

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

const STORAGE_KEY_PREFIX = "kpi_dashboard_filters_";

export const useKpiDashboardFilters = () => {
  const { currentOrg } = useOrganization();
  const [filters, setFilters] = useState<KpiDashboardFilters>(DEFAULT_FILTERS);
  const [isLoaded, setIsLoaded] = useState(false);

  const storageKey = currentOrg?.id ? `${STORAGE_KEY_PREFIX}${currentOrg.id}` : null;

  // Load filters from localStorage on mount or when org changes
  useEffect(() => {
    if (!storageKey) return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<KpiDashboardFilters>;
        setFilters({
          viewMode: parsed.viewMode || DEFAULT_FILTERS.viewMode,
          quarter: parsed.quarter ?? getCurrentQuarter(),
          year: parsed.year ?? getCurrentYear(),
          departmentFilter: parsed.departmentFilter || DEFAULT_FILTERS.departmentFilter,
          projectFilter: parsed.projectFilter || DEFAULT_FILTERS.projectFilter,
          officeFilter: parsed.officeFilter || DEFAULT_FILTERS.officeFilter,
        });
      } else {
        // No saved filters, use defaults with current quarter/year
        setFilters({
          ...DEFAULT_FILTERS,
          quarter: getCurrentQuarter(),
          year: getCurrentYear(),
        });
      }
    } catch (e) {
      console.error("Failed to load KPI dashboard filters:", e);
      setFilters({
        ...DEFAULT_FILTERS,
        quarter: getCurrentQuarter(),
        year: getCurrentYear(),
      });
    }
    setIsLoaded(true);
  }, [storageKey]);

  // Save filters to localStorage whenever they change
  const saveToStorage = useCallback((newFilters: KpiDashboardFilters) => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(newFilters));
    } catch (e) {
      console.error("Failed to save KPI dashboard filters:", e);
    }
  }, [storageKey]);

  // Individual setters that auto-save
  const setViewMode = useCallback((viewMode: "quarterly" | "annual") => {
    setFilters(prev => {
      const newFilters = { ...prev, viewMode };
      saveToStorage(newFilters);
      return newFilters;
    });
  }, [saveToStorage]);

  const setQuarter = useCallback((quarter: number) => {
    setFilters(prev => {
      const newFilters = { ...prev, quarter };
      saveToStorage(newFilters);
      return newFilters;
    });
  }, [saveToStorage]);

  const setYear = useCallback((year: number) => {
    setFilters(prev => {
      const newFilters = { ...prev, year };
      saveToStorage(newFilters);
      return newFilters;
    });
  }, [saveToStorage]);

  const setDepartmentFilter = useCallback((departmentFilter: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, departmentFilter };
      saveToStorage(newFilters);
      return newFilters;
    });
  }, [saveToStorage]);

  const setProjectFilter = useCallback((projectFilter: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, projectFilter };
      saveToStorage(newFilters);
      return newFilters;
    });
  }, [saveToStorage]);

  const setOfficeFilter = useCallback((officeFilter: string) => {
    setFilters(prev => {
      const newFilters = { ...prev, officeFilter };
      saveToStorage(newFilters);
      return newFilters;
    });
  }, [saveToStorage]);

  const clearFilters = useCallback(() => {
    const defaultWithCurrentPeriod = {
      ...DEFAULT_FILTERS,
      quarter: getCurrentQuarter(),
      year: getCurrentYear(),
    };
    setFilters(defaultWithCurrentPeriod);
    saveToStorage(defaultWithCurrentPeriod);
  }, [saveToStorage]);

  return {
    // Filter values
    viewMode: filters.viewMode,
    quarter: filters.quarter,
    year: filters.year,
    departmentFilter: filters.departmentFilter,
    projectFilter: filters.projectFilter,
    officeFilter: filters.officeFilter,
    // Setters
    setViewMode,
    setQuarter,
    setYear,
    setDepartmentFilter,
    setProjectFilter,
    setOfficeFilter,
    clearFilters,
    // Loading state
    isLoaded,
  };
};
