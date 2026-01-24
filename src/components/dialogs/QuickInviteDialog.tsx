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
import { UserPlus, Check, Plus, Loader2, Camera, ChevronsUpDown, X, Crown, Trash2 } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/hooks/useOrganization";
import { useEmploymentTypes } from "@/hooks/useEmploymentTypes";
import { format } from "date-fns";
import { ImageCropper } from "@/components/ui/image-cropper";
import { ScrollArea } from "@/components/ui/scroll-area";

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

interface MemberFormData extends QuickInviteFormData {
  id: string;
  avatarFile: File | null;
  avatarPreview: string | null;
}

const createEmptyMember = (defaultOfficeId?: string): MemberFormData => ({
  id: crypto.randomUUID(),
  fullName: "",
  email: "",
  officeId: defaultOfficeId || "",
  department: "",
  position: "",
  employmentType: "",
  role: "member",
  managerId: "",
  isNewHire: false,
  avatarFile: null,
  avatarPreview: null,
});

export function QuickInviteDialog({ open, onOpenChange, onSuccess }: QuickInviteDialogProps) {
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [errors, setErrors] = useState<Record<number, Record<string, string>>>({});
  
  // Multi-member state
  const [members, setMembers] = useState<MemberFormData[]>([createEmptyMember()]);
  
  // Data loading
  const [departments, setDepartments] = useState<string[]>([]);
  const [positions, setPositions] = useState<PositionData[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [ownerInfo, setOwnerInfo] = useState<{ id: string; name: string } | null>(null);
  const { data: employmentTypes = [], isLoading: loadingEmploymentTypes } = useEmploymentTypes(true);
  
  // Per-member combobox state
  const [departmentOpenStates, setDepartmentOpenStates] = useState<Record<number, boolean>>({});
  const [positionOpenStates, setPositionOpenStates] = useState<Record<number, boolean>>({});
  const [departmentSearches, setDepartmentSearches] = useState<Record<number, string>>({});
  const [positionSearches, setPositionSearches] = useState<Record<number, string>>({});
  
  // Per-member avatar state
  const [cropperOpenStates, setCropperOpenStates] = useState<Record<number, boolean>>({});
  const [tempImageSources, setTempImageSources] = useState<Record<number, string>>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

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

  // Auto-select office for all members if only one exists
  useEffect(() => {
    if (offices.length === 1) {
      setMembers(prev => prev.map(m => 
        m.officeId ? m : { ...m, officeId: offices[0].id }
      ));
    }
  }, [offices]);

  const resetForm = () => {
    setMembers([createEmptyMember()]);
    setErrors({});
    setSuccess(false);
    setSuccessCount(0);
    setDepartmentSearches({});
    setPositionSearches({});
    setDepartmentOpenStates({});
    setPositionOpenStates({});
    setCropperOpenStates({});
    setTempImageSources({});
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

  // Add new member
  const addMember = () => {
    const defaultOfficeId = offices.length === 1 ? offices[0].id : '';
    setMembers(prev => [...prev, createEmptyMember(defaultOfficeId)]);
  };

  // Remove member
  const removeMember = (index: number) => {
    setMembers(prev => prev.filter((_, i) => i !== index));
    // Clean up per-member state
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[index];
      return newErrors;
    });
  };

  // Update specific member field
  const updateMember = useCallback((index: number, field: keyof QuickInviteFormData, value: string | boolean) => {
    setMembers(prev => prev.map((member, i) => {
      if (i !== index) return member;
      if (field === 'department') {
        return { ...member, department: value as string, position: '' };
      }
      return { ...member, [field]: value };
    }));
    // Clear error for this field
    setErrors(prev => {
      const memberErrors = prev[index] || {};
      const newMemberErrors = { ...memberErrors };
      delete newMemberErrors[field];
      return { ...prev, [index]: newMemberErrors };
    });
  }, []);

  // Update member avatar
  const updateMemberAvatar = (index: number, file: File | null, preview: string | null) => {
    setMembers(prev => prev.map((member, i) => 
      i === index ? { ...member, avatarFile: file, avatarPreview: preview } : member
    ));
  };

  // Add new department
  const handleAddNewDepartment = async (index: number, name: string) => {
    if (name.trim().length < 2) return;
    
    const trimmedName = name.trim();
    if (!departments.includes(trimmedName)) {
      setDepartments(prev => [...prev, trimmedName]);
      
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
    updateMember(index, 'department', trimmedName);
    setDepartmentOpenStates(prev => ({ ...prev, [index]: false }));
    setDepartmentSearches(prev => ({ ...prev, [index]: '' }));
  };

  // Add new position
  const handleAddNewPosition = async (index: number, name: string) => {
    if (name.trim().length < 2) return;
    
    const trimmedName = name.trim();
    const member = members[index];
    
    if (currentOrg) {
      try {
        const { data: newPos } = await supabase
          .from('positions')
          .insert({
            name: trimmedName,
            department: member.department || null,
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
    
    updateMember(index, 'position', trimmedName);
    setPositionOpenStates(prev => ({ ...prev, [index]: false }));
    setPositionSearches(prev => ({ ...prev, [index]: '' }));
  };

  // Get filtered positions for a member's department
  const getFilteredPositions = (department: string) => {
    return department
      ? positions.filter(p => !p.department || p.department === department)
      : positions;
  };

  // Build manager options (owner + team members)
  const managerOptions = [
    ...(ownerInfo ? [{ id: ownerInfo.id, name: ownerInfo.name, isOwner: true }] : []),
    ...teamMembers.map(m => ({ id: m.id, name: m.profiles.full_name, isOwner: false })),
  ];

  // Avatar handling
  const handleFileSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select an image under 5MB", variant: "destructive" });
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setTempImageSources(prev => ({ ...prev, [index]: event.target?.result as string }));
      setCropperOpenStates(prev => ({ ...prev, [index]: true }));
    };
    reader.readAsDataURL(file);
    
    const inputRef = fileInputRefs.current[index];
    if (inputRef) {
      inputRef.value = '';
    }
  };

  const handleCropComplete = (index: number, croppedBlob: Blob) => {
    const file = new File([croppedBlob], 'avatar.png', { type: 'image/png' });
    const preview = URL.createObjectURL(croppedBlob);
    updateMemberAvatar(index, file, preview);
  };

  const removeAvatar = (index: number) => {
    updateMemberAvatar(index, null, null);
  };

  const validateAllMembers = (): boolean => {
    let allValid = true;
    const newErrors: Record<number, Record<string, string>> = {};
    
    members.forEach((member, index) => {
      try {
        quickInviteSchema.parse(member);
      } catch (error) {
        allValid = false;
        if (error instanceof z.ZodError) {
          newErrors[index] = {};
          error.errors.forEach((err) => {
            if (err.path[0]) {
              newErrors[index][err.path[0] as string] = err.message;
            }
          });
        }
      }
    });
    
    setErrors(newErrors);
    return allValid;
  };

  const handleSubmit = async () => {
    if (!validateAllMembers()) {
      toast({ title: "Validation Error", description: "Please fill in all required fields for each member", variant: "destructive" });
      return;
    }

    setLoading(true);
    let successfulCount = 0;
    let errorCount = 0;
    
    for (const member of members) {
      try {
        const validated = quickInviteSchema.parse(member);
        
        // Upload avatar if exists
        let avatarUrl = '';
        if (member.avatarFile && currentOrg) {
          const fileName = `team-invites/${currentOrg.id}/${Date.now()}-${member.id}-avatar.png`;
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, member.avatarFile, { upsert: true });
            
          if (!uploadError) {
            const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(fileName);
            avatarUrl = publicUrl.publicUrl;
          }
        }
        
        const nameParts = validated.fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || nameParts[0] || '';
        
        const { invokeEdgeFunction } = await import('@/lib/edgeFunctionUtils');
        const { error } = await invokeEdgeFunction('invite-team-member', {
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
          errorCount++;
        } else {
          successfulCount++;
        }
      } catch (err) {
        errorCount++;
      }
    }
    
    setLoading(false);
    
    if (successfulCount > 0) {
      setSuccessCount(successfulCount);
      setSuccess(true);
      toast({ 
        title: `${successfulCount} Invitation${successfulCount > 1 ? 's' : ''} Sent!`, 
        description: `Team member${successfulCount > 1 ? 's' : ''} will receive email${successfulCount > 1 ? 's' : ''} with login details` 
      });
    }
    
    if (errorCount > 0 && successfulCount === 0) {
      toast({ 
        title: "Failed to Send Invitations", 
        description: "Please try again or contact support", 
        variant: "destructive" 
      });
    } else if (errorCount > 0) {
      toast({ 
        title: `${errorCount} Failed`, 
        description: "Some invitations could not be sent", 
        variant: "destructive" 
      });
    }
    
    if (successfulCount > 0) {
      setTimeout(() => {
        onSuccess?.();
        onOpenChange(false);
      }, 1500);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="py-12 text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Check className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {successCount > 1 ? `${successCount} Invitations Sent!` : 'Invitation Sent!'}
            </h2>
            <p className="text-muted-foreground">
              {successCount > 1 
                ? 'Team members will receive emails with login details to complete their onboarding.'
                : `${members[0]?.fullName || 'Team member'} will receive an email with login details to complete their onboarding.`
              }
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member{members.length > 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            Add new team members to your organization. They'll receive an email invitation.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-4 py-2">
            {members.map((member, index) => (
              <div key={member.id} className="border rounded-lg p-4 bg-card relative">
                {/* Delete button (show only if more than 1 member) */}
                {members.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMember(index)}
                    className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                
                {/* Header Row: Avatar + Toggle */}
                <div className="flex items-center gap-4 mb-4">
                  {/* Avatar Upload */}
                  <div className="relative">
                    <Avatar 
                      className="h-14 w-14 border-2 border-dashed border-muted-foreground/25 cursor-pointer"
                      onClick={() => fileInputRefs.current[index]?.click()}
                    >
                      {member.avatarPreview ? (
                        <AvatarImage src={member.avatarPreview} />
                      ) : (
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          <Camera className="h-5 w-5" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {member.avatarPreview && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full"
                        onClick={(e) => { e.stopPropagation(); removeAvatar(index); }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                    <input
                      ref={(el) => { fileInputRefs.current[index] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileSelect(index, e)}
                    />
                  </div>

                  {/* Existing/New Hire Toggle */}
                  <RadioGroup
                    value={member.isNewHire ? "new_hire" : "existing"}
                    onValueChange={(value) => updateMember(index, 'isNewHire', value === "new_hire")}
                    className="flex items-center gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="existing" id={`existing-${index}`} />
                      <Label htmlFor={`existing-${index}`} className="text-sm font-normal cursor-pointer">
                        Existing Team
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="new_hire" id={`new_hire-${index}`} />
                      <Label htmlFor={`new_hire-${index}`} className="text-sm font-normal cursor-pointer">
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
                      value={member.fullName}
                      onChange={(e) => updateMember(index, 'fullName', e.target.value)}
                      placeholder="Full name"
                      className={cn("h-9", errors[index]?.fullName && "border-destructive")}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Work Email (Username for Login) *</Label>
                    <Input
                      type="email"
                      value={member.email}
                      onChange={(e) => updateMember(index, 'email', e.target.value)}
                      placeholder="email@company.com"
                      className={cn("h-9", errors[index]?.email && "border-destructive")}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1.5 block">Office *</Label>
                    <Select value={member.officeId} onValueChange={(value) => updateMember(index, 'officeId', value)}>
                      <SelectTrigger className={cn("h-9", errors[index]?.officeId && "border-destructive")}>
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
                      value={member.managerId || ''} 
                      onValueChange={(value) => updateMember(index, 'managerId', value)}
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
                    <Popover 
                      open={departmentOpenStates[index] || false} 
                      onOpenChange={(open) => setDepartmentOpenStates(prev => ({ ...prev, [index]: open }))}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={departmentOpenStates[index] || false}
                          className={cn(
                            "w-full h-9 justify-between font-normal",
                            errors[index]?.department && "border-destructive"
                          )}
                        >
                          <span className="truncate">
                            {member.department || 'Select department...'}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder="Search or add new..." 
                            value={departmentSearches[index] || ''}
                            onValueChange={(val) => setDepartmentSearches(prev => ({ ...prev, [index]: val }))}
                          />
                          <CommandList className="max-h-[200px]">
                            {departments.filter(d => d.toLowerCase().includes((departmentSearches[index] || '').toLowerCase())).length === 0 && 
                             (departmentSearches[index] || '').trim().length < 2 && (
                              <CommandEmpty>No departments found.</CommandEmpty>
                            )}
                            <CommandGroup>
                              {departments
                                .filter(d => d.toLowerCase().includes((departmentSearches[index] || '').toLowerCase()))
                                .map((dept) => (
                                  <CommandItem
                                    key={dept}
                                    value={dept}
                                    onSelect={() => {
                                      updateMember(index, 'department', dept);
                                      setDepartmentOpenStates(prev => ({ ...prev, [index]: false }));
                                      setDepartmentSearches(prev => ({ ...prev, [index]: '' }));
                                    }}
                                  >
                                    <Check className={cn('mr-2 h-4 w-4', member.department === dept ? 'opacity-100' : 'opacity-0')} />
                                    {dept}
                                  </CommandItem>
                                ))}
                              {(departmentSearches[index] || '').trim().length >= 2 && 
                               !departments.some(d => d.toLowerCase() === (departmentSearches[index] || '').toLowerCase()) && (
                                <CommandItem
                                  value={`add-${departmentSearches[index]}`}
                                  onSelect={() => handleAddNewDepartment(index, departmentSearches[index] || '')}
                                  className="text-primary"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add "{departmentSearches[index]}"
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
                    <Popover 
                      open={positionOpenStates[index] || false} 
                      onOpenChange={(open) => setPositionOpenStates(prev => ({ ...prev, [index]: open }))}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={positionOpenStates[index] || false}
                          className={cn(
                            "w-full h-9 justify-between font-normal",
                            errors[index]?.position && "border-destructive"
                          )}
                          disabled={!member.department}
                        >
                          <span className="truncate">
                            {member.position || (member.department ? 'Select position...' : 'Select department first')}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder="Search or add new..." 
                            value={positionSearches[index] || ''}
                            onValueChange={(val) => setPositionSearches(prev => ({ ...prev, [index]: val }))}
                          />
                          <CommandList className="max-h-[200px]">
                            {getFilteredPositions(member.department).filter(p => p.name.toLowerCase().includes((positionSearches[index] || '').toLowerCase())).length === 0 && 
                             (positionSearches[index] || '').trim().length < 2 && (
                              <CommandEmpty>No positions found for this department.</CommandEmpty>
                            )}
                            <CommandGroup>
                              {getFilteredPositions(member.department)
                                .filter(p => p.name.toLowerCase().includes((positionSearches[index] || '').toLowerCase()))
                                .map((pos, idx) => (
                                  <CommandItem
                                    key={`${pos.id}-${idx}`}
                                    value={pos.name}
                                    onSelect={() => {
                                      updateMember(index, 'position', pos.name);
                                      setPositionOpenStates(prev => ({ ...prev, [index]: false }));
                                      setPositionSearches(prev => ({ ...prev, [index]: '' }));
                                    }}
                                  >
                                    <Check className={cn('mr-2 h-4 w-4', member.position === pos.name ? 'opacity-100' : 'opacity-0')} />
                                    {pos.name}
                                  </CommandItem>
                                ))}
                              {(positionSearches[index] || '').trim().length >= 2 && 
                               !getFilteredPositions(member.department).some(p => p.name.toLowerCase() === (positionSearches[index] || '').toLowerCase()) && (
                                <CommandItem
                                  value={`add-${positionSearches[index]}`}
                                  onSelect={() => handleAddNewPosition(index, positionSearches[index] || '')}
                                  className="text-primary"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add "{positionSearches[index]}"
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
                      value={member.employmentType} 
                      onValueChange={(value) => updateMember(index, 'employmentType', value)}
                      disabled={loadingEmploymentTypes}
                    >
                      <SelectTrigger className={cn("h-9", errors[index]?.employmentType && "border-destructive")}>
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
                      value={member.role} 
                      onValueChange={(value) => updateMember(index, 'role', value)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue>
                          {ROLE_OPTIONS.find(r => r.value === member.role)?.label}
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
            ))}

            {/* Add More Button with Dotted Border */}
            <Button
              type="button"
              variant="outline"
              onClick={addMember}
              className="w-full h-12 border-dashed border-2 hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add More
            </Button>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
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
                {members.length > 1 ? `Send ${members.length} Invites` : 'Send Invite'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Image Croppers - one per member */}
      {members.map((member, index) => (
        tempImageSources[index] && (
          <ImageCropper
            key={`cropper-${member.id}`}
            open={cropperOpenStates[index] || false}
            onOpenChange={(open) => {
              setCropperOpenStates(prev => ({ ...prev, [index]: open }));
              if (!open) setTempImageSources(prev => ({ ...prev, [index]: '' }));
            }}
            imageSrc={tempImageSources[index]}
            onCropComplete={(blob) => handleCropComplete(index, blob)}
            cropShape="circle"
          />
        )
      ))}
    </Dialog>
  );
}
