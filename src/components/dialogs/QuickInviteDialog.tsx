import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Check, CalendarIcon, Plus, Loader2 } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { useOrganization } from "@/hooks/useOrganization";
import { useEmploymentTypes } from "@/hooks/useEmploymentTypes";
import { format } from "date-fns";

interface QuickInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface Office {
  id: string;
  name: string;
}

const quickInviteSchema = z.object({
  fullName: z.string().trim().min(2, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Valid email required").max(255, "Email must be less than 255 characters"),
  officeId: z.string().min(1, "Please select an office"),
  department: z.string().trim().min(2, "Department is required").max(100),
  position: z.string().trim().min(2, "Position is required").max(100),
  joinDate: z.string().min(1, "Join date is required"),
  employmentType: z.string().min(1, "Please select employment type"),
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
  const [positions, setPositions] = useState<string[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const { data: employmentTypes = [], isLoading: loadingEmploymentTypes } = useEmploymentTypes(true);
  
  // Inline add state
  const [isAddingNewDepartment, setIsAddingNewDepartment] = useState(false);
  const [isAddingNewPosition, setIsAddingNewPosition] = useState(false);
  const [newDepartment, setNewDepartment] = useState("");
  const [newPosition, setNewPosition] = useState("");
  
  // Date picker state
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const [formData, setFormData] = useState<QuickInviteFormData>({
    fullName: "",
    email: "",
    officeId: "",
    department: "",
    position: "",
    joinDate: "",
    employmentType: "",
  });

  useEffect(() => {
    if (open && currentOrg) {
      loadDepartments();
      loadPositions();
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
      fullName: "",
      email: "",
      officeId: "",
      department: "",
      position: "",
      joinDate: "",
      employmentType: "",
    });
    setErrors({});
    setSuccess(false);
    setIsAddingNewDepartment(false);
    setIsAddingNewPosition(false);
    setNewDepartment("");
    setNewPosition("");
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

  const loadOffices = async () => {
    if (!currentOrg) return;
    const { data } = await supabase.from('offices').select('id, name').eq('organization_id', currentOrg.id).order('name');
    if (data) setOffices(data);
  };

  const handleChange = useCallback((field: keyof QuickInviteFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const handleAddNewDepartment = () => {
    if (newDepartment.trim().length >= 2) {
      setDepartments(prev => [...prev, newDepartment.trim()]);
      handleChange('department', newDepartment.trim());
      setNewDepartment("");
      setIsAddingNewDepartment(false);
    }
  };

  const handleAddNewPosition = () => {
    if (newPosition.trim().length >= 2) {
      setPositions(prev => [...prev, newPosition.trim()]);
      handleChange('position', newPosition.trim());
      setNewPosition("");
      setIsAddingNewPosition(false);
    }
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
        joinDate: validated.joinDate,
        employmentType: validated.employmentType,
        role: 'member', // Default role
        organizationId: currentOrg?.id,
        isNewHire: false,
        // Optional fields with defaults
        phone: '',
        dateOfBirth: '',
        street: '',
        city: '',
        state: '',
        country: '',
        managerId: '',
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

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="py-12 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Quick invite a new team member. They'll complete their profile during onboarding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Full Name */}
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

          {/* Email */}
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

          {/* Office & Department row */}
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

            {/* Department */}
            <div className="space-y-2">
              <Label>Department <span className="text-destructive">*</span></Label>
              {isAddingNewDepartment ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="New department"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNewDepartment()}
                    autoFocus
                  />
                  <Button type="button" size="icon" variant="ghost" onClick={handleAddNewDepartment}>
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Select value={formData.department} onValueChange={(value) => {
                  if (value === '__add_new__') {
                    setIsAddingNewDepartment(true);
                  } else {
                    handleChange('department', value);
                  }
                }}>
                  <SelectTrigger className={cn(errors.department && "border-destructive")}>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                    <SelectItem value="__add_new__" className="text-primary">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add new department
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              {errors.department && <p className="text-xs text-destructive">{errors.department}</p>}
            </div>
          </div>

          {/* Position & Employment Type row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Position */}
            <div className="space-y-2">
              <Label>Position <span className="text-destructive">*</span></Label>
              {isAddingNewPosition ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="New position"
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNewPosition()}
                    autoFocus
                  />
                  <Button type="button" size="icon" variant="ghost" onClick={handleAddNewPosition}>
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Select value={formData.position} onValueChange={(value) => {
                  if (value === '__add_new__') {
                    setIsAddingNewPosition(true);
                  } else {
                    handleChange('position', value);
                  }
                }}>
                  <SelectTrigger className={cn(errors.position && "border-destructive")}>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                    ))}
                    <SelectItem value="__add_new__" className="text-primary">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add new position
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              {errors.position && <p className="text-xs text-destructive">{errors.position}</p>}
            </div>

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
          </div>

          {/* Join Date */}
          <div className="space-y-2">
            <Label>Join Date <span className="text-destructive">*</span></Label>
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.joinDate && "text-muted-foreground",
                    errors.joinDate && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.joinDate ? format(new Date(formData.joinDate), "PPP") : "Select date"}
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
            {errors.joinDate && <p className="text-xs text-destructive">{errors.joinDate}</p>}
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
    </Dialog>
  );
}
