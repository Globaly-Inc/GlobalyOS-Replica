import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, UserPlus, Check, AlertCircle, User, MapPin, Briefcase, Calendar, Shield, Phone } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";

const inviteSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(255),
  phone: z.string().trim().min(5, "Please enter a valid phone number").max(20),
  firstName: z.string().trim().min(2, "First name must be at least 2 characters").max(50),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters").max(50),
  street: z.string().trim().min(2, "Street address is required").max(200),
  city: z.string().trim().min(2, "City is required").max(100),
  postcode: z.string().trim().min(2, "Postcode is required").max(20),
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
});

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
];

const InviteTeamMember = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [departments, setDepartments] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
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
    role: "user" as 'admin' | 'hr' | 'user',
  });

  useEffect(() => {
    loadDepartments();
    loadPositions();
  }, []);

  const loadDepartments = async () => {
    const { data } = await supabase
      .from('employees')
      .select('department')
      .order('department');
    
    if (data) {
      const uniqueDepts = [...new Set(data.map(e => e.department))].filter(Boolean);
      setDepartments(uniqueDepts);
    }
  };

  const loadPositions = async () => {
    const { data } = await supabase
      .from('positions')
      .select('name')
      .order('name');
    
    if (data) {
      setPositions(data.map(p => p.name));
    }
  };

  const validateField = (field: string, value: string) => {
    try {
      const fieldSchema = inviteSchema.shape[field as keyof typeof inviteSchema.shape];
      if (fieldSchema) {
        fieldSchema.parse(value);
        setErrors(prev => ({ ...prev, [field]: "" }));
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [field]: error.errors[0].message }));
      }
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field, formData[field as keyof typeof formData] as string);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      const validated = inviteSchema.parse(formData);
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('invite-team-member', {
        body: {
          ...validated,
          fullName: `${validated.firstName} ${validated.lastName}`,
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
        const allTouched: Record<string, boolean> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
            allTouched[err.path[0] as string] = true;
          }
        });
        setErrors(fieldErrors);
        setTouched(prev => ({ ...prev, ...allTouched }));
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

  const InputField = ({ 
    id, 
    label, 
    required = false, 
    type = "text",
    placeholder,
    className
  }: { 
    id: keyof typeof formData; 
    label: string; 
    required?: boolean;
    type?: string;
    placeholder?: string;
    className?: string;
  }) => {
    const hasError = touched[id] && errors[id];
    const isValid = touched[id] && !errors[id] && formData[id];

    return (
      <div className={cn("space-y-2", className)}>
        <Label htmlFor={id} className="flex items-center gap-1">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        <div className="relative">
          <Input
            id={id}
            type={type}
            value={formData[id] as string}
            onChange={(e) => handleChange(id, e.target.value)}
            onBlur={() => handleBlur(id)}
            placeholder={placeholder}
            className={cn(
              "pr-10 transition-all duration-200",
              hasError && "border-destructive focus-visible:ring-destructive",
              isValid && "border-green-500 focus-visible:ring-green-500"
            )}
          />
          {isValid && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500 animate-scale-in" />
          )}
          {hasError && (
            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive animate-scale-in" />
          )}
        </div>
        {hasError && (
          <p className="text-sm text-destructive flex items-center gap-1 animate-fade-in">
            {errors[id]}
          </p>
        )}
      </div>
    );
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Basic information about the team member</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <InputField id="firstName" label="First Name" required placeholder="John" />
                <InputField id="lastName" label="Last Name" required placeholder="Doe" />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <InputField id="email" label="Email" required type="email" placeholder="john@example.com" />
                <InputField id="phone" label="Phone" required type="tel" placeholder="+1 234 567 8900" />
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
              <InputField id="street" label="Street Address" required placeholder="123 Main Street" />
              <div className="grid gap-6 sm:grid-cols-2">
                <InputField id="city" label="City" required placeholder="New York" />
                <InputField id="postcode" label="Postcode" required placeholder="10001" />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <InputField id="state" label="State" required placeholder="New York" />
                <InputField id="country" label="Country" required placeholder="United States" />
              </div>
            </CardContent>
          </Card>

          {/* Department & Position */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Department & Position
              </CardTitle>
              <CardDescription>Work role and department assignment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="department" className="flex items-center gap-1">
                    Department <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => {
                      handleChange('department', value);
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
                  {formData.department === '__new__' && (
                    <Input
                      placeholder="Enter new department name"
                      className="mt-2 animate-fade-in"
                      onChange={(e) => {
                        if (e.target.value) {
                          setFormData(prev => ({ ...prev, department: e.target.value }));
                        }
                      }}
                    />
                  )}
                  {touched.department && errors.department && (
                    <p className="text-sm text-destructive flex items-center gap-1 animate-fade-in">
                      {errors.department}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position" className="flex items-center gap-1">
                    Position <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.position}
                    onValueChange={(value) => {
                      handleChange('position', value);
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
                  {formData.position === '__new__' && (
                    <Input
                      placeholder="Enter new position title"
                      className="mt-2 animate-fade-in"
                      onChange={(e) => {
                        if (e.target.value) {
                          setFormData(prev => ({ ...prev, position: e.target.value }));
                        }
                      }}
                    />
                  )}
                  {touched.position && errors.position && (
                    <p className="text-sm text-destructive flex items-center gap-1 animate-fade-in">
                      {errors.position}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employment Details (Optional) */}
          <Card className="animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Employment Details
                <span className="text-sm font-normal text-muted-foreground ml-2">(Optional)</span>
              </CardTitle>
              <CardDescription>Additional employment information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="joinDate">Join Date</Label>
                  <Input
                    id="joinDate"
                    type="date"
                    value={formData.joinDate}
                    onChange={(e) => handleChange('joinDate', e.target.value)}
                  />
                </div>
                <InputField id="idNumber" label="ID Number" placeholder="e.g., Employee ID" />
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                <InputField id="taxNumber" label="Personal Tax Number" placeholder="Tax identification number" />
                <div className="space-y-2">
                  <Label htmlFor="remuneration">Current Remuneration</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.remunerationCurrency}
                      onValueChange={(value) => handleChange('remunerationCurrency', value)}
                    >
                      <SelectTrigger className="w-28">
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
                      type="number"
                      value={formData.remuneration}
                      onChange={(e) => handleChange('remuneration', e.target.value)}
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
                <InputField id="emergencyContactName" label="Contact Name" placeholder="Jane Doe" />
                <InputField id="emergencyContactPhone" label="Contact Phone" type="tel" placeholder="+1 234 567 8900" />
                <InputField id="emergencyContactRelationship" label="Relationship" placeholder="e.g., Spouse, Parent" />
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
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Sending...
                </span>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default InviteTeamMember;