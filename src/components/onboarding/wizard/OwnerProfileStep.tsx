/**
 * Owner Profile Step
 * Collects essential profile information for the organization owner
 * Layout matches the Employee CompleteProfileStep for consistency
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  User, ArrowRight, ArrowLeft, Loader2, Check, ChevronsUpDown, 
  Camera, Upload, Building2, CheckCircle2, Home, Phone, Linkedin, 
  AlertCircle, Mail 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ImageCropper } from '@/components/ui/image-cropper';
import { DatePicker } from '@/components/ui/date-picker';
import { StructuredAddressInput, type AddressValue, EMPTY_ADDRESS } from '@/components/ui/structured-address-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { expandPositionName } from '@/utils/position-names';

interface DepartmentsRolesData {
  departments: string[];
  positions: Array<{ name: string; department: string }>;
}

interface OwnerProfileStepProps {
  organizationId: string;
  departmentsRoles?: DepartmentsRolesData;
  initialData?: {
    position?: string;
    department?: string;
    join_date?: string;
    date_of_birth?: string;
    avatar_url?: string;
    office_id?: string;
    personal_email?: string;
    phone?: string;
    gender?: string;
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    emergency_contact_name?: string;
    emergency_contact_relationship?: string;
    emergency_contact_phone?: string;
    linkedin_url?: string;
  };
  onSave: (data: {
    position: string;
    department: string;
    join_date: string;
    date_of_birth: string | null;
    avatar_url: string | null;
    office_id: string | null;
    personal_email: string;
    phone: string;
    gender: string;
    street: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
    emergency_contact_name: string;
    emergency_contact_relationship: string;
    emergency_contact_phone: string;
    linkedin_url: string | null;
  }) => void;
  onBack: () => void;
  isSaving: boolean;
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const RELATIONSHIP_OPTIONS = [
  'Spouse',
  'Parent',
  'Sibling',
  'Partner',
  'Friend',
  'Other',
];

export function OwnerProfileStep({
  organizationId,
  departmentsRoles,
  initialData,
  onSave,
  onBack,
  isSaving,
}: OwnerProfileStepProps) {
  const { session } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasValidAddress, setHasValidAddress] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    // Work details
    position: initialData?.position || '',
    department: initialData?.department || '',
    join_date: initialData?.join_date || new Date().toISOString().split('T')[0],
    // Personal details
    date_of_birth: initialData?.date_of_birth || '',
    avatar_url: initialData?.avatar_url || '',
    personal_email: initialData?.personal_email || '',
    phone: initialData?.phone || '',
    gender: initialData?.gender || '',
    // Address
    street: initialData?.street || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    postcode: initialData?.postcode || '',
    country: initialData?.country || '',
    // Emergency contact
    emergency_contact_name: initialData?.emergency_contact_name || '',
    emergency_contact_relationship: initialData?.emergency_contact_relationship || '',
    emergency_contact_phone: initialData?.emergency_contact_phone || '',
    // Professional
    linkedin_url: initialData?.linkedin_url || '',
  });
  
  const [positionOpen, setPositionOpen] = useState(false);
  const [positionSearch, setPositionSearch] = useState('');
  
  // Office selection state
  const [offices, setOffices] = useState<Array<{ id: string; name: string; city: string | null; country: string | null }>>([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState<string | null>(null);
  const [loadingOffices, setLoadingOffices] = useState(true);

  // Get departments and positions from previous step
  const departments = departmentsRoles?.departments || [];
  const positions = departmentsRoles?.positions || [];

  // Filter positions by selected department
  const filteredPositions = useMemo(() => {
    if (!formData.department) return positions;
    return positions.filter(p => p.department === formData.department);
  }, [positions, formData.department]);

  // Search filter for positions
  const searchedPositions = useMemo(() => {
    if (!positionSearch) return filteredPositions;
    return filteredPositions.filter(p => 
      p.name.toLowerCase().includes(positionSearch.toLowerCase())
    );
  }, [filteredPositions, positionSearch]);

  // Fetch existing employee data and avatar fallback
  useEffect(() => {
    async function fetchExistingData() {
      if (!session?.user?.id || !organizationId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: employee } = await supabase
          .from('employees')
          .select('position, department, join_date, date_of_birth, personal_email, phone, gender, street, city, state, postcode, country, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone, linkedin_url')
          .eq('user_id', session.user.id)
          .eq('organization_id', organizationId)
          .maybeSingle();

        // Also fetch avatar from profiles table as fallback
        let avatarUrl = initialData?.avatar_url || '';
        if (!avatarUrl) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (profile?.avatar_url) {
            avatarUrl = profile.avatar_url;
          }
        }

        if (employee) {
          setFormData(prev => ({
            ...prev,
            position: employee.position || prev.position,
            department: employee.department || prev.department,
            join_date: employee.join_date || prev.join_date,
            date_of_birth: employee.date_of_birth || prev.date_of_birth,
            avatar_url: avatarUrl || prev.avatar_url,
            personal_email: employee.personal_email || prev.personal_email,
            phone: employee.phone || prev.phone,
            gender: employee.gender || prev.gender,
            street: employee.street || prev.street,
            city: employee.city || prev.city,
            state: employee.state || prev.state,
            postcode: employee.postcode || prev.postcode,
            country: employee.country || prev.country,
            emergency_contact_name: employee.emergency_contact_name || prev.emergency_contact_name,
            emergency_contact_relationship: employee.emergency_contact_relationship || prev.emergency_contact_relationship,
            emergency_contact_phone: employee.emergency_contact_phone || prev.emergency_contact_phone,
            linkedin_url: employee.linkedin_url || prev.linkedin_url,
          }));
          setHasValidAddress(!!(employee.street && employee.country));
        } else if (avatarUrl) {
          setFormData(prev => ({ ...prev, avatar_url: avatarUrl }));
        }
      } catch (error) {
        console.error('Failed to fetch employee data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchExistingData();
  }, [session?.user?.id, organizationId, initialData?.avatar_url]);

  // Fetch offices for selection
  useEffect(() => {
    async function fetchOffices() {
      if (!organizationId) return;
      
      try {
        const { data, error } = await supabase
          .from('offices')
          .select('id, name, city, country')
          .eq('organization_id', organizationId)
          .order('name');
        
        if (error) throw error;
        setOffices(data || []);
        
        // Restore saved office or auto-select first/head office
        if (initialData?.office_id && data?.some(o => o.id === initialData.office_id)) {
          setSelectedOfficeId(initialData.office_id);
        } else if (data && data.length > 0) {
          const headOffice = data.find(o => 
            o.name.toLowerCase().includes('head office') || 
            o.name.toLowerCase().includes('headquarters')
          );
          setSelectedOfficeId(headOffice?.id || data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch offices:', error);
      } finally {
        setLoadingOffices(false);
      }
    }
    
    fetchOffices();
  }, [organizationId, initialData?.office_id]);

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const validateFile = (file: File): boolean => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload JPEG, PNG, or WebP image',
        variant: 'destructive',
      });
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 5MB',
        variant: 'destructive',
      });
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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset input for re-selection
    if (e.target) e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleCropComplete = async (blob: Blob) => {
    if (!session?.user?.id) return;
    
    setIsUploadingAvatar(true);
    try {
      const userId = session.user.id;
      // Use userId as first folder to match RLS policy
      const filePath = `${userId}/avatar-${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: true,
        });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      if (errors.avatar_url) {
        setErrors(prev => ({ ...prev, avatar_url: '' }));
      }
      
      toast({
        title: 'Photo uploaded',
        description: 'Your profile photo has been updated.',
      });
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      toast({
        title: 'Upload failed',
        description: 'Could not upload photo. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddressChange = (addressValue: AddressValue) => {
    setFormData(prev => ({
      ...prev,
      street: addressValue.street,
      city: addressValue.city,
      state: addressValue.state,
      postcode: addressValue.postcode,
      country: addressValue.country,
    }));
    setHasValidAddress(!!(addressValue.country && addressValue.street));
    if (errors.street && addressValue.street) {
      setErrors(prev => ({ ...prev, street: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Required personal fields
    if (!formData.avatar_url) newErrors.avatar_url = 'Profile photo is required';
    if (!formData.date_of_birth) newErrors.date_of_birth = 'Required';
    if (!formData.gender) newErrors.gender = 'Required';
    if (!formData.personal_email.trim()) newErrors.personal_email = 'Required';
    if (!formData.phone.trim()) newErrors.phone = 'Required';
    
    // Email format validation
    if (formData.personal_email && !formData.personal_email.includes('@')) {
      newErrors.personal_email = 'Invalid email format';
    }
    
    // Address validation
    if (!hasValidAddress || !formData.street.trim()) {
      newErrors.street = 'Please select an address from suggestions';
    }
    
    // Emergency contact
    if (!formData.emergency_contact_name.trim()) newErrors.emergency_contact_name = 'Required';
    if (!formData.emergency_contact_relationship) newErrors.emergency_contact_relationship = 'Required';
    if (!formData.emergency_contact_phone.trim()) newErrors.emergency_contact_phone = 'Required';
    
    // Work details
    if (!formData.position) newErrors.position = 'Required';
    if (!formData.department) newErrors.department = 'Required';
    if (!selectedOfficeId) newErrors.office = 'Please select an office';
    
    // LinkedIn URL format if provided
    if (formData.linkedin_url && !formData.linkedin_url.includes('linkedin.com')) {
      newErrors.linkedin_url = 'Invalid LinkedIn URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Required fields missing',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    if (!session?.user?.id || !organizationId) {
      toast({
        title: 'Error',
        description: 'Missing user or organization information',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Check if employee record exists
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      const employeeData = {
        position: formData.position,
        department: formData.department,
        join_date: formData.join_date,
        date_of_birth: formData.date_of_birth || null,
        personal_email: formData.personal_email,
        phone: formData.phone,
        gender: formData.gender,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        postcode: formData.postcode,
        country: formData.country,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_relationship: formData.emergency_contact_relationship,
        emergency_contact_phone: formData.emergency_contact_phone,
        linkedin_url: formData.linkedin_url || null,
        status: 'active',
        employment_type: 'employee',
        office_id: selectedOfficeId,
      };

      // Update avatar_url in profiles table (separate from employees)
      if (formData.avatar_url) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ avatar_url: formData.avatar_url })
          .eq('id', session.user.id);
        
        if (profileError) {
          console.warn('Failed to update profile avatar:', profileError);
        }
      }

      if (existingEmployee) {
        // Update existing employee
        const { error: updateError } = await supabase
          .from('employees')
          .update(employeeData)
          .eq('id', existingEmployee.id);

        if (updateError) throw updateError;
      } else {
        // Create new employee record with is_new_hire = false for owner
        const { data: newEmployee, error: insertError } = await supabase
          .from('employees')
          .insert({
            organization_id: organizationId,
            user_id: session.user.id,
            ...employeeData,
            is_new_hire: false,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        // Create initial position history record
        if (newEmployee) {
          await supabase.from('position_history').insert({
            employee_id: newEmployee.id,
            organization_id: organizationId,
            position: formData.position,
            department: formData.department,
            effective_date: formData.join_date,
            is_current: true,
            change_type: 'hire',
          });
        }
      }

      // Save to onboarding data and advance
      onSave({
        position: formData.position,
        department: formData.department,
        join_date: formData.join_date,
        date_of_birth: formData.date_of_birth || null,
        avatar_url: formData.avatar_url || null,
        office_id: selectedOfficeId,
        personal_email: formData.personal_email,
        phone: formData.phone,
        gender: formData.gender,
        street: formData.street,
        city: formData.city,
        state: formData.state,
        postcode: formData.postcode,
        country: formData.country,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_relationship: formData.emergency_contact_relationship,
        emergency_contact_phone: formData.emergency_contact_phone,
        linkedin_url: formData.linkedin_url || null,
      });
    } catch (error) {
      console.error('Failed to save owner profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: 'Error',
        description: `Failed to save your profile: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  };

  const userInitials = session?.user?.user_metadata?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  const inputClassName = (field: string) =>
    cn(errors[field] && 'border-destructive focus-visible:ring-destructive');

  // Prevent Enter key from submitting form on regular inputs
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      if (e.target.type !== 'textarea') {
        e.preventDefault();
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-2xl">
          Complete Your Profile{session?.user?.user_metadata?.full_name ? `, ${session.user.user_metadata.full_name.split(' ')[0]}` : ''}
        </CardTitle>
        <CardDescription className="text-base">
          Help your team get to know you. All fields marked with * are required.
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
                  value={session?.user?.user_metadata?.full_name || ''} 
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
                  <SelectTrigger className={inputClassName('gender')}>
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
            
            <StructuredAddressInput
              value={{
                country: formData.country,
                street: formData.street,
                city: formData.city,
                state: formData.state,
                postcode: formData.postcode,
              }}
              onChange={handleAddressChange}
              required
              allowBusinesses={false}
              error={!!errors.street}
            />
            {errors.street && (
              <p className="text-sm text-destructive">{errors.street}</p>
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

          <Separator />

          {/* Work Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Work Details
            </div>

            {/* Office Selection */}
            <div className="space-y-3">
              <Label>Your Office <span className="text-destructive">*</span></Label>
              {loadingOffices ? (
                <div className="flex gap-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 flex-1 rounded-lg bg-muted animate-pulse" />
                  ))}
                </div>
              ) : offices.length > 0 ? (
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                  {offices.map((office) => {
                    const isSelected = selectedOfficeId === office.id;
                    return (
                      <Card
                        key={office.id}
                        className={cn(
                          "p-4 cursor-pointer transition-all hover:border-primary/50 relative",
                          isSelected && "border-primary bg-primary/5 ring-1 ring-primary",
                          errors.office && !selectedOfficeId && "border-destructive"
                        )}
                        onClick={() => {
                          setSelectedOfficeId(office.id);
                          if (errors.office) {
                            setErrors(prev => ({ ...prev, office: '' }));
                          }
                        }}
                      >
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-primary absolute top-2 right-2" />
                        )}
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 pr-4">
                            <p className="font-medium text-sm truncate">{office.name}</p>
                            {(office.city || office.country) && (
                              <p className="text-xs text-muted-foreground truncate">
                                {[office.city, office.country].filter(Boolean).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No offices found. Please add offices in the previous step.</p>
              )}
              {errors.office && (
                <p className="text-sm text-destructive">{errors.office}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Department Select */}
              <div className="space-y-2">
                <Label>Department <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.department}
                  onValueChange={(value) => {
                    setFormData({ ...formData, department: value, position: '' });
                    if (errors.department) {
                      setErrors(prev => ({ ...prev, department: '' }));
                    }
                  }}
                >
                  <SelectTrigger className={inputClassName('department')}>
                    <SelectValue placeholder="Select department..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.length > 0 ? (
                      departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="Executive">Executive</SelectItem>
                        <SelectItem value="Operations">Operations</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Human Resources">Human Resources</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                {errors.department && (
                  <p className="text-sm text-destructive">{errors.department}</p>
                )}
              </div>

              {/* Position Field with Combobox */}
              <div className="space-y-2">
                <Label>Position / Job Title <span className="text-destructive">*</span></Label>
                <Popover open={positionOpen} onOpenChange={setPositionOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={positionOpen}
                      className={cn(
                        "w-full justify-between font-normal",
                        inputClassName('position')
                      )}
                      disabled={!formData.department && departments.length > 0}
                    >
                      {formData.position || 'Select position...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search or type custom..."
                        value={positionSearch}
                        onValueChange={setPositionSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <button
                            type="button"
                            className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent rounded cursor-pointer"
                            onClick={() => {
                              setFormData({ ...formData, position: positionSearch });
                              setPositionOpen(false);
                              setPositionSearch('');
                              if (errors.position) {
                                setErrors(prev => ({ ...prev, position: '' }));
                              }
                            }}
                          >
                            Use "{positionSearch}"
                          </button>
                        </CommandEmpty>
                        <CommandGroup heading={formData.department ? `${formData.department} roles` : 'Positions'}>
                          {searchedPositions.map((pos) => (
                            <CommandItem
                              key={`${pos.name}-${pos.department}`}
                              value={pos.name}
                              onSelect={() => {
                                setFormData({ ...formData, position: pos.name });
                                setPositionOpen(false);
                                setPositionSearch('');
                                if (errors.position) {
                                  setErrors(prev => ({ ...prev, position: '' }));
                                }
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  formData.position === pos.name ? 'opacity-100' : 'opacity-0'
                                )}
                              />
                              {expandPositionName(pos.name)}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.position && (
                  <p className="text-sm text-destructive">{errors.position}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack} disabled={isSaving} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving} 
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
