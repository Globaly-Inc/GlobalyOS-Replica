import { useState, useCallback, useEffect, useRef } from 'react';
import type { ColumnConfig } from '@/components/tasks/TaskColumnCustomizer';
import { getDefaultColumns } from '@/components/tasks/TaskColumnCustomizer';

const STORAGE_PREFIX = 'task-columns-';

function loadColumns(key: string): ColumnConfig[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveColumns(key: string, columns: ColumnConfig[]) {
  try {
    localStorage.setItem(key, JSON.stringify(columns));
  } catch { /* ignore */ }
}

/**
 * Persists column visibility & order to localStorage, keyed by spaceId.
 * Falls back to defaults when no saved config exists.
 */
export function usePersistedColumns(spaceId?: string | null) {
  const storageKey = spaceId ? `${STORAGE_PREFIX}${spaceId}` : '';

  const [columns, setColumnsState] = useState<ColumnConfig[]>(() => {
    if (storageKey) {
      const saved = loadColumns(storageKey);
      if (saved) return mergeWithDefaults(saved);
    }
    return getDefaultColumns();
  });

  const prevKeyRef = useRef(storageKey);

  // When spaceId changes, load that space's saved columns
  useEffect(() => {
    if (storageKey !== prevKeyRef.current) {
      prevKeyRef.current = storageKey;
      if (storageKey) {
        const saved = loadColumns(storageKey);
        setColumnsState(saved ? mergeWithDefaults(saved) : getDefaultColumns());
      } else {
        setColumnsState(getDefaultColumns());
      }
    }
  }, [storageKey]);

  const setColumns = useCallback((cols: ColumnConfig[]) => {
    setColumnsState(cols);
    if (storageKey) {
      saveColumns(storageKey, cols);
    }
  }, [storageKey]);

  return [columns, setColumns] as const;
}

/**
 * Merge saved columns with current defaults so new columns added
 * to the codebase appear automatically (appended at end).
 */
function mergeWithDefaults(saved: ColumnConfig[]): ColumnConfig[] {
  const defaults = getDefaultColumns();
  const savedKeys = new Set(saved.map(c => c.key));
  // Append any new default columns not in the saved set
  const newCols = defaults.filter(d => !savedKeys.has(d.key));
  return [...saved, ...newCols];
}
