/**
 * Google Places Autocomplete component
 * Handles address input with Google Places suggestions
 * Supports both addresses and establishments/businesses
 * Uses uncontrolled input pattern to prevent React/Google DOM conflicts
 * 
 * Features:
 * - Keyboard navigation (Arrow keys + Enter work properly)
 * - Business/establishment search (finds places like "GlobalyHub")
 * - Captures place_id and google_maps_url for map features
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
  place_name?: string;
  place_id?: string;
  google_maps_url?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, components?: AddressComponents) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  countryCode?: string;
  className?: string;
  allowBusinesses?: boolean;
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMaps?: () => void;
  }
}

let googleMapsPromise: Promise<void> | null = null;

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
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const isSelectingRef = useRef(false);
  const lastSelectedAddressRef = useRef<string>('');
  // Store onChange in a ref to avoid recreating the useEffect on every render
  const onChangeRef = useRef(onChange);
  const instanceIdRef = useRef(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(false);

  // Keep the ref updated with latest onChange
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Check if current value matches a previously selected address
  useEffect(() => {
    if (value && lastSelectedAddressRef.current && value === lastSelectedAddressRef.current) {
      setIsValid(true);
    } else if (!value) {
      setIsValid(false);
      lastSelectedAddressRef.current = '';
    }
  }, [value]);

  // Sync external value changes to input (uncontrolled pattern)
  useEffect(() => {
    if (inputRef.current && !isSelectingRef.current) {
      // Only sync if the value differs to avoid cursor issues
      if (inputRef.current.value !== value) {
        inputRef.current.value = value;
      }
    }
  }, [value]);

  // Handle keyboard interactions - allow Google's autocomplete to handle navigation
  // CRITICAL: Prevent Enter from bubbling to form when PAC dropdown is visible
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const pacContainer = document.querySelector('.pac-container:not([style*="display: none"])');
      const pacItems = pacContainer?.querySelectorAll('.pac-item');
      
      if (pacContainer && pacItems && pacItems.length > 0) {
        // CRITICAL: Prevent form submission while PAC dropdown is open
        e.preventDefault();
        e.stopPropagation();
        
        // Check if any item is already highlighted
        const hasHighlighted = pacContainer.querySelector('.pac-item-selected');
        
        if (!hasHighlighted) {
          // Simulate ArrowDown to highlight first item, then Enter to select
          const downEvent = new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            code: 'ArrowDown',
            keyCode: 40,
            which: 40,
            bubbles: true,
            cancelable: true,
          });
          inputRef.current?.dispatchEvent(downEvent);
        }
        
        // Give Google's widget time to highlight, then trigger selection
        setTimeout(() => {
          const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          });
          inputRef.current?.dispatchEvent(enterEvent);
        }, 50);
      }
    }
  }, []);

  // Load Google Maps API and initialize autocomplete
  // Re-initialize when countryCode changes (NOT onChange - that's in a ref)
  useEffect(() => {
    let isMounted = true;
    const currentInstance = ++instanceIdRef.current;
    
    const loadAndInit = async () => {
      try {
        // Load Google Maps script if not already loaded
        if (!window.google?.maps?.places) {
          if (!googleMapsPromise) {
            googleMapsPromise = new Promise<void>(async (resolve, reject) => {
              try {
                const { data, error } = await supabase.functions.invoke('get-google-maps-key');
                if (error || !data?.apiKey) {
                  console.error('Failed to get Google Maps key:', error);
                  reject(new Error('Failed to load Google Maps key'));
                  return;
                }
                
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${data.apiKey}&libraries=places`;
                script.async = true;
                script.defer = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Failed to load Google Maps script'));
                document.head.appendChild(script);
              } catch (err) {
                reject(err);
              }
            });
          }
          await googleMapsPromise;
        }
        
        // Check if this instance is still current
        if (!isMounted || currentInstance !== instanceIdRef.current) return;
        
        // Clean up previous autocomplete instance if exists
        if (autocompleteRef.current) {
          google.maps.event.clearInstanceListeners(autocompleteRef.current);
          autocompleteRef.current = null;
        }
        
        // Initialize autocomplete
        if (inputRef.current && window.google?.maps?.places) {
          // Use establishment + geocode types for comprehensive results
          // This finds both addresses AND businesses like "GlobalyHub"
          autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
            types: allowBusinesses ? ['establishment', 'geocode'] : ['address'],
            fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id', 'url'],
            componentRestrictions: countryCode ? { country: countryCode.toLowerCase() } : undefined,
          });

          autocompleteRef.current.addListener('place_changed', () => {
            const place = autocompleteRef.current?.getPlace();
            if (!place) return;
            
            isSelectingRef.current = true;

            const components: AddressComponents = {
              formatted_address: place.formatted_address,
              lat: place.geometry?.location?.lat(),
              lng: place.geometry?.location?.lng(),
              place_name: place.name,
              place_id: place.place_id,
              google_maps_url: place.url,
            };

            place.address_components?.forEach((component) => {
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

            // Use place name for businesses, formatted address for regular addresses
            const formattedAddress = place.name && place.formatted_address && !place.formatted_address.startsWith(place.name)
              ? `${place.name}, ${place.formatted_address}`
              : place.formatted_address || place.name || '';
            
            // Force update the input value to match what Google selected
            if (inputRef.current) {
              inputRef.current.value = formattedAddress;
            }
            
            // Track this as a valid selected address
            lastSelectedAddressRef.current = formattedAddress;
            setIsValid(true);
            
            // Use the ref to call onChange - this is the key fix!
            onChangeRef.current(formattedAddress, components);
            
            // Clear the selecting flag after a short delay
            setTimeout(() => {
              isSelectingRef.current = false;
            }, 100);
          });
        }
        
        if (isMounted && currentInstance === instanceIdRef.current) {
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error initializing Google Places:', err);
        if (isMounted && currentInstance === instanceIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadAndInit();

    return () => {
      isMounted = false;
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
        autocompleteRef.current = null;
      }
    };
  }, [countryCode, allowBusinesses]); // Removed onChange - now using ref

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // When user types, mark as not selected/valid
    if (newValue !== lastSelectedAddressRef.current) {
      setIsValid(false);
    }
    // Use the ref to call onChange
    onChangeRef.current(newValue);
  }, []);

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        defaultValue={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        required={required}
        className={cn(
          'pl-9 pr-10',
          isValid && 'border-success focus-visible:ring-success',
          className
        )}
        autoComplete="off"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : isValid ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : null}
      </div>
    </div>
  );
}
