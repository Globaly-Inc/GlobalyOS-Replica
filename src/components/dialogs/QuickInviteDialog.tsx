import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Check, Plus, Loader2, Camera, ChevronsUpDown, X, Crown } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/hooks/useOrganization";
import { useEmploymentTypes } from "@/hooks/useEmploymentTypes";
import { format } from "date-fns";
import { ImageCropper } from "@/components/ui/image-cropper";

interface QuickInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Office {
  id: string;
  name: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
}

interface PositionData {
  id: string;
  name: string;
  department: string | null;
}

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', description: 'Full access to all settings' },
  { value: 'hr', label: 'HR', description: 'Manage employee records' },
  { value: 'manager', label: 'Manager', description: 'Team oversight' },
  { value: 'member', label: 'Member', description: 'Standard access' },
];

const quickInviteSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Valid email required").max(255, "Email must be less than 255 characters"),
  officeId: z.string().min(1, "Please select an office"),
  department: z.string().trim().min(2, "Department is required").max(100),
  position: z.string().trim().min(2, "Position is required").max(100),
  employmentType: z.string().min(1, "Please select employment type"),
  role: z.enum(['admin', 'hr', 'manager', 'member']),
  managerId: z.string().optional(),
  isNewHire: z.boolean(),
});

type QuickInviteFormData = z.infer<typeof quickInviteSchema>;

export function QuickInviteDialog({ open, onOpenChange, onSuccess }: QuickInviteDialogProps) {
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Data loading
  const [departments, setDepartments] = useState<string[]>([]);
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [ownerInfo, setOwnerInfo] = useState<{ id: string; name: string } | null>(null);
  const { data: employmentTypes = [], isLoading: loadingEmploymentTypes } = useEmploymentTypes(true);
  
  // Combobox state
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [positionSearch, setPositionSearch] = useState("");
  
  // Avatar state
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<QuickInviteFormData>({
    fullName: "",
    email: "",
    officeId: "",
    department: "",
    position: "",
    employmentType: "",
    role: "member",
    managerId: "",
    isNewHire: false,
  });

  useEffect(() => {
    if (open && currentOrg) {
      loadDepartments();
      loadPositions();
      loadOffices();
      loadTeamMembers();
      loadOwnerInfo();
    }
  }, [open, currentOrg?.id]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  // Auto-select office if only one exists
  useEffect(() => {
    if (offices.length === 1 && !formData.officeId) {
      setFormData(prev => ({ ...prev, officeId: offices[0].id }));
    }
  }, [offices]);

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      officeId: "",
      department: "",
      position: "",
      employmentType: "",
      role: "member",
      managerId: "",
      isNewHire: false,
    });
    setErrors({});
    setSuccess(false);
    setAvatarFile(null);
    setAvatarPreview(null);
    setDepartmentSearch("");
    setPositionSearch("");
  };

  const loadDepartments = async () => {
    if (!currentOrg) return;
    const { data } = await supabase.from('employees').select('department').eq('organization_id', currentOrg.id).order('department');
    if (data) setDepartments([...new Set(data.map(e => e.department))].filter(Boolean) as string[]);
  };

  const loadPositions = async () => {
    if (!currentOrg) return;
    const { data } = await supabase.from('positions').select('id, name, department').eq('organization_id', currentOrg.id).order('name');
    if (data) setPositions(data);
  };

  const loadOffices = async () => {
    if (!currentOrg) return;
    const { data } = await supabase.from('offices').select('id, name').eq('organization_id', currentOrg.id).order('name');
    if (data) setOffices(data);
  };

  const loadTeamMembers = async () => {
    if (!currentOrg) return;
    const { data } = await supabase
      .from('employees')
      .select('id, user_id, profiles:user_id(full_name, avatar_url)')
      .eq('organization_id', currentOrg.id)
      .eq('status', 'active')
      .order('created_at');
    if (data) {
      setTeamMembers(data.filter(m => m.profiles) as TeamMember[]);
    }
  };

  const loadOwnerInfo = async () => {
    if (!currentOrg) return;
    const { data } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', currentOrg.id)
      .eq('role', 'owner')
      .single();
    if (data?.user_id) {
      // Get profile and employee ID for the owner
      const [profileRes, empRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', data.user_id).single(),
        supabase.from('employees').select('id').eq('organization_id', currentOrg.id).eq('user_id', data.user_id).single()
      ]);
      if (empRes.data && profileRes.data) {
        setOwnerInfo({ 
          id: empRes.data.id, 
          name: profileRes.data.full_name
        });
      }
    }
  };

  const handleChange = useCallback((field: keyof QuickInviteFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  // Handle department change - clear position when department changes
  const handleDepartmentChange = (value: string) => {
    handleChange('department', value);
    handleChange('position', '');
    setPositionSearch('');
  };

  // Add new department
  const handleAddNewDepartment = async (name: string) => {
    if (name.trim().length < 2) return;
    
    const trimmedName = name.trim();
    if (!departments.includes(trimmedName)) {
      setDepartments(prev => [...prev, trimmedName]);
      
      // Record for AI learning
      if (currentOrg) {
        try {
          await supabase.functions.invoke('save-org-structure-learning', {
            body: {
              organizationId: currentOrg.id,
              businessCategory: 'custom',
              companySize: 'medium',
              selectedDepartments: [],
              selectedPositions: [],
              customDepartments: [trimmedName],
              customPositions: [],
            }
          });
        } catch (e) {
          console.error('Failed to save learning:', e);
        }
      }
    }
    handleDepartmentChange(trimmedName);
    setDepartmentOpen(false);
    setDepartmentSearch("");
  };

  // Add new position
  const handleAddNewPosition = async (name: string) => {
    if (name.trim().length < 2) return;
    
    const trimmedName = name.trim();
    
    if (currentOrg) {
      try {
        const { data: newPos } = await supabase
          .from('positions')
          .insert({
            name: trimmedName,
            department: formData.department || null,
            organization_id: currentOrg.id,
          })
          .select()
          .single();
          
        if (newPos) {
          setPositions(prev => [...prev, newPos]);
        }
        
        await supabase.functions.invoke('save-org-structure-learning', {
          body: {
            organizationId: currentOrg.id,
            businessCategory: 'custom',
            companySize: 'medium',
            selectedDepartments: [],
            selectedPositions: [],
            customDepartments: [],
            customPositions: [trimmedName],
          }
        });
      } catch (e) {
        console.error('Failed to save position:', e);
      }
    }
    
    handleChange('position', trimmedName);
    setPositionOpen(false);
    setPositionSearch("");
  };

  // Filter positions by department
  const filteredPositions = formData.department
    ? positions.filter(p => !p.department || p.department === formData.department)
    : positions;

  // Build manager options (owner + team members)
  const managerOptions = [
    ...(ownerInfo ? [{ id: ownerInfo.id, name: ownerInfo.name, isOwner: true }] : []),
    ...teamMembers.map(m => ({ id: m.id, name: m.profiles.full_name, isOwner: false })),
  ];

  // Avatar handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select an image under 5MB", variant: "destructive" });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setTempImageSrc(event.target?.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const file = new File([croppedBlob], 'avatar.png', { type: 'image/png' });
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(croppedBlob));
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const validateForm = () => {
    try {
      quickInviteSchema.parse(formData);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({ title: "Validation Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const validated = quickInviteSchema.parse(formData);
      
      // Upload avatar if exists
      let avatarUrl = '';
      if (avatarFile && currentOrg) {
        const fileName = `team-invites/${currentOrg.id}/${Date.now()}-avatar.png`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });
          
        if (!uploadError) {
          const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(fileName);
          avatarUrl = publicUrl.publicUrl;
        }
      }
      
      const nameParts = validated.fullName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
      
      const { invokeEdgeFunction } = await import('@/lib/edgeFunctionUtils');
      const { data, error } = await invokeEdgeFunction('invite-team-member', {
        firstName,
        lastName,
        fullName: validated.fullName,
        email: validated.email,
        officeId: validated.officeId,
        department: validated.department,
        position: validated.position,
        joinDate: format(new Date(), 'yyyy-MM-dd'),
        employmentType: validated.employmentType,
        role: validated.role,
        organizationId: currentOrg?.id,
        isNewHire: validated.isNewHire,
        managerId: validated.managerId || '',
        avatarUrl,
        phone: '',
        dateOfBirth: '',
        street: '',
        city: '',
        state: '',
        country: '',
      }, {
        componentName: 'QuickInviteDialog',
        actionAttempted: `Quick invite team member: ${validated.fullName}`,
      });

      if (error) {
        toast({ 
          title: "Failed to Invite Team Member", 
          description: error.message || "Please try again or contact support", 
          variant: "destructive" 
        });
        return;
      }

      const responseData = data as { skipped?: boolean; code?: string } | null;
      if (responseData?.skipped && responseData?.code === 'USER_EXISTS') {
        toast({ 
          title: "User Already Exists", 
          description: `${formData.fullName} already has an account in the system` 
        });
        setTimeout(() => {
          onSuccess?.();
          onOpenChange(false);
        }, 1500);
        return;
      }

      setSuccess(true);
      toast({ title: "Invitation Sent!", description: `${formData.fullName} will receive an email with login details` });
      setTimeout(() => {
        onSuccess?.();
        onOpenChange(false);
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="py-12 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Invitation Sent!</h2>
            <p className="text-muted-foreground">{formData.fullName} will receive an email with login details to complete their onboarding.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Add a new team member to your organization. They'll receive an email invitation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Card-style form matching onboarding */}
          <div className="border rounded-lg p-4 bg-card">
            {/* Header Row: Avatar + Toggle */}
            <div className="flex items-center gap-4 mb-4">
              {/* Avatar Upload */}
              <div className="relative">
                <Avatar 
                  className="h-14 w-14 border-2 border-dashed border-muted-foreground/25 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarPreview ? (
                    <AvatarImage src={avatarPreview} />
                  ) : (
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <Camera className="h-5 w-5" />
                    </AvatarFallback>
                  )}
                </Avatar>
                {avatarPreview && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full"
                    onClick={(e) => { e.stopPropagation(); removeAvatar(); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Existing/New Hire Toggle */}
              <RadioGroup
                value={formData.isNewHire ? "new_hire" : "existing"}
                onValueChange={(value) => handleChange('isNewHire', value === "new_hire")}
                className="flex items-center gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="existing" />
                  <Label htmlFor="existing" className="text-sm font-normal cursor-pointer">
                    Existing Team
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new_hire" id="new_hire" />
                  <Label htmlFor="new_hire" className="text-sm font-normal cursor-pointer">
                    New Hire
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Row 1: Name, Email, Office, Manager */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Employee Full Name *</Label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  placeholder="Full name"
                  className={cn("h-9", errors.fullName && "border-destructive")}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Work Email (username for login with OTP) *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="email@company.com"
                  className={cn("h-9", errors.email && "border-destructive")}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Office *</Label>
                <Select value={formData.officeId} onValueChange={(value) => handleChange('officeId', value)}>
                  <SelectTrigger className={cn("h-9", errors.officeId && "border-destructive")}>
                    <SelectValue placeholder="Select office" />
                  </SelectTrigger>
                  <SelectContent>
                    {offices.map((office) => (
                      <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Manager *</Label>
                <Select 
                  value={formData.managerId || ''} 
                  onValueChange={(value) => handleChange('managerId', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {managerOptions.map((mgr) => (
                      <SelectItem key={mgr.id} value={mgr.id}>
                        <div className="flex items-center gap-2">
                          <span>{mgr.name}</span>
                          {mgr.isOwner && <Crown className="h-3 w-3 text-amber-500" />}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Department, Position, Type, Role */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Department - Searchable Combobox */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Department *</Label>
                <Popover open={departmentOpen} onOpenChange={setDepartmentOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={departmentOpen}
                      className={cn(
                        "w-full h-9 justify-between font-normal",
                        errors.department && "border-destructive"
                      )}
                    >
                      <span className="truncate">
                        {formData.department || 'Select department...'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Search or add new..." 
                        value={departmentSearch}
                        onValueChange={setDepartmentSearch}
                      />
                      <CommandList className="max-h-[200px]">
                        {departments.filter(d => d.toLowerCase().includes(departmentSearch.toLowerCase())).length === 0 && 
                         departmentSearch.trim().length < 2 && (
                          <CommandEmpty>No departments found.</CommandEmpty>
                        )}
                        <CommandGroup>
                          {departments
                            .filter(d => d.toLowerCase().includes(departmentSearch.toLowerCase()))
                            .map((dept) => (
                              <CommandItem
                                key={dept}
                                value={dept}
                                onSelect={() => {
                                  handleDepartmentChange(dept);
                                  setDepartmentOpen(false);
                                  setDepartmentSearch("");
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', formData.department === dept ? 'opacity-100' : 'opacity-0')} />
                                {dept}
                              </CommandItem>
                            ))}
                          {departmentSearch.trim().length >= 2 && 
                           !departments.some(d => d.toLowerCase() === departmentSearch.toLowerCase()) && (
                            <CommandItem
                              value={`add-${departmentSearch}`}
                              onSelect={() => handleAddNewDepartment(departmentSearch)}
                              className="text-primary"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add "{departmentSearch}"
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Position - Searchable Combobox */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Position *</Label>
                <Popover open={positionOpen} onOpenChange={setPositionOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={positionOpen}
                      className={cn(
                        "w-full h-9 justify-between font-normal",
                        errors.position && "border-destructive"
                      )}
                      disabled={!formData.department}
                    >
                      <span className="truncate">
                        {formData.position || (formData.department ? 'Select position...' : 'Select department first')}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Search or add new..." 
                        value={positionSearch}
                        onValueChange={setPositionSearch}
                      />
                      <CommandList className="max-h-[200px]">
                        {filteredPositions.filter(p => p.name.toLowerCase().includes(positionSearch.toLowerCase())).length === 0 && 
                         positionSearch.trim().length < 2 && (
                          <CommandEmpty>No positions found for this department.</CommandEmpty>
                        )}
                        <CommandGroup>
                          {filteredPositions
                            .filter(p => p.name.toLowerCase().includes(positionSearch.toLowerCase()))
                            .map((pos, idx) => (
                              <CommandItem
                                key={`${pos.id}-${idx}`}
                                value={pos.name}
                                onSelect={() => {
                                  handleChange('position', pos.name);
                                  setPositionOpen(false);
                                  setPositionSearch("");
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', formData.position === pos.name ? 'opacity-100' : 'opacity-0')} />
                                {pos.name}
                              </CommandItem>
                            ))}
                          {positionSearch.trim().length >= 2 && 
                           !filteredPositions.some(p => p.name.toLowerCase() === positionSearch.toLowerCase()) && (
                            <CommandItem
                              value={`add-${positionSearch}`}
                              onSelect={() => handleAddNewPosition(positionSearch)}
                              className="text-primary"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add "{positionSearch}"
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Employment Type */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Type *</Label>
                <Select 
                  value={formData.employmentType} 
                  onValueChange={(value) => handleChange('employmentType', value)}
                  disabled={loadingEmploymentTypes}
                >
                  <SelectTrigger className={cn("h-9", errors.employmentType && "border-destructive")}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {employmentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Role *</Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => handleChange('role', value)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue>
                      {ROLE_OPTIONS.find(r => r.value === formData.role)?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Send Invite
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Image Cropper */}
      {tempImageSrc && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={(open) => {
            setCropperOpen(open);
            if (!open) setTempImageSrc(null);
          }}
          imageSrc={tempImageSrc}
          onCropComplete={handleCropComplete}
          cropShape="circle"
        />
      )}
    </Dialog>
  );
}
