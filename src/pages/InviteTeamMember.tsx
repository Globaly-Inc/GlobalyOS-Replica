import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, UserPlus, Check, User, MapPin, Briefcase, Shield, Phone, Upload, Camera, ArrowRight, Edit } from "lucide-react";
import { z } from "zod";
import { cn, formatDate } from "@/lib/utils";
import { FormInputField } from "@/components/FormInputField";
import { useOrganization } from "@/hooks/useOrganization";

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
  joinDate: z.string().optional(),
  idNumber: z.string().trim().max(50).optional(),
  taxNumber: z.string().trim().max(50).optional(),
  remuneration: z.string().optional(),
  remunerationCurrency: z.string().default('USD'),
  emergencyContactName: z.string().trim().max(100).optional(),
  emergencyContactPhone: z.string().trim().max(20).optional(),
  emergencyContactRelationship: z.string().trim().max(50).optional(),
  role: z.enum(['admin', 'hr', 'user']),
  managerId: z.string().min(1, "Please select a manager"),
  officeId: z.string().min(1, "Please select an office"),
});

type FormDataType = z.infer<typeof inviteSchema>;

interface TeamMember {
  id: string;
  profiles: {
    full_name: string;
  };
}

interface Office {
  id: string;
  name: string;
}

const InviteTeamMember = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { currentOrg } = useOrganization();
  const [success, setSuccess] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();
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

  const [formData, setFormData] = useState<FormDataType>({
    email: "",
    personalEmail: "",
    phone: "",
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    street: "",
    city: "",
    postcode: "",
    state: "",
    country: "",
    department: "",
    position: "",
    joinDate: "",
    idNumber: "",
    taxNumber: "",
    remuneration: "",
    remunerationCurrency: "USD",
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    role: "user",
    managerId: "",
    officeId: "",
  });

  useEffect(() => {
    if (currentOrg) {
      loadDepartments();
      loadPositions();
      loadTeamMembers();
      loadOffices();
    }
  }, [currentOrg?.id]);

  const loadDepartments = async () => {
    if (!currentOrg) return;
    const { data } = await supabase
      .from('employees')
      .select('department')
      .eq('organization_id', currentOrg.id)
      .order('department');
    
    if (data) {
      const uniqueDepts = [...new Set(data.map(e => e.department))].filter(Boolean);
      setDepartments(uniqueDepts);
    }
  };

  const loadPositions = async () => {
    if (!currentOrg) return;
    const { data } = await supabase
      .from('positions')
      .select('name')
      .eq('organization_id', currentOrg.id)
      .order('name');
    
    if (data) {
      setPositions(data.map(p => p.name));
    }
  };

  const loadTeamMembers = async () => {
    if (!currentOrg) return;
    const { data } = await supabase
      .from('employees')
      .select(`
        id,
        profiles!inner(full_name)
      `)
      .eq('organization_id', currentOrg.id)
      .order('created_at');
    
    if (data) {
      setTeamMembers(data as TeamMember[]);
    }
  };

  const loadOffices = async () => {
    if (!currentOrg) return;
    const { data } = await supabase
      .from('offices')
      .select('id, name')
      .eq('organization_id', currentOrg.id)
      .order('name');
    
    if (data) {
      setOffices(data);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive",
        });
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateField = useCallback((field: string, value: string) => {
    try {
      const fieldSchema = inviteSchema.shape[field as keyof typeof inviteSchema.shape];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setErrors(prev => {
          if (prev[field] === "") return prev;
          return { ...prev, [field]: "" };
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => {
          if (prev[field] === error.errors[0].message) return prev;
          return { ...prev, [field]: error.errors[0].message };
        });
      }
    }
  }, []);

  const handleBlur = useCallback((field: string) => {
    setTouched(prev => {
      if (prev[field]) return prev;
      return { ...prev, [field]: true };
    });
  }, []);

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

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

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowPreview(true);
    } else {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async () => {
    setErrors({});

    try {
      const validated = inviteSchema.parse(formData);
      setLoading(true);

      let avatarUrl = null;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        // Use invites folder for HR/admin uploads during onboarding
        const fileName = `invites/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatarUrl = publicUrl;
        }
      }

      const { data, error } = await supabase.functions.invoke('invite-team-member', {
        body: {
          ...validated,
          fullName: `${validated.firstName} ${validated.lastName}`,
          avatarUrl,
          managerId: formData.managerId,
          officeId: formData.officeId,
          organizationId: currentOrg?.id,
        },
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to invite team member",
          variant: "destructive",
        });
        return;
      }

      if (data?.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setSuccess(true);
      toast({
        title: "Invitation Sent!",
        description: `${formData.firstName} ${formData.lastName} has been invited to join TeamHub`,
      });
      
      setTimeout(() => {
        navigate('/team');
      }, 1500);

    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      } else {
        toast({
          title: "Error",
          description: "Something went wrong",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'hr': return 'HR Manager';
      default: return 'Team Member';
    }
  };

  const getCurrencySymbol = (code: string) => {
    return currencies.find(c => c.code === code)?.symbol || '$';
  };

  if (success) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto flex items-center justify-center min-h-[60vh]">
          <Card className="w-full animate-scale-in">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 animate-scale-in">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Invitation Sent!</h2>
              <p className="text-muted-foreground">
                {formData.firstName} {formData.lastName} will receive an email invitation shortly.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (showPreview) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Review & Confirm</h1>
              <p className="text-muted-foreground">Review the details before sending the invitation</p>
            </div>
          </div>

          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center gap-6 pb-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10">
                  {formData.firstName[0]}{formData.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{formData.firstName} {formData.lastName}</h2>
                <p className="text-muted-foreground">{formData.position} • {formData.department}</p>
                <span className="inline-flex items-center mt-2 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {getRoleLabel(formData.role)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">Contact Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Company Email:</span> {formData.email}</p>
                    {formData.personalEmail && (
                      <p><span className="text-muted-foreground">Personal Email:</span> {formData.personalEmail}</p>
                    )}
                    <p><span className="text-muted-foreground">Personal Phone:</span> {formData.phone}</p>
                    {formData.managerId && (
                      <p><span className="text-muted-foreground">Manager:</span> {teamMembers.find(m => m.id === formData.managerId)?.profiles.full_name}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">Address</h3>
                  <div className="space-y-1 text-sm">
                    <p>{formData.street}</p>
                    <p>{formData.city}, {formData.state} {formData.postcode}</p>
                    <p>{formData.country}</p>
                  </div>
                </div>
              </div>

              {(formData.joinDate || formData.idNumber || formData.taxNumber || formData.remuneration) && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">Employment Details</h3>
                  <div className="grid gap-4 md:grid-cols-2 text-sm">
                    {formData.joinDate && (
                      <p><span className="text-muted-foreground">Join Date:</span> {formatDate(formData.joinDate)}</p>
                    )}
                    {formData.idNumber && (
                      <p><span className="text-muted-foreground">ID Number:</span> {formData.idNumber}</p>
                    )}
                    {formData.taxNumber && (
                      <p><span className="text-muted-foreground">Tax Number:</span> {formData.taxNumber}</p>
                    )}
                    {formData.remuneration && (
                      <p><span className="text-muted-foreground">Remuneration:</span> {getCurrencySymbol(formData.remunerationCurrency)}{Number(formData.remuneration).toLocaleString()} {formData.remunerationCurrency}/year</p>
                    )}
                  </div>
                </div>
              )}

              {(formData.emergencyContactName || formData.emergencyContactPhone) && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">Emergency Contact</h3>
                  <div className="text-sm">
                    <p>{formData.emergencyContactName} {formData.emergencyContactRelationship && `(${formData.emergencyContactRelationship})`}</p>
                    {formData.emergencyContactPhone && <p>{formData.emergencyContactPhone}</p>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => setShowPreview(false)} className="flex-1">
              <Edit className="h-4 w-4 mr-2" />
              Edit Details
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Confirm & Send Invitation
                </>
              )}
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/team')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Invite New Team Member</h1>
            <p className="text-muted-foreground">Add a new member to your team</p>
          </div>
        </div>

        <form onSubmit={handlePreview} className="space-y-6">
          {/* Profile Photo & Personal Information */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Basic information about the team member</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <AvatarImage src={avatarPreview || undefined} />
                    <AvatarFallback className="bg-muted">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 h-8 w-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    tabIndex={-1}
                  />
                </div>
                <div>
                  <p className="font-medium">Profile Photo</p>
                  <p className="text-sm text-muted-foreground">Click to upload a photo (max 5MB)</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <FormInputField
                  id="firstName"
                  label="First Name"
                  value={formData.firstName}
                  onChange={(value) => handleChange('firstName', value)}
                  onBlur={() => {
                    handleBlur('firstName');
                    validateField('firstName', formData.firstName);
                  }}
                  required
                  placeholder="John"
                  error={errors.firstName}
                  touched={touched.firstName}
                />
                <FormInputField
                  id="lastName"
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(value) => handleChange('lastName', value)}
                  onBlur={() => {
                    handleBlur('lastName');
                    validateField('lastName', formData.lastName);
                  }}
                  required
                  placeholder="Doe"
                  error={errors.lastName}
                  touched={touched.lastName}
                />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth <span className="text-destructive">*</span></Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                    onBlur={() => handleBlur('dateOfBirth')}
                    className={cn("transition-all duration-200", touched.dateOfBirth && errors.dateOfBirth && "border-destructive")}
                  />
                  {touched.dateOfBirth && errors.dateOfBirth && (
                    <p className="text-sm text-destructive">{errors.dateOfBirth}</p>
                  )}
                </div>
                <FormInputField
                  id="phone"
                  label="Personal Phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(value) => handleChange('phone', value)}
                  onBlur={() => {
                    handleBlur('phone');
                    validateField('phone', formData.phone);
                  }}
                  required
                  placeholder="+1 234 567 8900"
                  error={errors.phone}
                  touched={touched.phone}
                />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <FormInputField
                  id="email"
                  label="Company Email"
                  type="email"
                  value={formData.email}
                  onChange={(value) => handleChange('email', value)}
                  onBlur={() => {
                    handleBlur('email');
                    validateField('email', formData.email);
                  }}
                  required
                  placeholder="john@company.com"
                  error={errors.email}
                  touched={touched.email}
                />
                <FormInputField
                  id="personalEmail"
                  label="Personal Email"
                  type="email"
                  value={formData.personalEmail}
                  onChange={(value) => handleChange('personalEmail', value)}
                  onBlur={() => handleBlur('personalEmail')}
                  placeholder="john@gmail.com"
                  error={errors.personalEmail}
                  touched={touched.personalEmail}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address
              </CardTitle>
              <CardDescription>Full residential address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormInputField
                id="street"
                label="Street Address"
                value={formData.street}
                onChange={(value) => handleChange('street', value)}
                onBlur={() => {
                  handleBlur('street');
                  validateField('street', formData.street);
                }}
                required
                placeholder="123 Main Street"
                error={errors.street}
                touched={touched.street}
              />
              <div className="grid gap-6 sm:grid-cols-2">
                <FormInputField
                  id="city"
                  label="City"
                  value={formData.city}
                  onChange={(value) => handleChange('city', value)}
                  onBlur={() => {
                    handleBlur('city');
                    validateField('city', formData.city);
                  }}
                  required
                  placeholder="New York"
                  error={errors.city}
                  touched={touched.city}
                />
                <FormInputField
                  id="state"
                  label="State / Province"
                  value={formData.state}
                  onChange={(value) => handleChange('state', value)}
                  onBlur={() => {
                    handleBlur('state');
                    validateField('state', formData.state);
                  }}
                  required
                  placeholder="New York"
                  error={errors.state}
                  touched={touched.state}
                />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <FormInputField
                  id="postcode"
                  label="Postcode"
                  value={formData.postcode}
                  onChange={(value) => handleChange('postcode', value)}
                  onBlur={() => handleBlur('postcode')}
                  placeholder="10001"
                  error={errors.postcode}
                  touched={touched.postcode}
                />
                <div className="space-y-2">
                  <Label htmlFor="country" className="flex items-center gap-1">
                    Country <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.country}
                    onValueChange={(value) => {
                      handleChange('country', value);
                      setTouched(prev => ({ ...prev, country: true }));
                    }}
                  >
                    <SelectTrigger className={cn(
                      "transition-all duration-200",
                      touched.country && errors.country && "border-destructive",
                      touched.country && !errors.country && formData.country && "border-green-500"
                    )}>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country} value={country}>{country}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {touched.country && errors.country && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      {errors.country}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employment Details (includes Department & Position) */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Employment Details
              </CardTitle>
              <CardDescription>Work role and employment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="department" className="flex items-center gap-1">
                    Department <span className="text-destructive">*</span>
                  </Label>
                  {isAddingNewDepartment ? (
                    <div className="space-y-2">
                      <Input
                        placeholder="Enter new department name"
                        value={newDepartment}
                        onChange={(e) => {
                          setNewDepartment(e.target.value);
                          handleChange('department', e.target.value);
                        }}
                        autoFocus
                        className={cn(
                          "transition-all duration-200",
                          touched.department && errors.department && "border-destructive",
                          touched.department && !errors.department && newDepartment && "border-green-500"
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsAddingNewDepartment(false);
                          setNewDepartment("");
                          handleChange('department', "");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={formData.department}
                      onValueChange={(value) => {
                        if (value === '__new__') {
                          setIsAddingNewDepartment(true);
                          setNewDepartment("");
                          handleChange('department', "");
                        } else {
                          handleChange('department', value);
                        }
                        setTouched(prev => ({ ...prev, department: true }));
                      }}
                    >
                      <SelectTrigger className={cn(
                        "transition-all duration-200",
                        touched.department && errors.department && "border-destructive",
                        touched.department && !errors.department && formData.department && "border-green-500"
                      )}>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                        <SelectItem value="__new__" className="text-primary font-medium">
                          + Add new department...
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {touched.department && errors.department && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      {errors.department}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position" className="flex items-center gap-1">
                    Position <span className="text-destructive">*</span>
                  </Label>
                  {isAddingNewPosition ? (
                    <div className="space-y-2">
                      <Input
                        placeholder="Enter new position title"
                        value={newPosition}
                        onChange={(e) => {
                          setNewPosition(e.target.value);
                          handleChange('position', e.target.value);
                        }}
                        autoFocus
                        className={cn(
                          "transition-all duration-200",
                          touched.position && errors.position && "border-destructive",
                          touched.position && !errors.position && newPosition && "border-green-500"
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsAddingNewPosition(false);
                          setNewPosition("");
                          handleChange('position', "");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={formData.position}
                      onValueChange={(value) => {
                        if (value === '__new__') {
                          setIsAddingNewPosition(true);
                          setNewPosition("");
                          handleChange('position', "");
                        } else {
                          handleChange('position', value);
                        }
                        setTouched(prev => ({ ...prev, position: true }));
                      }}
                    >
                      <SelectTrigger className={cn(
                        "transition-all duration-200",
                        touched.position && errors.position && "border-destructive",
                        touched.position && !errors.position && formData.position && "border-green-500"
                      )}>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map((pos) => (
                          <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                        ))}
                        <SelectItem value="__new__" className="text-primary font-medium">
                          + Add new position...
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {touched.position && errors.position && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      {errors.position}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manager">Manager <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.managerId}
                    onValueChange={(value) => handleChange('managerId', value)}
                  >
                    <SelectTrigger className={touched.managerId && errors.managerId ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.profiles.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {touched.managerId && errors.managerId && (
                    <p className="text-sm text-destructive">{errors.managerId}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="office">Office <span className="text-destructive">*</span></Label>
                  <Select
                    value={formData.officeId}
                    onValueChange={(value) => handleChange('officeId', value)}
                  >
                    <SelectTrigger className={touched.officeId && errors.officeId ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select office" />
                    </SelectTrigger>
                    <SelectContent>
                      {offices.map((office) => (
                        <SelectItem key={office.id} value={office.id}>
                          {office.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {touched.officeId && errors.officeId && (
                    <p className="text-sm text-destructive">{errors.officeId}</p>
                  )}
                </div>
              </div>

              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 items-end">
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="joinDate">Join Date</Label>
                  <Input
                    id="joinDate"
                    name="joinDate"
                    type="date"
                    value={formData.joinDate}
                    onChange={(e) => handleChange('joinDate', e.target.value)}
                  />
                </div>
                <div className="lg:col-span-2">
                  <FormInputField
                    id="idNumber"
                    label="ID Number"
                    value={formData.idNumber || ""}
                    onChange={(value) => handleChange('idNumber', value)}
                    onBlur={() => handleBlur('idNumber')}
                    placeholder="e.g., Employee ID"
                    error={errors.idNumber}
                    touched={touched.idNumber}
                  />
                </div>
                <div className="lg:col-span-3">
                  <FormInputField
                    id="taxNumber"
                    label="Personal Tax Number"
                    value={formData.taxNumber || ""}
                    onChange={(value) => handleChange('taxNumber', value)}
                    onBlur={() => handleBlur('taxNumber')}
                    placeholder="Tax ID number"
                    error={errors.taxNumber}
                    touched={touched.taxNumber}
                  />
                </div>
                <div className="space-y-2 lg:col-span-5">
                  <Label htmlFor="remuneration">Current Remuneration</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.remunerationCurrency}
                      onValueChange={(value) => handleChange('remunerationCurrency', value)}
                    >
                      <SelectTrigger className="w-24 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.code} value={currency.code}>
                            {currency.code} ({currency.symbol})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="remuneration"
                      name="remuneration"
                      type="text"
                      inputMode="numeric"
                      value={formData.remuneration ? Number(formData.remuneration).toLocaleString() : ""}
                      onChange={(e) => {
                        const rawValue = e.target.value.replace(/,/g, '');
                        if (rawValue === '' || /^\d*$/.test(rawValue)) {
                          handleChange('remuneration', rawValue);
                        }
                      }}
                      placeholder="Annual salary"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact (Optional) */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Emergency Contact
                <span className="text-sm font-normal text-muted-foreground ml-2">(Optional)</span>
              </CardTitle>
              <CardDescription>Emergency contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-3">
                <FormInputField
                  id="emergencyContactName"
                  label="Contact Name"
                  value={formData.emergencyContactName || ""}
                  onChange={(value) => handleChange('emergencyContactName', value)}
                  onBlur={() => handleBlur('emergencyContactName')}
                  placeholder="Jane Doe"
                  error={errors.emergencyContactName}
                  touched={touched.emergencyContactName}
                />
                <FormInputField
                  id="emergencyContactPhone"
                  label="Contact Phone"
                  type="tel"
                  value={formData.emergencyContactPhone || ""}
                  onChange={(value) => handleChange('emergencyContactPhone', value)}
                  onBlur={() => handleBlur('emergencyContactPhone')}
                  placeholder="+1 234 567 8900"
                  error={errors.emergencyContactPhone}
                  touched={touched.emergencyContactPhone}
                />
                <FormInputField
                  id="emergencyContactRelationship"
                  label="Relationship"
                  value={formData.emergencyContactRelationship || ""}
                  onChange={(value) => handleChange('emergencyContactRelationship', value)}
                  onBlur={() => handleBlur('emergencyContactRelationship')}
                  placeholder="e.g., Spouse, Parent"
                  error={errors.emergencyContactRelationship}
                  touched={touched.emergencyContactRelationship}
                />
              </div>
            </CardContent>
          </Card>

          {/* Role Selection */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Role
              </CardTitle>
              <CardDescription>Assign system access permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-1">
                  Role <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: 'admin' | 'hr' | 'user') => handleChange('role', value)}
                >
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Team Member</SelectItem>
                    <SelectItem value="hr">HR Manager</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {formData.role === 'admin' && "Full access to all features and settings"}
                  {formData.role === 'hr' && "Can manage employees, leave requests, and HR functions"}
                  {formData.role === 'user' && "Standard access to view team and personal information"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => navigate('/team')} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Review & Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default InviteTeamMember;