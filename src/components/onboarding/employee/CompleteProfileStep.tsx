/**
 * Employee Onboarding - Complete Profile Step
 * Collect all required personal details including emergency contact
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, ArrowLeft, User, Home, Phone, Linkedin, AlertCircle, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddressAutocomplete, type AddressComponents } from '@/components/ui/address-autocomplete';

interface CompleteProfileStepProps {
  employeeId: string;
  initialData?: {
    personal_email?: string;
    phone?: string;
    date_of_birth?: string;
    gender?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postcode?: string;
      country?: string;
    };
    emergency_contact?: {
      name?: string;
      relationship?: string;
      phone?: string;
    };
    linkedin_url?: string;
    skills?: string[];
  };
  prefillData?: { 
    full_name?: string; 
    email?: string;
  };
  onSave: (data: ProfileFormData) => void;
  onBack?: () => void;
  isSaving: boolean;
}

export interface ProfileFormData {
  personal_email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  home_address: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  linkedin_url: string;
}

const RELATIONSHIP_OPTIONS = [
  'Spouse',
  'Parent',
  'Sibling',
  'Partner',
  'Friend',
  'Other',
];

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

export function CompleteProfileStep({ 
  initialData, 
  prefillData, 
  onSave, 
  onBack,
  isSaving 
}: CompleteProfileStepProps) {
  // Build initial home_address from existing address components
  const buildInitialAddress = () => {
    if (!initialData?.address) return '';
    const { street, city, state, postcode, country } = initialData.address;
    const parts = [street, city, state, postcode, country].filter(Boolean);
    return parts.join(', ');
  };

  const [formData, setFormData] = useState<ProfileFormData>({
    personal_email: initialData?.personal_email || '',
    phone: initialData?.phone || '',
    date_of_birth: initialData?.date_of_birth || '',
    gender: initialData?.gender || '',
    street: initialData?.address?.street || '',
    city: initialData?.address?.city || '',
    state: initialData?.address?.state || '',
    postcode: initialData?.address?.postcode || '',
    country: initialData?.address?.country || '',
    home_address: buildInitialAddress(),
    emergency_contact_name: initialData?.emergency_contact?.name || '',
    emergency_contact_relationship: initialData?.emergency_contact?.relationship || '',
    emergency_contact_phone: initialData?.emergency_contact?.phone || '',
    linkedin_url: initialData?.linkedin_url || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormData, string>>>({});
  const [hasValidAddress, setHasValidAddress] = useState(!!initialData?.address?.street);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProfileFormData, string>> = {};
    
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Required';
    if (!formData.personal_email.trim()) newErrors.personal_email = 'Required';
    if (!formData.phone.trim()) newErrors.phone = 'Required';
    
    // Email format validation
    if (formData.personal_email && !formData.personal_email.includes('@')) {
      newErrors.personal_email = 'Invalid email format';
    }
    
    // Validate address was selected from autocomplete
    if (!hasValidAddress || !formData.street.trim()) {
      newErrors.street = 'Please select an address from suggestions';
    }
    
    if (!formData.emergency_contact_name.trim()) newErrors.emergency_contact_name = 'Required';
    if (!formData.emergency_contact_relationship) newErrors.emergency_contact_relationship = 'Required';
    if (!formData.emergency_contact_phone.trim()) newErrors.emergency_contact_phone = 'Required';
    
    // Validate LinkedIn URL format if provided
    if (formData.linkedin_url && !formData.linkedin_url.includes('linkedin.com')) {
      newErrors.linkedin_url = 'Invalid LinkedIn URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const updateField = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAddressChange = (address: string, components?: AddressComponents) => {
    if (components) {
      setFormData(prev => ({
        ...prev,
        home_address: address,
        street: components.street_number 
          ? `${components.street_number} ${components.route || ''}`.trim()
          : components.route || '',
        city: components.locality || '',
        state: components.administrative_area_level_1 || '',
        postcode: components.postal_code || '',
        country: components.country || '',
      }));
      setHasValidAddress(true);
      if (errors.street) {
        setErrors(prev => ({ ...prev, street: undefined }));
      }
    } else {
      setFormData(prev => ({ ...prev, home_address: address }));
      setHasValidAddress(false);
    }
  };

  const inputClassName = (field: keyof ProfileFormData) =>
    cn(errors[field] && 'border-destructive focus-visible:ring-destructive');

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
        <CardDescription className="text-base">
          Help your team get to know you. All fields marked are required.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              Personal Details
            </div>
            
            {/* Row 1: Full Name + Date of Birth */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input 
                  value={prefillData?.full_name || ''} 
                  disabled 
                  className="bg-muted" 
                />
              </div>
              <div className="space-y-2">
                <Label>Date of Birth <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => updateField('date_of_birth', e.target.value)}
                  className={inputClassName('date_of_birth')}
                />
                {errors.date_of_birth && (
                  <p className="text-sm text-destructive">{errors.date_of_birth}</p>
                )}
              </div>
            </div>

            {/* Row 2: Personal Email, Phone, Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Personal Email <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={formData.personal_email}
                    onChange={(e) => updateField('personal_email', e.target.value)}
                    placeholder="your.email@personal.com"
                    className={cn("pl-9", inputClassName('personal_email'))}
                  />
                </div>
                {errors.personal_email && (
                  <p className="text-sm text-destructive">{errors.personal_email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Phone <span className="text-destructive">*</span></Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+1 234 567 8900"
                  className={inputClassName('phone')}
                />
                {errors.phone && (
                  <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(v) => updateField('gender', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* Address Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Home className="h-4 w-4" />
              Home Address
            </div>
            
            <div className="space-y-2">
              <Label>Address <span className="text-destructive">*</span></Label>
              <AddressAutocomplete
                value={formData.home_address}
                onChange={handleAddressChange}
                placeholder="Start typing your home address..."
                allowBusinesses={false}
                className={errors.street ? 'border-destructive' : ''}
              />
              {!hasValidAddress && formData.home_address && (
                <p className="text-sm text-amber-600">
                  Please select an address from the suggestions
                </p>
              )}
              {errors.street && (
                <p className="text-sm text-destructive">{errors.street}</p>
              )}
            </div>
            
            {/* Show parsed address preview when valid */}
            {hasValidAddress && formData.street && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                <p><span className="font-medium">Street:</span> {formData.street}</p>
                <p><span className="font-medium">City:</span> {formData.city}</p>
                <p><span className="font-medium">State:</span> {formData.state}</p>
                <p><span className="font-medium">Postal Code:</span> {formData.postcode}</p>
                <p><span className="font-medium">Country:</span> {formData.country}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Emergency Contact Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Phone className="h-4 w-4" />
              Emergency Contact
            </div>
            
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  In case of emergency, we need someone we can contact on your behalf.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Contact Name <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.emergency_contact_name}
                  onChange={(e) => updateField('emergency_contact_name', e.target.value)}
                  placeholder="Full name"
                  className={inputClassName('emergency_contact_name')}
                />
                {errors.emergency_contact_name && (
                  <p className="text-sm text-destructive">{errors.emergency_contact_name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Relationship <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.emergency_contact_relationship}
                  onValueChange={(v) => updateField('emergency_contact_relationship', v)}
                >
                  <SelectTrigger className={inputClassName('emergency_contact_relationship')}>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_OPTIONS.map(rel => (
                      <SelectItem key={rel} value={rel.toLowerCase()}>
                        {rel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.emergency_contact_relationship && (
                  <p className="text-sm text-destructive">{errors.emergency_contact_relationship}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Phone Number <span className="text-destructive">*</span></Label>
                <Input
                  type="tel"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
                  placeholder="+1 234 567 8900"
                  className={inputClassName('emergency_contact_phone')}
                />
                {errors.emergency_contact_phone && (
                  <p className="text-sm text-destructive">{errors.emergency_contact_phone}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Professional Section (Optional) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Linkedin className="h-4 w-4" />
              Professional (Optional)
            </div>
            
            <div className="space-y-2">
              <Label>LinkedIn Profile</Label>
              <Input
                type="url"
                value={formData.linkedin_url}
                onChange={(e) => updateField('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
                className={inputClassName('linkedin_url')}
              />
              {errors.linkedin_url && (
                <p className="text-sm text-destructive">{errors.linkedin_url}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            {onBack && (
              <Button 
                type="button"
                variant="outline"
                onClick={onBack}
                className="h-12 px-6"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={isSaving} 
              className="flex-1 h-12 text-base font-semibold"
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
