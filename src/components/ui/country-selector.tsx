/**
 * Reusable searchable country selector with flag emojis
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { COUNTRIES, getFlagEmoji, getCountryByCode, getCountryByName } from '@/lib/countries';

export interface CountrySelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  /** Whether the value should be stored as country code ('code') or country name ('name') */
  valueType?: 'code' | 'name';
  className?: string;
}

export function CountrySelector({
  value,
  onChange,
  placeholder = 'Select country',
  disabled = false,
  error = false,
  valueType = 'name',
  className,
}: CountrySelectorProps) {
  const [open, setOpen] = useState(false);

  // Find the selected country based on value type
  const selectedCountry = valueType === 'code' 
    ? getCountryByCode(value) 
    : getCountryByName(value);

  const handleSelect = (countryCode: string) => {
    const country = getCountryByCode(countryCode);
    if (country) {
      onChange(valueType === 'code' ? country.code : country.name);
    }
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            error && "border-destructive",
            !selectedCountry && "text-muted-foreground",
            className
          )}
        >
          {selectedCountry ? (
            <span className="flex items-center gap-2 truncate">
              <span>{getFlagEmoji(selectedCountry.code)}</span>
              <span className="truncate">{selectedCountry.name}</span>
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 z-50 bg-popover" align="start">
        <Command>
          <CommandInput placeholder="Search country..." className="h-9" />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup className="max-h-[200px] overflow-auto">
              {COUNTRIES.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.name}
                  onSelect={() => handleSelect(country.code)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedCountry?.code === country.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="mr-2">{getFlagEmoji(country.code)}</span>
                  {country.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
