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
import { ArrowLeft, UserPlus, Check, AlertCircle } from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";

const inviteSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(255),
  firstName: z.string().trim().min(2, "First name must be at least 2 characters").max(50),
  lastName: z.string().trim().min(2, "Last name must be at least 2 characters").max(50),
  position: z.string().trim().min(2, "Position must be at least 2 characters").max(100),
  department: z.string().trim().min(2, "Please select a department").max(100),
  joinDate: z.string().min(1, "Please select a join date"),
  phone: z.string().trim().max(20).optional(),
  location: z.string().trim().max(200).optional(),
  role: z.enum(['admin', 'user']),
});

const InviteTeamMember = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [departments, setDepartments] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    position: "",
    department: "",
    joinDate: "",
    phone: "",
    location: "",
    role: "user" as 'admin' | 'user',
  });

  useEffect(() => {
    loadDepartments();
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
    placeholder 
  }: { 
    id: keyof typeof formData; 
    label: string; 
    required?: boolean;
    type?: string;
    placeholder?: string;
  }) => {
    const hasError = touched[id] && errors[id];
    const isValid = touched[id] && !errors[id] && formData[id];

    return (
      <div className="space-y-2">
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
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/team')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Invite New Team Member</h1>
            <p className="text-muted-foreground">Add a new member to your team</p>
          </div>
        </div>

        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Team Member Details
            </CardTitle>
            <CardDescription>
              Fill in the details below. An invitation email will be sent to the new team member.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <InputField id="firstName" label="First Name" required placeholder="John" />
                <InputField id="lastName" label="Last Name" required placeholder="Doe" />
                <InputField id="email" label="Email" required type="email" placeholder="john@example.com" />
                <InputField id="position" label="Position" required placeholder="e.g., Software Engineer" />
                
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
                  <Label htmlFor="joinDate" className="flex items-center gap-1">
                    Join Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="joinDate"
                    type="date"
                    value={formData.joinDate}
                    onChange={(e) => handleChange('joinDate', e.target.value)}
                    onBlur={() => handleBlur('joinDate')}
                    className={cn(
                      "transition-all duration-200",
                      touched.joinDate && errors.joinDate && "border-destructive",
                      touched.joinDate && !errors.joinDate && formData.joinDate && "border-green-500"
                    )}
                  />
                  {touched.joinDate && errors.joinDate && (
                    <p className="text-sm text-destructive flex items-center gap-1 animate-fade-in">
                      {errors.joinDate}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="flex items-center gap-1">
                    Role <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: 'admin' | 'user') => handleChange('role', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Team Member</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <InputField id="phone" label="Phone" type="tel" placeholder="Optional" />
                <InputField id="location" label="Location" placeholder="Optional" />
              </div>

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
                    "Send Invitation"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default InviteTeamMember;
