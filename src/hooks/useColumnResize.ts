import { useState, useCallback, useRef, useEffect } from 'react';

export interface ColumnWidths {
  [key: string]: number;
}

const DEFAULT_WIDTHS: Record<string, number> = {
  name: 0, // flex (handled separately)
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

export function useColumnResize(initialWidths?: ColumnWidths) {
  const [widths, setWidths] = useState<ColumnWidths>({ ...DEFAULT_WIDTHS, ...initialWidths });
  const draggingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startWidth = widths[colKey] || DEFAULT_WIDTHS[colKey] || (colKey.startsWith('custom_') ? 120 : 100);
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
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [widths]);

  const getGridTemplate = useCallback((visibleColumns: { key: string; visible: boolean }[], hasSelection: boolean) => {
    const cols = visibleColumns.map(col => {
      if (col.key === 'name') return '1fr';
      const w = widths[col.key] || DEFAULT_WIDTHS[col.key] || 100;
      return `${w}px`;
    });
    return (hasSelection ? '28px ' : '') + cols.join(' ') + ' 40px';
  }, [widths]);

  return { widths, handleMouseDown, getGridTemplate };
}
