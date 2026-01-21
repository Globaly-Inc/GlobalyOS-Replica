/**
 * Employee Onboarding - Complete Profile Step
 * Collect all required personal details including emergency contact
 */

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowRight, ArrowLeft, User, Home, Phone, Linkedin, AlertCircle, Camera, Upload, Loader2, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AddressAutocomplete, type AddressComponents } from '@/components/ui/address-autocomplete';
import { ImageCropper } from '@/components/ui/image-cropper';
import { DatePicker } from '@/components/ui/date-picker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CompleteProfileStepProps {
  employeeId: string;
  userId: string;
  initialData?: {
    avatar_url?: string;
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
  avatar_url: string;
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
  employeeId,
  userId,
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
    avatar_url: initialData?.avatar_url || '',
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

  // Avatar upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const validateFile = (file: File): boolean => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please upload JPEG, PNG, or WebP image', variant: 'destructive' });
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File too large', description: 'Please select an image under 5MB', variant: 'destructive' });
      return false;
    }
    return true;
  };

  const handleFileSelect = (file: File) => {
    if (!validateFile(file)) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImageSrc(e.target?.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    if (e.target) e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleCropComplete = async (blob: Blob) => {
    setIsUploadingAvatar(true);
    try {
      const filePath = `${userId}/avatar-${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { contentType: 'image/png', upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      
      toast({ title: 'Photo uploaded', description: 'Your profile photo has been updated.' });
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast({ title: 'Upload failed', description: 'Could not upload photo. Please try again.', variant: 'destructive' });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const userInitials = prefillData?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ProfileFormData, string>> = {};
    
    // Profile picture is required
    if (!formData.avatar_url) newErrors.avatar_url = 'Profile photo is required';
    
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Required';
    if (!formData.gender) newErrors.gender = 'Required';
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

  // Prevent Enter key from submitting form on regular inputs
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      // Allow Enter in textarea but prevent in regular inputs
      if (e.target.type !== 'textarea') {
        e.preventDefault();
      }
    }
  };

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
        <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-6">
          {/* Personal Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              Personal Details
            </div>
            
            {/* Photo Upload - Left-aligned, compact layout */}
            <div className="space-y-2">
              <div className="flex items-start gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
                <div 
                  className={cn(
                    "relative cursor-pointer group rounded-full shrink-0",
                    isDragging && "ring-2 ring-primary ring-offset-2",
                    errors.avatar_url && "ring-2 ring-destructive ring-offset-2"
                  )}
                  onClick={handleAvatarClick}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
                    <AvatarImage src={formData.avatar_url} alt="Profile" />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isUploadingAvatar ? (
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    ) : (
                      <Camera className="h-5 w-5 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAvatarClick}
                    disabled={isUploadingAvatar}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {formData.avatar_url ? 'Change Photo' : 'Upload Photo'} <span className="text-destructive ml-1">*</span>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Click or drag • Max 5MB
                  </p>
                </div>
              </div>
              {errors.avatar_url && (
                <p className="text-sm text-destructive">{errors.avatar_url}</p>
              )}
            </div>

            {/* Image Cropper Dialog */}
            <ImageCropper
              open={cropperOpen}
              onOpenChange={setCropperOpen}
              imageSrc={selectedImageSrc || ''}
              onCropComplete={handleCropComplete}
              cropShape="circle"
            />
            
            {/* Row 1: Full Name, Date of Birth, Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <DatePicker
                  value={formData.date_of_birth}
                  onChange={(value) => updateField('date_of_birth', value)}
                  placeholder="Select date of birth"
                  allowFutureDates={false}
                  fromYear={1940}
                  toYear={new Date().getFullYear() - 16}
                  className={inputClassName('date_of_birth')}
                />
                {errors.date_of_birth && (
                  <p className="text-sm text-destructive">{errors.date_of_birth}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Gender <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.gender}
                  onValueChange={(v) => updateField('gender', v)}
                >
                  <SelectTrigger className={cn(errors.gender && 'border-destructive focus-visible:ring-destructive')}>
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
                {errors.gender && (
                  <p className="text-sm text-destructive">{errors.gender}</p>
                )}
              </div>
            </div>

            {/* Row 2: Personal Email, Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Phone className="h-4 w-4" />
                Emergency Contact
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Someone we can contact on your behalf</span>
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
