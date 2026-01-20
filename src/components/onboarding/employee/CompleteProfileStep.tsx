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
import { ArrowRight, ArrowLeft, User, Home, Phone, Linkedin, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompleteProfileStepProps {
  employeeId: string;
  initialData?: {
    preferred_name?: string;
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
  preferred_name: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  street: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
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
  const [formData, setFormData] = useState<ProfileFormData>({
    preferred_name: initialData?.preferred_name || '',
    phone: initialData?.phone || '',
    date_of_birth: initialData?.date_of_birth || '',
    gender: initialData?.gender || '',
    street: initialData?.address?.street || '',
    city: initialData?.address?.city || '',
    state: initialData?.address?.state || '',
    postcode: initialData?.address?.postcode || '',
    country: initialData?.address?.country || '',
    emergency_contact_name: initialData?.emergency_contact?.name || '',
    emergency_contact_relationship: initialData?.emergency_contact?.relationship || '',
    emergency_contact_phone: initialData?.emergency_contact?.phone || '',
    linkedin_url: initialData?.linkedin_url || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ProfileFormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProfileFormData, string>> = {};
    
    if (!formData.preferred_name.trim()) newErrors.preferred_name = 'Required';
    if (!formData.phone.trim()) newErrors.phone = 'Required';
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Required';
    if (!formData.street.trim()) newErrors.street = 'Required';
    if (!formData.city.trim()) newErrors.city = 'Required';
    if (!formData.state.trim()) newErrors.state = 'Required';
    if (!formData.postcode.trim()) newErrors.postcode = 'Required';
    if (!formData.country.trim()) newErrors.country = 'Required';
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
                <Label>Preferred Name <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.preferred_name}
                  onChange={(e) => updateField('preferred_name', e.target.value)}
                  placeholder="How should we call you?"
                  className={inputClassName('preferred_name')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Phone <span className="text-destructive">*</span></Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+1 234 567 8900"
                  className={inputClassName('phone')}
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
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Street Address <span className="text-destructive">*</span></Label>
                <Input
                  value={formData.street}
                  onChange={(e) => updateField('street', e.target.value)}
                  placeholder="123 Main Street, Apt 4B"
                  className={inputClassName('street')}
                />
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>City <span className="text-destructive">*</span></Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    placeholder="City"
                    className={inputClassName('city')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>State/Province <span className="text-destructive">*</span></Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    placeholder="State"
                    className={inputClassName('state')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Postal Code <span className="text-destructive">*</span></Label>
                  <Input
                    value={formData.postcode}
                    onChange={(e) => updateField('postcode', e.target.value)}
                    placeholder="12345"
                    className={inputClassName('postcode')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country <span className="text-destructive">*</span></Label>
                  <Input
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    placeholder="Country"
                    className={inputClassName('country')}
                  />
                </div>
              </div>
            </div>
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
