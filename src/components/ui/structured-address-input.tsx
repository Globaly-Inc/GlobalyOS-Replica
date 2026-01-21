/**
 * Structured Address Input Component
 * Single-row or two-row address input with country selector and street autocomplete
 * 
 * Default (singleRow=true): Country dropdown + Full Address (autocomplete shows full address minus country)
 * Expanded (singleRow=false): Country + Street + editable City/State/Postcode
 */

import { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CountrySelector } from '@/components/ui/country-selector';
import { AddressAutocomplete, type AddressComponents } from '@/components/ui/address-autocomplete';
import { cn } from '@/lib/utils';

export interface AddressValue {
  country: string;        // ISO 2-letter code
  street: string;         // In singleRow mode, this contains the full formatted address (minus country)
  city: string;
  state: string;
  postcode: string;
  lat?: number;
  lng?: number;
  place_id?: string;
  google_maps_url?: string;
}

export interface StructuredAddressInputProps {
  value: AddressValue;
  onChange: (address: AddressValue) => void;
  required?: boolean;
  disabled?: boolean;
  allowBusinesses?: boolean;
  className?: string;
  /** Hide labels for a more compact layout */
  compact?: boolean;
  /** Error state for street field */
  error?: boolean;
  /** Show only single row with full address (hides city/state/postcode row). Defaults to true. */
  singleRow?: boolean;
  /** Custom label for address field. Defaults to "Address". */
  addressLabel?: string;
}

// Empty address value for initialization
export const EMPTY_ADDRESS: AddressValue = {
  country: '',
  street: '',
  city: '',
  state: '',
  postcode: '',
};

export function StructuredAddressInput({
  value,
  onChange,
  required = false,
  disabled = false,
  allowBusinesses = false,
  className,
  compact = false,
  error = false,
  singleRow = true,
  addressLabel = 'Address',
}: StructuredAddressInputProps) {
  const isCountrySelected = !!value.country;
  const prevCountryRef = useRef(value.country);
  
  // Track when country changes to reset address fields
  useEffect(() => {
    if (prevCountryRef.current && value.country !== prevCountryRef.current) {
      // Country changed - reset address fields but keep country
      onChange({
        country: value.country,
        street: '',
        city: '',
        state: '',
        postcode: '',
      });
    }
    prevCountryRef.current = value.country;
  }, [value.country]);
  
  const handleCountryChange = (countryCode: string) => {
    onChange({
      ...value,
      country: countryCode,
    });
  };
  
  const handleAddressSelect = (address: string, components?: AddressComponents) => {
    if (components && components.formatted_address) {
      // Google autocomplete selection
      // For singleRow mode: show full formatted address minus country in the street field
      // This provides a complete display while still storing components internally
      let displayAddress: string;
      
      if (singleRow) {
        // Remove country from the end of formatted address for cleaner display
        displayAddress = components.formatted_address
          .replace(new RegExp(`,?\\s*${components.country}$`, 'i'), '')
          .trim();
      } else {
        // Traditional mode: just street number + route
        displayAddress = components.street_number 
          ? `${components.street_number} ${components.route || ''}`.trim()
          : components.route || address;
      }
      
      onChange({
        ...value,
        street: displayAddress,
        city: components.locality || '',
        state: components.administrative_area_level_1 || '',
        postcode: components.postal_code || '',
        lat: components.lat,
        lng: components.lng,
        place_id: components.place_id,
        google_maps_url: components.google_maps_url,
      });
    } else {
      // Manual input - just update the street field, clear geocoding data
      onChange({
        ...value,
        street: address,
        lat: undefined,
        lng: undefined,
        place_id: undefined,
        google_maps_url: undefined,
      });
    }
  };
  
  const handleFieldChange = (field: keyof AddressValue, newValue: string) => {
    onChange({ ...value, [field]: newValue });
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Row 1: Country + Address */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          {!compact && (
            <Label>
              Country {required && <span className="text-destructive">*</span>}
            </Label>
          )}
          <CountrySelector
            value={value.country}
            onChange={handleCountryChange}
            valueType="code"
            disabled={disabled}
            placeholder="Select country"
          />
        </div>
        <div className="sm:col-span-2 space-y-2">
          {!compact && (
            <Label>
              {addressLabel} {required && <span className="text-destructive">*</span>}
            </Label>
          )}
          <AddressAutocomplete
            value={value.street}
            onChange={handleAddressSelect}
            countryCode={value.country}
            disabled={disabled || !isCountrySelected}
            placeholder={isCountrySelected ? "Start typing your address..." : "Select a country first"}
            allowBusinesses={allowBusinesses}
            className={cn(error && 'border-destructive focus-visible:ring-destructive')}
          />
        </div>
      </div>
      
      {/* Row 2: City, State, Postcode - Only show if singleRow is false */}
      {!singleRow && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            {!compact && <Label>City</Label>}
            <Input
              value={value.city}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              disabled={disabled || !isCountrySelected}
              placeholder={isCountrySelected ? "City" : "—"}
            />
          </div>
          <div className="space-y-2">
            {!compact && <Label>State/Province</Label>}
            <Input
              value={value.state}
              onChange={(e) => handleFieldChange('state', e.target.value)}
              disabled={disabled || !isCountrySelected}
              placeholder={isCountrySelected ? "State" : "—"}
            />
          </div>
          <div className="space-y-2">
            {!compact && <Label>Postcode</Label>}
            <Input
              value={value.postcode}
              onChange={(e) => handleFieldChange('postcode', e.target.value)}
              disabled={disabled || !isCountrySelected}
              placeholder={isCountrySelected ? "Postcode" : "—"}
            />
          </div>
        </div>
      )}
    </div>
  );
}
