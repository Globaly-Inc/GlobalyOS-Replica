import { useState, useEffect, useCallback } from "react";
import { useOrganization } from "@/hooks/useOrganization";

export interface UsePersistedFiltersOptions<T> {
  pageKey: string;
  defaultFilters: T;
  dynamicDefaults?: () => Partial<T>;
}

const STORAGE_KEY_PREFIX = "filters_";

export function usePersistedFilters<T extends Record<string, any>>(
  options: UsePersistedFiltersOptions<T>
) {
  const { pageKey, defaultFilters, dynamicDefaults } = options;
  const { currentOrg } = useOrganization();
  const [filters, setFiltersState] = useState<T>(() => ({
    ...defaultFilters,
    ...(dynamicDefaults?.() || {}),
  }));
  const [isLoaded, setIsLoaded] = useState(false);

  const storageKey = currentOrg?.id
    ? `${STORAGE_KEY_PREFIX}${currentOrg.id}_${pageKey}`
    : null;

  // Load filters from localStorage on mount or when org changes
  useEffect(() => {
    if (!storageKey) return;

    try {
      const saved = localStorage.getItem(storageKey);
      const dynamic = dynamicDefaults?.() || {};
      
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<T>;
        // Merge: defaults < dynamic defaults < saved values
        setFiltersState({
          ...defaultFilters,
          ...dynamic,
          ...parsed,
        });
      } else {
        setFiltersState({
          ...defaultFilters,
          ...dynamic,
        });
      }
    } catch (e) {
      console.error(`Failed to load filters for ${pageKey}:`, e);
      setFiltersState({
        ...defaultFilters,
        ...(dynamicDefaults?.() || {}),
      });
    }
    setIsLoaded(true);
  }, [storageKey]);

  // Save to localStorage
  const saveToStorage = useCallback(
    (newFilters: T) => {
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(newFilters));
      } catch (e) {
        console.error(`Failed to save filters for ${pageKey}:`, e);
      }
    },
    [storageKey, pageKey]
  );

  // Set a single filter value
  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setFiltersState((prev) => {
        const newFilters = { ...prev, [key]: value };
        saveToStorage(newFilters);
        return newFilters;
      });
    },
    [saveToStorage]
  );

  // Set multiple filter values at once
  const setFilters = useCallback(
    (updates: Partial<T>) => {
      setFiltersState((prev) => {
        const newFilters = { ...prev, ...updates };
        saveToStorage(newFilters);
        return newFilters;
      });
    },
    [saveToStorage]
  );

  // Clear all filters to defaults (with dynamic defaults applied)
  const clearFilters = useCallback(() => {
    const defaultWithDynamic = {
      ...defaultFilters,
      ...(dynamicDefaults?.() || {}),
    };
    setFiltersState(defaultWithDynamic);
    saveToStorage(defaultWithDynamic);
  }, [defaultFilters, dynamicDefaults, saveToStorage]);

  return {
    filters,
    setFilter,
    setFilters,
    clearFilters,
    isLoaded,
  };
}
