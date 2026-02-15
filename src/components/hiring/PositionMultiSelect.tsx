/**
 * Multi-select positions dropdown for assignment templates
 */

import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { usePositions } from '@/hooks/usePositions';
import { Loader2 } from 'lucide-react';

interface PositionMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PositionMultiSelect({
  value,
  onChange,
  placeholder = 'Select positions...',
  disabled = false,
}: PositionMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: positions = [], isLoading } = usePositions();

  const filteredPositions = useMemo(() => {
    if (!search) return positions;
    const searchLower = search.toLowerCase();
    return positions.filter(p => p.name.toLowerCase().includes(searchLower));
  }, [positions, search]);

  const selectedPositions = useMemo(
    () => positions.filter(p => value.includes(p.id)),
    [positions, value]
  );

  const togglePosition = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter(v => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const removePosition = (id: string) => {
    onChange(value.filter(v => v !== id));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            {value.length > 0
              ? `${value.length} position${value.length > 1 ? 's' : ''} selected`
              : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search positions..."
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
                    No positions found. Add positions in Organization Settings.
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredPositions.map((position) => (
                      <CommandItem
                        key={position.id}
                        value={position.id}
                        onSelect={() => togglePosition(position.id)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value.includes(position.id) ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {position.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedPositions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedPositions.map((position) => (
            <Badge key={position.id} variant="secondary" className="text-xs gap-1">
              {position.name}
              <button
                type="button"
                onClick={() => removePosition(position.id)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
