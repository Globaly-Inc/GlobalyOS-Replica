/**
 * Searchable Timezone Selector with grouped regions
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
import { getTimezonesForCountry } from '@/utils/countryTimezones';

interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
}

interface TimezoneGroup {
  region: string;
  timezones: TimezoneOption[];
}

// Comprehensive timezone list grouped by region
const TIMEZONE_DATA: Record<string, string[]> = {
  'Australia & Pacific': [
    'Australia/Sydney',
    'Australia/Melbourne',
    'Australia/Brisbane',
    'Australia/Perth',
    'Australia/Adelaide',
    'Australia/Darwin',
    'Australia/Hobart',
    'Pacific/Auckland',
    'Pacific/Fiji',
    'Pacific/Guam',
    'Pacific/Honolulu',
  ],
  'Asia': [
    'Asia/Tokyo',
    'Asia/Seoul',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Singapore',
    'Asia/Kuala_Lumpur',
    'Asia/Bangkok',
    'Asia/Jakarta',
    'Asia/Manila',
    'Asia/Ho_Chi_Minh',
    'Asia/Kolkata',
    'Asia/Mumbai',
    'Asia/Kathmandu',
    'Asia/Dhaka',
    'Asia/Karachi',
    'Asia/Dubai',
    'Asia/Riyadh',
    'Asia/Jerusalem',
    'Asia/Tehran',
  ],
  'Europe': [
    'Europe/London',
    'Europe/Dublin',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Madrid',
    'Europe/Amsterdam',
    'Europe/Brussels',
    'Europe/Vienna',
    'Europe/Zurich',
    'Europe/Stockholm',
    'Europe/Oslo',
    'Europe/Copenhagen',
    'Europe/Helsinki',
    'Europe/Warsaw',
    'Europe/Prague',
    'Europe/Budapest',
    'Europe/Athens',
    'Europe/Istanbul',
    'Europe/Moscow',
  ],
  'Americas': [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'America/Toronto',
    'America/Vancouver',
    'America/Montreal',
    'America/Mexico_City',
    'America/Bogota',
    'America/Lima',
    'America/Santiago',
    'America/Sao_Paulo',
    'America/Buenos_Aires',
    'America/Caracas',
  ],
  'Africa & Middle East': [
    'Africa/Cairo',
    'Africa/Johannesburg',
    'Africa/Lagos',
    'Africa/Nairobi',
    'Africa/Casablanca',
    'Africa/Accra',
  ],
  'Other': [
    'UTC',
  ],
};

// Get offset string for a timezone
function getTimezoneOffset(tz: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find((p) => p.type === 'timeZoneName');
    return offsetPart?.value || '';
  } catch {
    return '';
  }
}

// Format timezone for display
function formatTimezoneCity(tz: string): string {
  const city = tz.split('/').pop()?.replace(/_/g, ' ') || tz;
  return city;
}

// Build timezone options with offsets
function buildTimezoneOptions(): TimezoneGroup[] {
  return Object.entries(TIMEZONE_DATA).map(([region, timezones]) => ({
    region,
    timezones: timezones.map(tz => ({
      value: tz,
      label: formatTimezoneCity(tz),
      offset: getTimezoneOffset(tz),
    })),
  }));
}

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
  const timezoneGroups = useMemo(() => {
    const baseGroups = buildTimezoneOptions();
    
    // If country code provided, add country-specific group at top
    if (countryCode) {
      const countryTimezones = getTimezonesForCountry(countryCode);
      if (countryTimezones.length > 0 && countryTimezones[0] !== 'UTC') {
        const countryGroup: TimezoneGroup = {
          region: 'Suggested',
          timezones: countryTimezones.map(tz => ({
            value: tz,
            label: formatTimezoneCity(tz),
            offset: getTimezoneOffset(tz),
          })),
        };
        return [countryGroup, ...baseGroups];
      }
    }
    
    return baseGroups;
  }, [countryCode]);

  // Filter timezones based on search
  const filteredGroups = useMemo(() => {
    if (!search) return timezoneGroups;
    
    const searchLower = search.toLowerCase();
    return timezoneGroups
      .map(group => ({
        ...group,
        timezones: group.timezones.filter(tz => 
          tz.value.toLowerCase().includes(searchLower) ||
          tz.label.toLowerCase().includes(searchLower) ||
          tz.offset.toLowerCase().includes(searchLower)
        ),
      }))
      .filter(group => group.timezones.length > 0);
  }, [timezoneGroups, search]);

  // Get display value
  const selectedTimezone = useMemo(() => {
    for (const group of timezoneGroups) {
      const found = group.timezones.find(tz => tz.value === value);
      if (found) return found;
    }
    // Fallback for timezones not in our list
    return { value, label: formatTimezoneCity(value), offset: getTimezoneOffset(value) };
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
            <Globe className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <span className="truncate">{selectedTimezone.label}</span>
            {selectedTimezone.offset && (
              <span className="text-xs text-muted-foreground">({selectedTimezone.offset})</span>
            )}
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search timezone..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[280px]">
            <CommandEmpty>No timezone found.</CommandEmpty>
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
                          'h-3.5 w-3.5',
                          value === tz.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span>{tz.label}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{tz.offset}</span>
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
