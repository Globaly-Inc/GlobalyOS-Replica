import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
  const [search, setSearch] = useState('');
  const filtered = members.filter(m =>
    m.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(''); }}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1 z-50" align="start" onClick={(e) => e.stopPropagation()}>
        <input
          className="w-full px-2 py-1.5 text-xs border-b bg-transparent outline-none placeholder:text-muted-foreground"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="max-h-48 overflow-y-auto">
          <button
            className={cn(
              'flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors',
              !value && 'bg-muted'
            )}
            onClick={() => { onChange(null); setOpen(false); }}
          >
            <span className="text-muted-foreground">Unassigned</span>
          </button>
          {filtered.map(m => (
            <button
              key={m.id}
              className={cn(
                'flex items-center gap-2 w-full px-2 py-1.5 text-xs rounded hover:bg-muted transition-colors',
                value === m.id && 'bg-muted'
              )}
              onClick={() => { onChange(m.id); setOpen(false); }}
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={m.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">{m.full_name?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <span className="truncate">{m.full_name}</span>
              {value === m.id && <Check className="h-3 w-3 ml-auto text-primary" />}
            </button>
          ))}
        </div>
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
