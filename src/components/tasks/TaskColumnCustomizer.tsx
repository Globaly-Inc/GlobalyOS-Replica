import { useState } from 'react';
import { Settings2, GripVertical, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: 'name', label: 'Name', visible: true },
  { key: 'category', label: 'Category', visible: true },
  { key: 'assignee', label: 'Assignee', visible: true },
  { key: 'tags', label: 'Tags', visible: true },
  { key: 'comments', label: 'Comments', visible: true },
  { key: 'attachments', label: 'Attachments', visible: true },
  { key: 'priority', label: 'Priority', visible: true },
  { key: 'due_date', label: 'Due Date', visible: false },
];

interface TaskColumnCustomizerProps {
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
}

export const TaskColumnCustomizer = ({ columns, onColumnsChange }: TaskColumnCustomizerProps) => {
  const toggleColumn = (key: string) => {
    // Don't allow hiding the name column
    if (key === 'name') return;
    onColumnsChange(
      columns.map(c => c.key === key ? { ...c, visible: !c.visible } : c)
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />
          Customize
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="end">
        <div className="px-3 py-2 border-b">
          <span className="text-sm font-medium">Columns</span>
        </div>
        <div className="p-2 space-y-0.5">
          {columns.map(col => (
            <div
              key={col.key}
              className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50"
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              <span className="text-sm flex-1">{col.label}</span>
              <Switch
                checked={col.visible}
                onCheckedChange={() => toggleColumn(col.key)}
                disabled={col.key === 'name'}
                className="scale-75"
              />
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const getDefaultColumns = (): ColumnConfig[] => [...DEFAULT_COLUMNS];
