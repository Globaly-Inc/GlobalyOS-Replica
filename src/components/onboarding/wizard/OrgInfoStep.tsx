/**
 * Organization Onboarding - Organization Info Step
 * Pre-fills data from signup (country, industry, company_size) and adds Google Places address
 * Includes logo upload and country-based auto-detection for timezone/currency
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ArrowLeft, ArrowRight, Building2, Check, ChevronsUpDown } from 'lucide-react';
import { AddressAutocomplete, AddressComponents } from '@/components/ui/address-autocomplete';
import { LogoUpload } from './LogoUpload';
import { cn } from '@/lib/utils';
import { COUNTRIES, getFlagEmoji } from '@/lib/countries';

interface OrgInfoStepProps {
  initialData?: {
    name?: string;
    logo_url?: string;
    country?: string;
    timezone?: string;
    currency?: string;
    website?: string;
    industry?: string;
    company_size?: string;
    business_address?: string;
    business_address_components?: { [key: string]: string | number | boolean | null } | null;
  };
  // Data from organization record (for pre-filling signup data)
  signupData?: {
    country?: string;
    industry?: string;
    company_size?: string;
  };
  onSave: (data: Record<string, unknown>) => void;
  onBack: () => void;
  isSaving: boolean;
}

// COUNTRIES imported from @/lib/countries

const TIMEZONES = [
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Toronto', label: 'Toronto (ET)' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (ART)' },
  { value: 'America/Mexico_City', label: 'Mexico City (CST)' },
  { value: 'America/Bogota', label: 'Bogota (COT)' },
  { value: 'America/Lima', label: 'Lima (PET)' },
  { value: 'America/Santiago', label: 'Santiago (CLT)' },
  { value: 'America/Caracas', label: 'Caracas (VET)' },
  { value: 'Atlantic/Reykjavik', label: 'Reykjavik (GMT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Dublin', label: 'Dublin (GMT/IST)' },
  { value: 'Europe/Lisbon', label: 'Lisbon (WET)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Europe/Madrid', label: 'Madrid (CET)' },
  { value: 'Europe/Rome', label: 'Rome (CET)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
  { value: 'Europe/Brussels', label: 'Brussels (CET)' },
  { value: 'Europe/Zurich', label: 'Zurich (CET)' },
  { value: 'Europe/Vienna', label: 'Vienna (CET)' },
  { value: 'Europe/Stockholm', label: 'Stockholm (CET)' },
  { value: 'Europe/Oslo', label: 'Oslo (CET)' },
  { value: 'Europe/Copenhagen', label: 'Copenhagen (CET)' },
  { value: 'Europe/Helsinki', label: 'Helsinki (EET)' },
  { value: 'Europe/Warsaw', label: 'Warsaw (CET)' },
  { value: 'Europe/Prague', label: 'Prague (CET)' },
  { value: 'Europe/Budapest', label: 'Budapest (CET)' },
  { value: 'Europe/Bucharest', label: 'Bucharest (EET)' },
  { value: 'Europe/Athens', label: 'Athens (EET)' },
  { value: 'Europe/Istanbul', label: 'Istanbul (TRT)' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)' },
  { value: 'Europe/Kiev', label: 'Kyiv (EET)' },
  { value: 'Africa/Cairo', label: 'Cairo (EET)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
  { value: 'Africa/Lagos', label: 'Lagos (WAT)' },
  { value: 'Africa/Nairobi', label: 'Nairobi (EAT)' },
  { value: 'Africa/Casablanca', label: 'Casablanca (WET)' },
  { value: 'Asia/Jerusalem', label: 'Jerusalem (IST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Riyadh', label: 'Riyadh (AST)' },
  { value: 'Asia/Qatar', label: 'Qatar (AST)' },
  { value: 'Asia/Kuwait', label: 'Kuwait (AST)' },
  { value: 'Asia/Tehran', label: 'Tehran (IRST)' },
  { value: 'Asia/Karachi', label: 'Karachi (PKT)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Kathmandu', label: 'Kathmandu (NPT)' },
  { value: 'Asia/Dhaka', label: 'Dhaka (BST)' },
  { value: 'Asia/Bangkok', label: 'Bangkok (ICT)' },
  { value: 'Asia/Jakarta', label: 'Jakarta (WIB)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur (MYT)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Taipei', label: 'Taipei (CST)' },
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Manila', label: 'Manila (PHT)' },
  { value: 'Australia/Perth', label: 'Perth (AWST)' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST)' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
  { value: 'Pacific/Fiji', label: 'Fiji (FJT)' },
];

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar ($)' },
  { code: 'EUR', name: 'Euro (€)' },
  { code: 'GBP', name: 'British Pound (£)' },
  { code: 'CAD', name: 'Canadian Dollar (C$)' },
  { code: 'AUD', name: 'Australian Dollar (A$)' },
  { code: 'JPY', name: 'Japanese Yen (¥)' },
  { code: 'CHF', name: 'Swiss Franc (CHF)' },
  { code: 'SGD', name: 'Singapore Dollar (S$)' },
  { code: 'HKD', name: 'Hong Kong Dollar (HK$)' },
  { code: 'INR', name: 'Indian Rupee (₹)' },
  { code: 'AED', name: 'UAE Dirham (د.إ)' },
  { code: 'SAR', name: 'Saudi Riyal (﷼)' },
  { code: 'ZAR', name: 'South African Rand (R)' },
  { code: 'BRL', name: 'Brazilian Real (R$)' },
  { code: 'MXN', name: 'Mexican Peso ($)' },
  { code: 'NZD', name: 'New Zealand Dollar (NZ$)' },
  { code: 'SEK', name: 'Swedish Krona (kr)' },
  { code: 'NOK', name: 'Norwegian Krone (kr)' },
  { code: 'DKK', name: 'Danish Krone (kr)' },
  { code: 'PLN', name: 'Polish Złoty (zł)' },
  { code: 'CZK', name: 'Czech Koruna (Kč)' },
  { code: 'KRW', name: 'South Korean Won (₩)' },
];

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance & Banking',
  'Manufacturing',
  'Retail & E-commerce',
  'Education',
  'Professional Services',
  'Media & Entertainment',
  'Real Estate',
  'Non-profit',
  'Government',
  'Other',
];

// Country to timezone and currency mapping for auto-detection
const COUNTRY_DEFAULTS: Record<string, { timezone: string; currency: string }> = {
  'US': { timezone: 'America/New_York', currency: 'USD' },
  'GB': { timezone: 'Europe/London', currency: 'GBP' },
  'CA': { timezone: 'America/Toronto', currency: 'CAD' },
  'AU': { timezone: 'Australia/Sydney', currency: 'AUD' },
  'DE': { timezone: 'Europe/Berlin', currency: 'EUR' },
  'FR': { timezone: 'Europe/Paris', currency: 'EUR' },
  'ES': { timezone: 'Europe/Madrid', currency: 'EUR' },
  'IT': { timezone: 'Europe/Rome', currency: 'EUR' },
  'NL': { timezone: 'Europe/Amsterdam', currency: 'EUR' },
  'SE': { timezone: 'Europe/Stockholm', currency: 'SEK' },
  'NO': { timezone: 'Europe/Oslo', currency: 'NOK' },
  'DK': { timezone: 'Europe/Copenhagen', currency: 'DKK' },
  'FI': { timezone: 'Europe/Helsinki', currency: 'EUR' },
  'CH': { timezone: 'Europe/Zurich', currency: 'CHF' },
  'AT': { timezone: 'Europe/Vienna', currency: 'EUR' },
  'BE': { timezone: 'Europe/Brussels', currency: 'EUR' },
  'IE': { timezone: 'Europe/Dublin', currency: 'EUR' },
  'PT': { timezone: 'Europe/Lisbon', currency: 'EUR' },
  'PL': { timezone: 'Europe/Warsaw', currency: 'PLN' },
  'CZ': { timezone: 'Europe/Prague', currency: 'CZK' },
  'JP': { timezone: 'Asia/Tokyo', currency: 'JPY' },
  'KR': { timezone: 'Asia/Seoul', currency: 'KRW' },
  'SG': { timezone: 'Asia/Singapore', currency: 'SGD' },
  'HK': { timezone: 'Asia/Hong_Kong', currency: 'HKD' },
  'IN': { timezone: 'Asia/Kolkata', currency: 'INR' },
  'AE': { timezone: 'Asia/Dubai', currency: 'AED' },
  'SA': { timezone: 'Asia/Riyadh', currency: 'SAR' },
  'ZA': { timezone: 'Africa/Johannesburg', currency: 'ZAR' },
  'BR': { timezone: 'America/Sao_Paulo', currency: 'BRL' },
  'MX': { timezone: 'America/Mexico_City', currency: 'MXN' },
  'NZ': { timezone: 'Pacific/Auckland', currency: 'NZD' },
};

export function OrgInfoStep({ initialData, signupData, onSave, onBack, isSaving }: OrgInfoStepProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    logo_url: initialData?.logo_url || '',
    country: initialData?.country || signupData?.country || '',
    timezone: initialData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    currency: initialData?.currency || 'USD',
    website: initialData?.website || '',
    industry: initialData?.industry || signupData?.industry || '',
    company_size: initialData?.company_size || signupData?.company_size || '',
    business_address: initialData?.business_address || '',
    business_address_components: initialData?.business_address_components || null,
  });

  // Track if user has manually modified timezone/currency
  const [userModifiedTimezone, setUserModifiedTimezone] = useState(false);
  const [userModifiedCurrency, setUserModifiedCurrency] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);
  const [timezoneOpen, setTimezoneOpen] = useState(false);

  // Update form when signup data becomes available and apply auto-detection
  useEffect(() => {
    if (signupData) {
      setFormData((prev) => {
        const newCountry = prev.country || signupData.country || '';
        const defaults = COUNTRY_DEFAULTS[newCountry];
        
        return {
          ...prev,
          country: newCountry,
          industry: prev.industry || signupData.industry || '',
          company_size: prev.company_size || signupData.company_size || '',
          // Auto-set timezone and currency if country has defaults
          timezone: defaults?.timezone || prev.timezone,
          currency: defaults?.currency || prev.currency,
        };
      });
    }
  }, [signupData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Normalize website URL - add https:// if missing
    let normalizedWebsite = formData.website.trim();
    if (normalizedWebsite && !normalizedWebsite.match(/^https?:\/\//)) {
      normalizedWebsite = `https://${normalizedWebsite}`;
    }
    
    onSave({
      ...formData,
      website: normalizedWebsite,
    });
  };

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCountryChange = (countryCode: string) => {
    updateField('country', countryCode);
    
    const defaults = COUNTRY_DEFAULTS[countryCode];
    if (defaults) {
      // Only auto-fill if user hasn't manually changed these
      if (!userModifiedTimezone) {
        updateField('timezone', defaults.timezone);
      }
      if (!userModifiedCurrency) {
        updateField('currency', defaults.currency);
      }
    }
  };

  const handleTimezoneChange = (value: string) => {
    setUserModifiedTimezone(true);
    updateField('timezone', value);
  };

  const handleCurrencyChange = (value: string) => {
    setUserModifiedCurrency(true);
    updateField('currency', value);
  };

  const handleAddressChange = (address: string, components?: AddressComponents) => {
    // Convert AddressComponents to simple key-value object for storage
    const simpleComponents = components ? Object.entries(components).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = typeof value === 'object' ? JSON.stringify(value) : value;
      }
      return acc;
    }, {} as { [key: string]: string | number | boolean | null }) : null;
    
    setFormData((prev) => ({
      ...prev,
      business_address: address,
      business_address_components: simpleComponents,
    }));
  };

  const handleLogoChange = (url: string | null) => {
    updateField('logo_url', url || '');
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">Organization Information</CardTitle>
        <CardDescription>
          Tell us about your organization to personalize your experience
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Logo Upload */}
          <div className="pb-2">
            <LogoUpload
              currentLogoUrl={formData.logo_url}
              onLogoChange={handleLogoChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Organization Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Acme Corporation"
              required
            />
          </div>

          {/* Country, Timezone, Currency in same row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="country">Primary Country *</Label>
              <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={countryOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.country ? (
                      <span className="flex items-center gap-2">
                        <span>{getFlagEmoji(formData.country)}</span>
                        {COUNTRIES.find(c => c.code === formData.country)?.name}
                      </span>
                    ) : (
                      'Select country...'
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search country..." />
                    <CommandList className="max-h-[200px]">
                      <CommandEmpty>No country found.</CommandEmpty>
                      <CommandGroup>
                        {COUNTRIES.map((country) => (
                          <CommandItem
                            key={country.code}
                            value={country.name}
                            onSelect={() => {
                              handleCountryChange(country.code);
                              setCountryOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                formData.country === country.code ? 'opacity-100' : 'opacity-0'
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Default Timezone</Label>
              <Popover open={timezoneOpen} onOpenChange={setTimezoneOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={timezoneOpen}
                    className="w-full justify-between font-normal"
                  >
                    {formData.timezone ? (
                      TIMEZONES.find(tz => tz.value === formData.timezone)?.label || formData.timezone
                    ) : (
                      'Select timezone...'
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search timezone..." />
                    <CommandList className="max-h-[200px]">
                      <CommandEmpty>No timezone found.</CommandEmpty>
                      <CommandGroup>
                        {TIMEZONES.map((tz) => (
                          <CommandItem
                            key={tz.value}
                            value={tz.label}
                            onSelect={() => {
                              handleTimezoneChange(tz.value);
                              setTimezoneOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                formData.timezone === tz.value ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {tz.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Default Currency</Label>
              <Select
                value={formData.currency}
                onValueChange={handleCurrencyChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Business Address - after Country row */}
          <div className="space-y-2">
            <Label htmlFor="business_address">Business Address *</Label>
            <AddressAutocomplete
              value={formData.business_address}
              onChange={handleAddressChange}
              placeholder="Start typing your business address..."
              required
              countryCode={formData.country}
            />
            <p className="text-xs text-muted-foreground">
              Search for your office or business location
            </p>
          </div>

          {/* Industry and Website in same row - bottom */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Select
                value={formData.industry}
                onValueChange={(value) => updateField('industry', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website (optional)</Label>
              <Input
                id="website"
                type="text"
                value={formData.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="example.com"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving || !formData.name || !formData.country || !formData.business_address} 
              className="flex-1"
            >
              {isSaving ? 'Saving...' : 'Continue'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
