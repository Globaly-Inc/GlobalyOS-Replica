import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { TaskStatusRow, TaskCategoryRow, TaskFilters, TaskPriority } from '@/types/task';

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
];

interface TaskFilterPopoverProps {
  statuses: TaskStatusRow[];
  categories: TaskCategoryRow[];
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
}

export const TaskFilterPopover = ({ statuses, categories, filters, onFiltersChange }: TaskFilterPopoverProps) => {
  const [open, setOpen] = useState(false);

  const activeCount = [
    filters.status_ids?.length,
    filters.priority?.length,
    filters.category_ids?.length,
    filters.due_date_from || filters.due_date_to ? 1 : 0,
  ].reduce((sum, n) => sum + (n || 0), 0);

  const toggleArrayValue = <T extends string>(arr: T[] | undefined, value: T): T[] => {
    const current = arr || [];
    return current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
  };

  const clearAll = () => {
    onFiltersChange({});
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-medium">Filters</span>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearAll}>
              Clear all
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-3 space-y-4">
            {/* Status */}
            <FilterSection title="Status">
              {statuses.map(s => (
                <FilterCheckbox
                  key={s.id}
                  label={s.name}
                  checked={(filters.status_ids || []).includes(s.id)}
                  onCheckedChange={() =>
                    onFiltersChange({ ...filters, status_ids: toggleArrayValue(filters.status_ids, s.id) })
                  }
                  color={s.color || undefined}
                />
              ))}
            </FilterSection>

            <Separator />

            {/* Priority */}
            <FilterSection title="Priority">
              {PRIORITIES.map(p => (
                <FilterCheckbox
                  key={p.value}
                  label={p.label}
                  checked={(filters.priority || []).includes(p.value)}
                  onCheckedChange={() =>
                    onFiltersChange({ ...filters, priority: toggleArrayValue(filters.priority, p.value) })
                  }
                />
              ))}
            </FilterSection>

            <Separator />

            {/* Category */}
            <FilterSection title="Category">
              {categories.map(c => (
                <FilterCheckbox
                  key={c.id}
                  label={c.name}
                  checked={(filters.category_ids || []).includes(c.id)}
                  onCheckedChange={() =>
                    onFiltersChange({ ...filters, category_ids: toggleArrayValue(filters.category_ids, c.id) })
                  }
                  color={c.color || undefined}
                />
              ))}
            </FilterSection>

            <Separator />

            {/* Due Date */}
            <FilterSection title="Due Date">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-10">From</span>
                  <Input
                    type="date"
                    value={filters.due_date_from || ''}
                    onChange={(e) => onFiltersChange({ ...filters, due_date_from: e.target.value || undefined })}
                    className="h-7 text-xs flex-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-10">To</span>
                  <Input
                    type="date"
                    value={filters.due_date_to || ''}
                    onChange={(e) => onFiltersChange({ ...filters, due_date_to: e.target.value || undefined })}
                    className="h-7 text-xs flex-1"
                  />
                </div>
              </div>
            </FilterSection>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

const FilterSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{title}</p>
    <div className="space-y-1">{children}</div>
  </div>
);

const FilterCheckbox = ({
  label,
  checked,
  onCheckedChange,
  color,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: () => void;
  color?: string;
}) => (
  <label className="flex items-center gap-2 py-0.5 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1">
    <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
    {color && <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />}
    <span className="text-sm">{label}</span>
  </label>
);
