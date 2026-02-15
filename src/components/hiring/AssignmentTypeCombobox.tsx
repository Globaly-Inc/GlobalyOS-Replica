/**
 * Searchable, creatable combobox for assignment types.
 * Fetches org-specific types from assignment_type_options table,
 * merges with built-in defaults, and allows creating new types.
 */

import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

const BUILT_IN_TYPES = [
  { label: 'Coding Challenge', value: 'coding' },
  { label: 'Writing Sample', value: 'writing' },
  { label: 'Design Task', value: 'design' },
  { label: 'Case Study', value: 'case_study' },
  { label: 'General Assignment', value: 'general' },
];

interface AssignmentTypeComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AssignmentTypeCombobox({
  value,
  onChange,
  placeholder = 'Select or create type...',
  disabled = false,
}: AssignmentTypeComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();
  const { currentOrg } = useOrganization();
  const organizationId = currentOrg?.id;

  // Fetch org-specific custom types
  const { data: customTypes = [], isLoading } = useQuery({
    queryKey: ['assignment-type-options', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('assignment_type_options')
        .select('*')
        .eq('organization_id', organizationId)
        .order('label');
      if (error) throw error;
      return (data || []).map((d: any) => ({ label: d.label, value: d.value }));
    },
    enabled: !!organizationId,
  });

  // Merge built-in + custom, deduplicate by value
  const allOptions = useMemo(() => {
    const map = new Map<string, { label: string; value: string }>();
    for (const opt of BUILT_IN_TYPES) map.set(opt.value, opt);
    for (const opt of customTypes) map.set(opt.value, opt);
    return Array.from(map.values());
  }, [customTypes]);

  // Filter by search
  const filteredOptions = useMemo(() => {
    if (!search) return allOptions;
    const s = search.toLowerCase();
    return allOptions.filter(
      (o) => o.label.toLowerCase().includes(s) || o.value.toLowerCase().includes(s),
    );
  }, [allOptions, search]);

  // Can create?
  const canCreate = useMemo(() => {
    if (!search.trim()) return false;
    const s = search.toLowerCase().trim();
    return !allOptions.some(
      (o) => o.label.toLowerCase() === s || o.value.toLowerCase() === s,
    );
  }, [allOptions, search]);

  // Create mutation
  const createType = useMutation({
    mutationFn: async (label: string) => {
      if (!organizationId) throw new Error('No organization');
      const newValue = label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      const { error } = await supabase.from('assignment_type_options').insert({
        organization_id: organizationId,
        label,
        value: newValue,
      });
      if (error) throw error;
      return { label, value: newValue };
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['assignment-type-options'] });
      onChange(created.value);
      setSearch('');
      setOpen(false);
      toast.success(`Type "${created.label}" created`);
    },
    onError: () => {
      toast.error('Failed to create type');
    },
  });

  // Display label for current value
  const displayLabel = useMemo(() => {
    const found = allOptions.find((o) => o.value === value);
    return found?.label || value || '';
  }, [allOptions, value]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {displayLabel || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or type to create..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">
                  No types found.
                </CommandEmpty>
                {filteredOptions.length > 0 && (
                  <CommandGroup>
                    {filteredOptions.map((opt) => (
                      <CommandItem
                        key={opt.value}
                        value={opt.value}
                        onSelect={() => {
                          onChange(opt.value === value ? '' : opt.value);
                          setOpen(false);
                          setSearch('');
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === opt.value ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        {opt.label}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {canCreate && (
                  <>
                    {filteredOptions.length > 0 && <CommandSeparator />}
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => createType.mutate(search.trim())}
                        disabled={createType.isPending}
                      >
                        {createType.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Plus className="mr-2 h-4 w-4 text-primary" />
                        )}
                        <span className="text-primary font-medium">
                          Create "{search.trim()}"
                        </span>
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
