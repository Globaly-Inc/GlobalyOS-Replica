/**
 * Organization Onboarding - Organization Info Step
 * Collects organization details with Google Places address autocomplete
 * Includes logo upload and legal business details
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { 
  ArrowLeft, ArrowRight, Building2, Check, ChevronsUpDown,
  // Category icons
  Monitor, Scale, GraduationCap, Plane, Heart, Landmark, 
  Home, ShoppingCart, Factory, Palette, Hotel, Users,
  Leaf, Zap, Phone, Truck, Trophy, Church, HelpCircle,
  Briefcase, BookOpen, Stethoscope, DollarSign, Building, 
  Megaphone, Utensils, Calendar, Code, Shield, Database
} from 'lucide-react';
import { AddressAutocomplete, AddressComponents } from '@/components/ui/address-autocomplete';
import { LogoUpload } from './LogoUpload';
import { cn } from '@/lib/utils';


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
  };
  onSave: (data: Record<string, unknown>) => void;
  onBack: () => void;
  isSaving: boolean;
}


const BUSINESS_CATEGORIES = [
  // Technology & IT
  { value: 'Technology', label: 'Technology', icon: Monitor },
  { value: 'IT Services & Consulting', label: 'IT Services & Consulting', icon: Monitor },
  { value: 'Software Development', label: 'Software Development', icon: Code },
  { value: 'Cybersecurity', label: 'Cybersecurity', icon: Shield },
  { value: 'Data & Analytics', label: 'Data & Analytics', icon: Database },
  
  // Professional Services
  { value: 'Professional Services', label: 'Professional Services', icon: Briefcase },
  { value: 'Legal Firm', label: 'Legal Firm', icon: Scale },
  { value: 'Tax & Accounting Firm', label: 'Tax & Accounting Firm', icon: DollarSign },
  { value: 'Management Consulting', label: 'Management Consulting', icon: Briefcase },
  { value: 'HR Consulting', label: 'HR Consulting', icon: Users },
  { value: 'Business Consulting', label: 'Business Consulting', icon: Briefcase },
  
  // Education
  { value: 'Education', label: 'Education', icon: GraduationCap },
  { value: 'Education Consultancy', label: 'Education Consultancy', icon: GraduationCap },
  { value: 'Training & Coaching', label: 'Training & Coaching', icon: BookOpen },
  { value: 'E-Learning', label: 'E-Learning', icon: Monitor },
  
  // Immigration & Legal
  { value: 'Migration Agency', label: 'Migration Agency', icon: Plane },
  { value: 'Immigration Services', label: 'Immigration Services', icon: Plane },
  
  // Healthcare
  { value: 'Healthcare', label: 'Healthcare', icon: Heart },
  { value: 'Medical Practice', label: 'Medical Practice', icon: Stethoscope },
  { value: 'Dental Practice', label: 'Dental Practice', icon: Heart },
  { value: 'Allied Health Services', label: 'Allied Health Services', icon: Heart },
  { value: 'Pharmacy', label: 'Pharmacy', icon: Heart },
  { value: 'Mental Health Services', label: 'Mental Health Services', icon: Heart },
  
  // Finance
  { value: 'Finance & Banking', label: 'Finance & Banking', icon: Landmark },
  { value: 'Insurance', label: 'Insurance', icon: Shield },
  { value: 'Financial Advisory', label: 'Financial Advisory', icon: DollarSign },
  { value: 'Wealth Management', label: 'Wealth Management', icon: DollarSign },
  { value: 'Fintech', label: 'Fintech', icon: Landmark },
  
  // Real Estate & Property
  { value: 'Real Estate', label: 'Real Estate', icon: Home },
  { value: 'Property Management', label: 'Property Management', icon: Building },
  { value: 'Construction', label: 'Construction', icon: Building },
  { value: 'Architecture & Design', label: 'Architecture & Design', icon: Palette },
  
  // Retail & Commerce
  { value: 'Retail & E-commerce', label: 'Retail & E-commerce', icon: ShoppingCart },
  { value: 'Wholesale & Distribution', label: 'Wholesale & Distribution', icon: ShoppingCart },
  
  // Manufacturing & Industry
  { value: 'Manufacturing', label: 'Manufacturing', icon: Factory },
  { value: 'Logistics & Supply Chain', label: 'Logistics & Supply Chain', icon: Truck },
  { value: 'Automotive', label: 'Automotive', icon: Truck },
  
  // Creative & Media
  { value: 'Media & Entertainment', label: 'Media & Entertainment', icon: Palette },
  { value: 'Advertising & Marketing', label: 'Advertising & Marketing', icon: Megaphone },
  { value: 'Design Agency', label: 'Design Agency', icon: Palette },
  { value: 'Digital Marketing', label: 'Digital Marketing', icon: Megaphone },
  
  // Hospitality & Travel
  { value: 'Hospitality', label: 'Hospitality', icon: Hotel },
  { value: 'Travel & Tourism', label: 'Travel & Tourism', icon: Plane },
  { value: 'Food & Beverage', label: 'Food & Beverage', icon: Utensils },
  { value: 'Event Management', label: 'Event Management', icon: Calendar },
  
  // Other Sectors
  { value: 'Non-profit', label: 'Non-profit', icon: Users },
  { value: 'Government', label: 'Government', icon: Landmark },
  { value: 'Agriculture', label: 'Agriculture', icon: Leaf },
  { value: 'Energy & Utilities', label: 'Energy & Utilities', icon: Zap },
  { value: 'Telecommunications', label: 'Telecommunications', icon: Phone },
  { value: 'Transportation', label: 'Transportation', icon: Truck },
  { value: 'Sports & Recreation', label: 'Sports & Recreation', icon: Trophy },
  { value: 'Religious Organization', label: 'Religious Organization', icon: Church },
  { value: 'Other', label: 'Other', icon: HelpCircle },
];

// COUNTRY_DEFAULTS removed - country derived from address

export function OrgInfoStep({ initialData, signupData, onSave, onBack, isSaving }: OrgInfoStepProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    logo_url: initialData?.logo_url || '',
    website: initialData?.website || '',
    industry: initialData?.industry || signupData?.industry || '',
    company_size: initialData?.company_size || signupData?.company_size || '',
    business_address: initialData?.business_address || '',
    business_address_components: initialData?.business_address_components || null,
    legal_business_name: initialData?.legal_business_name || '',
    business_registration_number: initialData?.business_registration_number || '',
  });

  const [businessCategoryOpen, setBusinessCategoryOpen] = useState(false);

  // Update form when signup data becomes available
  useEffect(() => {
    if (signupData) {
      setFormData((prev) => ({
        ...prev,
        industry: prev.industry || signupData.industry || '',
        company_size: prev.company_size || signupData.company_size || '',
      }));
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

          {/* Business Address */}
          <div className="space-y-2">
            <Label htmlFor="business_address">Business Address *</Label>
            <AddressAutocomplete
              value={formData.business_address}
              onChange={handleAddressChange}
              placeholder="Start typing your business address..."
              required
            />
            <p className="text-xs text-muted-foreground">
              Search for your office or business location
            </p>
          </div>

          {/* Legal Business Details - After Address */}
          <div className="grid grid-cols-2 gap-4">
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

          {/* Business Category and Website in same row - bottom */}
          <div className="grid grid-cols-2 gap-4">
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
              disabled={isSaving || !formData.name || !formData.business_address || !formData.legal_business_name} 
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
