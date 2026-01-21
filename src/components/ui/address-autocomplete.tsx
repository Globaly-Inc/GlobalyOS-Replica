/**
 * Address Autocomplete Component using Google Places API
 * Fixed controlled input sync with Google Places Autocomplete
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export interface AddressComponents {
  street_number?: string;
  route?: string;
  locality?: string;
  administrative_area_level_1?: string;
  administrative_area_level_2?: string;
  country?: string;
  country_code?: string;
  postal_code?: string;
  formatted_address?: string;
  lat?: number;
  lng?: number;
  place_name?: string; // Business/place name if applicable
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, components?: AddressComponents) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  countryCode?: string; // ISO 3166-1 alpha-2 country code (e.g., 'AU', 'US')
  className?: string;
  allowBusinesses?: boolean; // Default true - set false for address-only search
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps?: () => void;
  }
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Start typing an address or business...',
  disabled = false,
  required = false,
  countryCode,
  className,
  allowBusinesses = true,
}: AddressAutocompleteProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [hasValidAddress, setHasValidAddress] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const isSelectingRef = useRef(false);
  const lastSelectedValueRef = useRef<string>('');
  const isPacSelectionPendingRef = useRef(false); // Track if PAC dropdown selection is pending

  // Handle Enter key to prevent form submission when autocomplete dropdown is open
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const pacContainer = document.querySelector('.pac-container');
      const isDropdownVisible = pacContainer && 
        window.getComputedStyle(pacContainer).display !== 'none' &&
        pacContainer.childNodes.length > 0;
      
      if (isDropdownVisible) {
        e.preventDefault();
        e.stopPropagation();
        isPacSelectionPendingRef.current = true;
      }
    }
  }, []);

  // Load Google Maps script
  const loadGoogleMapsScript = useCallback(async () => {
    if (window.google?.maps?.places) {
      setIsScriptLoaded(true);
      return;
    }

    if (document.getElementById('google-maps-script')) {
      // Script is loading, wait for it
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.places) {
          setIsScriptLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('get-google-maps-key');
      
      if (error || !data?.apiKey) {
        console.error('Failed to fetch Google Maps API key:', error);
        setIsLoading(false);
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=places&loading=async`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        setIsScriptLoaded(true);
        setIsLoading(false);
      };
      
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        setIsLoading(false);
      };

      document.head.appendChild(script);
    } catch (err) {
      console.error('Error loading Google Maps:', err);
      setIsLoading(false);
    }
  }, []);

  // Initialize autocomplete
  useEffect(() => {
    loadGoogleMapsScript();
  }, [loadGoogleMapsScript]);

  // Setup autocomplete when script is loaded
  useEffect(() => {
    if (!isScriptLoaded || !inputRef.current || !window.google?.maps?.places) {
      return;
    }

    // Clean up previous autocomplete
    if (listenerRef.current) {
      google.maps.event.removeListener(listenerRef.current);
    }

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      // Only restrict to addresses if allowBusinesses is explicitly false
      ...(allowBusinesses === false ? { types: ['address'] } : {}),
      fields: ['address_components', 'formatted_address', 'geometry', 'name'],
      componentRestrictions: countryCode ? { country: countryCode.toLowerCase() } : undefined,
    });

    listenerRef.current = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      
      if (!place?.address_components) {
        isPacSelectionPendingRef.current = false;
        return;
      }

      isSelectingRef.current = true;
      isPacSelectionPendingRef.current = false;

      const components: AddressComponents = {
        formatted_address: place.formatted_address,
        lat: place.geometry?.location?.lat(),
        lng: place.geometry?.location?.lng(),
        place_name: place.name,
      };

      // Parse address components
      place.address_components.forEach((component) => {
        const type = component.types[0];
        switch (type) {
          case 'street_number':
            components.street_number = component.long_name;
            break;
          case 'route':
            components.route = component.long_name;
            break;
          case 'locality':
            components.locality = component.long_name;
            break;
          case 'administrative_area_level_1':
            components.administrative_area_level_1 = component.long_name;
            break;
          case 'administrative_area_level_2':
            components.administrative_area_level_2 = component.long_name;
            break;
          case 'country':
            components.country = component.long_name;
            components.country_code = component.short_name;
            break;
          case 'postal_code':
            components.postal_code = component.long_name;
            break;
        }
      });

      const formattedAddress = place.formatted_address || '';
      lastSelectedValueRef.current = formattedAddress;
      setHasValidAddress(true);
      
      // Force update the input value immediately to sync with Google's selection
      if (inputRef.current) {
        inputRef.current.value = formattedAddress;
      }
      
      // Call onChange with the formatted address and all components
      onChange(formattedAddress, components);
      
      // Reset selecting flag after a short delay
      setTimeout(() => {
        isSelectingRef.current = false;
      }, 150);
    });

    return () => {
      if (listenerRef.current) {
        google.maps.event.removeListener(listenerRef.current);
      }
    };
  }, [isScriptLoaded, onChange, countryCode, allowBusinesses]);

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // If user is manually typing (not selecting from dropdown)
    if (!isSelectingRef.current) {
      setHasValidAddress(false);
      lastSelectedValueRef.current = '';
      onChange(newValue); // No components when typing manually
    }
  };

  // Determine if the current value matches a previously selected address
  useEffect(() => {
    if (value && lastSelectedValueRef.current === value) {
      setHasValidAddress(true);
    } else if (!value) {
      setHasValidAddress(false);
    }
  }, [value]);

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        required={required}
        className={cn(
          "pl-9 pr-9",
          hasValidAddress && "border-success focus-visible:ring-success",
          className
        )}
      />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {!isLoading && hasValidAddress && (
        <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
      )}
    </div>
  );
}
