import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Plus } from 'lucide-react';
import type { TaskCategoryRow } from '@/types/task';

// ─── Priority Selector ───

const priorities = [
  { value: 'urgent', label: 'Urgent', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'high', label: 'High', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'normal', label: 'Normal', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'low', label: 'Low', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
];

interface PrioritySelectorProps {
  value: string;
  onChange: (val: string) => void;
  children: React.ReactNode;
}

export const PrioritySelector = ({ value, onChange, children }: PrioritySelectorProps) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1 z-50" align="start" onClick={(e) => e.stopPropagation()}>
        {priorities.map(p => (
          <button
            key={p.value}
            className={cn(
              'flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors',
              value === p.value && 'bg-muted'
            )}
            onClick={() => { onChange(p.value); setOpen(false); }}
          >
            <Badge variant="secondary" className={cn('text-[10px] h-5 px-1.5', p.className)}>
              {p.label}
            </Badge>
            {value === p.value && <Check className="h-3 w-3 ml-auto text-primary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

// ─── Category Selector ───

interface CategorySelectorProps {
  value: string | null;
  categories: TaskCategoryRow[];
  onChange: (val: string | null) => void;
  children: React.ReactNode;
}

export const CategorySelector = ({ value, categories, onChange, children }: CategorySelectorProps) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-40 p-1 z-50" align="start" onClick={(e) => e.stopPropagation()}>
        <button
          className={cn(
            'flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors',
            !value && 'bg-muted'
          )}
          onClick={() => { onChange(null); setOpen(false); }}
        >
          <span className="text-muted-foreground">None</span>
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            className={cn(
              'flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors',
              value === c.id && 'bg-muted'
            )}
            onClick={() => { onChange(c.id); setOpen(false); }}
          >
            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.color || '#6b7280' }} />
            <span className="truncate">{c.name}</span>
            {value === c.id && <Check className="h-3 w-3 ml-auto text-primary" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

// ─── Assignee Selector ───

interface AssigneeSelectorProps {
  value: string | null;
  members: { id: string; full_name: string; avatar_url: string | null }[];
  onChange: (val: string | null) => void;
  children: React.ReactNode;
}

export const AssigneeSelector = ({ value, members, onChange, children }: AssigneeSelectorProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 z-50" align="start" onClick={(e) => e.stopPropagation()}>
        <Command>
          <CommandInput placeholder="Search employees..." />
          <CommandList className="max-h-[240px] overflow-y-auto">
            <CommandEmpty>No employee found.</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem onSelect={() => { onChange(null); setOpen(false); }} value="__unassign__">
                  <X className="h-3 w-3 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Unassigned</span>
                </CommandItem>
              )}
              {members.map(m => (
                <CommandItem
                  key={m.id}
                  value={m.full_name}
                  onSelect={() => { onChange(m.id); setOpen(false); }}
                  className={value === m.id ? 'bg-primary/10 text-primary' : ''}
                >
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={m.avatar_url || undefined} />
                    <AvatarFallback className="text-[9px]">{m.full_name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{m.full_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// ─── Due Date Selector ───

interface DueDateSelectorProps {
  value: string | null;
  onChange: (val: string | null) => void;
  children: React.ReactNode;
}

export const DueDateSelector = ({ value, onChange, children }: DueDateSelectorProps) => {
  const [open, setOpen] = useState(false);
  const dateValue = value ? parseISO(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 z-50" align="start" onClick={(e) => e.stopPropagation()}>
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={(date) => {
            onChange(date ? format(date, 'yyyy-MM-dd') : null);
            setOpen(false);
          }}
          initialFocus
        />
        {value && (
          <button
            className="w-full text-xs text-center py-2 text-muted-foreground hover:text-foreground border-t"
            onClick={() => { onChange(null); setOpen(false); }}
          >
            Clear date
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
};
