/**
 * Owner Profile Step
 * Collects essential profile information for the organization owner
 * Includes profile photo upload and uses departments/positions from previous step
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, ArrowRight, ArrowLeft, Loader2, CalendarIcon, Check, ChevronsUpDown, Camera, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ImageCropper } from '@/components/ui/image-cropper';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
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
  };
  onSave: (data: {
    position: string;
    department: string;
    join_date: string;
    date_of_birth: string | null;
    avatar_url: string | null;
  }) => void;
  onBack: () => void;
  isSaving: boolean;
}

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
  const [formData, setFormData] = useState({
    position: initialData?.position || '',
    department: initialData?.department || '',
    join_date: initialData?.join_date || new Date().toISOString().split('T')[0],
    date_of_birth: initialData?.date_of_birth || '',
    avatar_url: initialData?.avatar_url || '',
  });
  
  const [positionOpen, setPositionOpen] = useState(false);
  const [positionSearch, setPositionSearch] = useState('');

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

  // Fetch existing employee data if available
  useEffect(() => {
    async function fetchExistingData() {
      if (!session?.user?.id || !organizationId) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: employee } = await supabase
          .from('employees')
          .select('position, department, join_date, date_of_birth')
          .eq('user_id', session.user.id)
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (employee) {
          setFormData({
            position: employee.position || '',
            department: employee.department || '',
            join_date: employee.join_date || new Date().toISOString().split('T')[0],
            date_of_birth: employee.date_of_birth || '',
            avatar_url: initialData?.avatar_url || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch employee data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchExistingData();
  }, [session?.user?.id, organizationId]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.position || !formData.department) {
      toast({
        title: 'Required fields missing',
        description: 'Please select your position and department.',
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
      // Get head office for assignment
      const { data: headOffice } = await supabase
        .from('offices')
        .select('id')
        .eq('organization_id', organizationId)
        .or('name.ilike.%Head Office%,name.ilike.%Headquarters%')
        .limit(1)
        .maybeSingle();

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
        status: 'active',
        employment_type: 'employee',
        office_id: headOffice?.id || null,
      };

      // Update avatar_url in profiles table (separate from employees)
      if (formData.avatar_url) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ avatar_url: formData.avatar_url })
          .eq('id', session.user.id);
        
        if (profileError) {
          console.warn('Failed to update profile avatar:', profileError);
          // Don't throw - avatar update is not critical to onboarding flow
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <User className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">
          Complete your profile{session?.user?.user_metadata?.full_name ? `, ${session.user.user_metadata.full_name.split(' ')[0]}` : ''}
        </CardTitle>
        <CardDescription>
          Set up your employee profile as the organization owner
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Upload with Drag-Drop */}
          <div className="flex flex-col items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <div 
              className={cn(
                "relative cursor-pointer group rounded-full",
                isDragging && "ring-2 ring-primary ring-offset-2"
              )}
              onClick={handleAvatarClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={formData.avatar_url} alt="Profile" />
                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploadingAvatar ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
            </div>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={handleAvatarClick}
              disabled={isUploadingAvatar}
            >
              <Upload className="h-4 w-4 mr-2" />
              {formData.avatar_url ? 'Change Photo' : 'Upload Photo'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Click or drag to upload. Max 5MB
            </p>
          </div>

          {/* Image Cropper Dialog */}
          <ImageCropper
            open={cropperOpen}
            onOpenChange={setCropperOpen}
            imageSrc={selectedImageSrc || ''}
            onCropComplete={handleCropComplete}
            cropShape="circle"
          />

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Department Select */}
            <div className="space-y-2">
              <Label>Department *</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => {
                  setFormData({ ...formData, department: value, position: '' });
                }}
              >
                <SelectTrigger>
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
            </div>

            {/* Position Field with Combobox */}
            <div className="space-y-2">
              <Label>Position / Job Title *</Label>
              <Popover open={positionOpen} onOpenChange={setPositionOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={positionOpen}
                    className="w-full justify-between font-normal"
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
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                formData.position === pos.name ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {pos.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Join Date */}
            <div className="space-y-2">
              <Label>Join Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.join_date && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.join_date ? format(new Date(formData.join_date), 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.join_date ? new Date(formData.join_date) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        setFormData({ ...formData, join_date: date.toISOString().split('T')[0] });
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <Label>Date of Birth (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !formData.date_of_birth && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date_of_birth ? format(new Date(formData.date_of_birth), 'PPP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date_of_birth ? new Date(formData.date_of_birth) : undefined}
                    onSelect={(date) => {
                      setFormData({ 
                        ...formData, 
                        date_of_birth: date ? date.toISOString().split('T')[0] : '' 
                      });
                    }}
                    captionLayout="dropdown-buttons"
                    fromYear={1940}
                    toYear={new Date().getFullYear() - 16}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button 
              type="submit" 
              disabled={isSaving || !formData.position || !formData.department} 
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
