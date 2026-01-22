/**
 * Searchable Timezone Selector with grouped regions and country flags
 * Uses centralized timezone database for consistency across the app
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, ChevronsUpDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TIMEZONE_DATABASE,
  getTimezoneOffset,
  getTimezonesByRegion,
  getTimezonesForCountry,
  searchTimezones,
  type TimezoneOption,
  type TimezoneGroup,
} from '@/constants/timezones';
import { getFlagEmoji } from '@/lib/countries';

interface TimezoneSelectorProps {
  value: string;
  onChange: (timezone: string) => void;
  disabled?: boolean;
  countryCode?: string; // If provided, prioritizes timezones for this country
  placeholder?: string;
  className?: string;
}

export function TimezoneSelector({
  value,
  onChange,
  disabled = false,
  countryCode,
  placeholder = 'Select timezone...',
  className,
}: TimezoneSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Build timezone groups with priority for country-specific timezones
  const baseGroups = useMemo(() => getTimezonesByRegion(), []);

  // Get groups with optional country priority
  const timezoneGroups = useMemo(() => {
    if (countryCode) {
      const countryTimezones = getTimezonesForCountry(countryCode);
      if (countryTimezones.length > 0) {
        const countryGroup: TimezoneGroup = {
          region: 'Suggested',
          timezones: countryTimezones.map(tz => ({
            value: tz.timezone,
            label: tz.city,
            offset: getTimezoneOffset(tz.timezone),
            flag: tz.countryCode ? getFlagEmoji(tz.countryCode) : '',
            countryCode: tz.countryCode,
          })),
        };
        return [countryGroup, ...baseGroups];
      }
    }
    return baseGroups;
  }, [countryCode, baseGroups]);

  // Filter timezones based on search using centralized search function
  const filteredGroups = useMemo(() => {
    if (!search) return timezoneGroups;
    
    const searchResults = searchTimezones(search);
    const searchResultSet = new Set(searchResults.map(r => r.timezone));
    
    return timezoneGroups
      .map(group => ({
        ...group,
        timezones: group.timezones.filter(tz => searchResultSet.has(tz.value)),
      }))
      .filter(group => group.timezones.length > 0);
  }, [timezoneGroups, search]);

  // Get selected timezone display info
  const selectedTimezone = useMemo((): TimezoneOption => {
    // First check in our groups
    for (const group of timezoneGroups) {
      const found = group.timezones.find(tz => tz.value === value);
      if (found) return found;
    }
    
    // Fallback: look up in database
    const dbEntry = TIMEZONE_DATABASE.find(tz => tz.timezone === value);
    if (dbEntry) {
      return {
        value: dbEntry.timezone,
        label: dbEntry.city,
        offset: getTimezoneOffset(dbEntry.timezone),
        flag: dbEntry.countryCode ? getFlagEmoji(dbEntry.countryCode) : '',
        countryCode: dbEntry.countryCode,
      };
    }
    
    // Ultimate fallback for unknown timezones
    const city = value.split('/').pop()?.replace(/_/g, ' ') || value;
    return {
      value,
      label: city,
      offset: getTimezoneOffset(value),
      flag: '',
      countryCode: '',
    };
  }, [value, timezoneGroups]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('h-8 justify-between text-sm font-normal', className)}
        >
          <span className="flex items-center gap-1.5 truncate">
            {selectedTimezone.flag ? (
              <span className="text-sm flex-shrink-0">{selectedTimezone.flag}</span>
            ) : (
              <Globe className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">{selectedTimezone.label}</span>
            {selectedTimezone.offset && (
              <span className="text-xs text-muted-foreground">({selectedTimezone.offset})</span>
            )}
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search by city, country, or timezone..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No timezone found. Try searching by country or city name.</CommandEmpty>
            {filteredGroups.map((group) => (
              <CommandGroup key={group.region} heading={group.region}>
                {group.timezones.map((tz) => (
                  <CommandItem
                    key={`${group.region}-${tz.value}`}
                    value={tz.value}
                    onSelect={() => {
                      onChange(tz.value);
                      setOpen(false);
                      setSearch('');
                    }}
                    className="flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Check
                        className={cn(
                          'h-3.5 w-3.5 flex-shrink-0',
                          value === tz.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      {tz.flag && <span className="text-sm">{tz.flag}</span>}
                      <span>{tz.label}</span>
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">{tz.offset}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
