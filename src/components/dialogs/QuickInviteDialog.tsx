import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Check, CalendarIcon, Plus, Loader2, Camera, ChevronsUpDown, X, Users } from "lucide-react";
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
  { value: 'admin', label: 'Admin', description: 'Full access to all settings and team management' },
  { value: 'hr', label: 'HR', description: 'Manage employee records, leave, and attendance' },
  { value: 'manager', label: 'Manager', description: 'Team oversight and performance reviews' },
  { value: 'member', label: 'Member', description: 'Standard employee access' },
];

const quickInviteSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Valid email required").max(255, "Email must be less than 255 characters"),
  officeId: z.string().min(1, "Please select an office"),
  department: z.string().trim().min(2, "Department is required").max(100),
  position: z.string().trim().min(2, "Position is required").max(100),
  joinDate: z.string().optional(),
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
  const { data: employmentTypes = [], isLoading: loadingEmploymentTypes } = useEmploymentTypes(true);
  
  // Combobox state
  const [departmentOpen, setDepartmentOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [positionSearch, setPositionSearch] = useState("");
  const [managerSearch, setManagerSearch] = useState("");
  
  // Date picker state
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
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
    joinDate: "",
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
      joinDate: "",
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
    setManagerSearch("");
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
    handleChange('position', ''); // Clear position when department changes
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
    
    // Save to positions table
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
        
        // Record for AI learning
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
      
      // Split name into first/last for the API
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
        joinDate: validated.joinDate || format(new Date(), 'yyyy-MM-dd'),
        employmentType: validated.employmentType,
        role: validated.role,
        organizationId: currentOrg?.id,
        isNewHire: validated.isNewHire,
        managerId: validated.managerId || '',
        avatarUrl,
        // Optional fields with defaults
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

      // Check if user already exists (graceful skip)
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Invite a new team member with full profile setup. They'll receive an email to complete onboarding.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 py-4 pr-4">
            {/* Row 1: Avatar + Existing/New Hire Toggle */}
            <div className="flex items-start gap-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <Avatar className="h-20 w-20 border-2 border-dashed border-muted-foreground/25">
                    {avatarPreview ? (
                      <AvatarImage src={avatarPreview} />
                    ) : (
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        <Camera className="h-6 w-6" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {avatarPreview && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full"
                      onClick={removeAvatar}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Photo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Existing/New Hire Toggle */}
              <div className="flex-1 space-y-3">
                <Label>Employee Type</Label>
                <RadioGroup
                  value={formData.isNewHire ? "new" : "existing"}
                  onValueChange={(value) => handleChange('isNewHire', value === "new")}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="existing" id="existing" />
                    <Label htmlFor="existing" className="font-normal cursor-pointer">
                      Existing Team
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="new" id="new" />
                    <Label htmlFor="new" className="font-normal cursor-pointer">
                      New Hire
                    </Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  {formData.isNewHire 
                    ? "This person is a new hire joining the company" 
                    : "This person is already part of the team"}
                </p>
              </div>
            </div>

            {/* Row 2: Full Name, Work Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  className={cn(errors.fullName && "border-destructive")}
                />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Work Email <span className="text-destructive">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={cn(errors.email && "border-destructive")}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
            </div>

            {/* Row 3: Office, Manager */}
            <div className="grid grid-cols-2 gap-4">
              {/* Office */}
              <div className="space-y-2">
                <Label>Office <span className="text-destructive">*</span></Label>
                <Select value={formData.officeId} onValueChange={(value) => handleChange('officeId', value)}>
                  <SelectTrigger className={cn(errors.officeId && "border-destructive")}>
                    <SelectValue placeholder="Select office" />
                  </SelectTrigger>
                  <SelectContent>
                    {offices.map((office) => (
                      <SelectItem key={office.id} value={office.id}>{office.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.officeId && <p className="text-xs text-destructive">{errors.officeId}</p>}
              </div>

              {/* Manager */}
              <div className="space-y-2">
                <Label>Reports To</Label>
                <Popover open={managerOpen} onOpenChange={setManagerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={managerOpen}
                      className="w-full justify-between font-normal"
                    >
                      {formData.managerId ? (
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          {teamMembers.find(m => m.id === formData.managerId)?.profiles.full_name || 'Select manager'}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Select manager</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search team members..." 
                        value={managerSearch}
                        onValueChange={setManagerSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No team member found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              handleChange('managerId', '');
                              setManagerOpen(false);
                            }}
                          >
                            <span className="text-muted-foreground">No manager</span>
                          </CommandItem>
                          {teamMembers.map((member) => (
                            <CommandItem
                              key={member.id}
                              value={member.profiles.full_name}
                              onSelect={() => {
                                handleChange('managerId', member.id);
                                setManagerOpen(false);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={member.profiles.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {getInitials(member.profiles.full_name)}
                                  </AvatarFallback>
                                </Avatar>
                                {member.profiles.full_name}
                              </div>
                              {formData.managerId === member.id && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Row 4: Department, Position (searchable comboboxes) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Department */}
              <div className="space-y-2">
                <Label>Department <span className="text-destructive">*</span></Label>
                <Popover open={departmentOpen} onOpenChange={setDepartmentOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={departmentOpen}
                      className={cn(
                        "w-full justify-between font-normal",
                        errors.department && "border-destructive"
                      )}
                    >
                      {formData.department || <span className="text-muted-foreground">Select department</span>}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search or add department..." 
                        value={departmentSearch}
                        onValueChange={setDepartmentSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {departmentSearch.trim().length >= 2 ? (
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-primary"
                              onClick={() => handleAddNewDepartment(departmentSearch)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add "{departmentSearch.trim()}"
                            </Button>
                          ) : (
                            "Type to search or add new"
                          )}
                        </CommandEmpty>
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
                                {dept}
                                {formData.department === dept && (
                                  <Check className="ml-auto h-4 w-4" />
                                )}
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
                              Add "{departmentSearch.trim()}"
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.department && <p className="text-xs text-destructive">{errors.department}</p>}
              </div>

              {/* Position */}
              <div className="space-y-2">
                <Label>Position <span className="text-destructive">*</span></Label>
                <Popover open={positionOpen} onOpenChange={setPositionOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={positionOpen}
                      className={cn(
                        "w-full justify-between font-normal",
                        errors.position && "border-destructive"
                      )}
                    >
                      {formData.position || <span className="text-muted-foreground">Select position</span>}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                      <CommandInput 
                        placeholder="Search or add position..." 
                        value={positionSearch}
                        onValueChange={setPositionSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {positionSearch.trim().length >= 2 ? (
                            <Button
                              variant="ghost"
                              className="w-full justify-start text-primary"
                              onClick={() => handleAddNewPosition(positionSearch)}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add "{positionSearch.trim()}"
                            </Button>
                          ) : (
                            "Type to search or add new"
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredPositions
                            .filter(p => p.name.toLowerCase().includes(positionSearch.toLowerCase()))
                            .map((pos) => (
                              <CommandItem
                                key={pos.id}
                                value={pos.name}
                                onSelect={() => {
                                  handleChange('position', pos.name);
                                  setPositionOpen(false);
                                  setPositionSearch("");
                                }}
                              >
                                {pos.name}
                                {formData.position === pos.name && (
                                  <Check className="ml-auto h-4 w-4" />
                                )}
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
                              Add "{positionSearch.trim()}"
                            </CommandItem>
                          )}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.position && <p className="text-xs text-destructive">{errors.position}</p>}
              </div>
            </div>

            {/* Row 5: Employment Type, Role */}
            <div className="grid grid-cols-2 gap-4">
              {/* Employment Type */}
              <div className="space-y-2">
                <Label>Employment Type <span className="text-destructive">*</span></Label>
                <Select 
                  value={formData.employmentType} 
                  onValueChange={(value) => handleChange('employmentType', value)}
                  disabled={loadingEmploymentTypes}
                >
                  <SelectTrigger className={cn(errors.employmentType && "border-destructive")}>
                    <SelectValue placeholder={loadingEmploymentTypes ? "Loading..." : "Select type"} />
                  </SelectTrigger>
                  <SelectContent>
                    {employmentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.name}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.employmentType && <p className="text-xs text-destructive">{errors.employmentType}</p>}
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label>System Role <span className="text-destructive">*</span></Label>
                <Select 
                  value={formData.role} 
                  onValueChange={(value) => handleChange('role', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex flex-col">
                          <span>{role.label}</span>
                          <span className="text-xs text-muted-foreground">{role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 6: Join Date (optional) */}
            <div className="space-y-2">
              <Label>Join Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.joinDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.joinDate ? format(new Date(formData.joinDate), "PPP") : "Select date (defaults to today)"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.joinDate ? new Date(formData.joinDate) : undefined}
                    onSelect={(date) => {
                      if (date) {
                        handleChange('joinDate', format(date, 'yyyy-MM-dd'));
                        setDatePickerOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
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
