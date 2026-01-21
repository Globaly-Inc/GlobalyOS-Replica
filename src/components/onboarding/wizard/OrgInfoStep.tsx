/**
 * Organization Onboarding - Organization Info Step
 * Collects organization details with structured address input
 * Includes logo upload and legal business details
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ArrowLeft, ArrowRight, Building2, Check, ChevronsUpDown } from 'lucide-react';
import { StructuredAddressInput, type AddressValue, EMPTY_ADDRESS } from '@/components/ui/structured-address-input';
import { LogoUpload } from './LogoUpload';
import { cn } from '@/lib/utils';
import { BUSINESS_CATEGORIES } from '@/constants/businessCategories';


interface OrgInfoStepProps {
  initialData?: {
    name?: string;
    logo_url?: string;
    website?: string;
    industry?: string;
    company_size?: string;
    business_address?: string;
    business_address_components?: { [key: string]: string | number | boolean | null } | null;
    legal_business_name?: string;
    business_registration_number?: string;
  };
  // Data from organization record (for pre-filling signup data)
  signupData?: {
    country?: string;
    industry?: string;
    company_size?: string;
    business_address?: string;
    business_address_components?: { [key: string]: string | number | boolean | null } | null;
  };
  onSave: (data: Record<string, unknown>) => void;
  onBack: () => void;
  isSaving: boolean;
}

// Helper to extract address value from stored components
const extractAddressValue = (
  address?: string,
  components?: { [key: string]: string | number | boolean | null } | null
): AddressValue => {
  if (!components) return EMPTY_ADDRESS;
  return {
    country: (components.country_code as string) || '',
    street: (components.route as string) || '',
    city: (components.locality as string) || '',
    state: (components.administrative_area_level_1 as string) || '',
    postcode: (components.postal_code as string) || '',
    lat: components.lat as number | undefined,
    lng: components.lng as number | undefined,
    place_id: components.place_id as string | undefined,
    google_maps_url: components.google_maps_url as string | undefined,
  };
};

export function OrgInfoStep({ initialData, signupData, onSave, onBack, isSaving }: OrgInfoStepProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    logo_url: initialData?.logo_url || '',
    website: initialData?.website || '',
    industry: initialData?.industry || signupData?.industry || '',
    company_size: initialData?.company_size || signupData?.company_size || '',
    legal_business_name: initialData?.legal_business_name || '',
    business_registration_number: initialData?.business_registration_number || '',
  });

  const [addressValue, setAddressValue] = useState<AddressValue>(
    extractAddressValue(initialData?.business_address, initialData?.business_address_components) ||
    extractAddressValue(signupData?.business_address, signupData?.business_address_components) ||
    EMPTY_ADDRESS
  );

  const [businessCategoryOpen, setBusinessCategoryOpen] = useState(false);

  // Update form when signup data becomes available
  useEffect(() => {
    if (signupData) {
      setFormData((prev) => ({
        ...prev,
        industry: prev.industry || signupData.industry || '',
        company_size: prev.company_size || signupData.company_size || '',
      }));
      if (!addressValue.country && signupData.business_address_components) {
        setAddressValue(extractAddressValue(signupData.business_address, signupData.business_address_components));
      }
    }
  }, [signupData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Normalize website URL - add https:// if missing
    let normalizedWebsite = formData.website.trim();
    if (normalizedWebsite && !normalizedWebsite.match(/^https?:\/\//)) {
      normalizedWebsite = `https://${normalizedWebsite}`;
    }
    
    // Build address components for storage
    const business_address = [addressValue.street, addressValue.city, addressValue.state, addressValue.postcode].filter(Boolean).join(', ');
    const business_address_components = {
      country_code: addressValue.country,
      country: addressValue.country, // Will be resolved to name elsewhere
      route: addressValue.street,
      locality: addressValue.city,
      administrative_area_level_1: addressValue.state,
      postal_code: addressValue.postcode,
      lat: addressValue.lat,
      lng: addressValue.lng,
      place_id: addressValue.place_id,
      google_maps_url: addressValue.google_maps_url,
      formatted_address: business_address,
    };
    
    onSave({
      ...formData,
      website: normalizedWebsite,
      business_address,
      business_address_components,
    });
  };

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = (url: string | null) => {
    updateField('logo_url', url || '');
  };

  const hasValidAddress = !!(addressValue.country && addressValue.street);

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

          {/* Row 2: Trading Business Name + Legal Business Name */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Trading Business Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Acme Corporation"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="legal_business_name">Legal Business Name *</Label>
              <Input
                id="legal_business_name"
                value={formData.legal_business_name}
                onChange={(e) => updateField('legal_business_name', e.target.value)}
                placeholder="Legal entity name"
                required
              />
            </div>
          </div>

          {/* Row 3: Business Address */}
          <div className="space-y-2">
            <Label>Business Address *</Label>
            <StructuredAddressInput
              value={addressValue}
              onChange={setAddressValue}
              required
              allowBusinesses
            />
          </div>

          {/* Row 4: Website + Business Registration Number */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website">Website <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="website"
                type="text"
                value={formData.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="business_registration_number">
                Business Registration Number
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </Label>
              <Input
                id="business_registration_number"
                value={formData.business_registration_number}
                onChange={(e) => updateField('business_registration_number', e.target.value)}
                placeholder="e.g., ABN, EIN, CRN"
              />
            </div>
          </div>

          {/* Row 5: Business Category (full width) */}
          <div className="space-y-2">
            <Label htmlFor="industry">Business Category</Label>
            <Popover open={businessCategoryOpen} onOpenChange={setBusinessCategoryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={businessCategoryOpen}
                  className="w-full justify-between font-normal"
                >
                  {formData.industry ? (
                    <span className="flex items-center gap-2">
                      {(() => {
                        const category = BUSINESS_CATEGORIES.find(c => c.value === formData.industry);
                        const IconComponent = category?.icon;
                        return IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground" />;
                      })()}
                      {BUSINESS_CATEGORIES.find(c => c.value === formData.industry)?.label || formData.industry}
                    </span>
                  ) : (
                    'Select category...'
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search category..." />
                  <CommandList className="max-h-[250px]">
                    <CommandEmpty>No category found.</CommandEmpty>
                    <CommandGroup>
                      {BUSINESS_CATEGORIES.map((category) => {
                        const IconComponent = category.icon;
                        return (
                          <CommandItem
                            key={category.value}
                            value={category.label}
                            onSelect={() => {
                              updateField('industry', category.value);
                              setBusinessCategoryOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                formData.industry === category.value ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            <IconComponent className="mr-2 h-4 w-4 text-muted-foreground" />
                            {category.label}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack} disabled={isSaving} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving || !formData.name || !hasValidAddress || !formData.legal_business_name} 
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
