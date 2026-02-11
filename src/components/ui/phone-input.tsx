/**
 * Reusable phone number input with country code selector
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PHONE_COUNTRIES, getPhoneCountry, getPhoneCountryFlag } from '@/lib/phoneCountries';

export interface PhoneInputProps {
  countryCode: string;
  onCountryChange: (code: string) => void;
  phone: string;
  onPhoneChange: (phone: string) => void;
  required?: boolean;
  error?: boolean;
  disabled?: boolean;
}

export function PhoneInput({
  countryCode,
  onCountryChange,
  phone,
  onPhoneChange,
  required = false,
  error = false,
  disabled = false,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const selected = getPhoneCountry(countryCode);

  return (
    <div className="flex gap-2">
      {/* Country code selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              'w-[110px] shrink-0 justify-between font-normal px-2',
              error && 'border-destructive',
            )}
          >
            <span className="flex items-center gap-1 truncate text-sm">
              <span>{selected ? getPhoneCountryFlag(selected.code) : ''}</span>
              <span>{selected?.dialCode || '+1'}</span>
            </span>
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-0 z-50 bg-popover" align="start">
          <Command>
            <CommandInput placeholder="Search country or code..." className="h-9" />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup className="max-h-[200px] overflow-auto">
                {PHONE_COUNTRIES.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={`${country.name} ${country.dialCode}`}
                    onSelect={() => {
                      onCountryChange(country.code);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        countryCode === country.code ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="mr-2">{getPhoneCountryFlag(country.code)}</span>
                    <span className="truncate flex-1">{country.name}</span>
                    <span className="ml-auto text-muted-foreground text-xs">{country.dialCode}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Phone number input */}
      <Input
        type="tel"
        value={phone}
        onChange={(e) => onPhoneChange(e.target.value)}
        placeholder={selected?.format || 'Phone number'}
        required={required}
        disabled={disabled}
        className={cn('flex-1', error && 'border-destructive')}
      />
    </div>
  );
}
