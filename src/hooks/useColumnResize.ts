import { useState, useCallback, useRef, useEffect } from 'react';

export interface ColumnWidths {
  [key: string]: number;
}

const DEFAULT_WIDTHS: Record<string, number> = {
  name: 300,
  category: 120,
  assignee: 100,
  tags: 120,
  comments: 60,
  attachments: 60,
  priority: 80,
  due_date: 100,
};

const MIN_WIDTH = 40;
const MAX_WIDTH = 600;

function loadWidths(storageKey: string): ColumnWidths | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

function saveWidths(storageKey: string, widths: ColumnWidths) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(widths));
  } catch { /* ignore */ }
}

export function useColumnResize(persistKey?: string) {
  const storageKey = persistKey ? `task-col-widths-${persistKey}` : '';

  const [widths, setWidths] = useState<ColumnWidths>(() => {
    const saved = storageKey ? loadWidths(storageKey) : null;
    return { ...DEFAULT_WIDTHS, ...(saved || {}) };
  });

  // Mirror state into a ref so mousemove closures always read latest values
  const widthsRef = useRef(widths);
  useEffect(() => {
    widthsRef.current = widths;
  }, [widths]);

  const draggingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);
  const storageKeyRef = useRef(storageKey);
  storageKeyRef.current = storageKey;

  // Stable callback — no dependency on `widths` state
  const handleMouseDown = useCallback((e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();

    const currentWidths = widthsRef.current;
    const startWidth = currentWidths[colKey] || DEFAULT_WIDTHS[colKey] || (colKey.startsWith('custom_') ? 120 : 100);
    draggingRef.current = { key: colKey, startX: e.clientX, startWidth };

    const onMouseMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const diff = ev.clientX - draggingRef.current.startX;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, draggingRef.current.startWidth + diff));
      setWidths(prev => ({ ...prev, [draggingRef.current!.key]: newWidth }));
    };

    const onMouseUp = () => {
      draggingRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Persist on resize end
      if (storageKeyRef.current) {
        saveWidths(storageKeyRef.current, widthsRef.current);
      }
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []); // No dependencies — uses refs only

  const getColumnWidth = useCallback((colKey: string): number => {
    return widths[colKey] || DEFAULT_WIDTHS[colKey] || 100;
  }, [widths]);

  const getGridTemplate = useCallback((visibleColumns: { key: string; visible: boolean }[], hasSelection: boolean) => {
    const cols = visibleColumns.map(col => {
      const w = widths[col.key] || DEFAULT_WIDTHS[col.key] || 100;
      return `${w}px`;
    });
    return (hasSelection ? '28px ' : '') + cols.join(' ') + ' 40px';
  }, [widths]);

  return { widths, handleMouseDown, getGridTemplate, getColumnWidth };
}
