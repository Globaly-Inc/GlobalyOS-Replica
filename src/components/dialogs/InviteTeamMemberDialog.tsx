import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Check, User, MapPin, Briefcase, Shield, Phone, Upload, Camera, CheckCircle2, AlertCircle } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { FormInputField } from "@/components/FormInputField";
import { useOrganization } from "@/hooks/useOrganization";
import { ScrollArea } from "@/components/ui/scroll-area";

interface InviteTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const countries = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Australia", "Austria", "Bangladesh",
  "Belgium", "Brazil", "Canada", "Chile", "China", "Colombia", "Czech Republic", "Denmark",
  "Egypt", "Finland", "France", "Germany", "Ghana", "Greece", "Hong Kong", "Hungary", "India",
  "Indonesia", "Ireland", "Israel", "Italy", "Japan", "Kenya", "Malaysia", "Mexico", "Nepal",
  "Netherlands", "New Zealand", "Nigeria", "Norway", "Pakistan", "Peru", "Philippines",
  "Poland", "Portugal", "Romania", "Russia", "Saudi Arabia", "Singapore", "South Africa",
  "South Korea", "Spain", "Sweden", "Switzerland", "Taiwan", "Thailand", "Turkey",
  "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Vietnam"
];

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'NPR', symbol: 'रू', name: 'Nepalese Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
];

const inviteSchema = z.object({
  email: z.string().trim().email("Please enter a valid company email").max(255),
  personalEmail: z.string().trim().email("Please enter a valid personal email").max(255).optional().or(z.literal("")),
  phone: z.string().trim().min(5, "Please enter a valid phone number").max(20),
  firstName: z.string().trim().min(2, "First name must be at least 2 characters").max(50),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters").max(50),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  street: z.string().trim().min(2, "Street address is required").max(200),
  city: z.string().trim().min(2, "City is required").max(100),
  postcode: z.string().trim().max(20).optional(),
  state: z.string().trim().min(2, "State is required").max(100),
  country: z.string().trim().min(2, "Country is required").max(100),
  department: z.string().trim().min(2, "Please select a department").max(100),
  position: z.string().trim().min(2, "Position is required").max(100),
  joinDate: z.string().min(1, "Join date is required"),
  idNumber: z.string().trim().max(50).optional(),
  taxNumber: z.string().trim().max(50).optional(),
  remuneration: z.string().optional(),
  remunerationCurrency: z.string().default('USD'),
  emergencyContactName: z.string().trim().max(100).optional(),
  emergencyContactPhone: z.string().trim().max(20).optional(),
  emergencyContactRelationship: z.string().trim().max(50).optional(),
  role: z.enum(['admin', 'hr', 'member']),
  managerId: z.string().min(1, "Please select a manager"),
  officeId: z.string().min(1, "Please select an office"),
});

type FormDataType = z.infer<typeof inviteSchema>;

interface TeamMember {
  id: string;
  profiles: { full_name: string };
}

interface Office {
  id: string;
  name: string;
}

const SECTIONS = ['personal', 'address', 'employment', 'emergency', 'role'] as const;
type Section = typeof SECTIONS[number];

export function InviteTeamMemberDialog({ open, onOpenChange, onSuccess }: InviteTeamMemberDialogProps) {
  const { currentOrg } = useOrganization();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [openSections, setOpenSections] = useState<string[]>(['personal']);
  const [completedSections, setCompletedSections] = useState<Set<Section>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [departments, setDepartments] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isAddingNewDepartment, setIsAddingNewDepartment] = useState(false);
  const [isAddingNewPosition, setIsAddingNewPosition] = useState(false);
  const [newDepartment, setNewDepartment] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormDataType & { isNewHire?: string }>({
    email: "", personalEmail: "", phone: "", firstName: "", lastName: "",
    dateOfBirth: "", street: "", city: "", postcode: "", state: "", country: "",
    department: "", position: "", joinDate: "", idNumber: "", taxNumber: "",
    remuneration: "", remunerationCurrency: "USD", emergencyContactName: "",
    emergencyContactPhone: "", emergencyContactRelationship: "", role: "member",
    managerId: "", officeId: "", isNewHire: "true",
  });

  useEffect(() => {
    if (open && currentOrg) {
      loadDepartments();
      loadPositions();
      loadTeamMembers();
      loadOffices();
    }
  }, [open, currentOrg?.id]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      email: "", personalEmail: "", phone: "", firstName: "", lastName: "",
      dateOfBirth: "", street: "", city: "", postcode: "", state: "", country: "",
      department: "", position: "", joinDate: "", idNumber: "", taxNumber: "",
      remuneration: "", remunerationCurrency: "USD", emergencyContactName: "",
      emergencyContactPhone: "", emergencyContactRelationship: "", role: "member",
      managerId: "", officeId: "", isNewHire: "true",
    });
    setOpenSections(['personal']);
    setCompletedSections(new Set());
    setErrors({});
    setTouched({});
    setAvatarFile(null);
    setAvatarPreview(null);
    setSuccess(false);
    setIsAddingNewDepartment(false);
    setIsAddingNewPosition(false);
  };

  const loadDepartments = async () => {
    if (!currentOrg) return;
    const { data } = await supabase.from('employees').select('department').eq('organization_id', currentOrg.id).order('department');
    if (data) setDepartments([...new Set(data.map(e => e.department))].filter(Boolean));
  };

  const loadPositions = async () => {
    if (!currentOrg) return;
    const { data } = await supabase.from('positions').select('name').eq('organization_id', currentOrg.id).order('name');
    if (data) setPositions(data.map(p => p.name));
  };

  const loadTeamMembers = async () => {
    if (!currentOrg) return;
    const { data } = await supabase.from('employees').select(`id, profiles!inner(full_name)`).eq('organization_id', currentOrg.id).order('created_at');
    if (data) setTeamMembers(data as TeamMember[]);
  };

  const loadOffices = async () => {
    if (!currentOrg) return;
    const { data } = await supabase.from('offices').select('id, name').eq('organization_id', currentOrg.id).order('name');
    if (data) setOffices(data);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please select an image under 5MB", variant: "destructive" });
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing valid input
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const handleBlur = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  // Validate on formData or touched changes
  useEffect(() => {
    Object.keys(touched).forEach(field => {
      if (touched[field]) {
        try {
          const fieldSchema = inviteSchema.shape[field as keyof typeof inviteSchema.shape];
          if (fieldSchema) {
            fieldSchema.parse(formData[field as keyof FormDataType]);
            setErrors(prev => {
              const newErrors = { ...prev };
              delete newErrors[field];
              return newErrors;
            });
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            setErrors(prev => ({ ...prev, [field]: error.errors[0]?.message || 'Invalid value' }));
          }
        }
      }
    });
  }, [formData, touched]);

  const getSectionErrors = useCallback((section: Section): string[] => {
    const sectionFields: Record<Section, string[]> = {
      personal: ['firstName', 'lastName', 'dateOfBirth', 'phone', 'email', 'personalEmail'],
      address: ['street', 'city', 'state', 'country', 'postcode'],
      employment: ['department', 'position', 'managerId', 'officeId', 'joinDate', 'idNumber', 'taxNumber', 'remuneration'],
      emergency: ['emergencyContactName', 'emergencyContactPhone', 'emergencyContactRelationship'],
      role: ['role'],
    };
    return sectionFields[section].filter(field => touched[field] && errors[field]);
  }, [touched, errors]);

  const isSectionComplete = useCallback((section: Section): boolean => {
    switch (section) {
      case 'personal':
        return !!(formData.firstName && formData.lastName && formData.dateOfBirth && formData.phone && formData.email);
      case 'address':
        return !!(formData.street && formData.city && formData.state && formData.country);
      case 'employment':
        return !!(formData.department && formData.position && formData.managerId && formData.officeId && formData.joinDate);
      case 'emergency':
        return true; // Optional section
      case 'role':
        return !!formData.role;
      default:
        return false;
    }
  }, [formData]);

  useEffect(() => {
    const newCompleted = new Set<Section>();
    SECTIONS.forEach(section => {
      if (isSectionComplete(section)) newCompleted.add(section);
    });
    setCompletedSections(newCompleted);

    // Auto-expand next section with smooth scroll
    for (let i = 0; i < SECTIONS.length - 1; i++) {
      if (isSectionComplete(SECTIONS[i]) && !openSections.includes(SECTIONS[i + 1])) {
        const nextSection = SECTIONS[i + 1];
        setOpenSections(prev => [...prev, nextSection]);
        
        // Scroll to the next section after a short delay to allow accordion animation
        setTimeout(() => {
          const sectionElement = document.querySelector(`[data-section="${nextSection}"]`);
          if (sectionElement) {
            sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 150);
        break;
      }
    }
  }, [formData, isSectionComplete]);

  const validateForm = () => {
    try {
      inviteSchema.parse(formData);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        const allTouched: Record<string, boolean> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
            allTouched[err.path[0] as string] = true;
          }
        });
        setErrors(fieldErrors);
        setTouched(prev => ({ ...prev, ...allTouched }));
      }
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({ title: "Validation Error", description: "Please fill in all required fields", variant: "destructive" });
      setOpenSections(SECTIONS.map(s => s)); // Open all sections to show errors
      return;
    }

    setLoading(true);
    try {
      let avatarUrl = null;
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `invites/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, avatarFile);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
          avatarUrl = publicUrl;
        }
      }

      const validated = inviteSchema.parse(formData);
      const { data, error } = await supabase.functions.invoke('invite-team-member', {
        body: {
          ...validated,
          fullName: `${validated.firstName} ${validated.lastName}`,
          avatarUrl,
          organizationId: currentOrg?.id,
          isNewHire: formData.isNewHire !== 'false',
        },
      });

      if (error || data?.error) {
        toast({ title: "Error", description: error?.message || data?.error || "Failed to invite team member", variant: "destructive" });
        return;
      }

      setSuccess(true);
      toast({ title: "Team Member Added!", description: `${formData.firstName} ${formData.lastName} has been added and will receive login details` });
      setTimeout(() => {
        onSuccess?.();
        onOpenChange(false);
      }, 1500);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getSectionIcon = (section: Section, completed: boolean) => {
    const errorCount = getSectionErrors(section).length;
    if (errorCount > 0) return <AlertCircle className="h-4 w-4 text-destructive" />;
    if (completed) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    switch (section) {
      case 'personal': return <User className="h-4 w-4" />;
      case 'address': return <MapPin className="h-4 w-4" />;
      case 'employment': return <Briefcase className="h-4 w-4" />;
      case 'emergency': return <Phone className="h-4 w-4" />;
      case 'role': return <Shield className="h-4 w-4" />;
    }
  };

  const getSectionLabel = (section: Section, label: string, optional?: boolean) => {
    const errorCount = getSectionErrors(section).length;
    return (
      <div className="flex items-center gap-2">
        <span>{label}</span>
        {optional && <span className="text-xs text-muted-foreground">(Optional)</span>}
        {errorCount > 0 && (
          <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full">
            {errorCount} {errorCount === 1 ? 'error' : 'errors'}
          </span>
        )}
      </div>
    );
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="py-12 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Team Member Added!</h2>
            <p className="text-muted-foreground">{formData.firstName} {formData.lastName} has been added and will receive a confirmation email with login details.</p>
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
            Add New Team Member
          </DialogTitle>
          <DialogDescription>Add a new member to your team. They will be set as active and receive login credentials via email.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          <Accordion type="multiple" value={openSections} onValueChange={setOpenSections} className="space-y-2">
            {/* Personal Information */}
            <AccordionItem value="personal" data-section="personal" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  {getSectionIcon('personal', completedSections.has('personal'))}
                  {getSectionLabel('personal', 'Personal Information')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="h-16 w-16 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      <AvatarImage src={avatarPreview || undefined} />
                      <AvatarFallback className="bg-muted"><Camera className="h-6 w-6 text-muted-foreground" /></AvatarFallback>
                    </Avatar>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 h-6 w-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md">
                      <Upload className="h-3 w-3" />
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  </div>
                  <div className="text-sm text-muted-foreground">Upload photo (optional)</div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInputField id="firstName" label="First Name" value={formData.firstName} onChange={(v) => handleChange('firstName', v)} onBlur={() => handleBlur('firstName')} required placeholder="John" error={errors.firstName} touched={touched.firstName} />
                  <FormInputField id="lastName" label="Last Name" value={formData.lastName} onChange={(v) => handleChange('lastName', v)} onBlur={() => handleBlur('lastName')} required placeholder="Doe" error={errors.lastName} touched={touched.lastName} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Date of Birth <span className="text-destructive">*</span></Label>
                    <Input type="date" value={formData.dateOfBirth} onChange={(e) => handleChange('dateOfBirth', e.target.value)} className={cn(touched.dateOfBirth && errors.dateOfBirth && "border-destructive")} />
                    {touched.dateOfBirth && errors.dateOfBirth && <p className="text-sm text-destructive">{errors.dateOfBirth}</p>}
                  </div>
                  <FormInputField id="phone" label="Personal Phone" type="tel" value={formData.phone} onChange={(v) => handleChange('phone', v)} onBlur={() => handleBlur('phone')} required placeholder="+1 234 567 8900" error={errors.phone} touched={touched.phone} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInputField id="email" label="Company Email" type="email" value={formData.email} onChange={(v) => handleChange('email', v)} onBlur={() => handleBlur('email')} required placeholder="john@company.com" error={errors.email} touched={touched.email} />
                  <FormInputField id="personalEmail" label="Personal Email" type="email" value={formData.personalEmail} onChange={(v) => handleChange('personalEmail', v)} onBlur={() => handleBlur('personalEmail')} placeholder="john@gmail.com" />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Address */}
            <AccordionItem value="address" data-section="address" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  {getSectionIcon('address', completedSections.has('address'))}
                  {getSectionLabel('address', 'Address')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6 space-y-4">
                <FormInputField id="street" label="Street Address" value={formData.street} onChange={(v) => handleChange('street', v)} onBlur={() => handleBlur('street')} required placeholder="123 Main Street" error={errors.street} touched={touched.street} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInputField id="city" label="City" value={formData.city} onChange={(v) => handleChange('city', v)} onBlur={() => handleBlur('city')} required placeholder="New York" error={errors.city} touched={touched.city} />
                  <FormInputField id="state" label="State / Province" value={formData.state} onChange={(v) => handleChange('state', v)} onBlur={() => handleBlur('state')} required placeholder="New York" error={errors.state} touched={touched.state} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormInputField id="postcode" label="Postcode" value={formData.postcode} onChange={(v) => handleChange('postcode', v)} onBlur={() => handleBlur('postcode')} placeholder="10001" />
                  <div className="space-y-2">
                    <Label>Country <span className="text-destructive">*</span></Label>
                    <Select value={formData.country} onValueChange={(v) => { handleChange('country', v); setTouched(p => ({ ...p, country: true })); }}>
                      <SelectTrigger className={cn(touched.country && errors.country && "border-destructive")}><SelectValue placeholder="Select country" /></SelectTrigger>
                      <SelectContent className="bg-popover">{countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                    {touched.country && errors.country && <p className="text-sm text-destructive">{errors.country}</p>}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Employment Details */}
            <AccordionItem value="employment" data-section="employment" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  {getSectionIcon('employment', completedSections.has('employment'))}
                  {getSectionLabel('employment', 'Employment Details')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Department <span className="text-destructive">*</span></Label>
                    {isAddingNewDepartment ? (
                      <div className="space-y-2">
                        <Input placeholder="Enter new department" value={newDepartment} onChange={(e) => { setNewDepartment(e.target.value); handleChange('department', e.target.value); }} autoFocus />
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setIsAddingNewDepartment(false); setNewDepartment(""); handleChange('department', ""); }}>Cancel</Button>
                      </div>
                    ) : (
                      <Select value={formData.department} onValueChange={(v) => { if (v === '__new__') { setIsAddingNewDepartment(true); } else { handleChange('department', v); } setTouched(p => ({ ...p, department: true })); }}>
                        <SelectTrigger className={cn(touched.department && errors.department && "border-destructive")}><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent className="bg-popover">{departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}<SelectItem value="__new__" className="text-primary font-medium">+ Add new...</SelectItem></SelectContent>
                      </Select>
                    )}
                    {touched.department && errors.department && <p className="text-sm text-destructive">{errors.department}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Position <span className="text-destructive">*</span></Label>
                    {isAddingNewPosition ? (
                      <div className="space-y-2">
                        <Input placeholder="Enter new position" value={newPosition} onChange={(e) => { setNewPosition(e.target.value); handleChange('position', e.target.value); }} autoFocus />
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setIsAddingNewPosition(false); setNewPosition(""); handleChange('position', ""); }}>Cancel</Button>
                      </div>
                    ) : (
                      <Select value={formData.position} onValueChange={(v) => { if (v === '__new__') { setIsAddingNewPosition(true); } else { handleChange('position', v); } setTouched(p => ({ ...p, position: true })); }}>
                        <SelectTrigger className={cn(touched.position && errors.position && "border-destructive")}><SelectValue placeholder="Select position" /></SelectTrigger>
                        <SelectContent className="bg-popover">{positions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}<SelectItem value="__new__" className="text-primary font-medium">+ Add new...</SelectItem></SelectContent>
                      </Select>
                    )}
                    {touched.position && errors.position && <p className="text-sm text-destructive">{errors.position}</p>}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Manager <span className="text-destructive">*</span></Label>
                    <Select value={formData.managerId} onValueChange={(v) => handleChange('managerId', v)}>
                      <SelectTrigger className={cn(touched.managerId && errors.managerId && "border-destructive")}><SelectValue placeholder="Select manager" /></SelectTrigger>
                      <SelectContent className="bg-popover">{teamMembers.map(m => <SelectItem key={m.id} value={m.id}>{m.profiles.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                    {touched.managerId && errors.managerId && <p className="text-sm text-destructive">{errors.managerId}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Office <span className="text-destructive">*</span></Label>
                    <Select value={formData.officeId} onValueChange={(v) => handleChange('officeId', v)}>
                      <SelectTrigger className={cn(touched.officeId && errors.officeId && "border-destructive")}><SelectValue placeholder="Select office" /></SelectTrigger>
                      <SelectContent className="bg-popover">{offices.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
                    </Select>
                    {touched.officeId && errors.officeId && <p className="text-sm text-destructive">{errors.officeId}</p>}
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Join Date <span className="text-destructive">*</span></Label>
                    <Input type="date" value={formData.joinDate} onChange={(e) => handleChange('joinDate', e.target.value)} className={cn(touched.joinDate && errors.joinDate && "border-destructive")} />
                    {touched.joinDate && errors.joinDate && <p className="text-sm text-destructive">{errors.joinDate}</p>}
                  </div>
                  <FormInputField id="idNumber" label="ID Number" value={formData.idNumber || ""} onChange={(v) => handleChange('idNumber', v)} onBlur={() => handleBlur('idNumber')} placeholder="Employee ID" />
                  <FormInputField id="taxNumber" label="Tax Number" value={formData.taxNumber || ""} onChange={(v) => handleChange('taxNumber', v)} onBlur={() => handleBlur('taxNumber')} placeholder="Tax ID" />
                </div>
                <div className="space-y-2">
                  <Label>Current Remuneration</Label>
                  <div className="flex gap-2">
                    <Select value={formData.remunerationCurrency} onValueChange={(v) => handleChange('remunerationCurrency', v)}>
                      <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover">{currencies.map(c => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="text" inputMode="numeric" value={formData.remuneration ? Number(formData.remuneration).toLocaleString() : ""} onChange={(e) => { const v = e.target.value.replace(/,/g, ''); if (v === '' || /^\d*$/.test(v)) handleChange('remuneration', v); }} placeholder="Annual salary" className="flex-1" />
                  </div>
                </div>
                
                {/* New Hire Checkbox */}
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                  <input
                    type="checkbox"
                    id="isNewHire"
                    checked={formData.isNewHire !== 'false'}
                    onChange={(e) => handleChange('isNewHire', e.target.checked ? 'true' : 'false')}
                    className="h-4 w-4 rounded border-input"
                  />
                  <div className="flex-1">
                    <Label htmlFor="isNewHire" className="font-medium cursor-pointer">
                      New hire (requires onboarding)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Uncheck for existing employees being added to the system
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Emergency Contact */}
            <AccordionItem value="emergency" data-section="emergency" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  {getSectionIcon('emergency', completedSections.has('emergency'))}
                  {getSectionLabel('emergency', 'Emergency Contact', true)}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormInputField id="emergencyContactName" label="Contact Name" value={formData.emergencyContactName || ""} onChange={(v) => handleChange('emergencyContactName', v)} onBlur={() => handleBlur('emergencyContactName')} placeholder="Jane Doe" />
                  <FormInputField id="emergencyContactPhone" label="Contact Phone" type="tel" value={formData.emergencyContactPhone || ""} onChange={(v) => handleChange('emergencyContactPhone', v)} onBlur={() => handleBlur('emergencyContactPhone')} placeholder="+1 234 567 8900" />
                  <FormInputField id="emergencyContactRelationship" label="Relationship" value={formData.emergencyContactRelationship || ""} onChange={(v) => handleChange('emergencyContactRelationship', v)} onBlur={() => handleBlur('emergencyContactRelationship')} placeholder="Spouse, Parent" />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* System Role */}
            <AccordionItem value="role" data-section="role" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  {getSectionIcon('role', completedSections.has('role'))}
                  {getSectionLabel('role', 'System Role')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 pb-6 space-y-4">
                <div className="space-y-2">
                  <Label>Role <span className="text-destructive">*</span></Label>
                  <Select value={formData.role} onValueChange={(v: 'admin' | 'hr' | 'member') => handleChange('role', v)}>
                    <SelectTrigger className="max-w-xs"><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="hr">HR Manager</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {formData.role === 'admin' && "Full access to all features and settings"}
                    {formData.role === 'hr' && "Can manage employees, leave requests, and HR functions"}
                    {formData.role === 'member' && "Standard access to view team and personal information"}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>

        <div className="flex gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1">
            {loading ? <span className="flex items-center gap-2"><span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Sending...</span> : <><UserPlus className="h-4 w-4 mr-2" />Send Confirmation</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
